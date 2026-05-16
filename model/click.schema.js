const mongoose = require("mongoose");

const schema = mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "url",
    required: true,
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "campaign",
  },
  ip: {
    type: String,
  },
  location: {
    type: String,
  },
  device: {
    type: String,
  },
  browser: {
    type: String,
  },
  os: {
    type: String,
  },
  referrer: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("click", schema);
