/**
 * sessionRepository.ts
 * author: Christian Beshara
 * 
 * AA-19 Subtask AA-77: Build a data access layer (CRUD functions)
 * to create, read, update, and delete words, categories, and settings efficiently.
 * 
 * Heart of analyitcs page
 */

import type { Database } from "sql.js";
import type { Session, WordEvent, Bigram } from "./schema";
import { schedulePersist, uuid } from "./database";

//Row mapping
function rowToSession(row: unknown[]): Session {
  return {
    id:          row[0] as string,
    profile_id:  row[1] as string,
    started_at:  row[2] as number,
    ended_at:    row[3] as number | undefined,
    word_count:  row[4] as number,
  };
}
//WordEvent row mapping
function rowToWordEvent(row: unknown[]): WordEvent {
  return {
    id:         row[0] as number,
    session_id: row[1] as string,
    profile_id: row[2] as string,
    word_id:    row[3] as string,
    word:       row[4] as string,
    category:   row[5] as string,
    position:   row[6] as number,
    timestamp:  row[7] as number,
  };
}

//Session page

//Begin Session
export function startSession(db: Database, profileId: string): Session {
  const id = uuid();
  const now = Date.now();

  db.run(
    `INSERT OR IGNORE INTO profiles (id, name, avatar_color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?);`,
    [profileId, "Default User", "#49a8f0", now, now]
  );

  db.run(
    "INSERT INTO sessions (id, profile_id, started_at, word_count) VALUES (?, ?, ?, 0);",
    [id, profileId, now]
  );
  schedulePersist(db);
  return { id, profile_id: profileId, started_at: now, word_count: 0 };
}

//End Session
export function endSession(db: Database, sessionId: string): void {
  db.run(
    "UPDATE sessions SET ended_at = ? WHERE id = ?;",
    [Date.now(), sessionId]
  );
  schedulePersist(db);
}

//Gets most receent session for stats page
export function getRecentSessions(
  db: Database,
  profileId: string,
  limit = 30
): Session[] {
  const result = db.exec(
    `SELECT * FROM sessions
     WHERE profile_id = ?
     ORDER BY started_at DESC
     LIMIT ?;`,
    [profileId, limit]
  );
  return result[0]?.values.map(rowToSession) ?? [];
}

//Events for words
export interface LogWordTapInput {
  sessionId: string;
  profileId: string;
  wordId: string;
  word: string;
  category: string;
  position: number; // current sentence length at time of tap
}
 
/**
 * Log a single word tap.
 * Also updates session word_count and the bigram table.
 * Call from TalkPage every time a tile is pressed.
 */
