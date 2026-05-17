const mongoose = require("mongoose");

const domainSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    domain: {
        type: String,
        required: true,
    },
    isDefault: {
        type: Boolean,
        default: false,
    }, 
    isValid: {
        type: Boolean,
        default: false,
    },
    verificationToken: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model("domain", domainSchema);