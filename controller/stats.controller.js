const mongoose = require("mongoose");
const modelSchema = require("../model.schema.js");

const getUrlStatsController = async (req, res) => {
    try {
        const { urlId } = req.params;
        const clickStateWithMinutes = await modelSchema.aggregate([
            {
                $match: {
                    shortUrl: new mongoose.Types.ObjectId(urlId),
                    userId: new mongoose.Types.ObjectId(req.user.id)
                } 
            },
            {
                $unwind: "$countGraph"
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
            },
            {
                $sort: {
                    "_id": 1
                }
            }
        ]);

        const urlStats = await modelSchema.findOne({ shortUrl: urlId, userId: req.user.id });

        if (!urlStats) {
            return res.status(404).send({ message: "URL not found" });
        }

        return res.status(200).send({ urlStats, clickStateWithMinutes });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    getUrlStatsController,
}