export function logWordTap(db: Database, input: LogWordTapInput): void {
  const now = Date.now();
 
  // 1. Insert word event
  db.run(
    `INSERT INTO word_events (session_id, profile_id, word_id, word, category, position, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [input.sessionId, input.profileId, input.wordId, input.word, input.category, input.position, now]
  );
 
  // 2. Increment session word_count
  db.run(
    "UPDATE sessions SET word_count = word_count + 1 WHERE id = ?;",
    [input.sessionId]
  );
 
  // 3. Update bigram if there's a previous word in the sentence
  if (input.position > 0) {
    // Get the previous word in this session at position - 1
    const prev = db.exec(
      `SELECT word FROM word_events
       WHERE session_id = ? AND position = ?
       ORDER BY timestamp DESC LIMIT 1;`,
      [input.sessionId, input.position - 1]
    );
    const prevWord = prev[0]?.values?.[0]?.[0] as string | undefined;
    if (prevWord) {
      updateBigram(db, input.profileId, prevWord, input.word, now);
    }
  }
 
  schedulePersist(db);
}


//Statistics queries
export interface WordFrequency {
  word: string;
  word_id: string;
  category: string;
  count: number;
}

//top n most used words for a given profile
export function getTopWords(
  db: Database,
  profileId: string,
  limit = 10
): WordFrequency[] {
  const result = db.exec(
    `SELECT word, word_id, category, COUNT(*) as count
     FROM word_events
     WHERE profile_id = ?
     GROUP BY word_id
     ORDER BY count DESC
     LIMIT ?;`,
    [profileId, limit]
  );
  return (
    result[0]?.values.map((r) => ({
      word:     r[0] as string,
      word_id:  r[1] as string,
      category: r[2] as string,
      count:    r[3] as number,
    })) ?? []
  );
}

//Which category is used the most
export interface CategoryUsage {
  category: string;
  count: number;
}

export function getCategoryUsage(
  db: Database,
  profileId: string
): CategoryUsage[] {
  const result = db.exec(
    `SELECT category, COUNT(*) as count
     FROM word_events
     WHERE profile_id = ?
     GROUP BY category
     ORDER BY count DESC;`,
    [profileId]
  );
  return (
    result[0]?.values.map((r) => ({
      category: r[0] as string,
      count:    r[1] as number,
    })) ?? []
  );
}
 

//Daily Ussage for the user over X amount of days
export interface DailyUsage {
  date: string;  // "YYYY-MM-DD"
  count: number;
}

export function getDailyUsage(
  db: Database,
  profileId: string,
  days = 14
): DailyUsage[] {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const result = db.exec(
    `SELECT DATE(timestamp / 1000, 'unixepoch') as date, COUNT(*) as count
     FROM word_events
     WHERE profile_id = ? AND timestamp >= ?
     GROUP BY date
     ORDER BY date ASC;`,
    [profileId, since]
  );

  // Map results to DailyUsage format
  const rows = result[0]?.values.map((r) => ({
    date:  r[0] as string,
    count: r[1] as number,
  })) ?? [];

  // Create a map for quick lookup
  const map = new Map(rows.map(r => [r.date, r.count]));
    
  // Fill in missing days with count 0
  const daysArray: DailyUsage[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10); // "YYYY-MM-DD"

    daysArray.push({ date, count: map.get(date) ?? 0 });

  }

  return daysArray;
}


//query to have total words spokem, number of sessions, average session time
export interface ProfileStats {
  total_words: number;
  total_sessions: number;
  avg_words_per_session: number;
}
 
export function getProfileStats(db: Database, profileId: string): ProfileStats {
  const words = db.exec(
    "SELECT COUNT(*) FROM word_events WHERE profile_id = ?;",
    [profileId]
  );
  const sessions = db.exec(
    "SELECT COUNT(*) FROM sessions WHERE profile_id = ?;",
    [profileId]
  );
  const totalWords   = (words[0]?.values?.[0]?.[0] as number) ?? 0;
  const totalSessions = (sessions[0]?.values?.[0]?.[0] as number) ?? 1;
  return {
    total_words:           totalWords,
    total_sessions:        totalSessions,
    avg_words_per_session: Math.round(totalWords / totalSessions),
  };
}

//gathering word events for specific sessions
export function getSessionEvents(
  db: Database,
  sessionId: string
): WordEvent[] {
  const result = db.exec(
    "SELECT * FROM word_events WHERE session_id = ? ORDER BY timestamp ASC;",
    [sessionId]
  );
  return result[0]?.values.map(rowToWordEvent) ?? [];
}

//Bigram update function current method is gonna be using bigrams but could be updated in the future
function updateBigram(
  db: Database,
  profileId: string,
  firstWord: string,
  secondWord: string,
  now: number
): void {
  db.run(
    `INSERT INTO bigrams (profile_id, first_word, second_word, count, last_seen)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(profile_id, first_word, second_word)
     DO UPDATE SET count = count + 1, last_seen = excluded.last_seen;`,
    [profileId, firstWord, secondWord, now]
  );
}

//barebones layout for future prediticion queries based on bigrams
export function getPredictions(
  db: Database,
  profileId: string,
  afterWord: string,
  limit = 4
): Bigram[] {
  const result = db.exec(
    `SELECT profile_id, first_word, second_word, count, last_seen
     FROM bigrams
     WHERE profile_id = ? AND first_word = ?
     ORDER BY count DESC, last_seen DESC
     LIMIT ?;`,
    [profileId, afterWord, limit]
  );
  return (
    result[0]?.values.map((r) => ({
      profile_id:  r[0] as string,
      first_word:  r[1] as string,
      second_word: r[2] as string,
      count:       r[3] as number,
      last_seen:   r[4] as number,
    })) ?? []
  );
}


export function getTopWordsSince(
  db: Database,
  profileId: string,
  since: number,
  limit = 5
): WordFrequency[] {
  const result = db.exec(
    `SELECT word, word_id, category, COUNT(*) as count
     FROM word_events
     WHERE profile_id = ? AND timestamp >= ?
     GROUP BY word_id
     ORDER BY count DESC
     LIMIT ?;`,
    [profileId, since, limit]
  );

  return result[0]?.values.map((r) => ({
    word: r[0] as string,
    word_id: r[1] as string,
    category: r[2] as string,
    count: r[3] as number,
  })) ?? [];
}

export function getCategoryUsageSince(
  db: Database,
  profileId: string,
  since: number,
  limit = 5
): CategoryUsage[] {
  const result = db.exec(
    `SELECT category, COUNT(*) as count
     FROM word_events
     WHERE profile_id = ? AND timestamp >= ?
     GROUP BY category
     ORDER BY count DESC
     LIMIT ?;`,
    [profileId, since, limit]
  );

  return result[0]?.values.map((r) => ({
    category: r[0] as string,
    count: r[1] as number,
  })) ?? [];
}
// ─── Inter-tap stats ───────────────────────────────────────────────

export interface InterTapStats {
  averageMs:       number;
  fastestMs:       number;
  slowestMs:       number;
  hesitations:     number; // gaps > 5 seconds
  hesitationRate:  number; // percentage of taps preceded by hesitation
}

const HESITATION_THRESHOLD_MS = 5000;   // 5 seconds
const MAX_GAP_MS              = 300000; // 5 minutes — beyond this assumed sentence break

export function getInterTapStats(
  db: Database,
  profileId: string,
  since = 0
): InterTapStats | null {
  const result = db.exec(
    `SELECT timestamp FROM word_events
     WHERE profile_id = ? AND timestamp >= ?
     ORDER BY timestamp ASC;`,
    [profileId, since]
  );

  const timestamps = result[0]?.values.map((r) => r[0] as number) ?? [];
  if (timestamps.length < 2) return null;

  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const gap = timestamps[i] - timestamps[i - 1];
    if (gap < MAX_GAP_MS) gaps.push(gap);
  }

  if (gaps.length === 0) return null;

  const avg          = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const fastest      = Math.min(...gaps);
  const slowest      = Math.max(...gaps);
  const hesitations  = gaps.filter((g) => g > HESITATION_THRESHOLD_MS).length;

  return {
    averageMs:      Math.round(avg),
    fastestMs:      fastest,
    slowestMs:      slowest,
    hesitations,
    hesitationRate: Math.round((hesitations / gaps.length) * 100),
  };
}

// ─── Sentence complexity ───────────────────────────────────────────

export interface SentenceComplexityStats {
  avgLength:    number;
  maxLength:    number;
  totalSentences: number;
}

export function getSentenceComplexity(
  db: Database,
  profileId: string,
  since = 0
): SentenceComplexityStats | null {
  // Use position field — each new sentence resets position to 0
  // Max position per session gives sentence length
  const result = db.exec(
    `SELECT session_id, MAX(position) + 1 as sentence_length
     FROM word_events
     WHERE profile_id = ? AND timestamp >= ?
     GROUP BY session_id
     HAVING sentence_length > 0;`,
    [profileId, since]
  );

  const lengths = result[0]?.values.map((r) => r[1] as number) ?? [];
  if (lengths.length === 0) return null;

  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const max = Math.max(...lengths);

  return {
    avgLength:      Math.round(avg * 10) / 10,
    maxLength:      max,
    totalSentences: lengths.length,
  };
}