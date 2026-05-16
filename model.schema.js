const mongoose = require("mongoose");

const schema = mongoose.Schema({
  shortUrl: {
    type: String,
  },
  private: {
    type: Boolean,
    default: false,
  },
  longUrl: {
    type: String,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "campaign"
  },
  guestId: {
    type: String,
    default: null
  },
  countGraph: [
    {
      timestamp: {
        type: Date,
        default: Date.now
      },
      count: {
        type: Number,
        default: 0
      }
    }
  ],
  customUrl: {
    type: String,
    default: null,
  },
  userIps: {
    type: Array,
    default: []
  },
  location: {
    type: Array,
    default: []
  },
  devices: {
    type: Array,
    default: []
  },
  browsers: {
    type: Array,
    default: []
  },
  os: {
    type: Array,
    default: []
  },
  referrer: {
    type: Array,
    default: []
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
  },
});

schema.index({ longUrl: 1 })

module.exports = mongoose.model("url", schema);
