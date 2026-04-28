import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDatabase } from "../hooks/useDatabase";
import { getTopWords, getRecentSessions, getSessionEvents, 
         type CategoryUsage, type WordFrequency } from "../db/sessionRepository";
import { getCategoryUsage } from "../db/sessionRepository";
import "./StatsPage.css";


const PROFILE_ID = "default_profile";

export default function StatsPage() {
  const navigate = useNavigate();
  const { db, ready } = useDatabase();
  const [stats, setStats] = useState<any>(null);
  const [mode, setMode] = useState<"session" | "global">("global");

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

        try {

            // 1. Get Session
            const sessions = getRecentSessions(db, PROFILE_ID, 1);
            const session = sessions[0];

            let sessionTime = 0;

            if (mode === "session" && session) {
                const end = session.ended_at ?? Date.now();
                sessionTime = end - session.started_at;
            } else {
                // For global mode, sum all session times
                sessionTime = sessions.reduce((total, s) => {
                    const end = s.ended_at ?? Date.now();
                    return total + (end - s.started_at);
                }, 0);
            }

            // 2. Get Top Words for that session
            let topWords: WordFrequency[] = [];;

            if (mode === "global") {
                topWords = getTopWords(db, PROFILE_ID, 5);
            } else {
                const sessionId = session?.id;

                if (!sessionId) {
                    topWords = [];
                } else {
                  const events = getSessionEvents(db, sessionId);

                  // Aggregate word counts
                  const map: Record<string, any> = {};
                
                  events.forEach((e) => {
                    if (!map[e.word]) {
                      map[e.word] = { word: e.word, category: e.category, count: 0 };
                    }
                    map[e.word].count += 1;
                  });

                  topWords = Object.values(map)
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 5);
                }
            }
            
            // 4. Get category usage
            let categories: CategoryUsage[] = [];

            if (mode === "global") {
                categories = getCategoryUsage(db, PROFILE_ID).slice(0, 5);
            } else {
                const sessionId = session?.id;

                if (!sessionId) {
                    categories = [];
                } else {
                    const events = getSessionEvents(db, sessionId);

                    const map: Record<string, number> = {};

                    events.forEach((e) => {
                        if (!map[e.category]) {
                            map[e.category] = 0;
                        }
                        map[e.category] += 1;
                    } );

                    categories = Object.entries(map)
                        .map(([category, count]) => ({ category, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);
                }
            }

            // 3. Get profile info
            const result = db.exec(
                "SELECT name FROM profiles WHERE id = ?;",
                [PROFILE_ID]
            );

            const name =
                result[0]?.values?.[0]?.[0] ?? "Default User";

            setStats({ name, sessionTime, topWords, categories });

        } catch (err) {
            console.error("Failed to load stats: ", err);
        }
    }, [ready, db, mode]);

    //if (!ready || !stats) return <div>Loading...</div>;
    if (!ready) return <div>Loading DB...</div>;

    const safeStats = stats ?? {
        name: "No Profile",
        sessionTime: 0,
        topWords: [],
        categories: []
    };


    
    return (
    <div className="stats-page">
      <div className="cloud cloud1" />
      <div className="cloud cloud2" />

      <div className="stats-card">
        <div className="stats-header">
          <button className="stats-back-btn" onClick={() => navigate("/home")}>
            ← Back
          </button>
          <h1 className="text-outline"> 📊 Statistics </h1>
        </div>

        <div className="stats-toggle">
            <button
                className={`stats-action-btn ${mode === "global" ? "is-global" : ""}`}
                onClick={() => setMode("global")}
            >
                Global
            </button>

            <button
                className={`stats-action-btn ${mode === "session" ? "is-session" : ""}`}
                onClick={() => setMode("session")}
            >
                Session
            </button>
        </div>

        <div className="stats-row">
            <div className="stats-section small">
              <h2>Profile:</h2>
              <p>{safeStats.name}</p>

            </div>

            <div className="stats-section small">

              <h2>Session Time:</h2>
              <p>{formatTime(safeStats.sessionTime)}</p>
            </div>

        </div>


        <div className="stats-row">
          <div className="stats-section small">

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


        <div className="stats-section small">
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
