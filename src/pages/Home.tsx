import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";

export default function Home() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const dateText = now.toLocaleDateString([], {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <section className="home">
      <div className="home-frame">
        <div className="home-card">
          <header className="home-header">
            <p className="home-kicker">Welcome!</p>
            <h1 className="home-time">{timeText}</h1>
            <p className="home-date">{dateText}</p>
          </header>

          <div className="home-actions">
            <button
              className="home-pill home-pill--talk"
              onClick={() => navigate("/talk")}
            >
              <span className="home-pill__label">Let&apos;s Talk!</span>
            </button>

            <button
              className="home-pill home-pill--stats"
              onClick={() => navigate("/stats")}
            >
              <span className="home-pill__label">Statistics</span>
            </button>

            <button
              className="home-pill home-pill--config"
              onClick={() => navigate("/user-config")}
            >
              <span className="home-pill__label">Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}