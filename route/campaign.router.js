const express = require("express");
const { userAuth } = require("../middleware/userAuth.middleware");
const {
  createCampaignController,
  getCampaignsController,
  getCampaignAnalyticsController,
  getCampaignAiInsightsController,
} = require("../controller/campaign.controller");
const planLimiter = require("../middleware/subscritption.middleware");
const rateLimit = require("../middleware/rateLimit.middleware");
const airateLimit = require("../middleware/airateLimit.middleware");

const router = express.Router();

router.post("/", userAuth, planLimiter("campaigns"), rateLimit, createCampaignController);
router.get("/", userAuth, rateLimit, getCampaignsController);
router.get("/:campaignId/analytics", userAuth, rateLimit, getCampaignAnalyticsController);
router.get("/:campaignId/ai-insights", userAuth, airateLimit, getCampaignAiInsightsController);

module.exports = router;
