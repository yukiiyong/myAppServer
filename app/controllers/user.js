
var xss = require('xss')
var mongoose = require('mongoose')
var User = mongoose.model('User')
var uuid = require('uuid')
var sms = require('../service/sms')

exports.signup = async (ctx, next) => {
  //向数据库中查找是否有手机号
  //没有的话新建一个用户
  //有的话赋予验证码，并保存到数据库中，并向手机发送验证码
  var phoneNumber = xss(ctx.request.body.phoneNumber.trim())

  var user = await User.findOne({
    phoneNumber: phoneNumber
  })

  var verifyCode = sms.getCode()

  if(!user) {
    var accessToken = uuid.v4()

    user = new User({
      nickname: 'myName',
      avatar: '',
      phoneNumber: phoneNumber,
      verifyCode: verifyCode,
      accessToken: accessToken
    })
  }
  else {
    user.verifyCode = verifyCode
  }
  console.log(verifyCode)
  try{
    user = await user.save()
  }
  catch (e) {
    ctx.body = {
      success: false
    }
    return
  }

  var msg = '您的注册验证码是：'+ user.verifyCode
  try{
    sms.send(user.phoneNumber, msg)
  }catch(e) {
    console.log('signup function err')
    console.log(e)

    ctx.body = {
      success: false,
      err: '短信服务异常'
    }

    return 
  }

  ctx.body = {
    success: true
  }
}

exports.verify = async (ctx,next) => {
  // 检查用户输入的手机号和验证码是否为空
  //不为空则向数据库查询，存在记录则验证成功 user.verified 为 true，再保存到数据库，以作用户已经验证的凭据
  //最后返回data（nickname，accessToken，avatar，_id）
 const phoneNumber = ctx.request.body.phoneNumber
 const verifyCode = ctx.request.body.code
 console.log(ctx.request.body)
  if(!phoneNumber || !verifyCode) {
    ctx.body = {
      success: false,
      err: '验证没通过'
    }
    return next()
  }

  let user = await User.findOne({
    phoneNumber: phoneNumber,
    verifyCode: verifyCode
  })

  if(user) {
    user.verified = true
    user = await user.save()    

    ctx.body = {
      success: true,
      data: {
        nickname: user.nickname,
        accessToken: user.accessToken,
        avatar: user.avatar,
        _id: user._id
      }
    }
  }
  else {
    ctx.body = {
      success: false,
      err: '验证未通过'
    }
  }
  await next()
}

exports.update = async (ctx, next) => {
  //fields 是要更新的条目
  //验证body中的条目是否存在，然后从body 中取出相应的条目存入session中的user（进行xss过滤）
  //将user保存到数据库中
  //返回data（nickname，accessToken，avatar，age，gender，_id）

  let body = ctx.request.body
  let user = ctx.session.user
  let bodyUser = body.user
  let fields = 'nickname,avatar,age,gender'.split(',')
  fields.forEach(function(field) {
    if(bodyUser[field]) {
      user[field] = xss(bodyUser[field].trim())
    }
  })

  user = await user.save()

  ctx.body = {
    success: true,
    data: {
      nickname: user.nickname,
      accessToken: user.accessToken,
      avatar: user.avatar,
      age: user.age,
      gender: user.gender,
      _id: user._id
    }
  }

}