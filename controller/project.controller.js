const Project = require("../model/project.schema");
const crypto = require("crypto");

// Create a new project
const createProjectController = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Project name is required." });
        }

        const projectApiKey = "pk_" + crypto.randomBytes(24).toString("hex");

        const newProject = await Project.create({
            name,
            description,
            projectApiKey,
            userId: req.user.id
        });

        return res.status(201).json({ success: true, project: newProject });
    } catch (error) {
        console.error("Error creating project:", error);
        return res.status(500).json({ success: false, message: "Error creating project", error: error.message });
    }
};

// Get all projects for the user
const getProjectsController = async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, projects });
    } catch (error) {
        console.error("Error fetching projects:", error);
        return res.status(500).json({ success: false, message: "Error fetching projects", error: error.message });
    }
};

// Get a specific project
const getProjectByIdController = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findOne({ _id: projectId, userId: req.user.id });
        
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found." });
        }

        return res.status(200).json({ success: true, project });
    } catch (error) {
        console.error("Error fetching project:", error);
        return res.status(500).json({ success: false, message: "Error fetching project", error: error.message });
    }
};

module.exports = {
    createProjectController,
    getProjectsController,
    getProjectByIdController
};
