const express = require("express");
const { userAuth } = require("../middleware/userAuth.middleware.js");
const { createApiKey, getApiKeys, deleteApiKey } = require("../controller/apikey.controller.js");
const rateLimit = require("../middleware/rateLimit.middleware.js");

const router = express.Router();

router.post("/", userAuth, rateLimit, createApiKey);
router.get("/", userAuth, rateLimit, getApiKeys);
router.delete("/:key", userAuth, rateLimit, deleteApiKey);

module.exports = router;
