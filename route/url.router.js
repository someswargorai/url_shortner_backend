const express = require("express");

const { userAuth } = require("../middleware/userAuth.middleware.js");
const { urlShortController } = require("../controller/url-controller.js");
const { getUrlAnalyticsController } = require("../controller/url-analytics.controller.js");
const { getUrlStatsController } = require("../controller/stats.controller.js");
const { getUrlAiInsightsController } = require("../controller/geturl-ai-insights.controller.js");
const { updateUrlController } = require("../controller/update-url.controller.js");
const { aiChatController } = require("../controller/ai-chat.controller.js");

const router = express.Router();

router.post("/shorten-url", userAuth, urlShortController);
router.get("/analytics", userAuth, getUrlAnalyticsController);
router.get("/stats/:urlId", userAuth, getUrlStatsController);
router.get("/ai-insights/:urlId", userAuth, getUrlAiInsightsController);
router.patch("/update-url/:urlId", userAuth, updateUrlController);
router.post("/ai-chat", userAuth, aiChatController);

module.exports = router;
