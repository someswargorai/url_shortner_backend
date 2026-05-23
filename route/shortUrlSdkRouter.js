const express = require("express");

const { urlShortSdkController } = require("../controller/urlShortSdkController.js");
const { apiKeyAuth } = require("../middleware/apiKeyAuth.middleware");
const planLimiter = require("../middleware/subscritption.middleware.js");
const rateLimit = require("../middleware/rateLimit.middleware.js");


const router = express.Router();

router.post("/shorten",  apiKeyAuth, planLimiter("urls"), rateLimit, urlShortSdkController);

module.exports = router;