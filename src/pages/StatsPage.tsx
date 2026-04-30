import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDatabase } from "../hooks/useDatabase";
import { getRecentSessions } from "../db/sessionRepository";
import { getCategoryUsageSince } from "../db/sessionRepository";
import { getTopWordsSince } from "../db/sessionRepository";
import { getDailyUsage } from "../db/sessionRepository";
import "./StatsPage.css";
import { useAIInsights } from "../hooks/useAIInsights";
import { resetDB } from "../db/database";
import CloudBackground from "../components/CloudBackground";

const PROFILE_ID = "default_profile";

export default function StatsPage() {
  const navigate = useNavigate();
  const { db, ready } = useDatabase();
  const [stats, setStats] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year" | "total">("day");

  const [showConfirm, setShowConfirm] = useState(false);

  const { insight, loading, modelStatus, downloadProgress, daysAgo, generate, startDownload } = useAIInsights(timeframe);

  function formatTime(ms: number) {
    let seconds = Math.floor(ms / 1000);

    const years = Math.floor(seconds / (60 * 60 * 24 * 365));
      seconds %= (60 * 60 * 24 * 365);
    const months = Math.floor(seconds / (60 * 60 * 24 * 30));
      seconds %= (60 * 60 * 24 * 30);
    const days = Math.floor(seconds / (60 * 60 * 24));
      seconds %= (60 * 60 * 24);
    const hours = Math.floor(seconds / (60 * 60));
      seconds %= (60 * 60);
    const minutes = Math.floor(seconds / 60);
      seconds %= 60;

     // build string dynamically based on which units are present
    const parts = [];

    if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
    if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? "s" : ""}`);

    return parts.join(" ");
  }

  function handleresetStats() {
          if (!db) return;

          setShowConfirm(true);
  }


    useEffect(() => {
    if (!ready || !db) return;

      function getSinceTimeframe(tf: string) {
        const now = Date.now();
        switch (tf) {
          case "day":   return now - 1   * 24 * 60 * 60 * 1000;
          case "week":  return now - 7   * 24 * 60 * 60 * 1000;
          case "month": return now - 30  * 24 * 60 * 60 * 1000;
          case "year":  return now - 365 * 24 * 60 * 60 * 1000;
        default:      return 0;
        } 
      }

        try {

            // 1. Get Session Info

            const since = getSinceTimeframe(timeframe);

            const sessions = getRecentSessions(db, PROFILE_ID, 100);
            const filteredSessions = sessions.filter(s => s.started_at >= since);

            const now = Date.now();
            const sessionTime = filteredSessions.reduce((total, s) => {

             const end = s.ended_at ?? now;

             // ignore sessions that are clearly duplicates
             if (!s.ended_at && now - s.started_at > 1000 * 60 * 60) {
              return total; // skip long-running ghost sessions
             }

             const duration = end - s.started_at;

             return total + Math.max(0, duration);

            }, 0);


            // 2. Get Top Words for that session

            const topWords = getTopWordsSince(db, PROFILE_ID, since, 5);
            
            // 3. Get category usage

            const categories = getCategoryUsageSince(db, PROFILE_ID, since, 5);

            // 4. Get usage data for graphing

            // fallback if call fails
            const usageDays =
              timeframe === "day"   ? 1   :
              timeframe === "week"  ? 7   :
              timeframe === "month" ? 30  :
              timeframe === "year"  ? 365 : 365;

            const dailyUsage = getDailyUsage(db, PROFILE_ID, usageDays);

            // 5. Get profile info

            const result = db.exec(
                "SELECT name FROM profiles WHERE id = ?;",
                [PROFILE_ID]
            );
      const name = result[0]?.values?.[0]?.[0] ?? "Default User";

      setStats({ name, sessionTime, topWords, categories, dailyUsage });
        } catch (err) {
          console.error("Failed to load stats:", err);
        }
    }, [ready, db, timeframe]);

    if (!ready) return <div>Loading DB...</div>;

    const safeStats = stats ?? {
        name: "No Profile",
        sessionTime: 0,
        topWords: [],
        categories: [],
        dailyUsage: [],
    };


    /* ----- Page ----- */
    
    return (
    <div className="stats-page">
      <CloudBackground mode="auto" count={2} />

      <div className="stats-shell">

        {/* Back */}
        <div className="stats-top-row">
          <button className="stats-back-btn" onClick={() => navigate("/home")}>
            ← Back To Home
          </button>
          <button className="stats-reset-btn" onClick={() => handleresetStats()}>
            Reset Statistics
          </button>
        </div>

        {/* Hero */}
        <div className="stats-hero">
          <h1>📊 Statistics</h1>
          <p>Track usage and progress over time</p>
        </div>
        
        {/* Timeframe buttons */}
        <div className="stats-actions">
            <button
                className={`stats-action-btn ${timeframe === "day" ? "is-active" : ""}`}
                onClick={() => setTimeframe("day")}
            >
                Today
            </button>
            <button
                className={`stats-action-btn ${timeframe === "week" ? "is-active" : ""}`}
                onClick={() => setTimeframe("week")}
            >
                Week
            </button>
            <button
                className={`stats-action-btn ${timeframe === "month" ? "is-active" : ""}`}
                onClick={() => setTimeframe("month")}
            >
                Month
            </button>
            <button
                className={`stats-action-btn ${timeframe === "year" ? "is-active" : ""}`}
                onClick={() => setTimeframe("year")}
            >
                Year
            </button>
            <button
                className={`stats-action-btn ${timeframe === "total" ? "is-active" : ""}`}
                onClick={() => setTimeframe("total")}
            >
                Total
            </button>
        </div>

        {/* Profile + Session Time */}
        <div className="stats-row">
            <div className="stats-panel">
              <h2>Profile:</h2>
              <p>{safeStats.name}</p>
            </div>
            <div className="stats-panel">
              <h2>Session Time Total:</h2>
              <p>{formatTime(safeStats.sessionTime)}</p>
            </div>
        </div>

        {/* Daily Usage Chart */}
        <div className="stats-row full">
          <div className="stats-panel">
            <h2>Daily Usage</h2>
              <svg className="daily-svg" viewBox="0 0 300 140" preserveAspectRatio="xMidYMid meet">
                {(() => {
                  const data = safeStats.dailyUsage ?? [];

                  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
                  const max = Math.max(...data.map((d: any) => d.count), 1);
                  const visibleData = data.slice(-14);

                  const chartWidth = 300 - margin.left - margin.right;
                  const chartHeight = 140 - margin.top - margin.bottom;
                  const baseY = margin.top + chartHeight;
                  const step = chartWidth / visibleData.length; 

                  const fontTitle = 8;
                  const fontLabel = 4;

                  // -- No data case --
                  if (data.length === 0) {
                    return <text x="50%" y="50%" textAnchor="middle" fill="#888">No data yet</text>;
                  }
                  
                  // -- Single data point case --
                  if (data.length === 1) {
                    const d = data[0];

                    const x = margin.left + chartWidth / 2;
                    const y = baseY - (d.count / Math.max(d.count, 1)) * chartHeight;

                  return (
                    <>
                        {/*  Single Y-axis labels */}

                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                          const y = baseY - p * chartHeight;
                          const value = Math.round(max * p);
                          return (

                            <g key={i}>
                              <text
                                x={margin.left - 10}
                                y={y}
                                fontSize={fontLabel}
                                fill="#666"
                                textAnchor="start"
                                fontFamily="inherit"
                              >
                                {value}
                              </text>
                              {/* single grid line */}
                              <line
                                x1={margin.left}
                                x2={margin.left + chartWidth}
                                y1={y}
                                y2={y}
                                stroke="#ddd"
                                strokeWidth="0.5"
                              />
                            </g>
                          );
                        })}
                        {/* Single Y-axis title */}
                        <text
                          x={10}
                          y={margin.top + chartHeight / 2}
                          transform={`rotate(-90, 10, ${margin.top + chartHeight / 2})`}
                          textAnchor="middle"
                          fontSize={fontTitle}
                          fill="#43543b"
                          fontFamily="inherit"
                        >
                          Usage Count
                        </text>

                        {/* Single bar */}
                        <rect
                          x={x - 20}
                          y={y}
                          width={20}
                          height={baseY - y}
                          fill="#49a8f0"
                        />

                        {/* Single date */}
                        <text
                          x={x - 10}
                          y={baseY + 15}
                          textAnchor="middle"
                          fill="#888"
                          fontSize={fontLabel}
                          fontFamily="inherit"
                        >
                          {new Date(d.date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                        </text>

                        {/* Single X-axis title */}
                        <text
                          x={margin.left + chartWidth / 2 - 8}
                          y={baseY + 30}
                          textAnchor="middle"
                          fontSize={fontTitle}
                          fill="#43543b"
                          fontFamily="inherit"
                        >
                          Date
                        </text>
                    </>
                  );
                  }
                  
                  // -- Normal case (2+ points) --
                  return (
                    <>

                      {/* Y-axis labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                        const y = baseY - p * chartHeight;
                        const value = Math.round(max * p);

                        return (
                          <g key={i}>
                          <text
                            x={margin.left - 10}
                            y={y}
                            fontSize={fontLabel}
                            fill="#666"
                            textAnchor="start"
                            fontFamily="inherit"
                          >
                            {value}
                          </text>

                          {/* grid line */}
                            <line
                              x1={margin.left}
                              x2={margin.left + chartWidth}
                              y1={y}
                              y2={y}
                              stroke="#ddd"
                              strokeWidth="0.5"
                            />
                          </g>
                        );
                      })}

                      {/* Y-axis title */}
                      <text
                        x={10}
                        y={margin.top + chartHeight / 2}
                        transform={`rotate(-90, 10, ${margin.top + chartHeight / 2})`}
                        textAnchor="middle"
                        fontSize={fontTitle}
                        fill="#43543b"
                        fontFamily="inherit"
                      >
                        Usage Count
                      </text>
                    
                      {/* Bars */}
                      {visibleData.map((d: any, i: number) => {
                        const x = margin.left + i * step + step * 0.1;
                        const y = baseY - (d.count / max) * chartHeight;

                        return (
                          <rect
                            key={`bar-${i}`}
                            x={x}
                            y={y}
                            width={step * 0.9}
                            height={baseY - y}
                            fill="#49a8f0"
                          />
                        );
                      })}

                      {/* Line */}
                      {visibleData.map((d: any, i: number) => {
                        if (i === 0) return null;
                        const prev = visibleData[i - 1];

                        const x1 = margin.left + (i - 1) * step + step * 0.55;
                        const y1 = baseY - (prev.count / max) * chartHeight;
                        const x2 = margin.left + i * step + step * 0.55;
                        const y2 = baseY - (d.count / max) * chartHeight;
                      
                        return (
                          <line
                            key={`line-${i}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="black"
                            strokeWidth="1"
                          />
                        );
                      })}

                      {/* Points */}
                      {visibleData.map((d: any, i: number) => {
                        const x = margin.left + i * step + step * 0.55;
                        const y = baseY - (d.count / max) * chartHeight;

                        return (
                          <circle
                            key={`point-${i}`}
                            cx={x}
                            cy={y}
                            r="1.5"
                            fill="black"
                          />
                        );
                      })}

                      
                      {/* X-axis labels */}
                      {visibleData.map((d: any, i: number) => {
                        const x = margin.left + i * step + step * 0.55;

                        return (
                          <text
                            key={`label-${i}`}
                            x={x}
                            y={baseY + 15}
                            textAnchor="middle"
                            fill="#888"
                            fontSize={fontLabel}
                            fontFamily="inherit"
                          >
                            {new Date(d.date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                          </text>
                        );
                      })}

                      {/* X-axis title */}
                      <text
                        x={margin.left + chartWidth / 2 - 8}
                        y={baseY + 30}
                        textAnchor="middle"
                        fontSize={fontTitle}
                        fill="#43543b"
                        fontFamily="inherit"
                      >
                        Date
                      </text>

                    </>
                  );
                })()} 
              </svg>

          </div>
        </div>

        {/* Top Words + Top Categories */}

        <div className="stats-row">
          <div className="stats-panel">

            <h2>Top Words</h2>

            {safeStats.topWords.length === 0 ? (
              <p>No data yet</p>
            ) : (

            <div className="bar-chart">
              {safeStats.topWords.map((w: any, i: number) => {
                const max = safeStats.topWords[0]?.count || 1;
                const width = (w.count / max) * 100;

                return (
                  <div key={i} className="bar-row">
                    <span className="bar-label">
                      {w.word} <span className="bar-category">({w.category})</span>
                    </span>

                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${width}%` }} />
                    </div>

                      <span className="bar-count">{w.count}</span>
                    </div>
                );
              })}
            </div>

            )}
        </div>


        <div className="stats-panel">
          <h2>Top Categories</h2>

          {safeStats.categories?.length === 0 ? (
            <p>No data yet</p>
          ) : (
            <div className="bar-chart">
              {safeStats.categories.map((c: any, i: number) => {
                const max = safeStats.categories[0]?.count || 1;
                const width = (c.count / max) * 100;

                return (
                  <div key={i} className="bar-row">
                    <span className="bar-label">{c.category}</span>

                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${width}%` }} />
                  </div>

                    <span className="bar-count">{c.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>

        {/* ─── AI Insights Module ─── */}
        <div className="stats-row full">
          <div className="stats-panel ai-insights-panel">

            <div className="ai-insights-header">
              <h2>AI Insights</h2>
              {daysAgo !== null && (
                <span className="ai-insights-age">
                  Generated {daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`}
                </span>
              )}
            </div>

            {modelStatus === "checking" && (
              <p className="ai-insights-status">Checking AI availability...</p>
            )}

            {modelStatus === "unavailable" && (
              <p className="ai-insights-status ai-insights-unavailable">
                AI not available on this device. WebGPU support is required.
              </p>
            )}

            {modelStatus === "not-loaded" && (
              <div className="ai-insights-empty">
                <p>Download the AI model to enable session insights.</p>
                <p className="ai-insights-size">One-time download — approximately 1.5 GB. Requires wifi.</p>
                <button className="ai-generate-btn" onClick={startDownload}>
                  Download AI Model
                </button>
              </div>
            )}

            {modelStatus === "loading" && (
              <div className="ai-insights-loading">
                <p>Downloading AI model... {downloadProgress}%</p>
                <div className="ai-loading-bar">
                  <div
                    className="ai-loading-fill ai-loading-fill--progress"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <p className="ai-insights-size">This is a one-time download. Do not close the app.</p>
              </div>
            )}

            {modelStatus === "error" && (
              <div className="ai-insights-empty">
                <p className="ai-insights-status ai-insights-unavailable">
                  Something went wrong. Please try again.
                </p>
                <button className="ai-generate-btn" onClick={startDownload}>
                  Retry Download
                </button>
              </div>
            )}

            {modelStatus === "ready" && !insight && !loading && (
              <div className="ai-insights-empty">
                <p>No summary generated yet for this timeframe.</p>
                <button className="ai-generate-btn" onClick={generate}>
                  Generate Summary
                </button>
              </div>
            )}

            {loading && (
              <div className="ai-insights-loading">
                <p>Generating summary...</p>
                <div className="ai-loading-bar">
                  <div className="ai-loading-fill" />
                </div>
              </div>
            )}

            {insight && !loading && (
              <div className="ai-insights-content">
                <div className="ai-section">
                  <h3>Summary</h3>
                  <p>{insight.summary || "No data available."}</p>
                </div>
                <div className="ai-section">
                  <h3>Sentence Complexity</h3>
                  <p>{insight.sentenceComplexity || "No data available."}</p>
                </div>
                <div className="ai-section">
                  <h3>Lag Time</h3>
                  <p>{insight.lagTime || "No data available."}</p>
                </div>
                <div className="ai-section">
                  <h3>Word Suggestions</h3>
                  <p>{insight.wordSuggestions || "No data available."}</p>
                </div>
                {modelStatus === "ready" && (
                  <button className="ai-generate-btn ai-regenerate-btn" onClick={generate}>
                    Regenerate Summary
                  </button>
                )}
              </div>
            )}

          </div>
      </div>

     </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Reset Stats?</h3>
            <p>This will permanently delete all your previous data.</p>

            <div className="modal-actions">
              <button
                className="modal-btn modal-cancel-btn"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>

              <button
                className="modal-btn modal-confirm-btn"
                onClick={() => {
                  resetDB();
                  
                  setStats({
                    name: "Default User",
                    sessionTime: 0,
                    topWords: [],
                    categories: [],
                    dailyUsage: [],
                  });
                  setShowConfirm(false);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
