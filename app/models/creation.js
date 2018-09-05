const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId
const Mixed = Schema.Types.Mixed

const CreationSchema = new Schema({
  author: {
    type: ObjectId,
    ref: 'User'
  },
  video: {
    type: ObjectId,
    ref: 'Video'
  },
  audio: {
    type: ObjectId,
    ref: 'audio'
  },
  title: String,

  qiniu_thumb: String, //url
  qiniu_video: String,

  cloudinary_thumb: String, //url
  cloudinary_video: String,

  finish: {
    type: Number,
    default: 0
  },

  favorite: [String],

  favorite_total: {
    type: Number,
    default: 0
  }, 
  
  meta: {
    createAt:{
      type: Date,
      default: Date.now()
    },
    updateAt: {
      type: Date,
      default: Date.now()
    }
  }
})

CreationSchema.pre('save', function(next) {
  if(this.isNew) {
    this.createAt = this.updateAt = Date.now()
  }else {
    this.updateAt = Date.now()
  }

  next()
})

module.exports =  mongoose.model('Creation', CreationSchema)