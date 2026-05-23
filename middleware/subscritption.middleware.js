const Subscription = require("../model/subscription.schema.js");
const Project = require("../model/project.schema.js");
const Campaign = require("../model/campaign.schema.js");
const Domain = require("../model/domain.schema.js");
const Url = require("../model.schema.js");
const User = require("../model/user.schema.js"); // ← for apiKeys


const PLAN_LIMITS = {
  free: {
    projects: 0,
    campaigns: 5,
    domains: 0,
    urls: 10,
    apiKeys: 0,
  },
  base_plan: {
    projects: 5,
    campaigns: 10,
    domains: 1,
    urls: 60,
    apiKeys: 1,
  },
  pro_plan: {
    projects: 20,
    campaigns: 20,
    domains: 1,
    urls: 120,
    apiKeys: 2,
  },
};

const PLAN_MESSAGES = {
  projects: (limit, plan) =>
    `Your ${plan?.replace("_", " ")} plan allows up to ${limit} projects. Upgrade to create more.`,
  campaigns: (limit, plan) =>
    `Your ${plan?.replace("_", " ")} plan allows up to ${limit} campaigns. Upgrade to create more.`,
  domains: (_, plan) =>
    `Your ${plan?.replace("_", " ")} plan does not include custom domains. Upgrade to add one.`,
  urls: (limit, plan) =>
    `Your ${plan?.replace("_", " ")} plan allows up to ${limit} URLs. Upgrade to create more.`,
  apiKeys: (limit, plan) =>
    limit === 0
      ? `Your ${plan?.replace("_", " ")} plan does not include API keys. Upgrade to create one.`
      : `Your ${plan?.replace("_", " ")} plan allows up to ${limit} API key(s). Upgrade to create more.`,
};

function planLimiter(resource) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // get subscription
      const subscription = await Subscription.findOne({ userId });

      // determine plan
      const isActive = subscription?.subscriptionStatus === "active";
      const isCanceledButValid =
        subscription?.subscriptionStatus === "canceled" &&
        subscription?.expiresAt &&
        new Date() < subscription.expiresAt;

      const hasValidSub = isActive || isCanceledButValid;

      let planName = "free";
      if (hasValidSub && subscription?.plan) {
        planName = subscription.plan.toLowerCase()?.replace(" ","_");
      }

      const limits = PLAN_LIMITS[planName] ?? PLAN_LIMITS.free;
      const limit = limits[resource];

      // count current usage
      let count = 0;
      switch (resource) {
        case "projects":
          count = await Project.countDocuments({ userId });
          break;

        case "campaigns":
          count = await Campaign.countDocuments({ userId });
          break;

        case "domains":
          count = await Domain.countDocuments({ userId });
          break;

        case "urls":
          count = await Url.countDocuments({ userId });
          break;

        case "apiKeys":
          // apiKeys is embedded array in User model
          const user = await User.findById(userId).select("apiKeys");
          count =
            user?.apiKeys?.filter(
              (k) => k.status === "active", // only count active keys
            ).length ?? 0;
          break;

        default:
          return res
            .status(500)
            .json({ error: `Unknown resource: ${resource}` });
      }

      // check limit
      if (limit !== Infinity && count >= limit) {
        return res.status(403).json({
          error: PLAN_MESSAGES[resource](limit, planName),
          limit,
          current: count,
          plan: planName,
          upgrade: true,
        });
      }

      // attach to req for controllers if needed
      req.plan = { name: planName, limits };

      next();
    } catch (err) {
      console.error("planLimiter error", err);
      res.status(500).json({ error: "Internal error" });
    }
  };
}

module.exports =  planLimiter ;