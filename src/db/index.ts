/**
 * index.ts
 * Author: Christian Beshara
 * 
 * AA-19 Subtask AA-77: Build a data access layer (CRUD functions)
 * to create, read, update, and delete words, categories, and settings efficiently.
 * 
 * import everything from "@/db" to access the database and migrations in a single module.
 */

export { getDB, resetDB, schedulePersist, uuid } from "./database";
export { runMigrations, getMigrationHistory } from "./migrations";
export type { AppliedMigration } from "./migrations";

// Schema types
export type {
  VocabularyWord,
  Profile,
  Session,
  WordEvent,
  Bigram,
  ABATokenEvent,
  Setting,
} from "./schema";

// Word repository
export {
  seedVocabularyIfEmpty,
  getWords,
  getWordById,
  getFavoriteWords,
  searchWords,
  getCategories,
  createWord,
  updateWord,
  toggleFavorite,
  deleteWord,
} from "./wordRepository";

// Session + analytics repository
export {
  startSession,
  endSession,
  getRecentSessions,
  logWordTap,
  getTopWords,
  getCategoryUsage,
  getDailyUsage,
  getProfileStats,
  getSessionEvents,
  getPredictions,
} from "./sessionRepository";

