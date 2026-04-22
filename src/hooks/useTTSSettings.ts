/**
 * useTTSSettings.ts
 *
 * TTS settings are stored in the SQLite database (settings table)
 * via getSetting/setSetting from abaRepository.
 *
 * speakWithSettings reads from the database at speak time so
 * TalkPage always uses the latest saved settings.
 */

import type { Database } from "sql.js";
import { getSetting, setSetting } from "../db/abaRepository";

export interface TTSSettings {
  volume: number;   // 0–100
  rate: number;     // 0.5–1.75
  voiceURI: string;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  volume: 80,
  rate: 1.0,
  voiceURI: "",
};

const PROFILE_ID = "__global__";

// ─── Database read/write ───────────────────────────────────────────

export function loadTTSSettingsFromDB(db: Database): TTSSettings {
  return {
    volume:   getSetting<number>(db,  "tts_volume",   PROFILE_ID, DEFAULT_TTS_SETTINGS.volume)   ?? DEFAULT_TTS_SETTINGS.volume,
    rate:     getSetting<number>(db,  "tts_rate",     PROFILE_ID, DEFAULT_TTS_SETTINGS.rate)     ?? DEFAULT_TTS_SETTINGS.rate,
    voiceURI: getSetting<string>(db,  "tts_voiceURI", PROFILE_ID, DEFAULT_TTS_SETTINGS.voiceURI) ?? DEFAULT_TTS_SETTINGS.voiceURI,
  };
}

export function saveTTSSettingsToDB(db: Database, settings: TTSSettings): void {
  setSetting(db, "tts_volume",   settings.volume,   PROFILE_ID);
  setSetting(db, "tts_rate",     settings.rate,     PROFILE_ID);
  setSetting(db, "tts_voiceURI", settings.voiceURI, PROFILE_ID);
}

// ─── Speak (used by TalkPage) ──────────────────────────────────────
// Reads settings from db if available, falls back to defaults

export function speakWithSettings(
  text: string,
  overrides?: Partial<TTSSettings>,
  db?: Database
): void {
  if (!text.trim()) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const base = db ? loadTTSSettingsFromDB(db) : DEFAULT_TTS_SETTINGS;
  const settings = { ...base, ...overrides };

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  utterance.volume = settings.volume / 100;
  utterance.rate   = settings.rate;
  utterance.pitch  = 1;

  if (settings.voiceURI) {
    const voices = window.speechSynthesis.getVoices();
    const match  = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (match) utterance.voice = match;
  }

  window.speechSynthesis.speak(utterance);
}