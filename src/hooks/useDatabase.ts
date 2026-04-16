/**
 * useDatabase.ts
 * Author: Christian Beshara
 * 
 * AA-19 Subtask AA-78: Implement fast query patterns for core features such as search, favorites, and recent history.
 */

import { useState, useEffect } from "react";
import type { Database } from "sql.js";
import { getDB } from "../db/database";
import { seedVocabularyIfEmpty } from "../db/wordRepository";
 
interface UseDatabaseResult {
  db: Database | null;
  ready: boolean;
  error: Error | null;
}
 
export function useDatabase(): UseDatabaseResult {
  const [db, setDb] = useState<Database | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
 
  useEffect(() => {
    let cancelled = false;
 
    getDB()
      .then((database) => {
        if (cancelled) return;
        // Seed vocabulary from coreWords on first launch
        seedVocabularyIfEmpty(database);
        setDb(database);
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[useDatabase] Failed to initialise DB:", err);
        setError(err as Error);
      });
 
    return () => { cancelled = true; };
  }, []);
 
  return { db, ready, error };
}
 