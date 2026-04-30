import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";

import uiClickSound from "../assets/sounds/ui_click.wav";

const NAV_DELAY_MS = 120;

export default function Home() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const pointerSoundPlayedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const audio = new Audio(uiClickSound);
    audio.preload = "auto";
    audio.volume = 0.75;
    audio.load();

    clickAudioRef.current = audio;

    return () => {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }

      audio.pause();
      audio.src = "";
    };
  }, []);

  const playClick = () => {
    const audio = clickAudioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const handleNavPointerDown = () => {
    pointerSoundPlayedRef.current = true;
    playClick();
  };

  const navigateWithSound = (path: string) => {
    if (!pointerSoundPlayedRef.current) {
      playClick();
    }

    pointerSoundPlayedRef.current = false;

    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
    }

    navigationTimerRef.current = window.setTimeout(() => {
      navigate(path);
    }, NAV_DELAY_MS);
  };

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
              onPointerDown={handleNavPointerDown}
              onClick={() => navigateWithSound("/talk")}
            >
              <span className="home-pill__label">Let&apos;s Talk!</span>
            </button>

            <button
              className="home-pill home-pill--stats"
              onPointerDown={handleNavPointerDown}
              onClick={() => navigateWithSound("/stats")}
            >
              <span className="home-pill__label">Statistics</span>
            </button>

            <button
              className="home-pill home-pill--config"
              onPointerDown={handleNavPointerDown}
              onClick={() => navigateWithSound("/user-config")}
            >
              <span className="home-pill__label">Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
