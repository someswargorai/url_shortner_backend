const mongoose = require("mongoose");

const projectSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    projectApiKey: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
});

module.exports = mongoose.model("project", projectSchema);