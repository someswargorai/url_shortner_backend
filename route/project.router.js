const express = require("express");
const {
    createProjectController,
    getProjectsController,
    getProjectByIdController
} = require("../controller/project.controller");
const { userAuth } = require("../middleware/userAuth.middleware");

const router = express.Router();

router.post("/", userAuth, createProjectController);
router.get("/", userAuth, getProjectsController);
router.get("/:projectId", userAuth, getProjectByIdController);

module.exports = router;
