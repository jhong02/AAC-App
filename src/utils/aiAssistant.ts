/**
 * aiAssistant.ts
 *
 * On-device AI inference using Transformers.js (@huggingface/transformers).
 * Model: Qwen2.5-0.5B-Instruct (ONNX, no auth required, ~400MB)
 *
 * - Downloads automatically on first use, cached in browser forever
 * - No API key, no account, no server
 * - Works in browser via WebGPU (fast) or WASM fallback (slower but universal)
 * - Same code works in Capacitor mobile app
 *
 * Stage 2 (mobile): add device check and swap to WASM explicitly
 * for older iPads that don't support WebGPU.
 */

import { pipeline, env } from "@huggingface/transformers";

// Use browser cache — model persists across sessions
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

// Singleton pipeline — initialized once, reused for all calls
let generator: any = null;
let generatorLoading = false;

export type DownloadProgressCallback = (percent: number) => void;

/**
 * Check if the device can run AI inference.
 * Returns true if WebGPU or WASM is available.
 * WASM is always available in modern browsers so this is almost always true.
 */
export async function checkAIAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  // WASM is the universal fallback — available on all modern browsers
  return typeof WebAssembly !== "undefined";
}

/**
 * Check if the model is already cached in the browser.
 */
export async function isModelCached(): Promise<boolean> {
  try {
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();
    return keys.some((k) => k.url.includes("Qwen2.5-0.5B"));
  } catch {
    // If cache API unavailable, assume not cached
    return false;
  }
}

/**
 * Initialize the pipeline with optional progress tracking.
 * Transformers.js handles the download and caching automatically.
 */
async function getGenerator(
  onProgress?: DownloadProgressCallback
): Promise<any> {
  if (generator) return generator;
  if (generatorLoading) return null;

  generatorLoading = true;

  try {
    // Try WebGPU first for speed, fall back to WASM
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
 * Download the model with progress tracking.
 * Since Transformers.js downloads automatically during pipeline init,
 * this just initializes the pipeline and tracks progress.
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
 * Generate a text response from the model.
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
          "You are an ABA therapy assistant. Respond only with the four labeled sections requested. No extra text.",
      },
      { role: "user", content: prompt },
    ];

    const output = await gen(messages, {
      max_new_tokens: 500,
      temperature: 0.4,
      top_k: 40,
      do_sample: true,
    });

    // Extract assistant response text
    const text =
      output?.[0]?.generated_text?.at(-1)?.content?.trim() ??
      output?.[0]?.generated_text?.trim() ??
      null;

    return text;
  } catch {
    return null;
  }
}