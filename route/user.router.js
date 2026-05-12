const express = require("express");
const { authController } = require("../controller/login-controller");
const router = express.Router();

router.post("/login", authController);

module.exports = router;
