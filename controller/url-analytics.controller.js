const modelSchema = require("../model.schema.js");

const getUrlAnalyticsController = async (req, res) => {
    try {
    
        const url = await modelSchema.find({
            userId: req.user.id,
        });

        if (url.length === 0) {
            return res.status(200).send({ success: true, message: "You have no url shorted yet" });
        }

        return res.status(200).send({ success: true, url: url });
    } catch (err) {
        return res.status(500).send({ success: false, message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    getUrlAnalyticsController,
}