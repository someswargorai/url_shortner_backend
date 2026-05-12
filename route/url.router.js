const express = require("express");

const { userAuth } = require("../middleware/userAuth.middleware");
const { urlShortController } = require("../controller/url-controller");
const router = express.Router();

router.post("/shorten-url", userAuth, urlShortController);

module.exports = router;
