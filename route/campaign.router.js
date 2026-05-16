const express = require("express");
const { userAuth } = require("../middleware/userAuth.middleware");
const {
  createCampaignController,
  getCampaignsController,
  getCampaignAnalyticsController,
  getCampaignAiInsightsController,
} = require("../controller/campaign.controller");

const router = express.Router();

router.post("/", userAuth, createCampaignController);
router.get("/", userAuth, getCampaignsController);
router.get("/:campaignId/analytics", userAuth, getCampaignAnalyticsController);
router.get("/:campaignId/ai-insights", userAuth, getCampaignAiInsightsController);

module.exports = router;
