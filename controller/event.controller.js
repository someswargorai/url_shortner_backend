  const Event = require("../model/event.schema");
const Project = require("../model/project.schema");
const UAParser = require("ua-parser-js");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mailSender = require("../utils/mailSender.utils");

// Public Endpoint for SDK to track an event
const trackEventController = async (req, res) => {
    try {
        const projectApiKey = req.headers['x-project-key'] || req.body.projectKey;
        if (!projectApiKey) {
            return res.status(401).json({ success: false, message: "Missing Project API Key" });
        }

        const project = await Project.findOne({ projectApiKey }).populate("userId");
 
        if (!project) {
            return res.status(404).json({ success: false, message: "Invalid Project API Key" });
        }

        const { event, metadata, notification, userId, anonymousId } = req.body;
        if (!event) {
            return res.status(400).json({ success: false, message: "Event name is required" });
        }

        // --- ENRICHMENT LOGIC ---
        const ua = req.headers['user-agent'];
        const parsed = UAParser(ua);
        const deviceType = parsed.device.type || "desktop";
        const browserName = parsed.browser.name || "Unknown";
        const osName = parsed.os.name || "Unknown";

        const referrer = req.headers.referer || "Direct";

        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
        const lookupIp = (ip === "::1" || ip === "127.0.0.1") ? "8.8.8.8" : ip;
        
        let country = "Unknown";
        let city = "Unknown";
        let region = "Unknown";

        try {
            const geoResponse = await axios.get(`http://ip-api.com/json/${lookupIp}`);
            if (geoResponse.data.status === "success") {
                country = geoResponse.data.country || "Unknown";
                city = geoResponse.data.city || "Unknown";
                region = geoResponse.data.regionName || "Unknown";
            }
        } catch (geoError) {
            console.error("GeoIP lookup failed:", geoError.message);
        }

        const newEvent = await Event.create({
            projectId: project._id,
            eventName: event,
            notification: notification || false,
            metadata: metadata || {},
            userId: userId || null,
            anonymousId: anonymousId || null,
            device: {
                os: osName,
                browser: browserName,
                deviceType: deviceType
            },
            location: {
                country,
                city,
                region
            },
            source: {
                referrer
            },
            ip: lookupIp
        });

        
        if (notification && project.userId?.email) {
            // Helper to format metadata to beautiful HTML-colored JSON
            const formatMetadataHtml = (meta) => {
                if (!meta || Object.keys(meta).length === 0) {
                    return `<span style="color: #71717a; font-style: italic;">No metadata provided</span>`;
                }
                try {
                    const lines = JSON.stringify(meta, null, 2).split('\n');
                    return lines.map(line => {
                        let escaped = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        escaped = escaped.replace(/"([^"]+)":/g, '<span style="color: #a78bfa;">"$1"</span>:');
                        escaped = escaped.replace(/: "([^"]*)"/g, ': <span style="color: #34d399;">"$1"</span>');
                        escaped = escaped.replace(/: (true|false)/g, ': <span style="color: #f472b6; font-weight: bold;">$1</span>');
                        escaped = escaped.replace(/: ([0-9.-]+)/g, ': <span style="color: #fbbf24;">$1</span>');
                        return escaped;
                    }).join('\n');
                } catch (e) {
                    return JSON.stringify(meta);
                }
            };

            const metadataHtml = formatMetadataHtml(metadata);
            const formattedTime = new Date(newEvent.timestamp).toLocaleString("en-US", {
                timeZone: "UTC",
                dateStyle: "medium",
                timeStyle: "medium"
            }) + " UTC";

            const emailSubject = `🚀 Event "${event}" triggered in ${project.name}`;
            const emailText = `Event "${event}" triggered in project "${project.name}" at ${formattedTime}.\n\n` +
                              `User ID: ${userId || 'Anonymous'}\n` +
                              `Location: ${city}, ${region}, ${country}\n` +
                              `Device: ${deviceType} (${osName} / ${browserName})\n` +
                              `IP: ${lookupIp}\n\n` +
                              `Metadata:\n${JSON.stringify(metadata, null, 2)}`;

            const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${emailSubject}</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  background-color: #09090b;
                  color: #e4e4e7;
                  margin: 0;
                  padding: 0;
                  -webkit-font-smoothing: antialiased;
                }
                .container {
                  max-width: 600px;
                  margin: 40px auto;
                  background-color: #18181b;
                  border: 1px solid #27272a;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .header {
                  background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
                  padding: 30px 40px;
                  border-bottom: 1px solid #27272a;
                }
                .header-badge {
                  display: inline-block;
                  background: rgba(99, 102, 241, 0.15);
                  border: 1px solid rgba(99, 102, 241, 0.4);
                  color: #a5b4fc;
                  padding: 4px 10px;
                  font-size: 11px;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  font-weight: 600;
                  border-radius: 9999px;
                  margin-bottom: 12px;
                }
                .header-title {
                  font-size: 22px;
                  font-weight: 700;
                  margin: 0;
                  color: #ffffff;
                  letter-spacing: -0.02em;
                }
                .content {
                  padding: 25px 20px;
                }
                .intro-text {
                  font-size: 15px;
                  line-height: 1.6;
                  color: #a1a1aa;
                  margin-top: 0;
                  margin-bottom: 25px;
                }
                .intro-text strong {
                  color: #f4f4f5;
                }
                .details-grid {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 30px;
                  background: #09090b;
                  border: 1px solid #27272a;
                  border-radius: 8px;
                  overflow: hidden;
                }
                .details-row td {
                  padding: 12px 16px;
                  font-size: 13px;
                  border-bottom: 1px solid #18181b;
                }
                .details-row:last-child td {
                  border-bottom: none;
                }
                .label {
                  color: #71717a;
                  font-weight: 500;
                  width: 30%;
                }
                .value {
                  color: #e4e4e7;
                  font-weight: 600;
                }
                .meta-section {
                  margin-bottom: 30px;
                }
                .section-title {
                  font-size: 12px;
                  font-weight: 600;
                  text-transform: uppercase;
                  color: #71717a;
                  letter-spacing: 0.05em;
                  margin-bottom: 10px;
                  display: block;
                }
                .meta-code {
                  background-color: #09090b;
                  border: 1px solid #27272a;
                  border-radius: 8px;
                  padding: 16px;
                  margin: 0;
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 13px;
                  line-height: 1.5;
                  overflow-x: auto;
                  white-space: pre-wrap;
                  word-break: break-all;
                }
                .btn-container {
                  text-align: center;
                  margin-top: 35px;
                  margin-bottom: 15px;
                }
                .action-btn {
                  display: inline-block;
                  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                  color: #ffffff !important;
                  text-decoration: none;
                  padding: 12px 28px;
                  font-size: 14px;
                  font-weight: 600;
                  border-radius: 6px;
                  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
                }
                .footer {
                  background-color: #111113;
                  padding: 25px 40px;
                  border-top: 1px solid #27272a;
                  text-align: center;
                  font-size: 12px;
                  color: #52525b;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="header-badge">Live Event Triggered</div>
                  <h1 class="header-title" style="color: #ffffff !important;">Event Alert: ${event}</h1>
                </div>
                <div class="content">
                  <p class="intro-text">
                    An event of type <strong>${event}</strong> was captured from your project <strong>${project.name}</strong>.
                  </p>
                  
                  <table class="details-grid">
                    <tr class="details-row">
                      <td class="label">Project</td>
                      <td class="value">${project.name}</td>
                    </tr>
                    <tr class="details-row">
                      <td class="label">Time (UTC)</td>
                      <td class="value">${formattedTime}</td>
                    </tr>
                    <tr class="details-row">
                      <td class="label">Triggered By</td>
                      <td class="value">${userId || anonymousId || 'Anonymous'}</td>
                    </tr>
                    <tr class="details-row">
                      <td class="label">Location</td>
                      <td class="value">📍 ${city}, ${region}, ${country}</td>
                    </tr>
                    <tr class="details-row">
                      <td class="label">Device Info</td>
                      <td class="value">💻 ${deviceType} (${osName} / ${browserName})</td>
                    </tr>
                    <tr class="details-row">
                      <td class="label">IP Address</td>
                      <td class="value">${lookupIp}</td>
                    </tr>
                    <tr class="details-row">
                      <td class="label">Referrer</td>
                      <td class="value">${referrer}</td>
                    </tr>
                  </table>
                  
                  <div class="meta-section">
                    <span class="section-title">Event Metadata</span>
                    <pre class="meta-code"><code>${metadataHtml}</code></pre>
                  </div>
                  
                  <div class="btn-container">
                    <a href="${process.env.frontend_url || 'http://localhost:3000'}/dashboard" class="action-btn" target="_blank" style="color: #ffffff !important;">View Live Logs</a>
                  </div>
                </div>
                <div class="footer">
                  <p style="margin: 0 0 10px 0;">Sent via Shorty Developer Alerts</p>
                  <p style="margin: 0;">&copy; ${new Date().getFullYear()} Shorty Inc. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            `;

            mailSender(project.userId?.email, emailSubject, emailText, emailHtml);
        }

        return res.status(201).json({ success: true, message: "Event tracked successfully" });
    } catch (error) {
        console.error("Error tracking event:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Internal Endpoint for Dashboard - Get raw logs
const getProjectLogsController = async (req, res) => {
    try {
        const { projectId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const project = await Project.findOne({ _id: projectId, userId: req.user.id });
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        const events = await Event.find({ projectId })
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Event.countDocuments({ projectId });

        return res.status(200).json({
            success: true,
            events,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error fetching logs:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Internal Endpoint for Dashboard - Analytics
const getProjectAnalyticsController = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findOne({ _id: projectId, userId: req.user.id });
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        const totalEvents = await Event.countDocuments({ projectId });

        // Calculate today's events and event growth compared to yesterday
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);

        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);

        const todayEvents = await Event.countDocuments({
            projectId,
            timestamp: { $gte: startOfToday }
        });

        const yesterdayEvents = await Event.countDocuments({
            projectId,
            timestamp: { $gte: startOfYesterday, $lt: startOfToday }
        });

        let eventGrowth = 0;
        if (yesterdayEvents > 0) {
            eventGrowth = Math.round(((todayEvents - yesterdayEvents) / yesterdayEvents) * 100);
        } else if (todayEvents > 0) {
            eventGrowth = 100;
        }

        // Aggregate by eventName
        const topEvents = await Event.aggregate([
            { $match: { projectId: project._id } },
            { $group: { _id: "$eventName", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Aggregate by Country
        const countries = await Event.aggregate([
            { $match: { projectId: project._id } },
            { $group: { _id: "$location.country", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Aggregate by Cities
        const cities = await Event.aggregate([
            { $match: { projectId: project._id } },
            { $group: { _id: "$location.city", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Aggregate by OS
        const os = await Event.aggregate([
            { $match: { projectId: project._id } },
            { $group: { _id: "$device.os", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Aggregate by Device
        const devices = await Event.aggregate([
            { $match: { projectId: project._id } },
            { $group: { _id: "$device.deviceType", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Aggregate Active Users
        const sessionsDataAgg = await Event.aggregate([
            { $match: { projectId: project._id } },
            { $group: { _id: { $ifNull: ["$userId", "$anonymousId"] }, count: { $sum: 1 } } }
        ]);
        
        const activeUsers = sessionsDataAgg.length;

        // Today's Active Users
        const todaySessionsAgg = await Event.aggregate([
            { $match: { projectId: project._id, timestamp: { $gte: startOfToday } } },
            { $group: { _id: { $ifNull: ["$userId", "$anonymousId"] } } }
        ]);
        const todayActiveUsers = todaySessionsAgg.length;

        // Yesterday's Active Users
        const yesterdaySessionsAgg = await Event.aggregate([
            { $match: { projectId: project._id, timestamp: { $gte: startOfYesterday, $lt: startOfToday } } },
            { $group: { _id: { $ifNull: ["$userId", "$anonymousId"] } } }
        ]);
        const yesterdayActiveUsers = yesterdaySessionsAgg.length;

        let activeUsersGrowth = 0;
        if (yesterdayActiveUsers > 0) {
            activeUsersGrowth = Math.round(((todayActiveUsers - yesterdayActiveUsers) / yesterdayActiveUsers) * 100);
        } else if (todayActiveUsers > 0) {
            activeUsersGrowth = 100;
        }
        
        // Compute Engagement Metrics
        const totalSessions = activeUsers || 1;
        const avgDepth = (totalEvents / totalSessions).toFixed(1);
        const activeMultiEventSessions = sessionsDataAgg.filter(s => s.count > 1).length;
        const engagementRate = activeUsers > 0 
            ? Math.round((activeMultiEventSessions / activeUsers) * 100) + "%" 
            : "0%";
        const engagementMetrics = { engagementRate, avgDepth };

        // Aggregate Active Paths
        const activePaths = await Event.aggregate([
            { $match: { projectId: project._id } },
            { 
                $group: { 
                    _id: { $ifNull: ["$metadata.path", { $ifNull: ["$metadata.url", { $concat: ["/", "$eventName"] }] }] },
                    count: { $sum: 1 } 
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 3 },
            { $project: { path: "$_id", count: 1, _id: 0 } }
        ]);

        // Aggregate Revenue & Campaign Attribution
        const revenueAggregation = await Event.aggregate([
            { $match: { projectId: project._id } },
            {
                $group: {
                    _id: { 
                        $cond: [
                            { $and: [{ $ne: ["$source.referrer", null] }, { $ne: ["$source.referrer", "Direct"] }] },
                            "$source.referrer",
                            { $ifNull: ["$metadata.utm_source", { $ifNull: ["$metadata.source", { $ifNull: ["$metadata.referrer", { $ifNull: ["$source.referrer", "Direct / Organic"] }] }] }] }
                        ]
                    },
                    count: { $sum: 1 },
                    revenue: {
                        $sum: {
                            $convert: {
                                input: {
                                    $ifNull: [
                                        "$metadata.amount",
                                        { $ifNull: ["$metadata.price", { $ifNull: ["$metadata.revenue", { $ifNull: ["$metadata.value", 0] }] }] }
                                    ]
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        let totalRevenue = 0;
        const campaignAttribution = revenueAggregation.map(item => {
            totalRevenue += (item.revenue || 0);
            return {
                source: item._id,
                count: item.count,
                revenue: item.revenue > 0 ? `$${item.revenue.toLocaleString()}` : "$0",
                conversion: totalEvents > 0 ? ((item.count / totalEvents) * 100).toFixed(1) + "%" : "0.0%"
            };
        });
        const revenueData = { totalRevenue, campaignAttribution };

        // Process Vertical Funnel Analysis
        let funnelAnalysis = [];
        if (topEvents && topEvents.length > 0) {
            funnelAnalysis = await Promise.all(topEvents.slice(0, 6).map(async (evt, idx, arr) => {
                let conversionRate = "100%";
                if (idx > 0 && arr[idx - 1].count > 0) {
                    conversionRate = Math.round((evt.count / arr[idx - 1].count) * 100) + "%";
                }

                // Query today's and yesterday's count for this specific event
                const todayCount = await Event.countDocuments({
                    projectId: project._id,
                    eventName: evt._id,
                    timestamp: { $gte: startOfToday }
                });

                const yesterdayCount = await Event.countDocuments({
                    projectId: project._id,
                    eventName: evt._id,
                    timestamp: { $gte: startOfYesterday, $lt: startOfToday }
                });

                let growth = 0;
                if (yesterdayCount > 0) {
                    growth = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
                } else if (todayCount > 0) {
                    growth = 100;
                }

                return {
                    name: evt._id,
                    count: evt.count,
                    todayCount,
                    growth,
                    conversionFromPrevious: conversionRate
                };
            }));
        }

        return res.status(200).json({
            success: true,
            analytics: {
                totalEvents,
                todayEvents,
                eventGrowth,
                topEvents,
                countries,
                os,
                cities,
                devices,
                activeUsers,
                todayActiveUsers,
                activeUsersGrowth,
                activePaths,
                engagementMetrics,
                revenueData,
                funnelAnalysis
            }
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getProjectAiChatController = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ success: false, message: "Query is required" });
        }

        const project = await Project.findOne({ _id: projectId, userId: req.user.id });
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        // Fetch context
        const totalEvents = await Event.countDocuments({ projectId });
        const recentEvents = await Event.find({ projectId }).sort({ timestamp: -1 }).limit(200);

        // Aggregate Top Events
        const topEvents = await Event.aggregate([
            { $match: { projectId: project._id } },
            { $group: { _id: "$eventName", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const contextData = {
            projectName: project.name,
            totalEvents,
            topEvents,
            recentEvents: recentEvents.map(e => ({
                event: e.eventName,
                user: e.userId || e.anonymousId || "Anonymous",
                device: e.device.deviceType,
                os: e.device.os,
                location: `${e.location.city}, ${e.location.country}`,
                metadata: e.metadata,
                time: e.timestamp
            }))
        };

        const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an expert Data Analyst AI for a software project named "${project.name}".
Your goal is to answer the user's question about their tracking events accurately and concisely based ONLY on the provided context.
Context (JSON): ${JSON.stringify(contextData)}

User Question: ${query}

Provide a helpful, analytical answer. Use markdown for formatting. If the answer cannot be determined from the context, state that clearly but offer any related insights if possible. Keep it concise.`;

        const result = await model.generateContent(prompt);
        return res.status(200).json({ success: true, aiResponse });
    } catch (error) {
        console.error("Error in AI Chat:", error);
        return res.status(500).json({ success: false, message: "Failed to process AI chat" });
    }
};

