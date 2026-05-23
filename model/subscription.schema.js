// models/Subscription.ts
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subscriptionId: { type: String },
    subscriptionStatus: {
      type: String,
      enum: ["active", "canceled", "expired"],
    },
    plan: { type: String },
    polarCustomerId: { type: String, default: null },
    subscribedAt: { type: Date },
    renewsAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
