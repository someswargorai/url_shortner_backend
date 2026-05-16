const modelSchema = require("../model.schema");
const redis = require("../config/redis.config");

const updateUrlController = async (req, res) => {
   try {
    const {urlId} = req.params;
    const {privacy} = req.body;
    const url = await modelSchema.findById(urlId);
    if (!url) {
        return res.status(404).json({ message: "Url not found" });
    }
    if(privacy){
        await redis.del(url.shortUrl);
    } else {
        await redis.set(url.shortUrl, url.longUrl, "EX", 86400);
    }
    url.private = privacy;
    await url.save(); 
    return res.status(200).json({ success: true, message: "Url updated successfully", url });
   }catch(e){
     res.status(500).send({ success: false, message: "Internal server error" });
   }
}

module.exports = { updateUrlController }