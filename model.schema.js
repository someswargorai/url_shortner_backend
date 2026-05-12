const mongoose = require("mongoose");

const schema = mongoose.Schema({
  shortUrl: {
    type: String,
  },
  longUrl: {
    type: String,
  },
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  },
  count:{
    type: Number,
    default: 0,
  },
  customUrl: {
    type: String,
    default: null,
  },
  location:{
    type: String,
    default: ""
  },
  device:{
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  seqId: {
    type: Number,
    default: new Date(),
  },
});

schema.index({longUrl: 1})

module.exports = mongoose.model("url", schema);
