'use strict'

var qiniu = require('qiniu')
var cloudinary = require('cloudinary')
var sha1 = require('sha1')
var uuid = require('uuid')
var config = require('../../config/config')


qiniu.conf.ACCESS_KEY = config.qiniu.AK 
qiniu.conf.SECRET_KEY = config.qiniu.SK

cloudinary.config(config.cloudinary)
var qiniuConfig = qiniu.conf.Config()
var mac = new qiniu.auth.digest.Mac(config.qiniu.AK, config.qiniu.Sk)

exports.getQiniuToken = function(body) {
  var type = body.type
  var key = uuid.v4()
  var putPolicy
  var options = {
    persistentNotifyUrl: config.notify
  }
  var name = 'myApp'

  if(type === 'avatar') {
    key += '.jpeg'
    putPolicy = new qiniu.rs.PutPolicy('myappavatar:' + key)
  }
  else if (type === 'video') {
    key += '.mp4'
    options.scope = 'myappvideo:' + key
    options.persistentOps = 'avthumb/mp4/an/1'
    putPolicy = new qiniu.rs.PutPolicy(options)
  }
  else if (type === 'audio') {
    //
  }

  var token = putPolicy.uploadToken()
  console.log(token)
  return {
    key: key,
    token: token
  }
}

exports.saveToQiniu = function(url, key) {
  //转存clouinary上的视频到qiniu
  var bucketManager = new qiniu.rs.BucketManager(mac, qiniuConfig)
  return new Promise(function(resolve, reject) {
    bucketManager.fetch(url, 'myappvideo', key, function(err, ret) {
      if(!err) {
        resolve(ret)
      }
      else {
        reject(err)
      }
    })
  })
}

exports.uploadToCloudinary = function(url) {
  //转存qiniu上的视频到cloudinary
  return new Promise(function(resolve, reject) {
    cloudinary.uploader.upload(url, function(result) {
      if(result && result.public_id) {
        resolve(result)
      }
      else {
        reject(result)
      }
    },{
      resource_type: 'video',
      folder: 'video'
    })
  })
}

exports.getCloudinaryToken = function(body) {
  var type = body.type
  var timestamp = body.timestamp
  var folder
  var tags

  if(type === 'avatar') {
    folder = 'avatar'
    tags = 'app,avatar'
  }
  else if(type === 'video') {
    folder = 'video'
    tags = 'app,video'
  }
  else if(type === 'audio') {
    folder = 'audio'
    tags = 'app,audio'
  }

  //data.data
  var signature = 'folder=' + folder + '&tags=' + tags + '&timestamp=' + timestamp + config.cloudinary.api_secret
  var key = uuid.v4()

  signature = sha1(signature)

  return {
    token: signature,
    key: key
  }
}