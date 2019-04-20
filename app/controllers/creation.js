const mongoose = require('mongoose')
const uuid = require('uuid')
const config = require('../../config/config')
const robot = require('../service/robot')
const _ = require('lodash')

const User = mongoose.model('User')
const Video = mongoose.model('Video')
const Audio = mongoose.model('Audio')
const Creation = mongoose.model('Creation')
let userFields = ['avatar', 'nickname', 'gender', 'age']
function asyncMedia(videoId, audioId) {
  //合成静音视频和封面图,并把两者的七牛地址保存到audio和creation中
  if(!videoId) {
    return
  }
  var query = {
    _id: audioId
  }
  if(!audioId) {
    //没有audioID传入则用videoId代替查找数据库记录
    query = {
      video: videoId
    }
  }
  console.log('asyncMedia running')
  //分别查找video和audio是否存在于数据库中
  Promise.all([
    Video.findOne({_id: videoId}).exec(),
    Audio.findOne(query).exec()
  ]).then(data => {
    console.log(data)
    var video = data[0]
    var audio = data[1]
    //检查数据
    if(!video || !video.public_id || !audio || !audio.public_id) {
      return
    }
    console.log('asyncMedia running')

    var video_public_id = video.public_id
    var audio_public_id = audio.public_id
    var videoUrl = config.cloudinary.base + '/video/upload/e_volume:-100/e_volume:400,l_video:' + audio.public_id.replace(/\//g, ':') + '/' + video.public_id + '.mp4'
    var videoName = video_public_id.replace(/\//g, '_') + '.mp4'
    var thumbUrl = config.cloudinary.base + '/video/upload/' + video_public_id + '.jpg'
    var thumbName = video_public_id.replace(/\//g, '_') + '.jpg'

    robot.saveToQiniu(videoUrl, videoName)
      .catch((err) => {
        console.log(err)
      })
      .then((response) => {
        if(response && response.key) {
          audio.qiniu_video = response.key
          audio.save().then((_audio) => {
            Creation.findOne({
              audio: audio._id,
              video: video._id
            }).exec().then((_creation) => {
              if(_creation) {
                if(!_creation.qiniu_video) {
                  _creation.qiniu_video = _audio.qiniu_video
                  _creation.save()
                }                
              }
            }).catch(err => {
              console.log('同步视频失败')
            })
            console.log('同步视频成功')
          })
        }
      })
    robot.saveToQiniu(thumbUrl,thumbName)
      .then((response) => {
        if(response && response.key) {
          audio.qiniu_thumb = response.key
          audio.save().then((_audio) => {
            if(!_audio) {
              return
            }
            Creation.findOne({
              video: video._id,
              audio: audio._id
            }).exec().then((_creation) => {
              if(_creation) {
                if(!_creation.qiniu_thumb) {
                  _creation.qiniu_thumb = _audio.qiniu_thumb
                  _creation.save()
                }
              }
            }).catch((err) => {
              console.log('同步封面图失败')
            })
             console.log('同步封面图成功')
          })
        }
      })
  })
}

exports.video = async (ctx, next) => {
  //user， videoData(body.video)保存到本地
  //查找video是否上传到qiniu（查找videoData和videoData.key是否存在）
  //到数据库中查找video是否存在(qiniu_key: videoData.key)
  //不存在则新建video(author,qiniu_key,persistentId)，然后保存到数据库
  //组建video在qiniu中的url地址
  //用这个URL地址转存到cloudinary中
  //cloudinary返回到public_id 和 detail 保存到video数据库中 
  var user = ctx.session.user
  var videoData = ctx.request.body.video
  console.log(videoData)
  if(!videoData || !videoData.public_id) { //七牛检查key，cloudinary检查public_id
    ctx.body = {
      success: false,
      err: '视频上传失败'
    }
    return
  }
  var video = await Video.findOne({
    public_id: videoData.public_id
  })

  if(!video) {
    video = new Video({
      author: user._id,
      public_id: videoData.public_id,
      detail: videoData
    })

    video = await video.save()

    ctx.body = {
      success: true,
      data: video._id
    }
  }
}

exports.audio = async (ctx, next) => {
  //user， audioData(body.audio)保存到本地
  //查找audio是否上传到cloudinary（查找audioData和audioData.public_id是否存在）
  //到数据库中查找audio是否存在(public_id: audioData.public_id)
  //不存在则新建video(author,public_id,detail)，videoId(根据videoID到数据库查找后返回的id），然后保存到数据库
  //body 返回 audio._id
  const user = ctx.session.user
  const body = ctx.request.body
  const audioData  = body.audio
  const videoId = body.videoId
  console.log(body)

  if(!audioData || !audioData.public_id) {
    ctx.body = {
      success: false,
      err: '音频上传失败'
    }
    return
  }

  var audio = await Audio.findOne({
    public_id: audioData.public_id
  }).exec()

  var video = await Video.findOne({
    _id: videoId
  }).exec()

  if(!audio) {
    let _audio = {
      author: user._id,
      public_id: audioData.public_id,
      detail: audioData
    }

    if(video) {
      _audio.video = video._id
    }

    audio = new Audio(_audio)
    audio = await audio.save()
  }

  asyncMedia(video._id, audio._id)

  ctx.body = {
    success: true,
    data: audio._id
  }
}

exports.save = async (ctx, next) => {
  //传入参数为videoID， audioId, title, user(session.user)
  //查找video和audio中是否存在对应记录,不存在返回失败
  //用videoID和audioId 在 creation 查找是否存在记录
  //不存在则创建新的creation(author, videoId, audioId, title, finish = 20)
  //如果video和audio的public_id都存在，则把cloudinary_thumb和cloudinary_video存入creation，finish+=20
  //如果video的qiniu_thunb存在，存入creation，finish+=30
  //如果audio的qiniu_video 存在，存入creation， finish+=30
  //保存creation到数据库
  //返回body(_id,finish,title,qiniu_thumb,qiniu_video,author: {avatar,nickname,gender,_id})
  const body = ctx.request.body
  const videoId = body.videoId
  const title = body.title
  const user = ctx.session.user
  console.log(title)
  var video = await Video.findOne({
    _id: videoId
  }).exec()
  //生成缩略图地址和视频地址
  var thumbUrl = config.cloudinary.base + '/video/upload/' + video.public_id + '.jpg'
  let thumbName = video.public_id.replace(/\//g, '_') + '.jpg'
  let videoUrl = '/video/upload/' + video.public_id + '.mp4'

  if(!video) {
    ctx.body = {
      success: false,
      err: '视频不能为空'
    }
    return 
  }

  var creation = await Creation.findOne({
    video: videoId
  }).exec()

  if(!creation) {
    var creationData = {
      author: user._id,
      video: video._id,
      cloudinary_thumb: thumbUrl,
      cloudinary_video: videoUrl,
      title: title,
      finish: 100
    }

    creation = new Creation(creationData)
  }

  creation = await creation.save()

  ctx.body = {
    success: true,
    data: {
      _id: creation._id,
      finish: creation.finish,
      title: creation.title,
      author: {
        avatar: user.avatar,
        nickname: user.nickname,
        gender: user.gender,
        _id: user._id
      }
    }
  }
}

exports.find = async (ctx, next) => {
  //list页面查找creation，返回creation和总数
  //传入参数为page(qeury) skip(offset) limit(count:5) find(finish:100) sort(meta.createAt:-1) populate(author 'avatar nickname gender age' )
  const query = ctx.query
  const page = parseInt(query.page, 10) || 1
  const count = 10
  const offset = (page - 1) * count

  var result = await Creation.find({finish: 100})
      .sort({'meta.createAt': -1})
      .skip(offset)
      .limit(count)
      .populate('author', userFields.join(' '))
      .exec()

  var total = await Creation.count({finish: 100}).exec()


  ctx.body={
    success: true,
    data: result,
    total: total
  }

}
exports.findByName = async(ctx, next) => {
  //myVideo页面查找属于自己的creation，返回creation和总数
  //传入参数为page(query)，skip(offset) limit(count:5) find(finish: 100,author:authorid) sort(meta.createAt:-1) populate(author 'avatar nickname gender age' )
  const query = ctx.query
  const author = query.author
  const page = parseInt(query.page) || 0
  const count = 10
  const offset = (page - 1) * count

  if(!author && author === 'undefined' && author === '') {
    ctx.body = {
      success: false,
      err: 'author丢失'
    }
    return
  }
  let result = await Creation.find({
    author: author,
    finish: 100
  }).sort({'meta.createAt': -1})
  .skip(offset)
  .limit(count)
  .populate('author', userFields.join(' '))
  .exec()

  let total = await Creation.count({
    author: author,
    finish: 100
  }).exec()

  ctx.body = {
    success: true,
    data: result,
    total: total
  }
}
exports.votes= async (ctx, next) => {
  //传入参数为creation._id  up(Boolean) user(session.user)
  //查找creation中是否存在对应记录，不存在返回失败信息
  //如果up为true， creation.votes.push(user._id)
  //如果up为false, _.without(creation.votes,user._id)
  //creation.up = creation.votes.length
  //保存creation到数据库
  //返回body(success: true)
  const body = ctx.request.body
  const user = ctx.session.user
  const id = body.id
  const favorite = body.favorite
  console.log(favorite)
  var creation = await Creation.findOne({
    _id: id
  }).exec()

  if(!creation) {
    ctx.body = {
      success: false,
      err: '点赞失败'
    }
    return next()
  }

  if(favorite) {
    creation.favorite.push(String(user._id))
  } else {
    creation.favorite = _.without(creation.favorite, String(user._id))
  }

  creation.favorite_total = creation.favorite.length

  creation = await creation.save() 

  ctx.body = {
    success: true,
    data: creation
  }
}






