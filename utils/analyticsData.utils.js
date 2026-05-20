const Event = require("../model/event.schema");

async function getProjectAnalyticsData(project) {
  const totalEvents = await Event.countDocuments({ projectId: project._id });

  // Calculate today's events and event growth compared to yesterday
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);

  const todayEvents = await Event.countDocuments({
    projectId: project._id,
    timestamp: { $gte: startOfToday },
  });

  const yesterdayEvents = await Event.countDocuments({
    projectId: project._id,
    timestamp: { $gte: startOfYesterday, $lt: startOfToday },
  });

  let eventGrowth = 0;
  if (yesterdayEvents > 0) {
    eventGrowth = Math.round(
      ((todayEvents - yesterdayEvents) / yesterdayEvents) * 100,
    );
  } else if (todayEvents > 0) {
    eventGrowth = 100;
  }

  // Aggregate by eventName
  const topEvents = await Event.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: "$eventName", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Aggregate by Country
  const countries = await Event.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: "$location.country", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Aggregate by Cities
  const cities = await Event.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: "$location.city", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Aggregate by OS
  const os = await Event.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: "$device.os", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Aggregate by Device
  const devices = await Event.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: "$device.deviceType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Aggregate Active Users
  const sessionsDataAgg = await Event.aggregate([
    { $match: { projectId: project._id } },
    {
      $group: {
        _id: { $ifNull: ["$userId", "$anonymousId"] },
        count: { $sum: 1 },
      },
    },
  ]);

  const activeUsers = sessionsDataAgg.length;

  // Today's Active Users
  const todaySessionsAgg = await Event.aggregate([
    { $match: { projectId: project._id, timestamp: { $gte: startOfToday } } },
    { $group: { _id: { $ifNull: ["$userId", "$anonymousId"] } } },
  ]);
  const todayActiveUsers = todaySessionsAgg.length;

  // Yesterday's Active Users
  const yesterdaySessionsAgg = await Event.aggregate([
    {
      $match: {
        projectId: project._id,
        timestamp: { $gte: startOfYesterday, $lt: startOfToday },
      },
    },
    { $group: { _id: { $ifNull: ["$userId", "$anonymousId"] } } },
  ]);
  const yesterdayActiveUsers = yesterdaySessionsAgg.length;

  let activeUsersGrowth = 0;
  if (yesterdayActiveUsers > 0) {
    activeUsersGrowth = Math.round(
      ((todayActiveUsers - yesterdayActiveUsers) / yesterdayActiveUsers) *
        100,
    );
  } else if (todayActiveUsers > 0) {
    activeUsersGrowth = 100;
  }

  // Compute Engagement Metrics
  const totalSessions = activeUsers || 1;
  const avgDepth = (totalEvents / totalSessions).toFixed(1);
  const activeMultiEventSessions = sessionsDataAgg.filter((s) => s.count > 1).length;
  const engagementRate =
    activeUsers > 0
      ? Math.round((activeMultiEventSessions / activeUsers) * 100) + "%"
      : "0%";
  const engagementMetrics = { engagementRate, avgDepth };

  // Aggregate Active Paths
  const activePaths = await Event.aggregate([
    { $match: { projectId: project._id } },
    {
      $group: {
        _id: {
          $ifNull: [
            "$metadata.path",
            { $ifNull: ["$metadata.url", { $concat: ["/", "$eventName"] }] },
          ],
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 3 },
    { $project: { path: "$_id", count: 1, _id: 0 } },
  ]);

  // Aggregate Revenue & Campaign Attribution
  const revenueAggregation = await Event.aggregate([
    { $match: { projectId: project._id } },
    {
      $group: {
        _id: {
          $cond: [
            {
              $and: [
                { $ne: ["$source.referrer", null] },
                { $ne: ["$source.referrer", "Direct"] },
              ],
            },
            "$source.referrer",
            {
              $ifNull: [
                "$metadata.utm_source",
                {
                  $ifNull: [
                    "$metadata.source",
                    {
                      $ifNull: [
                        "$metadata.referrer",
                        { $ifNull: ["$source.referrer", "Direct / Organic"] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        count: { $sum: 1 },
        revenue: {
          $sum: {
            $convert: {
              input: {
                $ifNull: [
                  "$metadata.amount",
                  {
                    $ifNull: [
                      "$metadata.price",
                      {
                        $ifNull: [
                          "$metadata.revenue",
                          { $ifNull: ["$metadata.value", 0] },
                        ],
                      },
                    ],
                  },
                ],
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // --- REVENUE TIMELINE AGGREGATION (PROFIT) ---
  const getRevenueTimeline = async (unit) => {
    return await Event.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: { $ifNull: ["$createdAt", "$timestamp"] },
              unit: unit,
            },
          },
          profit: {
            $sum: {
              $convert: {
                input: {
                  $ifNull: [
                    "$metadata.amount",
                    {
                      $ifNull: [
                        "$metadata.price",
                        {
                          $ifNull: [
                            "$metadata.revenue",
                            { $ifNull: ["$metadata.value", 0] },
                          ],
                        },
                      ],
                    },
                  ],
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          date: "$_id",
          profit: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);
  };

  const revenueTimelineDay = await getRevenueTimeline("day");
  const revenueTimelineWeek = await getRevenueTimeline("week");
  const revenueTimelineMonth = await getRevenueTimeline("month");
  const revenueTimelineYear = await getRevenueTimeline("year");

  let totalRevenue = 0;
  const campaignAttribution = revenueAggregation.map((item) => {
    totalRevenue += item.revenue || 0;
    return {
      source: item._id,
      count: item.count,
      revenue: item.revenue > 0 ? `$${item.revenue.toLocaleString()}` : "$0",
      conversion:
        totalEvents > 0
          ? ((item.count / totalEvents) * 100).toFixed(1) + "%"
          : "0.0%",
    };
  });
  const revenueData = { totalRevenue, campaignAttribution };

  // Process Vertical Funnel Analysis
  let funnelAnalysis = [];
  if (topEvents && topEvents.length > 0) {
    funnelAnalysis = await Promise.all(
      topEvents.slice(0, 6).map(async (evt, idx, arr) => {
        let conversionRate = "100%";
        if (idx > 0 && arr[idx - 1].count > 0) {
          conversionRate =
            Math.round((evt.count / arr[idx - 1].count) * 100) + "%";
        }

        const todayCount = await Event.countDocuments({
          projectId: project._id,
          eventName: evt._id,
          timestamp: { $gte: startOfToday },
        });

        const yesterdayCount = await Event.countDocuments({
          projectId: project._id,
          eventName: evt._id,
          timestamp: { $gte: startOfYesterday, $lt: startOfToday },
        });

        let growth = 0;
        if (yesterdayCount > 0) {
          growth = Math.round(
            ((todayCount - yesterdayCount) / yesterdayCount) * 100,
          );
        } else if (todayCount > 0) {
          growth = 100;
        }

        return {
          name: evt._id,
          count: evt.count,
          todayCount,
          growth,
          conversionFromPrevious: conversionRate,
        };
      }),
    );
  }

  // Aggregate Active Users timelines
  const getActiveUsersTimeline = async (unit) => {
    return await Event.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: { $ifNull: ["$createdAt", "$timestamp"] },
              unit: unit,
            },
          },
          activeUsers: {
            $addToSet: { $ifNull: ["$userId", "$anonymousId"] },
          },
        },
      },
      {
        $project: {
          date: "$_id",
          count: { $size: "$activeUsers" },
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);
  };

  const activeUsersTimelineDay = await getActiveUsersTimeline("day");
  const activeUsersTimelineWeek = await getActiveUsersTimeline("week");
  const activeUsersTimelineMonth = await getActiveUsersTimeline("month");
  const activeUsersTimelineYear = await getActiveUsersTimeline("year");

  // Calculate User Retention (1D, 7D, 30D)
  const retentionAgg = await Event.aggregate([
    { $match: { projectId: project._id } },
    {
      $addFields: {
        todayStart: { $dateTrunc: { date: "$$NOW", unit: "day" } },
        yesterdayStart: {
          $dateSubtract: {
            startDate: { $dateTrunc: { date: "$$NOW", unit: "day" } },
            unit: "day",
            amount: 1,
          },
        },
        sevenDayStart: {
          $dateSubtract: {
            startDate: { $dateTrunc: { date: "$$NOW", unit: "day" } },
            unit: "day",
            amount: 7,
          },
        },
        thirtyDayStart: {
          $dateSubtract: {
            startDate: { $dateTrunc: { date: "$$NOW", unit: "day" } },
            unit: "day",
            amount: 30,
          },
        },
      },
    },
    {
      $facet: {
        today: [
          {
            $match: {
              $expr: {
                $gte: [
                  { $ifNull: ["$createdAt", "$timestamp"] },
                  "$todayStart",
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              users: { $addToSet: { $ifNull: ["$userId", "$anonymousId"] } },
            },
          },
        ],
        yesterday: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $gte: [
                      { $ifNull: ["$createdAt", "$timestamp"] },
                      "$yesterdayStart",
                    ],
                  },
                  {
                    $lt: [
                      { $ifNull: ["$createdAt", "$timestamp"] },
                      "$todayStart",
                    ],
                  },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              users: { $addToSet: { $ifNull: ["$userId", "$anonymousId"] } },
            },
          },
        ],
        sevenDaysAgo: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $gte: [
                      { $ifNull: ["$createdAt", "$timestamp"] },
                      "$sevenDayStart",
                    ],
                  },
                  {
                    $lt: [
                      { $ifNull: ["$createdAt", "$timestamp"] },
                      "$yesterdayStart",
                    ],
                  },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              users: { $addToSet: { $ifNull: ["$userId", "$anonymousId"] } },
            },
          },
        ],
        thirtyDaysAgo: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $gte: [
                      { $ifNull: ["$createdAt", "$timestamp"] },
                      "$thirtyDayStart",
                    ],
                  },
                  {
                    $lt: [
                      { $ifNull: ["$createdAt", "$timestamp"] },
                      "$sevenDayStart",
                    ],
                  },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              users: { $addToSet: { $ifNull: ["$userId", "$anonymousId"] } },
            },
          },
        ],
      },
    },
    {
      $project: {
        todaysUsers: { $ifNull: [{ $arrayElemAt: ["$today.users", 0] }, []] },
        yesterdayUsers: {
          $ifNull: [{ $arrayElemAt: ["$yesterday.users", 0] }, []],
        },
        sevenDayUsers: {
          $ifNull: [{ $arrayElemAt: ["$sevenDaysAgo.users", 0] }, []],
        },
        thirtyDayUsers: {
          $ifNull: [{ $arrayElemAt: ["$thirtyDaysAgo.users", 0] }, []],
        },
      },
    },
    {
      $addFields: {
        oneDayRetained: {
          $setIntersection: ["$todaysUsers", "$yesterdayUsers"],
        },
        sevenDayRetained: {
          $setIntersection: ["$todaysUsers", "$sevenDayUsers"],
        },
        thirtyDayRetained: {
          $setIntersection: ["$todaysUsers", "$thirtyDayUsers"],
        },
      },
    },
    {
      $project: {
        todaysCount: { $size: "$todaysUsers" },
        yesterdayCount: { $size: "$yesterdayUsers" },
        sevenDayCount: { $size: "$sevenDayUsers" },
        thirtyDayCount: { $size: "$thirtyDayUsers" },
        oneDayRetentionCount: { $size: "$oneDayRetained" },
        oneDayRetentionRate: {
          $multiply: [
            {
              $divide: [
                { $size: "$oneDayRetained" },
                { $max: [{ $size: "$yesterdayUsers" }, 1] },
              ],
            },
            100,
          ],
        },
        sevenDayRetentionCount: { $size: "$sevenDayRetained" },
        sevenDayRetentionRate: {
          $multiply: [
            {
              $divide: [
                { $size: "$sevenDayRetained" },
                { $max: [{ $size: "$sevenDayUsers" }, 1] },
              ],
            },
            100,
          ],
        },
        thirtyDayRetentionCount: { $size: "$thirtyDayRetained" },
        thirtyDayRetentionRate: {
          $multiply: [
            {
              $divide: [
                { $size: "$thirtyDayRetained" },
                { $max: [{ $size: "$thirtyDayUsers" }, 1] },
              ],
            },
            100,
          ],
        },
      },
    },
  ]);

  const retentionData = retentionAgg[0] || {
    todaysCount: 0,
    yesterdayCount: 0,
    sevenDayCount: 0,
    thirtyDayCount: 0,
    oneDayRetentionCount: 0,
    oneDayRetentionRate: 0,
    sevenDayRetentionCount: 0,
    sevenDayRetentionRate: 0,
    thirtyDayRetentionCount: 0,
    thirtyDayRetentionRate: 0,
  };

  return {
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
    revenueTimelineDay,
    revenueTimelineWeek,
    revenueTimelineMonth,
    revenueTimelineYear,
    funnelAnalysis,
    activeUsersTimelineDay,
    activeUsersTimelineWeek,
    activeUsersTimelineMonth,
    activeUsersTimelineYear,
    retentionData,
  };
}

module.exports = { getProjectAnalyticsData };
