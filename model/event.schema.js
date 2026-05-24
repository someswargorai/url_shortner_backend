const mongoose = require("mongoose");

const eventSchema = mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "project",
        required: true
    },
    eventName: {
        type: String,
        required: true
    },
    notification: {
        type: Boolean,
        default: false
    },
    userId: {
        type: String, // developer's user id, not necessarily ObjectId
        default: null
    },
    anonymousId: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // flexible object
        default: {}
    },
    device: {
        os: String,
        browser: String,
        deviceType: String
    },
    location: {
        country: String,
        city: String,
        region: String
    },
    source: {
        referrer: String
    },
    ip: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });


eventSchema.index({ projectId: 1, eventName: 1 });
eventSchema.index({ userId : "text"},{
    weights: {
        userId: 5
    }
});

module.exports = mongoose.model("event", eventSchema);
