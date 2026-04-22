import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDatabase } from "../hooks/useDatabase";
import { getTopWords, getRecentSessions } from "../db/sessionRepository";
import "./StatsPage.css";


const PROFILE_ID = "default_profile";

export default function StatsPage() {
  const navigate = useNavigate();
  const { db, ready } = useDatabase();
  const [stats, setStats] = useState<any>(null);

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
            // 1. Get recent session
            const sessions = getRecentSessions(db, PROFILE_ID, 1);
            const session = sessions[0];
            console.log("Sessions:", sessions);

            let sessionTime = 0;
            if (session) {
                const end = session.ended_at ?? Date.now();
                sessionTime = end - session.started_at;
            }

            // 2. Get top words for that session
            const topWords = getTopWords(db, PROFILE_ID, 5);
            console.log("Top Words:", topWords);

            // 3. Get profile info
            const result = db.exec(
                "SELECT name FROM profiles WHERE id = ?;",
                [PROFILE_ID]
            );

            const name =
                result[0]?.values?.[0]?.[0] ?? "Default User";

            setStats({ name, sessionTime, topWords });

        } catch (err) {
            console.error("Failed to load stats: ", err);
        }
    }, [ready, db]);

    //if (!ready || !stats) return <div>Loading...</div>;
    if (!ready) return <div>Loading DB...</div>;

    const safeStats = stats ?? {
        name: "No Profile",
        sessionTime: 0,
        topWords: []
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


        <p><strong>Profile:</strong> {safeStats.name}</p>

        <p>
          <strong>Session Time:</strong>{" "}
          {formatTime(safeStats.sessionTime)}
        </p>

        <h2> All Time Top Words</h2>

        {safeStats.topWords.length === 0 ? (
          <p>No data yet</p>
        ) : (
        <ul>
            {safeStats.topWords.map((w: any, i: number) => (
              <li key={i}>
                {w.word} ({w.category}) — {w.count}
              </li>
            ))}
          </ul>

        )}
        </div>
    </div>
  );
}
