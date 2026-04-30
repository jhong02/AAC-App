import type { Database } from "sql.js";
import { getSetting, setSetting } from "../db/abaRepository";

export interface TTSSettings {
  volume: number; // 0–100
  rate: number; // 0.5–1.75
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
let visibilityListenerAttached = false;
let voiceLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function hasSpeechSupport(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function clampSettings(settings: TTSSettings): TTSSettings {
  return {
    volume: Math.min(100, Math.max(0, isNaN(Number(settings.volume)) ? 80 : Number(settings.volume))),
    rate: Math.min(1.75, Math.max(0.5, Number(settings.rate) || 1)),
    voiceURI: settings.voiceURI || "",
  };
}

function refreshVoiceCache(): SpeechSynthesisVoice[] {
  if (!hasSpeechSupport()) return [];

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }

  return cachedVoices;
}

function waitForVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  if (!hasSpeechSupport()) return Promise.resolve([]);

  const existingVoices = refreshVoiceCache();
  if (existingVoices.length > 0) return Promise.resolve(existingVoices);

  if (voiceLoadPromise) return voiceLoadPromise;

  voiceLoadPromise = new Promise((resolve) => {
    let resolved = false;
    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    const finish = () => {
      if (resolved) return;

      resolved = true;

      if (intervalId !== undefined) window.clearInterval(intervalId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);

      window.speechSynthesis.removeEventListener("voiceschanged", checkVoices);

      const voices = refreshVoiceCache();
      voiceLoadPromise = null;
      resolve(voices);
    };

    const checkVoices = () => {
      const voices = refreshVoiceCache();
      if (voices.length > 0) finish();
    };

    window.speechSynthesis.addEventListener("voiceschanged", checkVoices);

    intervalId = window.setInterval(checkVoices, 100);
    timeoutId = window.setTimeout(finish, timeoutMs);

    checkVoices();
  });

  return voiceLoadPromise;
}

export function primeTTSVoices(): void {
  if (!hasSpeechSupport()) return;

  refreshVoiceCache();
  waitForVoices().catch(() => {});

  if (!voiceListenerAttached) {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      refreshVoiceCache();
    });

    voiceListenerAttached = true;
  }

  if (!visibilityListenerAttached && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refreshVoiceCache();

        try {
          window.speechSynthesis.resume();
        } catch {
          // Safari can be picky here. Safe to ignore.
        }
      }
    });

    visibilityListenerAttached = true;
  }
}

export function unlockTTSForUserGesture(): void {
  if (!hasSpeechSupport()) return;

  primeTTSVoices();

  try {
    window.speechSynthesis.resume();
  } catch {
    // Safe fallback for browsers that do not need this.
  }
}

function getBestFallbackVoice(): SpeechSynthesisVoice | null {
  const voices = refreshVoiceCache();
  if (voices.length === 0) return null;

  return (
    voices.find((voice) => voice.lang === "en-US" && voice.localService) ??
    voices.find((voice) => voice.lang.startsWith("en") && voice.localService) ??
    voices.find((voice) => voice.lang === "en-US") ??
    voices.find((voice) => voice.lang.startsWith("en")) ??
    voices[0] ??
    null
  );
}

function resolveVoice(voiceURI: string): SpeechSynthesisVoice | null {
  const voices = refreshVoiceCache();

  if (voiceURI) {
    const exactMatch = voices.find((voice) => voice.voiceURI === voiceURI);
    if (exactMatch) return exactMatch;

    const nameMatch = voices.find((voice) => voice.name === voiceURI);
    if (nameMatch) return nameMatch;
  }

  return getBestFallbackVoice();
}

export function loadTTSSettingsFromDB(db: Database): TTSSettings {
  const settings = {
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

  return clampSettings(settings);
}

export function saveTTSSettingsToDB(db: Database, settings: TTSSettings): void {
  const cleanSettings = clampSettings(settings);

  setSetting(db, "tts_volume", cleanSettings.volume, PROFILE_ID);
  setSetting(db, "tts_rate", cleanSettings.rate, PROFILE_ID);
  setSetting(db, "tts_voiceURI", cleanSettings.voiceURI, PROFILE_ID);

  runtimeSettings = { ...cleanSettings };
  runtimeSettingsLoaded = true;

  primeTTSVoices();
}

export function setRuntimeTTSSettings(settings: TTSSettings): void {
  runtimeSettings = clampSettings(settings);
  runtimeSettingsLoaded = true;

  primeTTSVoices();
}

export function syncRuntimeTTSSettingsFromDB(db: Database): TTSSettings {
  const settings = loadTTSSettingsFromDB(db);

  runtimeSettings = { ...settings };
  runtimeSettingsLoaded = true;

  primeTTSVoices();

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

  return clampSettings({ ...base, ...overrides });
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
  const cleanText = text.trim();

  if (!cleanText) return;
  if (!hasSpeechSupport()) return;

  primeTTSVoices();
  unlockTTSForUserGesture();

  const synth = window.speechSynthesis;
  const interrupt = options?.interrupt ?? true;
  const wasBusy = synth.speaking || synth.pending;

  if (interrupt && wasBusy) {
    synth.cancel();
  }

  const speak = () => {
    try {
      if (synth.paused) {
        synth.resume();
      }

      const utterance = buildUtterance(cleanText, settings);

      utterance.onerror = () => {
        // Fallback retry with browser default voice.
        if (settings.voiceURI) {
          const fallbackSettings = { ...settings, voiceURI: "" };
          const fallbackUtterance = buildUtterance(cleanText, fallbackSettings);

          window.setTimeout(() => {
            try {
              synth.cancel();
              synth.speak(fallbackUtterance);
            } catch {
              // Avoid crashing the app if Safari rejects speech.
            }
          }, 40);
        }
      };

      synth.speak(utterance);

      window.setTimeout(() => {
        try {
          if (synth.paused) synth.resume();
        } catch {
          // Safe to ignore.
        }
      }, 0);
    } catch (err) {
      console.error("[TTS] Failed to speak:", err);
    }
  };

  // iPad/Safari can cut off speech if cancel() and speak() happen in the same tick.
  if (interrupt && wasBusy) {
    window.setTimeout(speak, 28);
  } else {
    speak();
  }
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

export function getAvailableEnglishVoices(): SpeechSynthesisVoice[] {
  return refreshVoiceCache().filter((voice) => voice.lang.startsWith("en"));
}