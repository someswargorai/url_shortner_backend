const express = require("express");
const {
    createProjectController,
    getProjectsController,
    getProjectByIdController
} = require("../controller/project.controller");
const { userAuth } = require("../middleware/userAuth.middleware");
const planLimiter = require("../middleware/subscritption.middleware");
const rateLimit = require("../middleware/rateLimit.middleware");


const router = express.Router();

router.post("/", userAuth, planLimiter("projects"), rateLimit, createProjectController);
router.get("/", userAuth, rateLimit, getProjectsController);
router.get("/:projectId", userAuth, rateLimit, getProjectByIdController);

module.exports = router;
