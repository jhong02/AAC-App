/**
 * useTTSSettings
 *
 * Shared hook for reading/writing TTS settings (volume, rate, voiceURI)
 * to localStorage so AudioPage and TalkPage stay in sync.
 */
 
export const TTS_STORAGE_KEY = "aac_tts_settings";
 
export interface TTSSettings {
  volume: number;   // 0–100  (stored as 0–100, converted to 0–1 for Web Speech API)
  rate: number;     // 0.5–1.75
  voiceURI: string; // SpeechSynthesisVoice.voiceURI, empty = browser default
}
 
export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  volume: 80,
  rate: 1.0,
  voiceURI: "",
};
 
export function loadTTSSettings(): TTSSettings {
  try {
    const raw = localStorage.getItem(TTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TTS_SETTINGS };
    return { ...DEFAULT_TTS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TTS_SETTINGS };
  }
}
 
export function saveTTSSettings(settings: TTSSettings): void {
  localStorage.setItem(TTS_STORAGE_KEY, JSON.stringify(settings));
}
 
/**
 * Speak text using current persisted TTS settings.
 * Pass an optional override object to use different settings for a preview.
 */
export function speakWithSettings(
  text: string,
  overrides?: Partial<TTSSettings>
): void {
  if (!text.trim()) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
 
  const settings = { ...loadTTSSettings(), ...overrides };
 
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
 
  utterance.volume = settings.volume / 100;
  utterance.rate = settings.rate;
  utterance.pitch = 1;
 
  if (settings.voiceURI) {
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (match) utterance.voice = match;
  }
 
  window.speechSynthesis.speak(utterance);
}