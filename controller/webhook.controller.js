const { default: subscriptionSchema } = require("../model/subscription.schema");

const webhook = async (req,res)=>{
 const body = req.body.toString()
  const headers = req.headers;

  let event;
  try {
    event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET)
  } catch {
    return res.status(403).json({ error: "Invalid signature" })
  }

  const sub = event.data

  try {
    switch (event.type) {

      case "subscription.created":
        await subscriptionSchema.findOneAndUpdate(
          { email: sub.customer.email },
          {
            $set: {
              subscriptionId:     sub.id,
              subscriptionStatus: "active",
              plan:               sub.product.name,
              subscribedAt:       new Date(sub.createdAt),
              polarCustomerId:    sub.customerId,
              renewsAt:           sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
            },
          },
          { upsert: true, new: true }
        )
        break

      case "subscription.updated":
        await Subscription.findOneAndUpdate(
          { subscriptionId: sub.id },
          {
            $set: {
              subscriptionStatus: sub.status,
              renewsAt:           sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
            },
          }
        )
        break

      case "subscription.canceled":
        await Subscription.findOneAndUpdate(
          { subscriptionId: sub.id },
          {
            $set: {
              subscriptionStatus: "canceled",
              expiresAt:          sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
            },
          }
        )
        break

      case "subscription.revoked":
        await Subscription.findOneAndUpdate(
          { subscriptionId: sub.id },
          {
            $set: {
              subscriptionStatus: "expired",
              expiresAt:          new Date(),
            },
          }
        )
        break
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error("Webhook handler failed", error)
    res.status(500).json({ error: "Internal error" })
  }
}

module.exports = webhook;