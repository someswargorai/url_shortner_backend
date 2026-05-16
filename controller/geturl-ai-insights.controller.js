const redis = require("../config/redis.config.js");
const model = require("../config/ai.config.js");
const modelSchema = require("../model.schema.js");


module.exports.getUrlAiInsightsController = async (req, res) => {
    try {
        const { urlId } = req.params;
        const url = await modelSchema.findById(urlId);
        if (!url) {
            return res.status(404).json({ message: "Url not found" });
        }

        const prompt = `
                You are an expert growth analyst and data scientist for a URL shortener analytics platform.

                You are given raw analytics data of a short URL. Your job is NOT just to summarize it, but to generate **deep, actionable, and insightful intelligence** that a product owner or marketer can use immediately.

                ---

                ## GOAL
                Convert raw click analytics into:
                - Growth insights
                - User behavior patterns
                - Marketing recommendations
                - Anomaly detection
                - Engagement quality analysis

                ---

                ## DATA
                Short URL: ${url.shortUrl}
                Long URL: ${url.longUrl}

                Total Clicks: ${url.countGraph.length}

                User IPs: ${JSON.stringify(url.userIps)}
                Locations: ${JSON.stringify(url.location)}
                Devices: ${JSON.stringify(url.devices)}
                Browsers: ${JSON.stringify(url.browsers)}
                OS: ${JSON.stringify(url.os)}
                Referrers: ${JSON.stringify(url.referrer)}

                Created At: ${url.createdAt}
                Updated At: ${url.updatedAt}

                ---

                ## WHAT YOU MUST ANALYZE

                ### 1. Traffic Pattern Intelligence
                - Identify peak engagement time patterns (hour/day behavior if possible)
                - Detect whether traffic is stable, spiky, or declining
                - Identify unusual spikes or drops

                ### 2. Audience Behavior Insights
                - Who is the main audience likely to be?
                - Device dominance (mobile vs desktop usage insight)
                - Browser/OS preferences and what it implies

                ### 3. Geographic Intelligence
                - Top regions/countries (if available)
                - Unexpected or suspicious traffic locations

                ### 4. Referral Intelligence
                - Which sources drive the most traffic?
                - Is traffic organic, social, direct, or bot-like?

                ### 5. Conversion Quality (Inference)
                - Is traffic high-quality or low-quality?
                - Are users likely engaged or just random clicks?

                ### 6. Growth Recommendations (VERY IMPORTANT)
                Give 3–5 actionable suggestions like:
                - Best time to share this link
                - Platforms to focus on
                - Improvements to increase CTR
                - Audience targeting ideas

                ### 7. Anomaly Detection
                - Detect suspicious behavior (bot traffic, spam clicks, unusual geo/device mismatch)

                ---

                ## OUTPUT FORMAT (STRICT JSON)

                Return ONLY valid JSON:

                {
                "summary": "",
                "traffic_pattern": "",
                "audience_insights": "",
                "geo_insights": "",
                "referrer_insights": "",
                "anomalies": "",
                "growth_recommendations": [
                    "",
                    "",
                    ""
                ],
                "interesting_insight": ""
                }

                ---

                Make the insights feel like they come from a premium SaaS analytics product like Mixpanel or Amplitude.
                Be concise but extremely valuable.
                `;

        const cachedAi = await redis.get(`ai-insights:${urlId}`);
        if(cachedAi) {
            return res.status(200).json({ aiText: cachedAi, message: "Using Cached Insights" });
        }
        const aiResponse = await model.generateContent(prompt);
        const aiText = aiResponse.response.text();
        await redis.set(`ai-insights:${urlId}`, aiText, "EX", 3600); 
        return res.status(200).json({ aiText, message: "AI Generated Data" });


    } catch (error) {
        return res.status(500).json({ message: "Error fetching AI insights", error });
    }
}   