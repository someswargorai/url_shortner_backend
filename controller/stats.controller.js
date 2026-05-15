const modelSchema = require("../model.schema.js");

const getUrlStatsController = async (req, res) => {
    try {
        const { urlId } = req.params;
        const clickStateWithMinutes = await modelSchema.aggregate([
            {
                $unwind: {
                    path: "$countGraph"
                }
            },
            {
                $group: {
                    _id: {
                        $dateTrunc: {
                            date: "$countGraph.timestamp",
                            unit: "minute"
                        }
                    },
                    count: {
                        $sum: "$countGraph.count"
                    }
                }
            }
        ])
        const urlStats = await modelSchema.findOne({ _id: urlId });
        return res.status(200).send({ urlStats, clickStateWithMinutes });
    } catch (error) {
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    getUrlStatsController,
}