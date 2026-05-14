const modelSchema = require("../model.schema.js");
 
const getUrlStatsController = async (req, res) => {
    try {
        const { urlId } = req.params;
        const urlStats = await modelSchema.findOne({ _id: urlId });
        return res.status(200).send({ urlStats });
    } catch (error) {
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    getUrlStatsController,
}