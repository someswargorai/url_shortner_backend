const mongoose = require("mongoose");

const schema = mongoose.Schema({
  shortUrl: {
    type: String,
  },
  longUrl: {
    type: String,
  },
  seqId: {
    type: Number,
    default: new Date(),
  },
});

schema.index({longUrl: 1})

module.exports = mongoose.model("url", schema);
