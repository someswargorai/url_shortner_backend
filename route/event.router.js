const express = require("express");
const {
    trackEventController,
    getProjectLogsController,
    getProjectAnalyticsController,
    getProjectAiChatController,
    getProjectUserJourneysController
} = require("../controller/event.controller");
const { userAuth } = require("../middleware/userAuth.middleware");

const router = express.Router();
 
router.post("/track", trackEventController);
router.get("/:projectId/logs", userAuth, getProjectLogsController);
router.get("/:projectId/analytics", userAuth, getProjectAnalyticsController);
router.get("/:projectId/user-journeys", userAuth, getProjectUserJourneysController);
router.post("/:projectId/chat", userAuth, getProjectAiChatController);

module.exports = router;
