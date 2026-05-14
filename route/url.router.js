const express = require("express");

const { userAuth } = require("../middleware/userAuth.middleware.js");
const { urlShortController } = require("../controller/url-controller.js");
const { getUrlAnalyticsController } = require("../controller/url-analytics.controller.js");
const { getUrlStatsController } = require("../controller/stats.controller.js");

const router = express.Router();

router.post("/shorten-url", userAuth, urlShortController);
router.get("/analytics", userAuth, getUrlAnalyticsController);
router.get("/stats/:urlId", userAuth, getUrlStatsController);

module.exports = router;
