const modelSchema = require("../model.schema");
const redis = require("../config/redis.config");
const shortBasesixtwocode = require("../utils/Base-six-two-converter.utils");

const urlShortController = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(200).send("No Url has given to short");
        }

        let uniqueId;
        const cacheKey = `url:${req.user.id}:${url}`;
        const getTheCacheUrl = await redis.get(cacheKey);

        if (getTheCacheUrl === null) {
            const findURL = await modelSchema.findOne({ longUrl: url, userId: req.user.id });

            if (findURL) {
                return res.status(200).send({ url: findURL.shortUrl });
            } else {
                uniqueId = await redis.incr("url_sequence");
                const newUrl = new modelSchema({
                    longUrl: url,
                    userId: req.user.id,
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
                userId: req.user.id
            },
            {
                $set: {
                    shortUrl: constructShortUrl,
                },
            }
        );

        return res.status(200).send({ url: constructShortUrl });
    } catch (err) {
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    urlShortController,
}