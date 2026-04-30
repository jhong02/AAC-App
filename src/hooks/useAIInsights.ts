/**
 * useAIInsights.ts
 *
 * Manages AI summary generation for StatsPage.
 * Four focused 1-3 sentence sections:
 * - Summary: interprets top 3 stats for the timeframe
 * - Growth: compares current vs previous snapshot
 * - Word Suggestions: category to expand + unused words to remove
 * - Lag Time: hesitation rate vs previous snapshot
 */

import { useState, useEffect } from "react";
import { useDatabase } from "./useDatabase";
import {
  getTopWordsSince,
  getCategoryUsageSince,
  getInterTapStats,
  getSentenceComplexity,
  getUnusedWords,
} from "../db/sessionRepository";
import { getSetting, setSetting } from "../db/abaRepository";
import {
  generateInsight,
  checkAIAvailable,
  downloadModel,
} from "../utils/aiAssistant";

const PROFILE_ID = "default_profile";



export type Timeframe = "day" | "week" | "month" | "year" | "total";

export interface AIInsight {
  summary:         string;
  growth:          string;
  wordSuggestions: string;
  lagTime:         string;
  generatedAt:     number;
}

// Snapshot saved alongside each summary for future comparison
interface StatsSnapshot {
  totalWords:        number;
  avgSentenceLength: number;
  hesitationRate:    number;
  topCategory:       string;
  generatedAt:       number;
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
    case "week":  return now - 7   * 24 * 60 * 60 * 1000;
    case "month": return now - 30  * 24 * 60 * 60 * 1000;
    case "year":  return now - 365 * 24 * 60 * 60 * 1000;
    case "total": return 0;
  }
}

function storageKey(timeframe: Timeframe): string {
  return `ai_insight_${timeframe}`;
}

function snapshotKey(timeframe: Timeframe): string {
  return `ai_snapshot_${timeframe}`;
}

function daysAgoFromTimestamp(ts: number): number {
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
}

function timeLabel(timeframe: Timeframe): string {
  switch (timeframe) {
    case "day":   return "the past 24 hours";
    case "week":  return "the past 7 days";
    case "month": return "the past 30 days";
    case "year":  return "the past year";
    case "total": return "all time";
  }
}

// ─── Prompts ───────────────────────────────────────────────────────

function summaryPrompt(
  period: string,
  totalWords: number,
  topWords: any[],
  topCategory: string,
  topCategoryPct: number
): string {
  const top3 = topWords.slice(0, 3)
    .map((w: any) => `${w.word} (${w.count} taps)`)
    .join(", ");

  return `Write 1 to 3 plain sentences summarizing AAC communication for ${period}. State the total words tapped, the top 3 words used, and note that ${topCategory} was the dominant category at ${topCategoryPct}%. Briefly interpret what this suggests about communication patterns. No markdown. No lists. No introduction.

Data: ${totalWords} total words. Top words: ${top3}. Dominant category: ${topCategory} (${topCategoryPct}%).`;
}

function growthPrompt(
  period: string,
  current: StatsSnapshot,
  previous: StatsSnapshot | null
): string {
  if (!previous) {
    return `Write 1 plain sentence saying there is not enough history yet to show growth for ${period}.`;
  }

  const wordDiff = current.totalWords - previous.totalWords;
  const wordDir  = wordDiff >= 0 ? "up" : "down";
  const lagDiff  = current.hesitationRate - previous.hesitationRate;
  const lagDir   = lagDiff <= 0 ? "improved" : "increased";

  return `Write 1 to 3 plain sentences comparing communication for ${period} to the previous summary. Total words are ${wordDir} by ${Math.abs(wordDiff)}. Hesitation rate has ${lagDir} by ${Math.abs(lagDiff)}%. Sentence length went from ${previous.avgSentenceLength} to ${current.avgSentenceLength} words. State only what changed, no interpretation. No markdown. No lists. No introduction.`;
}

// Word suggestions generated directly in code — no AI needed
function generateWordSuggestionsText(
  categories: any[],
  unusedWords: string[],
  totalCatTaps: number
): string {
  if (categories.length === 0) return "No category data available.";

  const sorted    = [...categories].sort((a, b) => a.count - b.count);
  const smallest  = sorted[0];
  const smallPct  = totalCatTaps > 0
    ? Math.round((smallest.count / totalCatTaps) * 100) : 0;

  let text = `The ${smallest.category} category is the least used at ${smallPct}% of taps. Consider adding more words to this category.`;

  if (unusedWords.length > 0) {
    text += ` The following words have not been tapped in 30 days and may be worth removing: ${unusedWords.join(", ")}.`;
  }

  return text;
}

