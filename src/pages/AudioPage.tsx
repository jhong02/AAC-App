import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useAudioSettings } from "../hooks/useAudioSettings";
import "./AudioPage.css";
import CloudBackground from "../components/CloudBackground";

import uiClickSound from "../assets/sounds/ui_click.wav";
import gridSettingSaveSound from "../assets/sounds/gridsetting_save.wav";

const NAV_DELAY_MS = 120;
const MODAL_DELAY_MS = 120;

export default function AudioPage() {
  const navigate = useNavigate();

  const {
    volume,
    setVolume,
    rate,
    setRate,
    voiceURI,
    setVoiceURI,
    save,
    preview,
    reset,
    ready,
    savedBadge,
  } = useAudioSettings();

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);

  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const saveAudioRef = useRef<HTMLAudioElement | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const modalTimerRef = useRef<number | null>(null);
  const pointerClickSoundPlayedRef = useRef(false);
  const pointerSaveSoundPlayedRef = useRef(false);

  useEffect(() => {
    const clickAudio = new Audio(uiClickSound);
    const saveAudio = new Audio(gridSettingSaveSound);

    clickAudio.preload = "auto";
    saveAudio.preload = "auto";
    clickAudio.volume = 0.75;
    saveAudio.volume = 0.8;

    clickAudio.load();
    saveAudio.load();

    clickAudioRef.current = clickAudio;
    saveAudioRef.current = saveAudio;

    return () => {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }

      if (modalTimerRef.current !== null) {
        window.clearTimeout(modalTimerRef.current);
      }

      clickAudio.pause();
      clickAudio.src = "";
      saveAudio.pause();
      saveAudio.src = "";
    };
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const load = () => {
      const available = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang.startsWith("en"));

      setVoices(available);
    };

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);

    const delayedLoadOne = window.setTimeout(load, 350);
    const delayedLoadTwo = window.setTimeout(load, 1000);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.clearTimeout(delayedLoadOne);
      window.clearTimeout(delayedLoadTwo);
    };
  }, []);

  const playAudio = (audio: HTMLAudioElement | null) => {
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const playClick = () => playAudio(clickAudioRef.current);
  const playSave = () => playAudio(saveAudioRef.current);

  const handleClickPointerDown = () => {
    pointerClickSoundPlayedRef.current = true;
    playClick();
  };

  const handleSavePointerDown = () => {
    pointerSaveSoundPlayedRef.current = true;
    playSave();
  };

  const playClickIfNeeded = () => {
    if (!pointerClickSoundPlayedRef.current) {
      playClick();
    }

    pointerClickSoundPlayedRef.current = false;
  };

  const playSaveIfNeeded = () => {
    if (!pointerSaveSoundPlayedRef.current) {
      playSave();
    }

    pointerSaveSoundPlayedRef.current = false;
  };

  const navigateWithSound = (path: string) => {
    playClickIfNeeded();

    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
    }

    navigationTimerRef.current = window.setTimeout(() => {
      navigate(path);
    }, NAV_DELAY_MS);
  };

  const handleVoiceSelect = (selectedVoiceURI: string) => {
    playClickIfNeeded();
    setVoiceURI(selectedVoiceURI);
  };

  const handlePreview = () => {
    playClickIfNeeded();
    preview();
  };

  const handleReset = () => {
    playClickIfNeeded();
    reset();
  };

  const handleSave = () => {
    if (!ready) return;

    playSaveIfNeeded();
    save();

    if (modalTimerRef.current !== null) {
      window.clearTimeout(modalTimerRef.current);
    }

    modalTimerRef.current = window.setTimeout(() => {
      setShowSavedModal(true);
    }, MODAL_DELAY_MS);
  };

  const handleCloseSavedModal = () => {
    playClickIfNeeded();
    setShowSavedModal(false);
  };

  const speedLabel = (val: number) => {
    if (val <= 0.6) return "Very Slow";
    if (val <= 0.85) return "Slow";
    if (val <= 1.15) return "Normal";
    if (val <= 1.4) return "Fast";
    return "Very Fast";
  };

  return (
    <section className="audio-page">
      <CloudBackground mode="auto" count={2} />
      <div className="audio-shell">
        <div className="audio-top-row">
          <button
            type="button"
            className="audio-back-badge"
            onPointerDown={handleClickPointerDown}
            onClick={() => navigateWithSound("/user-config")}
          >
            ← Back to Config
          </button>
        </div>

        <header className="audio-hero">
          <h1>📢 Audio Settings</h1>
          <p>Choose how the board speaks words and sentences.</p>
        </header>

        <section className="audio-panel">
          <div className="audio-section-label">
            <span className="audio-section-icon">
              {volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊"}
            </span>
            <span>Volume</span>
            <span className="audio-value-badge">{volume}%</span>
          </div>

          <input
            type="range"
            className="audio-slider volume-slider"
            min={0}
            max={100}
            step={1}
            value={volume}
            style={{ "--val": `${volume}%` } as CSSProperties}
            onChange={(e) => setVolume(Number(e.target.value))}
          />

          <div className="audio-slider-ticks">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </section>

        <section className="audio-panel">
          <div className="audio-section-label">
            <span className="audio-section-icon">⚡</span>
            <span>Speech Speed</span>
            <span className="audio-value-badge">{speedLabel(rate)}</span>
          </div>

          <input
            type="range"
            className="audio-slider speed-slider"
            min={0.5}
            max={1.75}
            step={0.05}
            value={rate}
            style={
              {
                "--val": `${((rate - 0.5) / (1.75 - 0.5)) * 100}%`,
              } as CSSProperties
            }
            onChange={(e) => setRate(Number(e.target.value))}
          />

          <div className="audio-slider-ticks">
            <span>Slower</span>
            <span>Normal</span>
            <span>Faster</span>
          </div>
        </section>

        <section className="audio-panel">
          <div className="audio-section-label">
            <span className="audio-section-icon">🎙️</span>
            <span>Voice</span>
            {voices.length === 0 && (
              <span className="audio-placeholder-tag">Loading…</span>
            )}
          </div>

          {voices.length > 0 ? (
            <div className="voice-options">
              <button
                type="button"
                className={`voice-option-btn ${voiceURI === "" ? "selected" : ""}`}
                onPointerDown={handleClickPointerDown}
                onClick={() => handleVoiceSelect("")}
              >
                <span>Browser Default</span>
              </button>

              {voices.map((voice) => (
                <button
                  type="button"
                  key={voice.voiceURI}
                  className={`voice-option-btn ${
                    voiceURI === voice.voiceURI ? "selected" : ""
                  }`}
                  onPointerDown={handleClickPointerDown}
                  onClick={() => handleVoiceSelect(voice.voiceURI)}
                >
                  <span>{voice.name}</span>
                  {voice.localService && (
                    <span className="voice-local-tag">device</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="audio-placeholder-note">
              Voices are loading — they should appear in a moment.
            </p>
          )}
        </section>

        <div className="audio-actions">
          <button
            type="button"
            className="audio-action-btn is-preview"
            onPointerDown={handleClickPointerDown}
            onClick={handlePreview}
          >
            ▶ Preview
          </button>

          <button
            type="button"
            className="audio-action-btn is-reset"
            onPointerDown={handleClickPointerDown}
            onClick={handleReset}
          >
            ↺ Reset
          </button>

          <button
            type="button"
            className="audio-action-btn is-save"
            onPointerDown={handleSavePointerDown}
            onClick={handleSave}
            disabled={!ready}
          >
            {savedBadge ? "✓ Saved!" : "💾 Save"}
          </button>
        </div>
      </div>

      {showSavedModal && (
        <div className="audio-save-modal" role="dialog" aria-modal="true">
          <div className="audio-save-modal__card">
            <div className="audio-save-modal__icon">✓</div>
            <h2>Audio settings saved!</h2>
            <p>Your voice, speed, and volume settings are ready to use.</p>

            <div className="audio-save-modal__actions">
              <button
                type="button"
                className="audio-save-modal__btn is-home"
                onPointerDown={handleClickPointerDown}
                onClick={() => navigateWithSound("/home")}
              >
                Return Home
              </button>

              <button
                type="button"
                className="audio-save-modal__btn is-close"
                onPointerDown={handleClickPointerDown}
                onClick={handleCloseSavedModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
