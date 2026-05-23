const webhook = require("../controller/webhook.controller");

const express = require("express");
const { userAuth } = require("../middleware/userAuth.middleware");
const router = express.Router();


router.post("/polar", express.raw({ type: "application/json" }), userAuth, webhook);

module.exports=router;