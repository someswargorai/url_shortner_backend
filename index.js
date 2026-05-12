const express = require("express");
const cors = require("cors");
const app = express();
const redis = require("./config/redis.config");
const mongo = require("./config/mongo.config");
const modelSchema = require("./model.schema");
const { model } = require("mongoose");
const shortBasesixtwocode = require("./utils/Base-six-two-converter.utils");
const userRouter = require("./route/user.router");
const urlRouter = require("./route/url.router");

app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  }),
);

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", () => {
  console.log("Redis disconnected");
});

(async () => {
  mongo();
})();

app.get("/", (req, res) => {
  res.status(200).send("Hello from URL shortner");
});

app.get("/get-url/:shortUrl", async(req, res) => {
  try {
    const { shortUrl } = req.params;
    // first check from redis
    const decodedUrl = decodeURIComponent(shortUrl);
    const isPresentOrNot = await redis.get(decodedUrl);
    // if not present in the cache
    if(isPresentOrNot === null){
        // find from DB
        const url = await modelSchema.findOne({ shortUrl: decodedUrl });
        if(url !== null){
            return res.status(301).redirect(url.longUrl)
        }else{
            return res.status(200).send({message:"No Such Url present in our system"})
        } 
    }else{
         return res.status(301).redirect(isPresentOrNot)
    }
  } catch (err) {
     return res.status(500).send({message:"We’re experiencing technical difficulties. Please retry after some time."})
  }
});

app.post("/url-short", async (req, res) => {
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
});

app.use("/auth", userRouter);
app.use("/url", urlRouter)

app.listen(3001, () => {
  console.log("URL shortner is listening on 3001 port");
});
