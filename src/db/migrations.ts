/**
 * migrations.ts
 * Author: Christian Beshara
 * 
 * AA-19 Subtask AA-76: Implement the local database schema and create migration/versioning support for future updates.
 * 
 * 
 */
import type { Database } from "sql.js";
import {
  SQL_CREATE_VOCABULARY,
  SQL_CREATE_PROFILES,
  SQL_CREATE_SESSIONS,
  SQL_CREATE_WORD_EVENTS,
  SQL_CREATE_BIGRAMS,
  SQL_CREATE_ABA_TOKEN_EVENTS,
  SQL_CREATE_SETTINGS,
} from "./schema";

// Migration registry
// Append-only — never edit or remove a past migration.
interface Migration {
  version: number;
  description: string;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Initial schema: vocabulary, profiles, sessions, word_events, bigrams, aba_token_events, settings",
    up: `
      ${SQL_CREATE_VOCABULARY}
      ${SQL_CREATE_PROFILES}
      ${SQL_CREATE_SESSIONS}
      ${SQL_CREATE_WORD_EVENTS}
      ${SQL_CREATE_BIGRAMS}
      ${SQL_CREATE_ABA_TOKEN_EVENTS}
      ${SQL_CREATE_SETTINGS}
    `,
  },
 
  //future migrations go here
];

//Ensure the working table exists to track schema version
function ensureVersionTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version      INTEGER PRIMARY KEY,
      description  TEXT    NOT NULL,
      applied_at   INTEGER NOT NULL
    );
  `);
}

//Chose highest applied migration version or 0 if none
function getCurrentVersion(db: Database): number {
  const result = db.exec(
    "SELECT MAX(version) AS v FROM schema_version;"
  );
  const row = result[0]?.values?.[0];
  if (!row || row[0] === null) return 0;
  return row[0] as number;
}


// This applies all the pending migrations in order 
export function runMigrations(db: Database): void {
  ensureVersionTable(db);
  const current = getCurrentVersion(db);
 
  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version
  );
 
  if (pending.length === 0) {
    console.log(`[DB] Schema is up to date (version ${current}).`);
    return;
  }
 
  for (const migration of pending) {
    console.log(
      `[DB] Applying migration v${migration.version}: ${migration.description}`
    );
 
    try {
      db.run("BEGIN TRANSACTION;");
      db.run(migration.up);
      db.run(
        "INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?);",
        [migration.version, migration.description, Date.now()]
      );
      db.run("COMMIT;");
      console.log(`[DB] Migration v${migration.version} applied successfully.`);
    } catch (err) {
      db.run("ROLLBACK;");
      console.error(`[DB] Migration v${migration.version} failed — rolled back.`, err);
      throw err; // surface to caller so app can handle gracefully
    }
  }
}

//for migration history and debugging, we can export a function to get applied migrations
export interface AppliedMigration {
  version: number;
  description: string;
  applied_at: number;
}
 
export function getMigrationHistory(db: Database): AppliedMigration[] {
  const result = db.exec(
    "SELECT version, description, applied_at FROM schema_version ORDER BY version ASC;"
  );
  if (!result[0]) return [];
  return result[0].values.map(([version, description, applied_at]) => ({
    version: version as number,
    description: description as string,
    applied_at: applied_at as number,
  }));
}