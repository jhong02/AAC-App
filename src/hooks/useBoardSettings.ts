/**
 * useBoardSettings.ts
 *
 * Manages grid preset and board tile persistence for BoardConfigContext.
 * - Loads grid preset and tiles from database on mount
 * - Saves grid preset immediately when it changes
 * - Saves board tiles immediately when they change
 *
 * Follows the same hook pattern as useSessionLogger and useAudioSettings —
 * all database logic stays here, BoardConfigContext only handles state.
 */

import { useState, useEffect } from "react";
import { useDatabase } from "./useDatabase";
import { getSetting, setSetting } from "../db/abaRepository";
import type { GridPreset, WordTile } from "../context/BoardConfigContext";
import { INITIAL_BOARD_TILES } from "../context/BoardConfigContext";

const GRID_PRESET_KEY = "grid_preset";
const BOARD_TILES_KEY = "board_tiles";
const PROFILE_ID      = "__global__";

export function useBoardSettings() {
  const { db, ready } = useDatabase();

  const [gridPreset, setGridPreset] = useState<GridPreset>("default");
  const [boardTiles, setBoardTiles] = useState<WordTile[]>(INITIAL_BOARD_TILES);

  // Load saved grid settings from database once ready
  useEffect(() => {
    if (!ready || !db) return;

    const savedPreset = getSetting<GridPreset>(db, GRID_PRESET_KEY, PROFILE_ID, "default");
    if (savedPreset) setGridPreset(savedPreset);

    const savedTiles = getSetting<WordTile[]>(db, BOARD_TILES_KEY, PROFILE_ID);
    if (savedTiles && savedTiles.length > 0) setBoardTiles(savedTiles);
  }, [ready, db]);

  // Save grid preset to database whenever it changes
  useEffect(() => {
    if (!ready || !db) return;
    setSetting(db, GRID_PRESET_KEY, gridPreset, PROFILE_ID);
  }, [gridPreset, ready, db]);

  // Save board tiles to database whenever they change
  useEffect(() => {
    if (!ready || !db) return;
    setSetting(db, BOARD_TILES_KEY, boardTiles, PROFILE_ID);
  }, [boardTiles, ready, db]);

  return {
    gridPreset,
    setGridPreset,
    boardTiles,
    setBoardTiles,
  };
}