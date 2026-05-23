const { default: subscriptionSchema } = require("../model/subscription.schema");
const { Polar } = require("@polar-sh/sdk");

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: "production", // change to "production" when live
});


const getActiveSubscription = async (req, res) => {
  try {
    console.log("User ID from token:", req.user.id); // Debugging line

    const subscription = await subscriptionSchema.findOne({
      userId: req.user.id,
    });

    res.status(200).json({success:true,plan: subscription});
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching active subscription" });
  }
};

const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await subscriptionSchema.find({ userId: req.user._id });
    res.status(200).json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching subscriptions" });
  }
};

const customerPortal = async (req, res) => {
  try {
    const userId = req.user?.id;
    const subscription = await subscriptionSchema.findOne({ userId });

    if (!subscription?.polarCustomerId) {
      return res.status(404).json({ error: "No subscription found" });
    }

    // generate a short-lived customer portal session
    const session = await polar.customerSessions.create({
      customerId: subscription.polarCustomerId,
    });

    res.status(200).json({ url: session.customerPortalUrl });
  } catch (error) {
    console.error("Customer portal error", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
};


module.exports = {
  getActiveSubscription,
  getAllSubscriptions,
  customerPortal,
};