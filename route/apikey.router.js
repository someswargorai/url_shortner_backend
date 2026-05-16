const express = require("express");
const { userAuth } = require("../middleware/userAuth.middleware.js");
const { createApiKey, getApiKeys, deleteApiKey } = require("../controller/apikey.controller.js");

const router = express.Router();

router.post("/", userAuth, createApiKey);
router.get("/", userAuth, getApiKeys);
router.delete("/:key", userAuth, deleteApiKey);

module.exports = router;
