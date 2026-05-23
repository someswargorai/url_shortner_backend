const express = require("express");
const {
  getActiveSubscription,
  getAllSubscriptions,
  customerPortal,
} = require("../controller/subscription.controller");
const { userAuth } = require("../middleware/userAuth.middleware");
const router = express.Router();

router.get("/get-active-subscription", userAuth, getActiveSubscription);
router.get("/get-all-subscriptions", userAuth, getAllSubscriptions);
router.post("/customer-portal", userAuth, customerPortal);

module.exports = router;
