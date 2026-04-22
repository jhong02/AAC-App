/**
 * useSessionLogger.ts will:
 * - mount: start the session 
 * - begin logging data to the database (taps)
 * - unmount: end the session
 * 
 * 
 * 1. Open database
 * 2. seed vocabulary if first run
 * 3. Ensure default profile exists
 * 4. Start session, storing sessionId in ref
 * 5. On unmount - end session
 * 6. logTap - write word event row
 * 
 */



import { useEffect, useRef } from 'react';
import { getDB } from '../db/database';
import { startSession, endSession, logWordTap } from '../db/sessionRepository';
import { createProfile, getProfileById } from '../db/abaRepository';
import { seedVocabularyIfEmpty }    from '../db/wordRepository';
import { coreWords } from '../data/coreWords';
import type { Database } from 'sql.js';


// Hardcoded until profile selection is built
const DEFAULT_PROFILE_ID = 'default_profile';

// Lookup map
const coreWordLookup = new Map(
    coreWords.map((w) => [w.word.toLowerCase(), {id: w.id, category: w.category}])
);



export function useSessionLogger() {

    const dbRef = useRef<Database | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    useEffect(() => {

        async function init() {
            // Open database
            const db = await getDB(); 
            // Seed vocabulary for first run
            seedVocabularyIfEmpty(db);
            // Ensure default profile exists
            const existing = getProfileById(db, DEFAULT_PROFILE_ID);
            if (!existing) {
                createProfile(db, 'Default User');
            }

            // Start session and store db and sessionID refs
            const session = startSession(db, DEFAULT_PROFILE_ID);
            dbRef.current = db;
            sessionIdRef.current = session.id;
        }

        init();

        // Cleanup runs when TalkPage unmounts
        return () => {
            if (dbRef.current && sessionIdRef.current) {
                endSession(dbRef.current, sessionIdRef.current);
            }
         };

    }, []);

    // LogTap returned to TalkPage, called every time a word is tapped
    function logTap(wordValue: string, sentenceLength: number) {

        if (!dbRef.current || !sessionIdRef.current) return;
    
        const match = coreWordLookup.get(wordValue.toLowerCase());
    
        logWordTap(dbRef.current, {
            sessionId: sessionIdRef.current,
            profileId: DEFAULT_PROFILE_ID,
            wordId: match?.id ?? `unknown-${wordValue}`,
            word: wordValue,
            category: match?.category ?? 'custom',
            position: sentenceLength,
        });
  }

// Return logTap so TalkPage can call it on every word tap
return { logTap };

}

