/**
 * abaRepository.ts
 * Author: Christian Beshara
 *
 *  AA-19 Subtask AA-77: Build a data access layer (CRUD functions)
 *  to create, read, update, and delete words, categories, and settings efficiently.
 * 
 * ABA tokens are positive reinforcement markers
 * that caregivers award during sessions
 */

import type { Database } from "sql.js";
import type { ABATokenEvent, Profile } from "./schema";
import { schedulePersist, uuid } from "./database";

// ABA Token Events

function rowToTokenEvent(row: unknown[]): ABATokenEvent {
  return {
    id:         row[0] as number,
    session_id: row[1] as string,
    profile_id: row[2] as string,
    token_type: row[3] as string,
    reason:     row[4] as string | undefined,
    timestamp:  row[5] as number,
  };
}

export type TokenType = "star" | "check" | "thumbs_up" | "custom";

export interface LogTokenInput {
  sessionId: string;
  profileId: string;
  tokenType: TokenType;
  reason?: string;
}

//Award a token during a session
export function logTokenEvent(db: Database, input: LogTokenInput): ABATokenEvent {
  const now = Date.now();
  db.run(
    `INSERT INTO aba_token_events (session_id, profile_id, token_type, reason, timestamp)
     VALUES (?, ?, ?, ?, ?);`,
    [input.sessionId, input.profileId, input.tokenType, input.reason ?? null, now]
  );
  schedulePersist(db);

  const result = db.exec("SELECT last_insert_rowid();");
  const id = result[0]?.values?.[0]?.[0] as number;
  return {
    id,
    session_id: input.sessionId,
    profile_id: input.profileId,
    token_type: input.tokenType,
    reason: input.reason,
    timestamp: now,
  };
}

// Get all token events for a session
export function getSessionTokens(
  db: Database,
  sessionId: string
): ABATokenEvent[] {
  const result = db.exec(
    "SELECT * FROM aba_token_events WHERE session_id = ? ORDER BY timestamp ASC;",
    [sessionId]
  );
  return result[0]?.values.map(rowToTokenEvent) ?? [];
}

//Get token summary for a profile (total per type, useful for the stats page) 
export interface TokenSummary {
  token_type: string;
  count: number;
}

export function getTokenSummary(
  db: Database,
  profileId: string
): TokenSummary[] {
  const result = db.exec(
    `SELECT token_type, COUNT(*) as count
     FROM aba_token_events
     WHERE profile_id = ?
     GROUP BY token_type
     ORDER BY count DESC;`,
    [profileId]
  );
  return (
    result[0]?.values.map((r) => ({
      token_type: r[0] as string,
      count:      r[1] as number,
    })) ?? []
  );
}

// Profiles

function rowToProfile(row: unknown[]): Profile {
  return {
    id:           row[0] as string,
    name:         row[1] as string,
    avatar_color: row[2] as string,
    created_at:   row[3] as number,
    updated_at:   row[4] as number,
  };
}

const AVATAR_COLORS = [
  "#49a8f0", "#71d631", "#f6a623", "#ff6a3d",
  "#b57bee", "#f2d224", "#64c9ec", "#ff8fab",
];

export function createProfile(db: Database, name: string): Profile {
  const id = uuid();
  const now = Date.now();
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  db.run(
    "INSERT INTO profiles (id, name, avatar_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);",
    [id, name, color, now, now]
  );
  schedulePersist(db);
  return { id, name, avatar_color: color, created_at: now, updated_at: now };
}

export function getProfiles(db: Database): Profile[] {
  const result = db.exec(
    "SELECT * FROM profiles ORDER BY name ASC;"
  );
  return result[0]?.values.map(rowToProfile) ?? [];
}

export function getProfileById(db: Database, id: string): Profile | null {
  const result = db.exec("SELECT * FROM profiles WHERE id = ?;", [id]);
  const row = result[0]?.values?.[0];
  return row ? rowToProfile(row) : null;
}

export function updateProfileName(db: Database, id: string, name: string): void {
  db.run(
    "UPDATE profiles SET name = ?, updated_at = ? WHERE id = ?;",
    [name, Date.now(), id]
  );
  schedulePersist(db);
}

export function deleteProfile(db: Database, id: string): void {
  // Cascades to sessions → word_events and aba_token_events via FK
  db.run("DELETE FROM profiles WHERE id = ?;", [id]);
  schedulePersist(db);
}


// Settings

export const GLOBAL_PROFILE = "__global__";

export function getSetting<T>(
  db: Database,
  key: string,
  profileId = GLOBAL_PROFILE,
  defaultValue?: T
): T | undefined {
  const result = db.exec(
    "SELECT value FROM settings WHERE profile_id = ? AND key = ?;",
    [profileId, key]
  );
  const raw = result[0]?.values?.[0]?.[0] as string | undefined;
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export function setSetting(
  db: Database,
  key: string,
  value: unknown,
  profileId = GLOBAL_PROFILE
): void {
  db.run(
    `INSERT INTO settings (profile_id, key, value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(profile_id, key)
     DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
    [profileId, key, JSON.stringify(value), Date.now()]
  );
  schedulePersist(db);
}

export function deleteSetting(
  db: Database,
  key: string,
  profileId = GLOBAL_PROFILE
): void {
  db.run(
    "DELETE FROM settings WHERE profile_id = ? AND key = ?;",
    [profileId, key]
  );
  schedulePersist(db);
}