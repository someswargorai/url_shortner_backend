const userSchema = require("../model/user.schema.js");
const crypto = require("crypto");

const createApiKey = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).send({ message: "Key name is required" });
        }

        const userId = req.user.id;
        
        // Generate a random 32-byte hex string for the API key
        // Prefix with 'sk-live-' to match the UI style
        const rawKey = crypto.randomBytes(32).toString('hex');
        const newKeyString = `sk-live-${rawKey}`;

        const newApiKey = {
            name,
            key: newKeyString,
            createdAt: new Date(),
            lastUsed: null,
            status: "active",
            plan: "Pro"
        };

        await userSchema.findByIdAndUpdate(userId, {
            $push: { apiKeys: newApiKey }
        });

        return res.status(201).send({
            message: "API key created successfully",
            apiKey: newApiKey
        });

    } catch (error) {
        console.error("Create API Key Error:", error);
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
};

const getApiKeys = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userSchema.findById(userId).select('apiKeys');
        
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        return res.status(200).send({
            apiKeys: user.apiKeys || []
        });

    } catch (error) {
        console.error("Get API Keys Error:", error);
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
};

const deleteApiKey = async (req, res) => {
    try {
        const { key } = req.params;
        const userId = req.user.id;

        await userSchema.findByIdAndUpdate(userId, {
            $pull: { apiKeys: { key: key } }
        });

        return res.status(200).send({
            message: "API key deleted successfully"
        });

    } catch (error) {
        console.error("Delete API Key Error:", error);
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
};

module.exports = {
    createApiKey,
    getApiKeys,
    deleteApiKey
};
