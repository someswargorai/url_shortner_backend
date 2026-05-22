const webhook = require("../controller/webhook.controller");

const express = require("express");
const router = express.Router();


router.post("/polar", express.raw({ type: "application/json" }), webhook);

module.exports=router;