const campaignSchema = require("../model/campaign.schema");
const clickSchema = require("../model/click.schema");
const redis = require("../config/redis.config");
const model = require("../config/ai.config");

const createCampaignController = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Campaign name is required" });
        }

        const newCampaign = new campaignSchema({
            name,
            description,
            userId: req.user.id,
            isDefault: false
        });

        await newCampaign.save();
        return res.status(201).json({ success: true, campaign: newCampaign });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error creating campaign", error });
    }
};

const getCampaignsController = async (req, res) => {
    try {
        // Ensure default campaign exists
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

        const campaigns = await campaignSchema.find({ userId: req.user.id }).lean().sort({ createdAt: -1 });

        const campaignIds = campaigns.map(c => c._id);
        const clicksAgg = await clickSchema.aggregate([
            { $match: { campaignId: { $in: campaignIds } } },
            { $group: { _id: "$campaignId", totalClicks: { $sum: 1 } } }
        ]);

        const clickMap = {};
        clicksAgg.forEach(c => {
            clickMap[c._id.toString()] = c.totalClicks;
        });

        const campaignsWithStats = campaigns.map(c => ({
            ...c,
            totalClicks: clickMap[c._id.toString()] || 0
        }));

        return res.status(200).json({ success: true, campaigns: campaignsWithStats });
    } catch (error) {
        console.error("GET CAMPAIGNS ERROR: ", error);
        return res.status(500).json({ success: false, message: "Error fetching campaigns", error: error.message });
    }
};

const getCampaignAnalyticsController = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaign = await campaignSchema.findById(campaignId);
        if (!campaign || campaign.userId.toString() !== req.user.id.toString()) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }

        const clicks = await clickSchema.find({ campaignId });

        const countGraph = clicks.map(c => ({ count: 1, _id: c.timestamp }));
        const location = clicks.map(c => c.location).filter(Boolean);
        const devices = clicks.map(c => c.device).filter(Boolean);
        const browsers = clicks.map(c => c.browser).filter(Boolean);
        const os = clicks.map(c => c.os).filter(Boolean);
        const referrer = clicks.map(c => c.referrer).filter(Boolean);

        return res.status(200).json({
            success: true,
            analytics: {
                campaign,
                totalClicks: clicks.length,
                countGraph,
                location,
                devices,
                browsers,
                os,
                referrer
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching campaign analytics", error });
    }
};

const getCampaignAiInsightsController = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaign = await campaignSchema.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const clicks = await clickSchema.find({ campaignId });

        const prompt = `
                You are an expert growth analyst and data scientist for a URL shortener analytics platform.

                You are given raw analytics data of a MARKETING CAMPAIGN. 
                Your job is to generate **deep, actionable, and insightful intelligence** about how this overall campaign performed.

                ---

                ## DATA
                Campaign Name: ${campaign.name}
                Campaign Description: ${campaign.description}

                Total Clicks across all links: ${clicks.length}

                Locations: ${JSON.stringify(clicks.map(c => c.location).filter(Boolean))}
                Devices: ${JSON.stringify(clicks.map(c => c.device).filter(Boolean))}
                Browsers: ${JSON.stringify(clicks.map(c => c.browser).filter(Boolean))}
                OS: ${JSON.stringify(clicks.map(c => c.os).filter(Boolean))}
                Referrers: ${JSON.stringify(clicks.map(c => c.referrer).filter(Boolean))}

                ---

                ## WHAT YOU MUST ANALYZE

                ### 1. Traffic Pattern Intelligence
                - Identify peak engagement patterns for the campaign.
                - How is the traffic behaving?

                ### 2. Audience Behavior Insights
                - Device dominance (mobile vs desktop usage insight)
                - Browser/OS preferences and what it implies

                ### 3. Geographic Intelligence
                - Top regions/countries
                - Unexpected or suspicious traffic locations

                ### 4. Referral Intelligence
                - Which sources drive the most traffic for this campaign? (e.g. Instagram vs Email)

                ### 5. Conversion Quality (Inference)
                - Is traffic high-quality or low-quality?

                ### 6. Growth Recommendations
                Give 3–5 actionable suggestions like:
                - Platforms to focus on for this campaign
                - Improvements to increase overall CTR
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
                `;

        const cachedAi = await redis.get(`ai-insights-campaign:${campaignId}`);
        if(cachedAi) {
            return res.status(200).json({ aiText: cachedAi, message: "Using Cached Insights" });
        }
        const aiResponse = await model.generateContent(prompt);
        const aiText = aiResponse.response.text();
        await redis.set(`ai-insights-campaign:${campaignId}`, aiText, "EX", 3600);
        return res.status(200).json({ aiText, message: "AI Generated Data" });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching AI insights", error });
    }
};

module.exports = {
    createCampaignController,
    getCampaignsController,
    getCampaignAnalyticsController,
    getCampaignAiInsightsController
};
