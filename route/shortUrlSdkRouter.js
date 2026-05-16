const express = require("express");

const { urlShortSdkController } = require("../controller/urlShortSdkController.js");
const { apiKeyAuth } = require("../middleware/apiKeyAuth.middleware");


const router = express.Router();

router.post("/shorten",  apiKeyAuth, urlShortSdkController);

module.exports = router;