const getProjectUserJourneysController = async (req, res) => {
    try {
        const { projectId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5; // Clean & high-speed defaults
        const skip = (page - 1) * limit;

        const project = await Project.findOne({ _id: projectId, userId: req.user.id });
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        // Get total count of unique users
        const totalResult = await Event.aggregate([
            { $match: { projectId: project._id } },
            {
                $group: {
                    _id: { $ifNull: ["$userId", "$anonymousId"] }
                }
            },
            { $count: "count" }
        ]);
        const total = totalResult[0]?.count || 0;

        // Get paginated unique users sorted by lastActive descending
        const uniqueUsers = await Event.aggregate([
            { $match: { projectId: project._id } },
            {
                $group: {
                    _id: { $ifNull: ["$userId", "$anonymousId"] },
                    lastActive: { $max: "$timestamp" }
                }
            },
            { $sort: { lastActive: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        const userKeys = uniqueUsers.map(u => u._id).filter(id => id !== null);

        if (userKeys.length === 0) {
            return res.status(200).json({
                success: true,
                journeys: [],
                total,
                page,
                totalPages: Math.ceil(total / limit)
            });
        }

        // Retrieve all events for ONLY these paginated users, sorted chronologically ascending
        const events = await Event.find({
            projectId: project._id,
            $or: [
                { userId: { $in: userKeys } },
                { anonymousId: { $in: userKeys } }
            ]
        }).sort({ timestamp: 1 });

        // Group events by userId or anonymousId
        const userGroups = {};
        events.forEach(evt => {
            const userKey = evt.userId || evt.anonymousId || "Anonymous Guest";
            if (!userGroups[userKey]) {
                userGroups[userKey] = {
                    userId: userKey,
                    deviceType: evt.device?.deviceType || "Desktop",
                    os: evt.device?.os || "Unknown OS",
                    country: evt.location?.country || "Direct",
                    city: evt.location?.city || "",
                    events: [],
                    rageClicks: 0,
                    lastActive: evt.timestamp
                };
            }
            userGroups[userKey].events.push(evt);
            userGroups[userKey].lastActive = evt.timestamp;
        });

        // Compute frustration (rage clicks) and session duration
        const journeys = Object.values(userGroups).map(group => {
            let rageClicks = 0;
            const sortedEvents = group.events;
            for (let i = 0; i < sortedEvents.length - 2; i++) {
                const diff1 = new Date(sortedEvents[i + 1].timestamp || 0).getTime() - new Date(sortedEvents[i].timestamp || 0).getTime();
                const diff2 = new Date(sortedEvents[i + 2].timestamp || 0).getTime() - new Date(sortedEvents[i + 1].timestamp || 0).getTime();
                if (
                    sortedEvents[i].eventName === sortedEvents[i + 1].eventName &&
                    sortedEvents[i + 1].eventName === sortedEvents[i + 2].eventName &&
                    diff1 < 2500 && diff2 < 2500
                ) {
                    rageClicks++;
                    i += 2; // skip group
                }
            }
            group.rageClicks = rageClicks;

            // Calculate duration in milliseconds
            const firstTime = new Date(sortedEvents[0].timestamp).getTime();
            const lastTime = new Date(sortedEvents[sortedEvents.length - 1].timestamp).getTime();
            group.sessionDurationMs = lastTime - firstTime;

            return group;
        });

        // Sort journeys by their most recent active timestamp descending
        journeys.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

        return res.status(200).json({
            success: true,
            journeys,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error fetching user journeys:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    trackEventController,
    getProjectLogsController,
    getProjectAnalyticsController,
    getProjectAiChatController,
    getProjectUserJourneysController
};

