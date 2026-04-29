import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDatabase } from "../hooks/useDatabase";
import { getRecentSessions } from "../db/sessionRepository";
import { getCategoryUsageSince } from "../db/sessionRepository";
import { getTopWordsSince } from "../db/sessionRepository";
import { getDailyUsage } from "../db/sessionRepository";
import "./StatsPage.css";


const PROFILE_ID = "default_profile";

export default function StatsPage() {
  const navigate = useNavigate();
  const { db, ready } = useDatabase();
  const [stats, setStats] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<"day" | "month" | "year" | "total">("day");

  console.log("StatsPage rendered");
  console.log("ready:", ready);
  console.log("db:", db);

  function formatTime(ms: number) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
}

    useEffect(() => {
    
        if (!ready|| !db) return;

        console.log("DB is ready, running queries");

        function getSinceTimeframe(timeframe: string) {
              const now = Date.now();

              switch (timeframe) {
                case "day":
                  return now - 1 * 24 * 60 * 60 * 1000;
                case "month":
                  return now - 30 * 24 * 60 * 60 * 1000;
                case "year":
                  return now - 365 * 24 * 60 * 60 * 1000;
                case "total":
                  return 0;
                default:
                  return 0;
              } 
            }

        try {

            // 1. Get Session Info

            const since = getSinceTimeframe(timeframe);

            const sessions = getRecentSessions(db, PROFILE_ID, 100);
            const filteredSessions = sessions.filter(s => s.started_at >= since);

            const sessionTime = filteredSessions.reduce((total, s) => {
              const end = s.ended_at ?? Date.now();
              return total + (end - s.started_at);
            }, 0);


            // 2. Get Top Words for that session

            const topWords = getTopWordsSince(db, PROFILE_ID, since, 5);
            
            // 3. Get category usage

            const categories = getCategoryUsageSince(db, PROFILE_ID, since, 5);

            // 4. Get usage data for graphing

            //fallback if call fails
            const usageDays =
              timeframe === "day" ? 1 :
              timeframe === "month" ? 30 :
              timeframe === "year" ? 365 :
              365;

            const dailyUsage = getDailyUsage(db, PROFILE_ID, usageDays);

            // 5. Get profile info

            const result = db.exec(
                "SELECT name FROM profiles WHERE id = ?;",
                [PROFILE_ID]
            );

            const name =
                result[0]?.values?.[0]?.[0] ?? "Default User";

            setStats({ name, sessionTime, topWords, categories, dailyUsage  });


        } catch (err) {
            console.error("Failed to load stats: ", err);
        }
    }, [ready, db, timeframe]);

    if (!ready) return <div>Loading DB...</div>;

    const safeStats = stats ?? {
        name: "No Profile",
        sessionTime: 0,
        topWords: [],
        categories: []
    };


    /* ----- Page ----- */
    
    return (
    <div className="stats-page">
      <div className="cloud cloud1" />
      <div className="cloud cloud2" />

      <div className="stats-shell">
        <div className="stats-top-row">
          <button className="stats-back-badge" onClick={() => navigate("/home")}>
            ← Back
          </button>
        </div>

        <div className="stats-hero">
          <h1>📊 Statistics</h1>
          <p>Track usage and progress over time</p>
        </div>
        

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
                    
                      {/* Bars */}
                      {visibleData.map((d: any, i: number) => {
                        const barHeight = (d.count / max) * 100;
                        const x = i * barWidth;

                        const chartHeight = 80;
                        const baseY = 85;

                        const y = baseY - (d.count / max) * chartHeight;
                        /*const y = 90 - barHeight;*/

                        return (
                          <rect
                            key={`bar-${i}`}
                            x={x}
                            y={y}
                            width={barWidth * 0.8}
                            height={barHeight}
                            fill="#49a8f0"
                          />
                        );
                      })}

                      {/* Line */}
                      {visibleData.map((d: any, i: number) => {
                        if (i === 0) return null;
                        const prev = visibleData[i - 1];
                        const x1 = (i - 1) * barWidth + (barWidth * 0.4);
                        const y1 = 90 - (prev.count / max) * 80;
                        const x2 = i * barWidth + (barWidth * 0.4);
                        const y2 = 90 - (d.count / max) * 80;
                      
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

                      {/* Points (optional) */}
                      {visibleData.map((d: any, i: number) => {
                        const x = i * barWidth + (barWidth * 0.4);
                        const y = 90 - (d.count / max) * 80;

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
                        const x = i * barWidth + (barWidth * 0.4);

                        return (
                          <text
                            key={`label-${i}`}
                            x={x}
                            y="95"
                            textAnchor="middle"
                            fill="#888"
                            fontSize="6"
                            fontFamily="inherit"
                          >
                            {new Date(d.date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                          </text>
                        );
                      })}

                    </>
                  );
                })()} 
              </svg>

          </div>
        </div>


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

     </div>
    </div>
  );
}
