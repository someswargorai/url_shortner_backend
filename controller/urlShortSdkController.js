const redis = require("../config/redis.config");
const modelSchema = require("../model.schema");
const userSchema = require("../model/user.schema");
const campaignSchema = require("../model/campaign.schema");
const shortBasesixtwocode = require("../utils/Base-six-two-converter.utils");

const urlShortSdkController = async (req, res) => {
    try {
        const { url, campaignId } = req.body;
        if (!url) {
            return res.status(200).send("No Url has given to short");
        }

        let actualCampaignId = campaignId;
        if (!actualCampaignId) {
            let defaultCampaign = await campaignSchema.findOne({ userId: req.user.id, isDefault: true });
            if (!defaultCampaign) {
                defaultCampaign = new campaignSchema({
                    name: "Default Campaign",
                    description: "Auto-generated default campaign",
                    userId: req.user.id,
                    isDefault: true
                });
                await defaultCampaign.save();
            }
            actualCampaignId = defaultCampaign._id;
        }

        let uniqueId;
        const cacheKey = `url:${req.user.id}:${url}:${actualCampaignId}`;
        const getTheCacheUrl = await redis.get(cacheKey);

        if (getTheCacheUrl === null) {
            const findURL = await modelSchema.findOne({ longUrl: url, userId: req.user.id, campaignId: actualCampaignId });

            if (findURL) {
                return res.status(200).send({ url: findURL.shortUrl });
            } else {
                uniqueId = await redis.incr("url_sequence");
                const newUrl = new modelSchema({
                    longUrl: url,
                    userId: req.user.id,
                    campaignId: actualCampaignId,
                    seqId: uniqueId
                });
                await newUrl.save();
            }
        } else {
            return res
                .status(200)
                .send({ url: getTheCacheUrl, message: "Get from cache" });
        }

        const shortBasesixtwocodeOutput = shortBasesixtwocode.shortBasesixtwocode(
            uniqueId,
        );

        const constructShortUrl = shortBasesixtwocodeOutput;
        await redis.set(cacheKey, constructShortUrl, "EX", 86400);
        await redis.set(constructShortUrl, url, "EX", 86400);

        await modelSchema.updateOne(
            {
                longUrl: url,
                userId: req.user.id,
                campaignId: actualCampaignId
            },
            {
                $set: {
                    shortUrl: constructShortUrl,
                },
            }
        );

        return res.status(200).send({ url: `${process.env.frontend_url}/${constructShortUrl}` });
    } catch (err) {
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    urlShortSdkController,
}