/**
 * database.ts
 * Author: Christian Beshara
 * 
 * AA-19 Subtask AA-76: Implement the local database schema and create migration/versioning support for future updates.
 * 
 * Uses the Origin Private File System (OPFS) to persist the SQLite database across page reloads 
 */


import { runMigrations } from "./migrations";
import type { Database, SqlJsStatic } from "sql.js";

async function getSqlJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/node_modules/sql.js/dist/sql-wasm-browser.js";
    script.onload = () => resolve((window as any).initSqlJs);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}


//Configurations
const DB_FILE_NAME = "aac_app.sqlite";

// OPFS is the modern, persistent storage API for web apps. Falls back to in-memory (data lost on reload) if OPFS unavailable.
let _db: Database | null = null;
let _SQL: SqlJsStatic | null = null;
let _initPromise: Promise<Database> | null = null;

//OPFS Helper Functions
async function readFromOPFS(): Promise<Uint8Array | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(DB_FILE_NAME, { create: false });
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    // File doesn't exist yet — first run
    return null;
  }
}

async function writeToOPFS(data: Uint8Array): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(DB_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data.buffer as ArrayBuffer);
    await writable.close();
  } catch (err) {
    console.error("[DB] Failed to persist to OPFS:", err);
  }
}

let _persistTimeout: ReturnType<typeof setTimeout> | null = null;
 
export function schedulePersist(db: Database): void {
  if (_persistTimeout) clearTimeout(_persistTimeout);
  _persistTimeout = setTimeout(async () => {
    const data = db.export();
    await writeToOPFS(data);
    console.log("[DB] Persisted to OPFS.");
  }, 300); // 300ms debounce
}
 
async function initDB(): Promise<Database> {
  // Load sql.js WASM. The wasm file is served from the CDN in dev;
  // for production, copy it into /public and point locateFile there.
  const initSqlJs = await getSqlJs();
  _SQL = await initSqlJs({
    locateFile: (_file: string) =>
      `/sql-wasm.wasm`,
  });

  if (!_SQL) throw new Error("[DB] Failed to load sql.js");
 
  // Try to load existing DB from OPFS
  const existing = await readFromOPFS();
  _db = existing ? new _SQL.Database(existing) : new _SQL.Database();
 
  // Enable WAL mode for better concurrent write performance
  _db.run("PRAGMA journal_mode=WAL;");
  _db.run("PRAGMA foreign_keys=ON;");
 
  // Apply any pending migrations
  runMigrations(_db);
 
  // Persist initial state if new DB
  if (!existing) {
    await writeToOPFS(_db.export());
    console.log("[DB] New database created and persisted.");
  }
 
  console.log("[DB] Initialised successfully.");
  return _db;
}
 
// ─────────────────────────────────────────────
// Singleton accessor — safe to call from anywhere
// ─────────────────────────────────────────────
 
export async function getDB(): Promise<Database> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;
  _initPromise = initDB();
  return _initPromise;
}
 
// ─────────────────────────────────────────────
// Utility: wipe all data (useful for tests / reset)
// ─────────────────────────────────────────────
 
export async function resetDB(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(DB_FILE_NAME);
  } catch {
    // File didn't exist
  }
  _db = null;
  _initPromise = null;
  console.log("[DB] Database reset.");
}
 
// ─────────────────────────────────────────────
// Utility: generate a simple UUID (no dependency needed)
// ─────────────────────────────────────────────
 
export function uuid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}
 