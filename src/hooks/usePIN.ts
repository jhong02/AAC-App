/**
 * usePIN.ts
 *
 * Manages PIN storage and validation for caregiver lockout.
 * PIN is stored in the SQLite database via getSetting/setSetting.
 *
 * - hasPin()     — returns true if a PIN has been set
 * - getPin()     — reads PIN from database
 * - setPin()     — saves PIN to database
 * - checkPin()   — validates input against stored PIN
 * - clearPin()   — removes the PIN
 * - isPinSetupComplete() — checks if first load prompt has been dismissed
 * - completePinSetup()   — marks first load prompt as done
 */

import type { Database } from "sql.js";
import { getSetting, setSetting } from "../db/abaRepository";

const PROFILE_ID      = "__global__";
const PIN_KEY         = "admin_pin";
const SETUP_DONE_KEY  = "pin_setup_complete";

export function hasPin(db: Database): boolean {
  const pin = getSetting<string>(db, PIN_KEY, PROFILE_ID);
  return !!pin && pin.length > 0;
}

export function getPin(db: Database): string | null {
  return getSetting<string>(db, PIN_KEY, PROFILE_ID) ?? null;
}

export function setPin(db: Database, pin: string): void {
  setSetting(db, PIN_KEY, pin, PROFILE_ID);
}

export function checkPin(db: Database, input: string): boolean {
  const stored = getPin(db);
  if (!stored) return false;
  return input === stored;
}

export function clearPin(db: Database): void {
  setSetting(db, PIN_KEY, "", PROFILE_ID);
}

export function isPinSetupComplete(db: Database): boolean {
  return getSetting<boolean>(db, SETUP_DONE_KEY, PROFILE_ID) ?? false;
}

export function completePinSetup(db: Database): void {
  setSetting(db, SETUP_DONE_KEY, true, PROFILE_ID);
}
