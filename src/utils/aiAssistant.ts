/**
 * aiAssistant.ts
 *
 * AI inference using MediaPipe Gemma running entirely on-device.
 * The model downloads once (~1.5GB) and is cached in the browser forever.
 * No API key, no server, no data leaves the device.
 *
 * Stage 2 note: when moving to Capacitor mobile, update MODEL_PATH
 * to use Capacitor filesystem and add the isCapacitor env check.
 */

import { FilesetResolver, LlmInference } from "@mediapipe/tasks-genai";
 
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/llm_inference/gemma-2b-it-gpu-int8/float16/1/gemma-2b-it-gpu-int8.bin";
 
const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm";
 
// Singleton engine — initialized once, reused for all calls
let engine: LlmInference | null = null;
let engineLoading = false;
 
export type DownloadProgressCallback = (percent: number) => void;
 
/**
 * Check if WebGPU is available on this device.
 * Required for MediaPipe Gemma to run.
 */
export async function checkAIAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (!("gpu" in navigator)) return false;
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}
 
/**
 * Check if the model has already been downloaded and cached.
 */
export async function isModelCached(): Promise<boolean> {
  try {
    const cache = await caches.open("mediapipe-gemma");
    const match = await cache.match(MODEL_URL);
    return !!match;
  } catch {
    return false;
  }
}
 
/**
 * Download the model with progress tracking.
 * Stores in browser cache so subsequent loads are instant.
 */
export async function downloadModel(
  onProgress: DownloadProgressCallback
): Promise<boolean> {
  try {
    const response = await fetch(MODEL_URL);
    if (!response.ok || !response.body) return false;
 
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
 
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (contentLength > 0) {
        onProgress(Math.round((received / contentLength) * 100));
      }
    }
 
    // Store in cache
    const blob = new Blob(chunks as BlobPart[]);
    const cache = await caches.open("mediapipe-gemma");
    await cache.put(MODEL_URL, new Response(blob));
 
    onProgress(100);
    return true;
  } catch {
    return false;
  }
}
 
/**
 * Initialize the MediaPipe engine.
 * Uses cached model if available.
 */
async function getEngine(): Promise<LlmInference | null> {
  if (engine) return engine;
  if (engineLoading) return null;
 
  engineLoading = true;
  try {
    const genai = await FilesetResolver.forGenAiTasks(WASM_PATH);
    engine = await LlmInference.createFromModelPath(genai, MODEL_URL);
    return engine;
  } catch {
    engineLoading = false;
    return null;
  }
}
 
/**
 * Generate a text response from Gemma.
 * Returns null if the model is unavailable or not downloaded.
 */
export async function generateInsight(prompt: string): Promise<string | null> {
  try {
    const llm = await getEngine();
    if (!llm) return null;
 
    const response = await llm.generateResponse(prompt);
    return response?.trim() ?? null;
  } catch {
    return null;
  }
}