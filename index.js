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
const { userAuth } = require("./middleware/userAuth.middleware");
const { userAuthforGetUrl } = require("./middleware/userAuthforGetUrl.middleware");
const UAParser = require("ua-parser-js");
const axios = require("axios");

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

app.get("/get-url/:shortUrl", userAuthforGetUrl, async (req, res) => {
  try {
    const { shortUrl } = req.params;

    // get the details of the user agent
    const ua = req.headers['user-agent'];
    const parsed = UAParser(ua);

    const referrer = req.headers.referer || "Direct";

    const deviceType = parsed.device.type || "Desktop";
    const browserName = parsed.browser.name || "Unknown Browser";
    const osName = parsed.os.name || "Unknown OS";
    const osVersion = parsed.os.version || "";
    const fullOs = osName === "Unknown OS" ? "Unknown" : `${osName} ${osVersion}`.trim();

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
    const lookupIp = (ip === "::1" || ip === "127.0.0.1") ? "8.8.8.8" : ip;
    let locationStr = "Unknown Location";

    try {
      const geoResponse = await axios.get(`http://ip-api.com/json/${lookupIp}`);
      if (geoResponse.data.status === "success") {
        locationStr = `${geoResponse.data.city}, ${geoResponse.data.regionName}, ${geoResponse.data.country}`;
      }
    } catch (e) {
      console.log("Geo error", e.message);
    }


    // first check from redis
    const decodedUrl = decodeURIComponent(shortUrl);
    const isPresentOrNot = await redis.get(decodedUrl);
    // if not present in the cache
    if (isPresentOrNot === null) {
      // find from DB
      const url = await modelSchema.findOne({ shortUrl: decodedUrl });
      if (url !== null) {
        // update the count of the url
        await modelSchema.updateOne(
          {
            shortUrl: decodedUrl
          },
          {

            $push: {
              userIps: ip,
              location: locationStr,
              devices: deviceType,
              browsers: browserName,
              os: fullOs,
              referrer: referrer,
              countGraph: {
                  count: 1
              },
            }
          }
        )
        return res.status(301).redirect(url.longUrl)
      } else {
        return res.status(200).send({ message: "No Such Url present in our system" })
      }
    } else {
      await modelSchema.updateOne(
        {
          shortUrl: decodedUrl
        },
        {

          $push: {
            userIps: ip,
            location: locationStr,
            devices: deviceType,
            browsers: browserName,
            os: fullOs,
            referrer: referrer,
            countGraph: {
              count: 1
            },
          }
        }
      )
      return res.status(301).redirect(isPresentOrNot)
    }
  } catch (err) {
    return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." })
  }
});

app.post("/url-short", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(200).send("No Url has given to short");
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
    const cacheKey = `guest:${ip}:${url}`;
    let uniqueId;
    const getTheCacheUrl = await redis.get(cacheKey);

    if (getTheCacheUrl === null) {
      const findURL = await modelSchema.findOne({ longUrl: url, guestId: ip });

      if (findURL !== null) {
        return res.status(200).send({ url: findURL.shortUrl });
      } else {
        uniqueId = await redis.incr("url_sequence");
        const newUrl = new modelSchema({
          longUrl: url,
          guestId: ip,
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
        guestId: ip
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
});

app.use("/auth", userRouter);
app.use("/url", urlRouter)

app.listen(3001, () => {
  console.log("URL shortner is listening on 3001 port");
});
