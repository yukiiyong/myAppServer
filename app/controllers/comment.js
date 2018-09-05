var mongoose = require('mongoose')
var User = mongoose.model('User')
const Comment = mongoose.model('Comment')
const Creation = mongoose.model('Creation')
const userFields = ['avatar', 'age', 'nickname', 'gender', 'breed']

exports.find = async (ctx, next) => {
  // 提交accessToken,page,videoId,向数据库查找是否有记录，有则返回数据
  //videoId必须有 page没有为1 每一页20条记录
  const id = ctx.query.creationId
  const page = parseInt(ctx.query.page, 10) || 1
  const count = 10
  const offset = (page - 1) * count
  if(!id) {
    ctx.body = {
      success: false,
      err: 'id不能为空'
    }

    return next()
  }
  console.log(ctx.query)
  var result = await Comment.find({creation: id })
      .sort({ 'meta.createAt': -1})
      .skip(offset)
      .limit(count)
      .populate('replyBy', userFields.join(' '))
      .exec()
  var total = await Comment.count({creation: id}).exec()

  ctx.body = {
    success: true,
    data: result,
    total: total
  }
}

exports.save = async (ctx, next) => {
  // 获取comment 和session里的user
  //查找creation中是否含有comment里的creation(创意)，无则返回body
  //用comment的cid（作者id）查找是否含有评论集
  //有则加上（from， tid， content）
  //无则建立一条新的comment（creation， replyBy，replyTo，content）
  //保存

  var commentData = ctx.request.body.comment
  var user = ctx.session.user
  console.log(ctx.request.body)
  var creation = await Creation.findOne({_id: commentData.creation}).exec()

  if(!creation) {
    ctx.body = {
      success: false,
      err: '没有视频了'
    }

    return  next()
  }

  var comment
  //cid = comment._id
  //tid = user._id
  //from 评论人(creation.author)
  if(commentData.cid) {
    comment = await Comment.findOne({
      _id: CommentData.cid
    }).exec()

    var reply = {
      from: commentData.from,
      to: commentData.tid,
      content: commentData.content
    }
    comment.reply.push(reply)

    comment = await comment.save()

    ctx.body = {
      success: true,
      data: [comment]
    }

  }
  else {
    comment = new Comment({
      creation: creation._id,
      replyBy: user._id,
      replyTo: creation.author,
      content: commentData.content
    })

    comment = await comment.save()
    ctx.body = {
      success: true,
      data: [comment]
    }
  }
}










