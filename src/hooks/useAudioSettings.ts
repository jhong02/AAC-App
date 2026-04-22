/**
 * useAudioSettings.ts
 *
 * Manages TTS settings persistence for AudioPage.
 * - Loads volume, rate, voiceURI from database on mount
 * - Saves to database when save() is called
 * - Returns current values, setters, save, reset, and db ready state
 *
 * Follows the same hook pattern as useSessionLogger —
 * all database logic stays here, AudioPage only handles UI.
 */

import { useState, useEffect } from "react";
import { useDatabase } from "./useDatabase";
import {
  DEFAULT_TTS_SETTINGS,
  loadTTSSettingsFromDB,
  saveTTSSettingsToDB,
  speakWithSettings,
  type TTSSettings,
} from "./useTTSSettings";

export function useAudioSettings() {
  const { db, ready } = useDatabase();

  const [volume,     setVolume]     = useState(DEFAULT_TTS_SETTINGS.volume);
  const [rate,       setRate]       = useState(DEFAULT_TTS_SETTINGS.rate);
  const [voiceURI,   setVoiceURI]   = useState(DEFAULT_TTS_SETTINGS.voiceURI);
  const [savedBadge, setSavedBadge] = useState(false);

  // Load saved settings from database once it's ready
  useEffect(() => {
    if (!ready || !db) return;
    const saved = loadTTSSettingsFromDB(db);
    setVolume(saved.volume);
    setRate(saved.rate);
    setVoiceURI(saved.voiceURI);
  }, [ready, db]);

  // Save current slider values to database
  function save() {
    if (!db) return;
    saveTTSSettingsToDB(db, { volume, rate, voiceURI });
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  }

  // Preview speech with current in-page values before saving
  function preview() {
    speakWithSettings(
      "Hello! This is how I will sound.",
      { volume, rate, voiceURI },
      db ?? undefined
    );
  }

  // Reset sliders to defaults without saving
  function reset() {
    setVolume(DEFAULT_TTS_SETTINGS.volume);
    setRate(DEFAULT_TTS_SETTINGS.rate);
    setVoiceURI(DEFAULT_TTS_SETTINGS.voiceURI);
  }

  return {
    // Values
    volume,
    rate,
    voiceURI,
    // Setters for sliders
    setVolume,
    setRate,
    setVoiceURI,
    // Actions
    save,
    preview,
    reset,
    // State
    ready,
    savedBadge,
  };
}