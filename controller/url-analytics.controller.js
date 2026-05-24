const modelSchema = require("../model.schema.js");

const getUrlAnalyticsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    
    const total = await modelSchema.countDocuments({ userId });

    if (total === 0) {
      return res.status(200).send({
        success: true,
        message: "You have no url shortened yet",
      });
    }

    const totalPages = Math.ceil(total / limit);

    
    const urls = await modelSchema
      .find({ userId })
      .select("seqId longUrl createdAt countGraph shortUrl")
      .sort({ createdAt: -1 }) // newest first
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).send({
      success: true,
      urls,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      success: false,
      message:
        "We're experiencing technical difficulties. Please retry after some time.",
    });
  }
};

module.exports = {
    getUrlAnalyticsController,
}