/**
 * useAIInsights.ts
 *
 * Manages AI summary generation for StatsPage.
 * Handles model download state, generation, storage, and staleness tracking.
 */

import { useState, useEffect } from "react";
import { useDatabase } from "./useDatabase";
import {
  getTopWordsSince,
  getCategoryUsageSince,
  getProfileStats,
  getInterTapStats,
  getSentenceComplexity,
} from "../db/sessionRepository";
import { getSetting, setSetting } from "../db/abaRepository";
import {
  generateInsight,
  checkAIAvailable,
  isModelCached,
  downloadModel,
} from "../utils/aiAssistant";

const PROFILE_ID = "default_profile";

export type Timeframe = "day" | "month" | "year" | "total";

export interface AIInsight {
  summary:            string;
  sentenceComplexity: string;
  lagTime:            string;
  wordSuggestions:    string;
  generatedAt:        number;
}

export type ModelStatus =
  | "checking"      // checking WebGPU and cache
  | "unavailable"   // WebGPU not supported
  | "not-downloaded"// WebGPU ok but model not cached
  | "downloading"   // actively downloading
  | "ready"         // model cached and engine ready
  | "error";        // download or generation failed

interface UseAIInsightsResult {
  insight:      AIInsight | null;
  loading:      boolean;
  modelStatus:  ModelStatus;
  downloadProgress: number;
  daysAgo:      number | null;
  generate:     () => Promise<void>;
  startDownload: () => Promise<void>;
}

function getSinceMs(timeframe: Timeframe): number {
  const now = Date.now();
  switch (timeframe) {
    case "day":   return now - 1   * 24 * 60 * 60 * 1000;
    case "month": return now - 30  * 24 * 60 * 60 * 1000;
    case "year":  return now - 365 * 24 * 60 * 60 * 1000;
    case "total": return 0;
  }
}

function storageKey(timeframe: Timeframe): string {
  return `ai_insight_${timeframe}`;
}

function daysAgoFromTimestamp(ts: number): number {
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
}

function buildPrompt(
  timeframe: Timeframe,
  topWords: any[],
  categories: any[],
  profileStats: any,
  interTap: any,
  sentenceStats: any
): string {
  const timeLabel =
    timeframe === "day"   ? "the past 24 hours" :
    timeframe === "month" ? "the past 30 days"  :
    timeframe === "year"  ? "the past year"      :
    "all time";

  const wordsText = topWords.length > 0
    ? topWords.map((w: any) => `${w.word} (${w.count} times, category: ${w.category})`).join(", ")
    : "no word data available";

  const categoriesText = categories.length > 0
    ? categories.map((c: any) => `${c.category}: ${c.count} taps`).join(", ")
    : "no category data available";

  const lagText = interTap
    ? `Average ${(interTap.averageMs / 1000).toFixed(1)} seconds between taps. ${interTap.hesitations} hesitations detected. Hesitation rate: ${interTap.hesitationRate}%.`
    : "No inter-tap data available.";

  const complexityText = sentenceStats
    ? `Average sentence length: ${sentenceStats.avgLength} words. Longest sentence: ${sentenceStats.maxLength} words. Total sentences: ${sentenceStats.totalSentences}.`
    : "No sentence data available.";

  return `You are an ABA therapy assistant helping caregivers track communication progress for children using AAC devices.

Analyze the following communication data for ${timeLabel} and provide a structured clinical report with exactly four sections. Each section must start with its label on its own line. Use plain text only, no markdown, no bullet points, no emojis.

Communication data:
- Most used words: ${wordsText}
- Category usage: ${categoriesText}
- Total words tapped: ${profileStats?.total_words ?? 0}
- Total sessions: ${profileStats?.total_sessions ?? 0}
- Average words per session: ${profileStats?.avg_words_per_session ?? 0}
- Sentence complexity: ${complexityText}
- Tap timing: ${lagText}

Write exactly these four sections:

SUMMARY
Two to three sentences summarizing overall communication patterns and volume.

SENTENCE COMPLEXITY
Two to three sentences analyzing sentence length and suggestions for encouraging longer sentences.

LAG TIME
Two to three sentences interpreting the inter-tap timing and what hesitations may indicate.

WORD SUGGESTIONS
Two to three sentences identifying overused words and suggesting more specific alternatives or phrase tiles.`;
}

