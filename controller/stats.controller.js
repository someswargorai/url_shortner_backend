const mongoose = require("mongoose");
const modelSchema = require("../model.schema.js");
const redis = require("../config/redis.config.js");

const getUrlStatsController = async (req, res) => {
  try {
    const { urlId } = req.params;
    const urlStatscacheKey = `${req.user.id}:${urlId}:urlStats`;
    const clickStateWithMinutesKey = `${req.user.id}:${urlId}:clickStateWithMinutes`;

    if (
      (await redis.exists(urlStatscacheKey)) &&
      (await redis.exists(clickStateWithMinutesKey))
    ) {
      return res.status(200).json({
        success: true,
        urlStats: JSON.parse(await redis.get(urlStatscacheKey)),
        clickStateWithMinutes: JSON.parse(
          await redis.get(clickStateWithMinutesKey),
        ),
        message: "Using Cached Analytics",
      });
    }

    const clickStateWithMinutes = await modelSchema.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(urlId),
          userId: new mongoose.Types.ObjectId(req.user.id),
        },
      },
      {
        $unwind: "$countGraph",
      },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: "$countGraph.timestamp",
              unit: "minute",
            },
          },
          count: {
            $sum: "$countGraph.count",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const urlStats = await modelSchema.findOne({
      _id: new mongoose.Types.ObjectId(urlId),
      userId: new mongoose.Types.ObjectId(req.user.id),
    });

    if (!urlStats) {
      return res.status(404).send({ message: "URL not found" });
    }

    await redis.set(urlStatscacheKey, JSON.stringify(urlStats), "EX", 300); // Cache for 5 minutes
    await redis.set(
      clickStateWithMinutesKey,
      JSON.stringify(clickStateWithMinutes),
      "EX",
      300
    ); // Cache for 5 minutes
    return res.status(200).send({ urlStats, clickStateWithMinutes });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .send({
        message:
          "We’re experiencing technical difficulties. Please retry after some time.",
      });
  }
};

module.exports = {
  getUrlStatsController,
};
