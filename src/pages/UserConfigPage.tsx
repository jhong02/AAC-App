import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./UserConfigPage.css";

import uiClickSound from "../assets/sounds/ui_click.wav";

const NAV_DELAY_MS = 120;

export default function UserConfigPage() {
  const navigate = useNavigate();

  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const pointerSoundPlayedRef = useRef(false);

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

  return (
    <section className="userConfig">
      <div className="userConfig-frame">
        <div className="userConfig-card">
          <header className="userConfig-header">
            <h1>Configure Your Patient&apos;s User Profile</h1>
          </header>

          <div className="userConfig-grid">
            <button
              className="userConfig-pill userConfig-pill--audio"
              onPointerDown={handleNavPointerDown}
              onClick={() => navigateWithSound("/audio")}
            >
              <span className="userConfig-pill__label">Audio Settings</span>
            </button>

            <button
              className="userConfig-pill userConfig-pill--grid"
              onPointerDown={handleNavPointerDown}
              onClick={() => navigateWithSound("/grid")}
            >
              <span className="userConfig-pill__label">Grid Settings</span>
            </button>
          </div>

          <button
            className="userConfig-back"
            onPointerDown={handleNavPointerDown}
            onClick={() => navigateWithSound("/home")}
          >
            ← Back To Home
          </button>
        </div>
      </div>
    </section>
  );
}
