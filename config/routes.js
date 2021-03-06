'use strict'

var Router = require('koa-router')
var User = require('../app/controllers/user')
var App = require('../app/controllers/app')
var Creation = require('../app/controllers/creation')
var Comment = require('../app/controllers/comment')

module.exports = function() {
  var router = new Router({
    prefix: '/api'
  })

  //user
  router.post('/u/signup', App.hasBody, User.signup)
  router.post('/u/login', App.hasBody, User.verify)
  router.post('/u/update', App.hasBody, App.hasToken, User.update)

  //app
  router.post('/signature', App.hasBody, App.hasToken, App.signature)

  //list
  router.get('/creations', App.hasToken, Creation.find)
  router.post('/creations', App.hasBody, App.hasToken, Creation.save)
  router.post('/creations/video', App.hasBody, App.hasToken, Creation.video)
  router.post('/creations/audio', App.hasBody, App.hasToken, Creation.audio)
  router.get('/creationsByName', App.hasToken, Creation.findByName)
  
  //votes
  router.post('/up', App.hasBody, App.hasToken, Creation.votes)
  
  router.post('/comments', App.hasBody, App.hasToken, Comment.save)
  router.get('/comments', App.hasToken, Comment.find)
  return router
}