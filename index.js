const express = require("express");
const cors = require("cors");
const app = express();
const redis = require("./config/redis.config");
const mongo = require("./config/mongo.config");
const modelSchema = require("./model.schema");
const clickSchema = require("./model/click.schema");
const shortBasesixtwocode = require("./utils/Base-six-two-converter.utils");
const userRouter = require("./route/user.router");
const urlRouter = require("./route/url.router");
const shortUrlSdkRouter = require("./route/shortUrlSdkRouter");
const { userAuthforGetUrl } = require("./middleware/userAuthforGetUrl.middleware");
const UAParser = require("ua-parser-js");
const axios = require("axios");
const cron = require("node-cron");
const webhookRouter = require("./route/webhook.router")



app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
  }),
);

app.use("/webhooks", webhookRouter);
app.use(express.json());

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
    
    // Check if custom domain was passed in query
    const requestDomain = req.query.domain;
    let cleanDomain = "";
    if (requestDomain) {
      cleanDomain = requestDomain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "").toLowerCase();
    }
    
    const cacheKey = cleanDomain ? `${cleanDomain}:${decodedUrl}` : decodedUrl;
    const isPresentOrNot = await redis.get(cacheKey);

    // if not present in the cache
    if (isPresentOrNot === null) {
      let query = { shortUrl: decodedUrl };
      
      if (cleanDomain) {
        const Domain = require("./model/domain.schema");
        const domainRecord = await Domain.findOne({ domain: cleanDomain, isValid: true });
        if (domainRecord) {
          query.userId = domainRecord.userId;
        }
      }

      // find from DB
      const url = await modelSchema.findOne(query);

      if (!url) {
        return res.status(200).send({ message: "No Such Url present in our system" })
      }

      if (url.private) {
        return res.status(200).send({ message: "No Such Url present in our system" })
      }

      // Add back to redis for future requests
      await redis.set(cacheKey, url.longUrl, "EX", 86400);

      // update the count of the url
      await modelSchema.updateOne(
          {
            _id: url._id
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
        
        const newClick = new clickSchema({
          urlId: url._id,
          campaignId: url.campaignId,
          ip: ip,
          location: locationStr,
          device: deviceType,
          browser: browserName,
          os: fullOs,
          referrer: referrer
        });
        await newClick.save();

        return res.status(301).redirect(url.longUrl)

    } else {
      let query = { shortUrl: decodedUrl };
      
      if (cleanDomain) {
        const Domain = require("./model/domain.schema");
        const domainRecord = await Domain.findOne({ domain: cleanDomain, isValid: true });
        if (domainRecord) {
          query.userId = domainRecord.userId;
        }
      }

      const url = await modelSchema.findOne(query);

      if (url && url.private) {
        return res.status(200).send({ message: "No Such Url present in our system" })
      }

      if (url) {
        await modelSchema.updateOne(
          {
            _id: url._id
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
        
        const newClick = new clickSchema({
          urlId: url._id,
          campaignId: url.campaignId,
          ip: ip,
          location: locationStr,
          device: deviceType,
          browser: browserName,
          os: fullOs,
          referrer: referrer
        });
        await newClick.save();
      }

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

const apikeyRouter = require("./route/apikey.router");
const campaignRouter = require("./route/campaign.router");
const projectRouter = require("./route/project.router");
const eventRouter = require("./route/event.router");
const domainRouter = require("./route/domain.router");

app.use("/auth", userRouter);
app.use("/url", urlRouter);
app.use("/api/v1", shortUrlSdkRouter);
app.use("/apikey", apikeyRouter);
app.use("/campaign", campaignRouter);
app.use("/project", projectRouter);
app.use("/event", eventRouter);
app.use("/domain", domainRouter);

const Project = require("./model/project.schema");
const User = require("./model/user.schema");
const mailSender = require("./utils/mailSender.utils");
const { getProjectAnalyticsData } = require("./utils/analyticsData.utils");
const { generateWeeklyReportHtml } = require("./utils/weeklyReportEmail.utils");

cron.schedule("0 9 * * 0", async () => {
  try {
    console.log("[Cron] Starting weekly analytics report generation...");
    
    const users = await User.find({});
    
    for (const user of users) {
      if (!user.email) continue;
      
      try {
        const latestProject = await Project.findOne({ userId: user._id }).sort({ createdAt: -1 });
        
        if (!latestProject) continue;
        
        const analytics = await getProjectAnalyticsData(latestProject);
        const htmlContent = generateWeeklyReportHtml(latestProject, analytics);
        
        await mailSender(
          user.email,
          `Weekly Analytics Report - ${latestProject.name}`,
          "Your weekly report is here.",
          htmlContent
        );
      } catch (err) {
        console.error(`[Cron] Error generating report for user ${user._id}:`, err);
      }
    }
    
    console.log("[Cron] Finished sending weekly analytics reports.");
  } catch (error) {
    console.error("[Cron] Error in weekly analytics cron job:", error);
  }
});

app.listen(3001, () => {
  console.log("URL shortner is listening on 3001 port");
});
