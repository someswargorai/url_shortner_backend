import { Request, Response, NextFunction } from "express";
import Subscription from "../models/Subscription";

export async function requireSubscription(
  req,
  res,
  next
) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const subscription = await Subscription.findOne({ userId });

  if (!subscription) {
    return res.status(403).json({ error: "Subscription required" });
  }

  const isActive = subscription.subscriptionStatus === "active";
  const isCanceledButValid =
    subscription.subscriptionStatus === "canceled" &&
    subscription.expiresAt &&
    new Date() < subscription.expiresAt;

  if (!isActive && !isCanceledButValid) {
    return res.status(403).json({ error: "Subscription required" });
  }

  next();
}
