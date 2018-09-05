'use strict'

var fs = require('fs')
var path = require('path')
var mongoose = require('mongoose')
var db = 'mongodb://localhost:27017/my-app'

mongoose.connect(db,{useNewUrlParser: true})

var models_path = path.join(__dirname, '/app/models')

var walk = function(modelPath) {
  fs.readdirSync(modelPath)
    .forEach(function(file) {
      var filePath = path.join(modelPath, '/' + file)
      var stat = fs.statSync(filePath)

      if(stat.isFile()) {
        if(/(.*)\.(js|coffee)/.test(file)) {
          require(filePath)
        }
      }
      else if(stat.isDirectory()) {
        walk(filePath)
      }
    }) 
}

walk(models_path)

var Koa = require('koa')
var logger = require('koa-logger')
var session = require('koa-session')
var bodyParser = require('koa-bodyparser')
var app = new Koa()

app.keys = ['myApp']
app.use(logger())
app.use(session(app))
app.use(bodyParser())

var router = require('./config/routes')()

app.use(router.routes())
    .use(router.allowedMethods())

app.listen(3000,() => {
  console.log('server listening at 3000')
})