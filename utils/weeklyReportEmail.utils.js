function generateWeeklyReportHtml(project, analytics) {
  const {
    totalEvents,
    todayEvents,
    eventGrowth,
    activeUsers,
    todayActiveUsers,
    activeUsersGrowth,
    engagementMetrics,
    revenueData,
    retentionData,
    topEvents,
  } = analytics;

  const eventGrowthColor = eventGrowth >= 0 ? "#34d399" : "#f43f5e";
  const eventGrowthIcon = eventGrowth >= 0 ? "▲" : "▼";
  const activeUserGrowthColor = activeUsersGrowth >= 0 ? "#34d399" : "#f43f5e";
  const activeUserGrowthIcon = activeUsersGrowth >= 0 ? "▲" : "▼";

  // Build Top Events rows
  let topEventsHtml = "";
  if (topEvents && topEvents.length > 0) {
    topEventsHtml = topEvents
      .slice(0, 5)
      .map(
        (e) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #27272a; color: #e4e4e7; font-size: 13px;">
            <span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${e._id}</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #27272a; color: #a1a1aa; text-align: right; font-size: 13px; font-weight: bold;">
            ${e.count.toLocaleString()}
          </td>
        </tr>
      `
      )
      .join("");
  } else {
    topEventsHtml = `<tr><td colspan="2" style="padding: 10px 0; color: #71717a; font-style: italic; font-size: 13px;">No events recorded yet.</td></tr>`;
  }

  // Format retention rates
  const retention1D = retentionData.oneDayRetentionRate ? retentionData.oneDayRetentionRate.toFixed(1) : "0.0";
  const retention7D = retentionData.sevenDayRetentionRate ? retentionData.sevenDayRetentionRate.toFixed(1) : "0.0";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Analytics Report - ${project.name}</title>
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
          background: linear-gradient(135deg, #0f172a 0%, #064e3b 100%);
          padding: 30px 40px;
          border-bottom: 1px solid #27272a;
          text-align: center;
        }
        .header-badge {
          display: inline-block;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
          padding: 4px 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          border-radius: 9999px;
          margin-bottom: 12px;
        }
        .header-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #ffffff;
          letter-spacing: -0.02em;
        }
        .header-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin-top: 8px;
        }
        .content {
          padding: 30px 40px;
        }
        .intro-text {
          font-size: 15px;
          line-height: 1.6;
          color: #a1a1aa;
          margin-top: 0;
          margin-bottom: 30px;
        }
        .intro-text strong {
          color: #f4f4f5;
        }
        
        .kpi-grid {
          display: table;
          width: 100%;
          border-collapse: separate;
          border-spacing: 15px 0;
          margin: 0 -15px 30px -15px;
        }
        .kpi-card {
          display: table-cell;
          width: 50%;
          background: #09090b;
          border: 1px solid #27272a;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        .kpi-title {
          font-size: 11px;
          text-transform: uppercase;
          color: #71717a;
          letter-spacing: 0.05em;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .kpi-value {
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 8px;
          font-family: monospace;
        }
        .kpi-trend {
          font-size: 12px;
          font-weight: 600;
        }
        
        .section-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          color: #e4e4e7;
          letter-spacing: 0.05em;
          margin-bottom: 15px;
          border-bottom: 1px solid #27272a;
          padding-bottom: 8px;
        }
        
        .retention-box {
          background: #09090b;
          border: 1px solid #27272a;
          border-radius: 8px;
          padding: 15px 20px;
          margin-bottom: 30px;
        }
        
        .table-full {
          width: 100%;
          border-collapse: collapse;
        }
        
        .footer {
          background-color: #111113;
          padding: 25px 40px;
          border-top: 1px solid #27272a;
          text-align: center;
          font-size: 12px;
          color: #52525b;
        }
        .action-btn {
          display: inline-block;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 28px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 6px;
          margin-top: 20px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-badge">Weekly Performance Update</div>
          <h1 class="header-title" style="color: #ffffff !important;">${project.name}</h1>
          <div class="header-subtitle">Your latest project insights are ready.</div>
        </div>
        <div class="content">
          <p class="intro-text">
            Here is your automated weekly telemetry report for <strong>${project.name}</strong>. We've compiled your growth metrics, active sessions, and event interactions to help you make data-driven decisions.
          </p>
          
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Today's Traffic</div>
              <div class="kpi-value">${todayEvents.toLocaleString()}</div>
              <div class="kpi-trend" style="color: ${eventGrowthColor}">
                ${eventGrowthIcon} ${Math.abs(eventGrowth)}% vs yesterday
              </div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Active Users</div>
              <div class="kpi-value">${todayActiveUsers.toLocaleString()}</div>
              <div class="kpi-trend" style="color: ${activeUserGrowthColor}">
                ${activeUserGrowthIcon} ${Math.abs(activeUsersGrowth)}% vs yesterday
              </div>
            </div>
          </div>
          
          <div class="retention-box">
            <h3 class="section-title" style="border: none; margin-bottom: 5px;">Engagement & Revenue Insights</h3>
            <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-top: 0;">
              Your project generated <strong>$${(revenueData?.totalRevenue || 0).toLocaleString()}</strong> in lifetime tracked revenue. 
              Currently, your engagement rate sits at <strong>${engagementMetrics.engagementRate}</strong> with users firing an average of <strong>${engagementMetrics.avgDepth}</strong> events per session.
            </p>
            <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-bottom: 0;">
              <strong>Retention Watch:</strong> ${retention1D}% of your active users return within 1 day, while ${retention7D}% return within 7 days.
            </p>
          </div>
          
          <h3 class="section-title">Top Performing Events</h3>
          <table class="table-full" style="margin-bottom: 30px;">
            ${topEventsHtml}
          </table>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/project/${project._id}" class="action-btn">View Full Dashboard</a>
          </div>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 10px 0;">This is an automated weekly report from Shorty Analytics.</p>
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Shorty Inc. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = { generateWeeklyReportHtml };
