const mongoose = require("mongoose");

const schema = mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  apiKeys: [
    {
      name: { type: String },
      key: { type: String, unique: true, sparse: true },
      createdAt: { type: Date, default: Date.now },
      lastUsed: { type: Date, default: null },
      status: { type: String, enum: ["active", "inactive"], default: "active" },
      plan: { type: String, default: "Base" },
    }
  ],
}, {
  timestamps: true,
});


module.exports = mongoose.model("user", schema);