function parseInsightText(text: string): Omit<AIInsight, "generatedAt"> {
  const summaryMatch     = text.match(/SUMMARY\s*([\s\S]*?)(?=SENTENCE COMPLEXITY|$)/i);
  const complexityMatch  = text.match(/SENTENCE COMPLEXITY\s*([\s\S]*?)(?=LAG TIME|$)/i);
  const lagMatch         = text.match(/LAG TIME\s*([\s\S]*?)(?=WORD SUGGESTIONS|$)/i);
  const suggestionsMatch = text.match(/WORD SUGGESTIONS\s*([\s\S]*?)$/i);

  return {
    summary:            summaryMatch?.[1]?.trim()     ?? "",
    sentenceComplexity: complexityMatch?.[1]?.trim()  ?? "",
    lagTime:            lagMatch?.[1]?.trim()         ?? "",
    wordSuggestions:    suggestionsMatch?.[1]?.trim() ?? "",
  };
}

export function useAIInsights(timeframe: Timeframe): UseAIInsightsResult {
  const { db, ready } = useDatabase();
  const [insight,           setInsight]           = useState<AIInsight | null>(null);
  const [loading,           setLoading]           = useState(false);
  const [modelStatus,       setModelStatus]       = useState<ModelStatus>("checking");
  const [downloadProgress,  setDownloadProgress]  = useState(0);

  // Check WebGPU + cache on mount
  useEffect(() => {
    async function check() {
      const available = await checkAIAvailable();
      if (!available) { setModelStatus("unavailable"); return; }
      const cached = await isModelCached();
      setModelStatus(cached ? "ready" : "not-downloaded");
    }
    check();
  }, []);

  // Load stored insight when timeframe changes
  useEffect(() => {
    if (!ready || !db) return;
    try {
      const stored = getSetting<AIInsight>(db, storageKey(timeframe), PROFILE_ID);
      setInsight(stored ?? null);
    } catch {
      setInsight(null);
    }
  }, [ready, db, timeframe]);

  const daysAgo = insight ? daysAgoFromTimestamp(insight.generatedAt) : null;

  const startDownload = async () => {
    setModelStatus("downloading");
    setDownloadProgress(0);
    const success = await downloadModel((pct) => setDownloadProgress(pct));
    setModelStatus(success ? "ready" : "error");
  };

  const generate = async () => {
    if (!db || !ready || modelStatus !== "ready") return;
    setLoading(true);

    try {
      const since         = getSinceMs(timeframe);
      const topWords      = getTopWordsSince(db, PROFILE_ID, since, 10);
      const categories    = getCategoryUsageSince(db, PROFILE_ID, since, 5);
      const profileStats  = getProfileStats(db, PROFILE_ID);
      const interTap      = getInterTapStats(db, PROFILE_ID, since);
      const sentenceStats = getSentenceComplexity(db, PROFILE_ID, since);

      const prompt = buildPrompt(timeframe, topWords, categories, profileStats, interTap, sentenceStats);
      const text   = await generateInsight(prompt);

      if (!text) {
        setModelStatus("error");
        setLoading(false);
        return;
      }

      const parsed: AIInsight = { ...parseInsightText(text), generatedAt: Date.now() };
      setSetting(db, storageKey(timeframe), parsed, PROFILE_ID);
      setInsight(parsed);
    } catch {
      setModelStatus("error");
    }

    setLoading(false);
  };

  return { insight, loading, modelStatus, downloadProgress, daysAgo, generate, startDownload };
}