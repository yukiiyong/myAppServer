

const mongoose = require('mongoose')
const uuid = require('uuid')
const User = mongoose.model('User')
const robot = require('../service/robot')

//获取签名
exports.signature = async (ctx, next) => {
  var body = ctx.request.body
  var cloud = body.cloud
  var data 
  console.log(body)
  if(cloud === 'qiniu') {
    data = robot.getQiniuToken(body)
  }
  else {
    data = robot.getCloudinaryToken(body)
  }

  ctx.body = {
    success: true,
    data: data
  }
}
//检查post时候数据是否带有body
exports.hasBody = async (ctx, next) => {
  var body = ctx.request.body || {}

  if(Object.keys(body).length === 0) {
    ctx.body = {
      success: false,
      err: '是漏了点什么嘛'
    }   
    return    
  }

  await next()
}
//检验token并对用户是否登陆进行验证
exports.hasToken = async (ctx, next) => {
  let accessToken = ctx.query.accessToken

  if(!accessToken) {
    accessToken = ctx.request.body.accessToken
  }

  if(!accessToken) {
    ctx.body = {
      success: false,
      err: '没有钥匙'
    }
    return 
  }

  let user = await User.findOne({
    accessToken: accessToken
  })

  if(!user) {
    ctx.body = {
      success: false,
      err: '用户没登录'
    }
    return 
  }

  ctx.session = ctx.session || {}
  ctx.session.user = user

  await next()
}