const userSchema = require("../model/user.schema.js");

const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.headers.authorization?.split(" ")[1] || req.headers["api-key"];
        console.log("apiKey", apiKey);
        if (!apiKey) {
            return res.status(401).send({ message: "API key is required" });
        }
        const findUser = await userSchema.findOne({ "apiKeys.key": apiKey });
        if (!findUser) {
            return res.status(401).send({ message: "Invalid API key" });
        }
        req.user = findUser;
        await userSchema.updateOne(
            {
                "apiKeys.key": apiKey
            }, 
            {
                $set: {
                    "apiKeys.$.lastUsed": new Date(),
                }
            }
        );
        next();
    } catch (error) {
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    apiKeyAuth,
}
