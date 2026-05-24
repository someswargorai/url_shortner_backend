const { default: subscriptionSchema } = require("../model/subscription.schema");
const { validateEvent } = require("@polar-sh/sdk/webhooks");

const webhook = async (req, res) => {
  const body = req.body.toString();
  const headers = req.headers;

  let event;
  try {
    event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET);
  } catch {
    return res.status(403).json({ error: "Invalid signature" });
  }

  const sub = event.data;

  try {
    switch (event.type) {
      case "subscription.created":
        await subscriptionSchema.findOneAndUpdate(
          { email: sub.customer.email },
          {
            $set: {
              subscriptionId: sub.id,
              subscriptionStatus: "active",
              plan: sub.product.name,
              userId: req.user._id,
              subscribedAt: new Date(sub.createdAt),
              polarCustomerId: sub.customerId,
              renewsAt: sub.currentPeriodEnd
                ? new Date(sub.currentPeriodEnd)
                : null,
            },
          },
          { upsert: true, new: true },
        );
        break;

      case "subscription.updated":
        await subscriptionSchema.findOneAndUpdate(
          { subscriptionId: sub.id },
          {
            $set: {
              subscriptionStatus: sub.status,
              plan: sub.product.name,
              renewsAt: sub.currentPeriodEnd
                ? new Date(sub.currentPeriodEnd)
                : null,
            },
          },
        );
        break;

      case "subscription.canceled":
        await subscriptionSchema.findOneAndUpdate(
          { subscriptionId: sub.id },
          {
            $set: {
              subscriptionStatus: "canceled",
              expiresAt: sub.currentPeriodEnd
                ? new Date(sub.currentPeriodEnd)
                : null,
            },
          },
        );
        break;

      case "subscription.revoked":
        await subscriptionSchema.findOneAndUpdate(
          { subscriptionId: sub.id },
          {
            $set: {
              subscriptionStatus: "expired",
              expiresAt: new Date(),
            },
          },
        );
        break;

      default:
        // unhandled event types — just acknowledge them
        console.log(`Unhandled event type: ${event.type}`);
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook handler failed", error);
    res.status(500).json({ error: "Internal error" });
  }
};

module.exports = webhook;
