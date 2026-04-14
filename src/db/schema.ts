/**
 * schema.ts
 * 
 * Author: Christian Beshara
 * AA-19 Subtask AA-75: Choose a local storage solution 
 *                    (SQLite) and define the data models needed for 
 *                     vocabulary, profiles, tokens, and session logs.
 * 
 *
 *
 */




// TypeScript Interfaces

/** A single AAC vocabulary word stored locally */
export interface VocabularyWord {
  id: string;           // matches coreWords.ts id e.g. "cw-019"
  word: string;
  category: string;     // "basic" | "pronoun" | "verb" | "descriptor"
  symbol_path?: string; // future: path to local image symbol
  is_favorite: number;  // SQLite has no boolean; 0 = false, 1 = true
  created_at: number;   // Unix ms
  updated_at: number;
}

/** A user profile (caregiver creates one per child) */
export interface Profile {
  id: string;           // UUID
  name: string;
  avatar_color: string; // hex color for avatar placeholder
  created_at: number;
  updated_at: number;
}

/** A single communication session (start → end) */
export interface Session {
  id: string;           // UUID
  profile_id: string;   // FK → profiles.id
  started_at: number;   // Unix ms
  ended_at?: number;    // null if session still active
  word_count: number;   // total taps in this session
}

/**
 * A single word-tap event within a session.
 * This is the core analytics record — drives statistics + text prediction.
 */
export interface WordEvent {
  id: number;           // AUTOINCREMENT
  session_id: string;   // FK → sessions.id
  profile_id: string;   // denormalized for fast per-profile queries
  word_id: string;      // FK → vocabulary.id
  word: string;         // denormalized so queries don't need a join
  category: string;
  position: number;     // position in sentence at time of tap (0-indexed)
  timestamp: number;    // Unix ms
}

/**
 * Bigram frequency table — "word A was followed by word B N times".
 * Temporary but will be used for next-word prediction logic
 */
export interface Bigram {
  profile_id: string;
  first_word: string;
  second_word: string;
  count: number;
  last_seen: number;    // Unix ms — for recency weighting
}

/**
 * ABA (Applied Behavior Analysis) token event.
 * Records reinforcement tokens awarded during a session.
 * For further implementation
 */
export interface ABATokenEvent {
  id: number;           // AUTOINCREMENT
  session_id: string;
  profile_id: string;
  token_type: string;   // e.g. "star", "check", "custom"
  reason?: string;      // optional note from caregiver
  timestamp: number;
}

/**
 * App-wide settings (one row per profile, plus a "global" profile_id = "__global__")
 */
export interface Setting {
  profile_id: string;
  key: string;
  value: string;        // JSON-serialised value
  updated_at: number;
}

// SQL CREATE statements (imported by migrations)
export const SQL_CREATE_VOCABULARY = `
  CREATE TABLE IF NOT EXISTS vocabulary (
    id           TEXT    PRIMARY KEY,
    word         TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    symbol_path  TEXT,
    is_favorite  INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_vocabulary_category  ON vocabulary(category);
  CREATE INDEX IF NOT EXISTS idx_vocabulary_favorite  ON vocabulary(is_favorite);
`;

export const SQL_CREATE_PROFILES = `
  CREATE TABLE IF NOT EXISTS profiles (
    id           TEXT    PRIMARY KEY,
    name         TEXT    NOT NULL,
    avatar_color TEXT    NOT NULL DEFAULT '#49a8f0',
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
  );
`;

export const SQL_CREATE_SESSIONS = `
  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT    PRIMARY KEY,
    profile_id  TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at  INTEGER NOT NULL,
    ended_at    INTEGER,
    word_count  INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_profile   ON sessions(profile_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_started   ON sessions(started_at);
`;

export const SQL_CREATE_WORD_EVENTS = `
  CREATE TABLE IF NOT EXISTS word_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    profile_id  TEXT    NOT NULL,
    word_id     TEXT    NOT NULL,
    word        TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    timestamp   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_word_events_profile    ON word_events(profile_id);
  CREATE INDEX IF NOT EXISTS idx_word_events_session    ON word_events(session_id);
  CREATE INDEX IF NOT EXISTS idx_word_events_word_id    ON word_events(word_id);
  CREATE INDEX IF NOT EXISTS idx_word_events_timestamp  ON word_events(timestamp);
`;

export const SQL_CREATE_BIGRAMS = `
  CREATE TABLE IF NOT EXISTS bigrams (
    profile_id   TEXT    NOT NULL,
    first_word   TEXT    NOT NULL,
    second_word  TEXT    NOT NULL,
    count        INTEGER NOT NULL DEFAULT 1,
    last_seen    INTEGER NOT NULL,
    PRIMARY KEY (profile_id, first_word, second_word)
  );
  CREATE INDEX IF NOT EXISTS idx_bigrams_lookup ON bigrams(profile_id, first_word);
`;

export const SQL_CREATE_ABA_TOKEN_EVENTS = `
  CREATE TABLE IF NOT EXISTS aba_token_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    profile_id  TEXT    NOT NULL,
    token_type  TEXT    NOT NULL DEFAULT 'star',
    reason      TEXT,
    timestamp   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_aba_profile   ON aba_token_events(profile_id);
  CREATE INDEX IF NOT EXISTS idx_aba_session   ON aba_token_events(session_id);
`;

export const SQL_CREATE_SETTINGS = `
  CREATE TABLE IF NOT EXISTS settings (
    profile_id  TEXT    NOT NULL,
    key         TEXT    NOT NULL,
    value       TEXT    NOT NULL,
    updated_at  INTEGER NOT NULL,
    PRIMARY KEY (profile_id, key)
  );
`;