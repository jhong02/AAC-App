import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_TTS_SETTINGS,
  loadTTSSettings,
  saveTTSSettings,
  speakWithSettings,
} from "../hooks/useTTSSettings";
import "./AudioPage.css";

export default function AudioPage() {
  const navigate = useNavigate();

  const [volume, setVolume] = useState(() => loadTTSSettings().volume);
  const [rate, setRate] = useState(() => loadTTSSettings().rate);
  const [voiceURI, setVoiceURI] = useState(() => loadTTSSettings().voiceURI);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [savedBadge, setSavedBadge] = useState(false);

  useEffect(() => {
    const load = () => {
      const available = window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang.startsWith("en"));
      setVoices(available);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const speedLabel = (val: number) => {
    if (val <= 0.6) return "Very Slow";
    if (val <= 0.85) return "Slow";
    if (val <= 1.15) return "Normal";
    if (val <= 1.4) return "Fast";
    return "Very Fast";
  };

  const handleSave = () => {
    saveTTSSettings({ volume, rate, voiceURI });
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const handlePreview = () => {
    speakWithSettings("Hello! This is how I will sound.", { volume, rate, voiceURI });
  };

  const handleReset = () => {
    setVolume(DEFAULT_TTS_SETTINGS.volume);
    setRate(DEFAULT_TTS_SETTINGS.rate);
    setVoiceURI(DEFAULT_TTS_SETTINGS.voiceURI);
  };

  return (
    <div className="audio-page">
      <div className="cloud cloud1" />
      <div className="cloud cloud2" />

      <div className="audio-card">
        <div className="audio-header">
          <button className="audio-back-btn" onClick={() => navigate("/user-config")}>
            ← Back
          </button>
          <h1 className="text-outline">🔊 Audio Settings</h1>
        </div>

        {/* Volume */}
        <div className="audio-section">
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
            style={{ "--val": `${volume}%` } as React.CSSProperties}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
          <div className="audio-slider-ticks">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Speech Speed */}
        <div className="audio-section">
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
            style={{ "--val": `${((rate - 0.5) / (1.75 - 0.5)) * 100}%` } as React.CSSProperties}
            onChange={(e) => setRate(Number(e.target.value))}
          />
          <div className="audio-slider-ticks">
            <span>Slower</span>
            <span>Normal</span>
            <span>Faster</span>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="audio-section">
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
                className={`voice-option-btn ${voiceURI === "" ? "selected" : ""}`}
                onClick={() => setVoiceURI("")}
              >
                🎤 Browser Default
              </button>
              {voices.map((v) => (
                <button
                  key={v.voiceURI}
                  className={`voice-option-btn ${voiceURI === v.voiceURI ? "selected" : ""}`}
                  onClick={() => setVoiceURI(v.voiceURI)}
                >
                  🎤 {v.name}
                  {v.localService && (
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
        </div>

        {/* Action Buttons */}
        <div className="audio-actions">
          <button className="btn-third audio-preview" onClick={handlePreview}>
            ▶ Preview
          </button>
          <button className="btn-third audio-reset" onClick={handleReset}>
            ↺ Reset
          </button>
          <button className="btn-third audio-save" onClick={handleSave}>
            {savedBadge ? "✓ Saved!" : "💾 Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
