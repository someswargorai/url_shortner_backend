const model = require("../config/ai.config.js");
const modelSchema = require("../model.schema.js");
const campaignSchema = require("../model/campaign.schema.js");
const clickSchema = require("../model/click.schema.js");

module.exports.aiChatController = async (req, res) => {
    try {
        const { messages } = req.body; // Expecting an array of { role: "user" | "model", parts: [{ text: "..." }] }
        const userId = req.user.id;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ message: "Messages array is required" });
        }

        // Gather context
        const userUrls = await modelSchema.find({ userId }).select("_id shortUrl longUrl customUrl createdAt private").lean();
        const urlIds = userUrls.map(u => u._id);
        const campaigns = await campaignSchema.find({ userId }).lean();
        
        // Fetch recent clicks (up to 2000 to keep context window manageable but informative)
        const recentClicks = await clickSchema.find({ urlId: { $in: urlIds } })
            .sort({ timestamp: -1 })
            .limit(2000)
            .select("urlId campaignId ip location device browser os referrer timestamp")
            .lean();

        const contextPrompt = `
You are an expert AI assistant for a URL Shortener and Campaign Management platform.
Your job is to answer the user's questions about their links, campaigns, and traffic patterns.

--- CONTEXT DATA ---
URLs:
${JSON.stringify(userUrls.map(u => ({ id: u._id, shortUrl: u.shortUrl, longUrl: u.longUrl, private: u.private, createdAt: u.createdAt })))}

Campaigns:
${JSON.stringify(campaigns.map(c => ({ id: c._id, name: c.name, isDefault: c.isDefault })))}

Recent Clicks (up to last 2000):
${JSON.stringify(recentClicks.map(c => ({
    urlId: c.urlId,
    campaignId: c.campaignId,
    location: c.location,
    device: c.device,
    browser: c.browser,
    os: c.os,
    referrer: c.referrer,
    timestamp: c.timestamp
})))}
--- END CONTEXT DATA ---

Instructions:
1. Analyze the context data to answer the user's questions accurately.
2. If asked about spikes, group the clicks by time (e.g., hours or days) and referrer (e.g., WhatsApp, Facebook) to identify trends.
3. Be conversational, helpful, and concise. Format your answers with Markdown for readability (use bolding, bullet points).
4. Do NOT hallucinate data. If you don't see the data to answer a specific question, tell the user that the data isn't available or there are no clicks matching their criteria.
`;

        // Start chat
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "Please use the following context for our conversation: " + contextPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood! I'll use this data to help the user." }],
                },
                ...messages.slice(0, -1) // All previous messages except the latest one
            ],
        });

        const latestMessage = messages[messages.length - 1].parts[0].text;
        const result = await chat.sendMessage(latestMessage);
        const responseText = result.response.text();

        return res.status(200).json({ reply: responseText });

    } catch (error) {
        console.error("AI Chat Error:", error);
        return res.status(500).json({ message: "Internal server error during AI chat", error: error.message });
    }
};
