const express = require("express");
const {
  trackEventController,
  getProjectLogsController,
  getProjectAnalyticsController,
  getProjectAiChatController,
  getLogsTypesController,
  getProjectUserJourneysController,
} = require("../controller/event.controller");
const { userAuth } = require("../middleware/userAuth.middleware");
const rateLimit = require("../middleware/rateLimit.middleware");

const router = express.Router();
 
router.post("/track", rateLimit, trackEventController); 
router.get("/:projectId/logs", userAuth, rateLimit, getProjectLogsController);
router.get("/:projectId/filter-logs", userAuth, rateLimit, getLogsTypesController);
router.get("/:projectId/analytics", userAuth, rateLimit, getProjectAnalyticsController);
router.get("/:projectId/user-journeys", userAuth, rateLimit, getProjectUserJourneysController);
router.post("/:projectId/chat", userAuth, rateLimit, getProjectAiChatController);

module.exports = router;
