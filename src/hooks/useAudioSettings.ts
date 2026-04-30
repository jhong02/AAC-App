import { useState, useEffect } from "react";
import { useDatabase } from "./useDatabase";
import {
  DEFAULT_TTS_SETTINGS,
  saveTTSSettingsToDB,
  speakWithSettings,
  syncRuntimeTTSSettingsFromDB,
  primeTTSVoices,
  unlockTTSForUserGesture,
} from "./useTTSSettings";

export function useAudioSettings() {
  const { db, ready } = useDatabase();

  const [volume, setVolume] = useState(DEFAULT_TTS_SETTINGS.volume);
  const [rate, setRate] = useState(DEFAULT_TTS_SETTINGS.rate);
  const [voiceURI, setVoiceURI] = useState(DEFAULT_TTS_SETTINGS.voiceURI);
  const [savedBadge, setSavedBadge] = useState(false);

  useEffect(() => {
    primeTTSVoices();

    const timerOne = window.setTimeout(() => {
      primeTTSVoices();
    }, 350);

    const timerTwo = window.setTimeout(() => {
      primeTTSVoices();
    }, 1000);

    return () => {
      window.clearTimeout(timerOne);
      window.clearTimeout(timerTwo);
    };
  }, []);

  useEffect(() => {
    if (!ready || !db) return;

    const saved = syncRuntimeTTSSettingsFromDB(db);

    setVolume(saved.volume);
    setRate(saved.rate);
    setVoiceURI(saved.voiceURI);
  }, [ready, db]);

  function save() {
    if (!db) return;

    unlockTTSForUserGesture();
    saveTTSSettingsToDB(db, { volume, rate, voiceURI });

    setSavedBadge(true);
    window.setTimeout(() => setSavedBadge(false), 2000);
  }

  function preview() {
    unlockTTSForUserGesture();

    speakWithSettings(
      "Hello! This is how I will sound.",
      { volume, rate, voiceURI },
      db ?? undefined
    );
  }

  function reset() {
    setVolume(DEFAULT_TTS_SETTINGS.volume);
    setRate(DEFAULT_TTS_SETTINGS.rate);
    setVoiceURI(DEFAULT_TTS_SETTINGS.voiceURI);
  }

  return {
    volume,
    rate,
    voiceURI,
    setVolume,
    setRate,
    setVoiceURI,
    save,
    preview,
    reset,
    ready,
    savedBadge,
  };
}