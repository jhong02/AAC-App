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

let runtimeSettings: TTSSettings = { ...DEFAULT_TTS_SETTINGS };
let runtimeSettingsLoaded = false;

let cachedVoices: SpeechSynthesisVoice[] = [];
let voiceListenerAttached = false;

function hasSpeechSupport(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function refreshVoiceCache(): SpeechSynthesisVoice[] {
  if (!hasSpeechSupport()) return [];
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

export function primeTTSVoices(): void {
  if (!hasSpeechSupport()) return;

  refreshVoiceCache();

  if (voiceListenerAttached) return;

  const handleVoicesChanged = () => {
    refreshVoiceCache();
  };

  window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
  voiceListenerAttached = true;
}

function resolveVoice(voiceURI: string): SpeechSynthesisVoice | null {
  if (!voiceURI) return null;

  const voices = refreshVoiceCache();
  return voices.find((voice) => voice.voiceURI === voiceURI) ?? null;
}

export function loadTTSSettingsFromDB(db: Database): TTSSettings {
  return {
    volume:
      getSetting<number>(
        db,
        "tts_volume",
        PROFILE_ID,
        DEFAULT_TTS_SETTINGS.volume
      ) ?? DEFAULT_TTS_SETTINGS.volume,
    rate:
      getSetting<number>(
        db,
        "tts_rate",
        PROFILE_ID,
        DEFAULT_TTS_SETTINGS.rate
      ) ?? DEFAULT_TTS_SETTINGS.rate,
    voiceURI:
      getSetting<string>(
        db,
        "tts_voiceURI",
        PROFILE_ID,
        DEFAULT_TTS_SETTINGS.voiceURI
      ) ?? DEFAULT_TTS_SETTINGS.voiceURI,
  };
}

export function saveTTSSettingsToDB(db: Database, settings: TTSSettings): void {
  setSetting(db, "tts_volume", settings.volume, PROFILE_ID);
  setSetting(db, "tts_rate", settings.rate, PROFILE_ID);
  setSetting(db, "tts_voiceURI", settings.voiceURI, PROFILE_ID);

  runtimeSettings = { ...settings };
  runtimeSettingsLoaded = true;
}

export function setRuntimeTTSSettings(settings: TTSSettings): void {
  runtimeSettings = { ...settings };
  runtimeSettingsLoaded = true;
}

export function syncRuntimeTTSSettingsFromDB(db: Database): TTSSettings {
  const settings = loadTTSSettingsFromDB(db);
  runtimeSettings = { ...settings };
  runtimeSettingsLoaded = true;
  return settings;
}

function getEffectiveTTSSettings(
  db?: Database,
  overrides?: Partial<TTSSettings>
): TTSSettings {
  let base = runtimeSettings;

  if (!runtimeSettingsLoaded && db) {
    base = loadTTSSettingsFromDB(db);
    runtimeSettings = { ...base };
    runtimeSettingsLoaded = true;
  }

  return { ...base, ...overrides };
}

function buildUtterance(text: string, settings: TTSSettings) {
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.volume = settings.volume / 100;
  utterance.rate = settings.rate;
  utterance.pitch = 1;

  const voice = resolveVoice(settings.voiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-US";
  }

  return utterance;
}

function speakNow(
  text: string,
  settings: TTSSettings,
  options?: { interrupt?: boolean }
): void {
  if (!text.trim()) return;
  if (!hasSpeechSupport()) return;

  primeTTSVoices();

  const synth = window.speechSynthesis;
  const interrupt = options?.interrupt ?? true;

  if (interrupt && (synth.speaking || synth.pending)) {
    synth.cancel();
  }

  const utterance = buildUtterance(text, settings);
  synth.speak(utterance);
}

export function speakWithSettings(
  text: string,
  overrides?: Partial<TTSSettings>,
  db?: Database
): void {
  const settings = getEffectiveTTSSettings(db, overrides);
  speakNow(text, settings, { interrupt: true });
}

export function speakTileWordInstant(
  text: string,
  overrides?: Partial<TTSSettings>,
  db?: Database
): void {
  const settings = getEffectiveTTSSettings(db, overrides);
  speakNow(text, settings, { interrupt: true });
}