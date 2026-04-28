/**
 * usePrediction.ts
 * Author: Christian Beshara
 *
 * AA-110: Word fill / text prediction using bigrams.
 *
 * After every word tap looks up the most likely next word
 * based on that user's bigram history. Returns the top prediction
 * 
 *
 * Falls back gracefully if no bigram data exists yet
 */

import { useState, useEffect } from "react";
import type { Database } from "sql.js";
import { getPredictions } from "../db/sessionRepository";

const DEFAULT_PROFILE_ID = "default_profile";

interface UsePredictionResult {
  prediction: string | null;   // the ghost word to show, or null if none
  acceptPrediction: () => void; // call when Fill button is pressed
  clearPrediction: () => void;  // call when sentence is cleared
}

export function usePrediction(
  db: Database | null,
  sentenceWords: string[],
  onAccept: (word: string) => void
): UsePredictionResult {
  const [prediction, setPrediction] = useState<string | null>(null);

  useEffect(() => {
    // No prediction if DB not ready or sentence is empty
    if (!db || sentenceWords.length === 0) {
      setPrediction(null);
      return;
    }

    const lastWord = sentenceWords[sentenceWords.length - 1];

    try {
      const results = getPredictions(db, DEFAULT_PROFILE_ID, lastWord, 1);
      if (results.length > 0) {
        setPrediction(results[0].second_word);
      } else {
        setPrediction(null);
      }
    } catch {
      setPrediction(null);
    }
  }, [db, sentenceWords]);

  const acceptPrediction = () => {
    if (!prediction) return;
    onAccept(prediction);
  };

  const clearPrediction = () => {
    setPrediction(null);
  };

  return { prediction, acceptPrediction, clearPrediction };
}