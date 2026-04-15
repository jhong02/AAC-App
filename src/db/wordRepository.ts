/**
 * wordRepository.ts
 * Author: Christian Beshara
 * 
 * AA-19 Subtask AA-77: Build a data access layer (CRUD functions)
 * to create, read, update, and delete words, categories, and settings efficiently.
 */

import type { Database, SqlValue } from "sql.js";
import type { VocabularyWord } from "./schema";
import { schedulePersist, uuid } from "./database";


//Helper functions to convert between databse rows and the vocab word objects

function rowToWord(row: unknown[]): VocabularyWord {
  return {
    id:          row[0] as string,
    word:        row[1] as string,
    category:    row[2] as string,
    symbol_path: row[3] as string | undefined,
    is_favorite: row[4] as number,
    created_at:  row[5] as number,
    updated_at:  row[6] as number,
  };
}

//imports the core words upon first start
import { coreWords } from "../data/coreWords";
 
export function seedVocabularyIfEmpty(db: Database): void {
  const result = db.exec("SELECT COUNT(*) FROM vocabulary;");
  const count = result[0]?.values?.[0]?.[0] as number;
  if (count > 0) return;
 
  console.log("[wordRepository] Seeding vocabulary from coreWords...");
  const now = Date.now();
 
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO vocabulary (id, word, category, symbol_path, is_favorite, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?);
  `);
 
  for (const w of coreWords) {
    stmt.run([w.id, w.word, w.category, w.symbol ?? null, now, now]);
  }
  stmt.free();
  schedulePersist(db);
  console.log(`[wordRepository] Seeded ${coreWords.length} words.`);
}


//CRUD FUUNCTIONS

//READ

//This reads all words filtered by category
export function getWords(db: Database, category?: string): VocabularyWord[] {
  const sql = category
    ? "SELECT * FROM vocabulary WHERE category = ? ORDER BY word ASC;"
    : "SELECT * FROM vocabulary ORDER BY word ASC;";
  const result = db.exec(sql, category ? [category] : []);
  return result[0]?.values.map(rowToWord) ?? [];
}
//Selects a single word by its ID
export function getWordById(db: Database, id: string): VocabularyWord | null {
  const result = db.exec("SELECT * FROM vocabulary WHERE id = ?;", [id]);
  const row = result[0]?.values?.[0];
  return row ? rowToWord(row) : null;
}
//Selects all words marked as favorite by using its_favorite
export function getFavoriteWords(db: Database): VocabularyWord[] {
  const result = db.exec(
    "SELECT * FROM vocabulary WHERE is_favorite = 1 ORDER BY word ASC;"
  );
  return result[0]?.values.map(rowToWord) ?? [];
}
//Partial match word search
export function searchWords(db: Database, query: string): VocabularyWord[] {
  const result = db.exec(
    "SELECT * FROM vocabulary WHERE word LIKE ? ORDER BY word ASC LIMIT 20;",
    [`%${query}%`]
  );
  return result[0]?.values.map(rowToWord) ?? [];
}
//return categories
export function getCategories(db: Database): string[] {
  const result = db.exec(
    "SELECT DISTINCT category FROM vocabulary ORDER BY category ASC;"
  );
  return result[0]?.values.map((r) => r[0] as string) ?? [];
}


//CREATE 
export interface CreateWordInput {
  word: string;
  category: string;
  symbol_path?: string;
}
 
export function createWord(db: Database, input: CreateWordInput): VocabularyWord {
  const now = Date.now();
  const id = `cw-custom-${uuid().slice(0, 8)}`;
 
  db.run(
    `INSERT INTO vocabulary (id, word, category, symbol_path, is_favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?);`,
    [id, input.word, input.category, input.symbol_path ?? null, now, now]
  );
  schedulePersist(db);
  return getWordById(db, id)!;
}

//UPDATE
export function updateWord(
  db: Database,
  id: string,
  updates: Partial<Pick<VocabularyWord, "word" | "category" | "symbol_path">>
): void {
  const fields: string[] = [];
  const values: SqlValue[] = [];

  if (updates.word !== undefined)        { fields.push("word = ?");        values.push(updates.word); }
  if (updates.category !== undefined)    { fields.push("category = ?");    values.push(updates.category); }
  if (updates.symbol_path !== undefined) { fields.push("symbol_path = ?"); values.push(updates.symbol_path); }
 
  if (fields.length === 0) return;
  fields.push("updated_at = ?");
  values.push(Date.now(), id);
 
  db.run(
    `UPDATE vocabulary SET ${fields.join(", ")} WHERE id = ?;`,
    values
  );
  schedulePersist(db);
}
 
/** Toggle favorite status */
export function toggleFavorite(db: Database, id: string): void {
  db.run(
    "UPDATE vocabulary SET is_favorite = ((is_favorite + 1) % 2), updated_at = ? WHERE id = ?;",
    [Date.now(), id]
  );
  schedulePersist(db);
}

//DELETE
//Only delete custom words core words remain intact
export function deleteWord(db: Database, id: string): void {
  if (!id.startsWith("cw-custom-")) {
    throw new Error("Cannot delete built-in core words.");
  }
  db.run("DELETE FROM vocabulary WHERE id = ?;", [id]);
  schedulePersist(db);
}
