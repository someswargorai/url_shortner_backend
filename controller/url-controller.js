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
        const getTheCacheUrl = await redis.get(url);

        if (getTheCacheUrl === null) {
            const findURL = await modelSchema.findOne({ longUrl: url });

            if (findURL !== null) {
                return res.status(200).send({ url: findURL.shortUrl });
            } else {
                const newUrl = new modelSchema({
                    longUrl: url,
                });
                uniqueId = newUrl.seqId;
                newUrl.save();
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
        await redis.set(url, constructShortUrl, "EX", 86400);
        await redis.set(constructShortUrl, url, "EX", 86400);
        const result = await modelSchema.updateOne(
            {
                longUrl: url,
            },
            {
                $set: {
                    shortUrl: constructShortUrl,
                    userId: req.user.id,
                },
            },
            {
                new: true,
            },
        );

        return res.status(200).send({ url: constructShortUrl });
    } catch (err) {
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    urlShortController,
}