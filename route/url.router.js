const express = require("express");

const { userAuth } = require("../middleware/userAuth.middleware.js");
const { urlShortController } = require("../controller/url-controller.js");
const { getUrlAnalyticsController } = require("../controller/url-analytics.controller.js");
const { getUrlStatsController } = require("../controller/stats.controller.js");
const { getUrlAiInsightsController } = require("../controller/geturl-ai-insights.controller.js");
const { updateUrlController } = require("../controller/update-url.controller.js");
const { aiChatController } = require("../controller/ai-chat.controller.js");
const planLimiter = require("../middleware/subscritption.middleware.js");
const rateLimit = require("../middleware/rateLimit.middleware.js");
const airateLimit = require("../middleware/airateLimit.middleware.js");

const router = express.Router();

router.post("/shorten-url", userAuth, planLimiter("urls"),rateLimit, urlShortController);
router.get("/analytics", userAuth, rateLimit, getUrlAnalyticsController);
router.get("/stats/:urlId", userAuth, rateLimit, getUrlStatsController);
router.get("/ai-insights/:urlId", userAuth, airateLimit, getUrlAiInsightsController);
router.patch("/update-url/:urlId", userAuth, rateLimit, updateUrlController);
router.post("/ai-chat", userAuth,  airateLimit, aiChatController);

module.exports = router; 
