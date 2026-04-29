import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDatabase } from "../hooks/useDatabase";
import { getRecentSessions } from "../db/sessionRepository";
import { getCategoryUsageSince } from "../db/sessionRepository";
import { getTopWordsSince } from "../db/sessionRepository";
import { getDailyUsage } from "../db/sessionRepository";
import "./StatsPage.css";
import { useAIInsights } from "../hooks/useAIInsights";

const PROFILE_ID = "default_profile";

export default function StatsPage() {
  const navigate = useNavigate();
  const { db, ready } = useDatabase();
  const [stats, setStats] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<"day" | "month" | "year" | "total">("day");

  const { insight, loading, modelStatus, downloadProgress, daysAgo, generate, startDownload } = useAIInsights(timeframe);

  function formatTime(ms: number) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  useEffect(() => {
    if (!ready || !db) return;

    function getSinceTimeframe(tf: string) {
      const now = Date.now();
      switch (tf) {
        case "day":   return now - 1   * 24 * 60 * 60 * 1000;
        case "month": return now - 30  * 24 * 60 * 60 * 1000;
        case "year":  return now - 365 * 24 * 60 * 60 * 1000;
        default:      return 0;
      }
    }

    try {
      const since = getSinceTimeframe(timeframe);
      const sessions = getRecentSessions(db, PROFILE_ID, 100);
      const filteredSessions = sessions.filter(s => s.started_at >= since);

      const sessionTime = filteredSessions.reduce((total, s) => {
        const end = s.ended_at ?? Date.now();
        return total + (end - s.started_at);
      }, 0);

      const topWords = getTopWordsSince(db, PROFILE_ID, since, 5);
      const categories = getCategoryUsageSince(db, PROFILE_ID, since, 5);

      const usageDays =
        timeframe === "day"   ? 1   :
        timeframe === "month" ? 30  :
        timeframe === "year"  ? 365 : 365;

      const dailyUsage = getDailyUsage(db, PROFILE_ID, usageDays);

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

  return (
    <div className="stats-page">
      <div className="cloud cloud1" />
      <div className="cloud cloud2" />

      <div className="stats-shell">

        {/* Back */}
        <div className="stats-top-row">
          <button className="stats-back-badge" onClick={() => navigate("/home")}>
            ← Back
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
            Day
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
            <h2>Session Time:</h2>
            <p>{formatTime(safeStats.sessionTime)}</p>
          </div>
        </div>

        {/* Daily Usage Chart */}
        <div className="stats-row full">
          <div className="stats-panel">
            <h2>Daily Usage</h2>
            <svg className="daily-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {(() => {
                const data = safeStats.dailyUsage ?? [];
                if (data.length === 0) {
                  return <text x="50%" y="50%" textAnchor="middle" fill="#888">No data yet</text>;
                }
                if (data.length < 2) return null;

                const max = Math.max(...data.map((d: any) => d.count), 1);
                const visibleData = data.slice(-14);
                const barWidth = 100 / visibleData.length;

                return (
                  <>
                    {visibleData.map((d: any, i: number) => {
                      const barHeight = (d.count / max) * 100;
                      const x = i * barWidth;
                      const y = 85 - (d.count / max) * 80;
                      return (
                        <rect key={`bar-${i}`} x={x} y={y} width={barWidth * 0.8} height={barHeight} fill="#49a8f0" />
                      );
                    })}
                    {visibleData.map((d: any, i: number) => {
                      if (i === 0) return null;
                      const prev = visibleData[i - 1];
                      return (
                        <line
                          key={`line-${i}`}
                          x1={(i - 1) * barWidth + barWidth * 0.4}
                          y1={90 - (prev.count / max) * 80}
                          x2={i * barWidth + barWidth * 0.4}
                          y2={90 - (d.count / max) * 80}
                          stroke="black"
                          strokeWidth="1"
                        />
                      );
                    })}
                    {visibleData.map((d: any, i: number) => (
                      <circle
                        key={`point-${i}`}
                        cx={i * barWidth + barWidth * 0.4}
                        cy={90 - (d.count / max) * 80}
                        r="1.5"
                        fill="black"
                      />
                    ))}
                    {visibleData.map((d: any, i: number) => (
                      <text
                        key={`label-${i}`}
                        x={i * barWidth + barWidth * 0.4}
                        y="95"
                        textAnchor="middle"
                        fill="#888"
                        fontSize="6"
                        fontFamily="inherit"
                      >
                        {new Date(d.date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                      </text>
                    ))}
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

            {modelStatus === "not-downloaded" && (
              <div className="ai-insights-empty">
                <p>Download the AI model to enable session insights.</p>
                <p className="ai-insights-size">One-time download — approximately 1.5 GB. Requires wifi.</p>
                <button className="ai-generate-btn" onClick={startDownload}>
                  Download AI Model
                </button>
              </div>
            )}

            {modelStatus === "downloading" && (
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
    </div>
  );
}