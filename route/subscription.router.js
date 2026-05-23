const express = require("express");
const {
  getActiveSubscription,
  getAllSubscriptions,
  customerPortal,
} = require("../controller/subscription.controller");
const { userAuth } = require("../middleware/userAuth.middleware");
const rateLimit = require("../middleware/rateLimit.middleware");
const router = express.Router();

router.get("/get-active-subscription", userAuth, rateLimit, getActiveSubscription);
router.get("/get-all-subscriptions", userAuth, rateLimit, getAllSubscriptions);
router.post("/customer-portal", userAuth, rateLimit, customerPortal);

module.exports = router;
