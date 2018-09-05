const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId
const Mixed = Schema.Types.Mixed

const VideoSchema = new Schema({
  author: {
    type: ObjectId,
    ref: 'User'
  },

  qiniu_key: String,
  qiniu_final_key: String,
  qiniu_detail: Mixed,
  persistentId: String,

  public_id: String,
  detail: Mixed,

  meta: {
    createAt: {
      type: Date,
      dafault: Date.now()
    },
    updateAt: {
      type: Date,
      dafault: Date.now()
    }
  }
})

VideoSchema.pre('save', function(next) {
  if (this.isNew) {
    this.meta.createAt = this.meta.updateAt = Date.now()
  }
  else {
    this.meta.updateAt = Date.now()
  }

  next()
})

module.exports = mongoose.model('Video', VideoSchema)
