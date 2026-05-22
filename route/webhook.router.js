const webhook = require("../controller/webhook.controller");

const express = require("express");
const router = express.Router();


router.post("/polar", webhook);

module.exports=router;