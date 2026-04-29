/**
 * useAIInsights.ts
 *
 * Manages AI summary generation for StatsPage.
 * - Handles model initialization, generation, storage, and staleness tracking
 * - Persists model loaded state in database so download prompt does not reappear
 */

import { useState, useEffect } from "react";
import { useDatabase } from "./useDatabase";
import {
  getTopWordsSince,
  getCategoryUsageSince,
  getInterTapStats,
  getSentenceComplexity,
} from "../db/sessionRepository";
import { getSetting, setSetting } from "../db/abaRepository";
import {
  generateInsight,
  checkAIAvailable,
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
  | "checking"
  | "unavailable"
  | "not-loaded"
  | "loading"
  | "ready"
  | "error";

interface UseAIInsightsResult {
  insight:          AIInsight | null;
  loading:          boolean;
  modelStatus:      ModelStatus;
  downloadProgress: number;
  daysAgo:          number | null;
  generate:         () => Promise<void>;
  startDownload:    () => Promise<void>;
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

// ─── Data context builder ─────────────────────────────────────────

function buildDataContext(
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

  const totalWords = profileStats?.total_words ?? 0;

  const top3 = topWords.slice(0, 3);
  const wordsText = top3.length > 0
    ? top3.map((w: any) => {
        const pct = totalWords > 0 ? Math.round((w.count / totalWords) * 100) : 0;
        return `${w.word}: ${w.count} taps (${pct}%, category: ${w.category})`;
      }).join(", ")
    : "no word data";

  const totalCatTaps = categories.reduce((s: number, c: any) => s + c.count, 0);
  const catsText = categories.length > 0
    ? categories.map((c: any) => {
        const pct = totalCatTaps > 0 ? Math.round((c.count / totalCatTaps) * 100) : 0;
        return `${c.category}: ${pct}%`;
      }).join(", ")
    : "no category data";

  const lagText = interTap
    ? `${(interTap.averageMs / 1000).toFixed(1)}s average between taps, ${interTap.hesitationRate}% hesitation rate`
    : "no timing data";

  const sentText = sentenceStats
    ? `${sentenceStats.avgLength} words average, ${sentenceStats.maxLength} words longest, ${sentenceStats.totalSentences} total sentences`
    : "no sentence data";

  return `Period: ${timeLabel}
Top 3 words: ${wordsText}
Categories: ${catsText}
Total words: ${totalWords}, Sessions: ${profileStats?.total_sessions ?? 0}, Avg per session: ${profileStats?.avg_words_per_session ?? 0}
Sentences: ${sentText}
Tap timing: ${lagText}`;
}

// ─── Individual section prompts ────────────────────────────────────

function summaryPrompt(data: string, timeLabel: string): string {
  return `You are an ABA therapy assistant. Use ONLY the numbers in the data below. Do not invent data. Do not reference any time period other than ${timeLabel}. Do not introduce your response. Start writing directly with the first sentence of content.
Write 3 sentences about ${timeLabel} only.
(1) State the key stats including top words and their percentages.
(2) Give one clinical insight about what the patterns indicate.
(3) Give one specific suggestion for the caregiver.


Data for ${timeLabel}:
${data}`;
}

function complexityPrompt(data: string, timeLabel: string): string {
  return `You are an ABA therapy assistant. Use ONLY the numbers in the data below. Do not invent data. Do not reference any time period other than ${timeLabel}. Do not introduce your response. Start writing directly with the first sentence of content.
Write 3  sentences about sentence complexity for ${timeLabel} only.
(1) State the sentence length stats with numbers from the data.
(2) Give one insight about what this sentence length indicates developmentally.
(3) Give one specific suggestion for encouraging longer sentences.


Data for ${timeLabel}:
${data}`;
}

function lagTimePrompt(data: string, timeLabel: string): string {
  return `You are an ABA therapy assistant. Use ONLY the numbers in the data below. Do not invent data. Do not reference any time period other than ${timeLabel}. Do not introduce your response. Start writing directly with the first sentence of content.
Write 3 sentences about tap timing for ${timeLabel} only.
(1) State the hesitation rate and average tap timing using the exact numbers from the data.
(2) Give one insight about what the hesitation rate may indicate.
(3) Give one specific suggestion related to board layout or practice.


Data for ${timeLabel}:
${data}`;
}

function wordSuggestionsPrompt(data: string, timeLabel: string): string {
  return `You are an ABA therapy assistant. Use ONLY the words listed in the data below. Do not invent words or patterns. Do not reference any time period other than ${timeLabel}. Do not introduce your response. Start writing directly with the first sentence of content.
Write 3 sentences about word suggestions for ${timeLabel} only.
(1) Identify the most overused word from the data and its exact percentage.
(2) Suggest a more specific or sophisticated single word to replace or supplement it if possible.


Data for ${timeLabel}:
${data}`;
}

export function useAIInsights(timeframe: Timeframe): UseAIInsightsResult {
  const { db, ready } = useDatabase();

  const [insight,          setInsight]          = useState<AIInsight | null>(null);
  const [loading,          setLoading]          = useState(false);
  const [modelStatus,      setModelStatus]      = useState<ModelStatus>("checking");
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Check availability and whether model was previously loaded
  useEffect(() => {
    async function check() {
      const ok = await checkAIAvailable();
      if (!ok) { setModelStatus("unavailable"); return; }

      if (db && ready) {
        const wasLoaded = getSetting<boolean>(db, "ai_model_loaded", PROFILE_ID);
        if (wasLoaded) {
          setModelStatus("loading");
          const success = await downloadModel(() => {});
          setModelStatus(success ? "ready" : "not-loaded");
          return;
        }
      }

      setModelStatus("not-loaded");
    }
    check();
  }, [db, ready]);

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
    setModelStatus("loading");
    setDownloadProgress(0);
    const success = await downloadModel((pct) => setDownloadProgress(pct));
    if (success && db && ready) {
      setSetting(db, "ai_model_loaded", true, PROFILE_ID);
    }
    setModelStatus(success ? "ready" : "error");
  };

  const generate = async () => {
    if (!db || !ready || modelStatus !== "ready") return;
    setLoading(true);

    try {
      const since = getSinceMs(timeframe);
      const topWords      = getTopWordsSince(db, PROFILE_ID, since, 10);
      const categories    = getCategoryUsageSince(db, PROFILE_ID, since, 5);
      const interTap      = getInterTapStats(db, PROFILE_ID, since);
      const sentenceStats = getSentenceComplexity(db, PROFILE_ID, since);

      const sessions = db.exec(
        `SELECT COUNT(*) FROM sessions WHERE profile_id = ? AND started_at >= ?;`,
        [PROFILE_ID, since]
      );
      const totalWordsInPeriod    = topWords.reduce((sum: number, w: any) => sum + w.count, 0);
      const totalSessionsInPeriod = (sessions[0]?.values?.[0]?.[0] as number) ?? 0;
      const avgWordsPerSession    = totalSessionsInPeriod > 0
        ? Math.round(totalWordsInPeriod / totalSessionsInPeriod) : 0;

      const profileStats = {
        total_words:           totalWordsInPeriod,
        total_sessions:        totalSessionsInPeriod,
        avg_words_per_session: avgWordsPerSession,
      };

      // Build shared data context
      const timeLabel =
        timeframe === "day"   ? "the past 24 hours" :
        timeframe === "month" ? "the past 30 days"  :
        timeframe === "year"  ? "the past year"      :
        "all time";

      const dataCtx = buildDataContext(
        timeframe, topWords, categories, profileStats, interTap, sentenceStats
      );

      // Four separate focused calls — one per section, each with timeLabel
      const [summary, sentenceComplexity, lagTime, wordSuggestions] = await Promise.all([
        generateInsight(summaryPrompt(dataCtx, timeLabel)),
        generateInsight(complexityPrompt(dataCtx, timeLabel)),
        generateInsight(lagTimePrompt(dataCtx, timeLabel)),
        generateInsight(wordSuggestionsPrompt(dataCtx, timeLabel)),
      ]);

      if (!summary && !sentenceComplexity && !lagTime && !wordSuggestions) {
        setModelStatus("error");
        setLoading(false);
        return;
      }

      const parsed: AIInsight = {
        summary:            summary            ?? "No data available.",
        sentenceComplexity: sentenceComplexity ?? "No data available.",
        lagTime:            lagTime            ?? "No data available.",
        wordSuggestions:    wordSuggestions    ?? "No data available.",
        generatedAt:        Date.now(),
      };

      setSetting(db, storageKey(timeframe), parsed, PROFILE_ID);
      setInsight(parsed);
    } catch {
      setModelStatus("error");
    }

    setLoading(false);
  };

  return {
    insight,
    loading,
    modelStatus,
    downloadProgress,
    daysAgo,
    generate,
    startDownload,
  };
}