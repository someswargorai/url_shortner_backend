const mongoose = require("mongoose");

const schema = mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
}, {
  timestamps: true,
});


module.exports = mongoose.model("user", schema);
