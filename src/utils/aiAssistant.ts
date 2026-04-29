/**
 * aiAssistant.ts
 *
 * On-device AI inference using Transformers.js (@huggingface/transformers).
 * Model: Qwen2.5-0.5B-Instruct (ONNX, no auth required, ~400MB)
 *
 * - Downloads automatically on first use, cached in browser or device filesystem
 * - No API key, no account, no server
 * - Works in browser via WebGPU (fast) or WASM fallback (universal)
 * - Works in Capacitor iOS/Android via the same WASM path
 * - isCapacitor check routes storage correctly for each environment
 */

import { pipeline, env } from "@huggingface/transformers";

// Detect if running inside Capacitor (mobile app)
const isCapacitor =
  typeof window !== "undefined" &&
  typeof (window as any).Capacitor !== "undefined";

if (isCapacitor) {
  // On Capacitor, disable browser cache and use local model path
  // Model file should be placed in app assets or downloaded to device storage
  env.allowLocalModels = true;
  env.useBrowserCache  = false;
} else {
  // On web browser, use browser cache — model persists across sessions
  env.allowLocalModels = false;
  env.useBrowserCache  = true;
}

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

// Singleton pipeline — initialized once, reused for all calls
let generator: any       = null;
let generatorLoading     = false;

export type DownloadProgressCallback = (percent: number) => void;

/**
 * Check if the device can run AI inference.
 * WASM is universally available — this is almost always true.
 */
export async function checkAIAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  return typeof WebAssembly !== "undefined";
}

/**
 * Check if the model is already cached.
 * On web: checks browser cache.
 * On Capacitor: always returns false (model readiness tracked in DB instead).
 */
export async function isModelCached(): Promise<boolean> {
  if (isCapacitor) return false;
  try {
    const cache = await caches.open("transformers-cache");
    const keys  = await cache.keys();
    return keys.some((k) => k.url.includes("Qwen2.5-0.5B"));
  } catch {
    return false;
  }
}

/**
 * Initialize the pipeline with optional progress tracking.
 * Tries WebGPU first for speed, falls back to WASM for compatibility.
 */
async function getGenerator(
  onProgress?: DownloadProgressCallback
): Promise<any> {
  if (generator) return generator;
  if (generatorLoading) return null;

  generatorLoading = true;

  try {
    const device = (navigator as any).gpu ? "webgpu" : "wasm";

    generator = await pipeline("text-generation", MODEL_ID, {
      device,
      dtype: "q4",
      progress_callback: onProgress
        ? (progress: any) => {
            if (progress.status === "downloading" && progress.total > 0) {
              onProgress(Math.round((progress.loaded / progress.total) * 100));
            }
          }
        : undefined,
    });

    return generator;
  } catch {
    generatorLoading = false;
    return null;
  }
}

/**
 * Download/initialize the model with progress tracking.
 */
export async function downloadModel(
  onProgress: DownloadProgressCallback
): Promise<boolean> {
  try {
    const gen = await getGenerator(onProgress);
    return !!gen;
  } catch {
    return false;
  }
}

/**
 * Strip ALL markdown and special formatting from AI output.
 */
function stripFormatting(text: string): string {
  let clean = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[\-\*\u2022]\s+/gm, "")
    .replace(/^\(?\d+\)?\.?\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/  +/g, " ")
    .replace(/\n+/g, " ")
    .trim();

  return clean;
}

/**
 * Generate a text response for a single focused section.
 * Returns null if the model is unavailable.
 */
export async function generateInsight(prompt: string): Promise<string | null> {
  try {
    const gen = await getGenerator();
    if (!gen) return null;

    const messages = [
      {
        role: "system",
        content:
          "You are an ABA therapy assistant. Write plain text only. No markdown, no asterisks, no dashes, no numbered lists, no bold, no special characters. Do not introduce your response. Start writing directly.",
      },
      { role: "user", content: prompt },
    ];

    const output = await gen(messages, {
      max_new_tokens: 150,
      temperature:    0.3,
      top_k:          40,
      do_sample:      true,
    });

    const raw =
      output?.[0]?.generated_text?.at(-1)?.content?.trim() ??
      output?.[0]?.generated_text?.trim() ??
      null;

    return raw ? stripFormatting(raw) : null;
  } catch {
    return null;
  }
}