function lagTimePrompt(
  period: string,
  currentRate: number,
  currentAvgMs: number,
  previousRate: number | null
): string {
  if (previousRate === null) {
    return `Write 1 plain sentence saying there is not enough history yet to compare lag time for ${period}. State the current hesitation rate is ${currentRate}% with an average of ${(currentAvgMs / 1000).toFixed(1)} seconds between taps.`;
  }

  const diff = currentRate - previousRate;
  const dir  = diff <= 0 ? "down" : "up";

  return `Write 1 to 3 plain sentences about tap timing for ${period}. The hesitation rate is ${dir} ${Math.abs(diff)}% from last time, now at ${currentRate}%. Average time between taps is ${(currentAvgMs / 1000).toFixed(1)} seconds. If hesitation is high suggest the board layout may need review. No markdown. No lists. No introduction.`;
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useAIInsights(timeframe: Timeframe): UseAIInsightsResult {
  const { db, ready } = useDatabase();

  const [insight,          setInsight]          = useState<AIInsight | null>(null);
  const [loading,          setLoading]          = useState(false);
  const [modelStatus,      setModelStatus]      = useState<ModelStatus>("checking");
  const [downloadProgress, setDownloadProgress] = useState(0);

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
      const since      = getSinceMs(timeframe);
      const label      = timeLabel(timeframe);
      const topWords   = getTopWordsSince(db, PROFILE_ID, since, 10);
      const categories = getCategoryUsageSince(db, PROFILE_ID, since, 5);
      const interTap   = getInterTapStats(db, PROFILE_ID, since);
      const sentStats  = getSentenceComplexity(db, PROFILE_ID, since);
      const unusedWords = getUnusedWords(db, PROFILE_ID, 30);

      const sessions = db.exec(
        `SELECT COUNT(*) FROM sessions WHERE profile_id = ? AND started_at >= ?;`,
        [PROFILE_ID, since]
      );
      const totalWords        = topWords.reduce((s: number, w: any) => s + w.count, 0);
      const totalSessions     = (sessions[0]?.values?.[0]?.[0] as number) ?? 0;
      const totalCatTaps      = categories.reduce((s: number, c: any) => s + c.count, 0);
      const topCat            = categories[0];
      const topCatPct         = topCat && totalCatTaps > 0
        ? Math.round((topCat.count / totalCatTaps) * 100) : 0;
      const avgSentLen        = sentStats?.avgLength ?? 0;
      const hesitationRate    = interTap?.hesitationRate ?? 0;
      const avgMs             = interTap?.averageMs ?? 0;

      // Load previous snapshot for comparison
      const prevSnapshot = getSetting<StatsSnapshot>(
        db, snapshotKey(timeframe), PROFILE_ID
      ) ?? null;

      // Build current snapshot
      const currentSnapshot: StatsSnapshot = {
        totalWords,
        avgSentenceLength: avgSentLen,
        hesitationRate,
        topCategory:       topCat?.category ?? "",
        generatedAt:       Date.now(),
      };

      // Word suggestions generated directly — no AI needed
      const wordSuggestions = generateWordSuggestionsText(categories, unusedWords, totalCatTaps);

      // Three AI calls in parallel for the remaining sections
      const [summary, growth, lagTime] = await Promise.all([
        generateInsight(summaryPrompt(label, totalWords, topWords, topCat?.category ?? "unknown", topCatPct)),
        generateInsight(growthPrompt(label, currentSnapshot, prevSnapshot)),
        generateInsight(lagTimePrompt(label, hesitationRate, avgMs, prevSnapshot?.hesitationRate ?? null)),
      ]);

      const parsed: AIInsight = {
        summary:         summary         ?? "No data available.",
        growth:          growth          ?? "Not enough history yet to show growth.",
        wordSuggestions: wordSuggestions ?? "No data available.",
        lagTime:         lagTime         ?? "No data available.",
        generatedAt:     Date.now(),
      };

      // Save insight and snapshot
      setSetting(db, storageKey(timeframe), parsed, PROFILE_ID);
      setSetting(db, snapshotKey(timeframe), currentSnapshot, PROFILE_ID);
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