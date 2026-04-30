/**
 * seedDemoData.ts
 *
 * Seeds 2 years of realistic mock AAC session data with an upward trend.
 * Call loadDemoData(db) from a hidden button or browser console.
 *
 * Word frequency follows realistic AAC usage patterns:
 * - Core words dominate (want, more, help, go, eat, drink)
 * - Descriptors and social words appear less frequently
 * - Sentence length and word variety grow over time
 */

import type { Database } from "sql.js";

const PROFILE_ID = "default_profile";

// Realistic AAC word distribution — weighted by how often a child uses them
const WORD_POOL: { word: string; category: string; weight: number }[] = [
  // High frequency core words
  { word: "want",    category: "basic",      weight: 15 },
  { word: "more",    category: "basic",      weight: 12 },
  { word: "help",    category: "basic",      weight: 10 },
  { word: "go",      category: "verb",       weight: 10 },
  { word: "eat",     category: "verb",       weight: 9  },
  { word: "drink",   category: "verb",       weight: 8  },
  // Medium frequency
  { word: "home",    category: "basic",      weight: 6  },
  { word: "play",    category: "verb",       weight: 6  },
  { word: "stop",    category: "basic",      weight: 5  },
  { word: "happy",   category: "descriptor", weight: 5  },
  { word: "hungry",  category: "descriptor", weight: 4  },
  { word: "snack",   category: "basic",      weight: 4  },
  // Lower frequency
  { word: "tired",   category: "descriptor", weight: 3  },
  { word: "sad",     category: "descriptor", weight: 3  },
  { word: "phone",   category: "basic",      weight: 3  },
  { word: "pizza",   category: "basic",      weight: 2  },
  { word: "nervous", category: "descriptor", weight: 2  },
  { word: "sleep",   category: "verb",       weight: 2  },
];

const TOTAL_WEIGHT = WORD_POOL.reduce((s, w) => s + w.weight, 0);

function weightedRandomWord(progress: number): typeof WORD_POOL[0] {
  // As progress increases (0→1 over 2 years), slightly increase variety
  // by boosting lower-weight words
  const boosted = WORD_POOL.map((w) => ({
    ...w,
    weight: w.weight + (progress * (5 - w.weight) * 0.3),
  }));
  const total = boosted.reduce((s, w) => s + w.weight, 0);
  let rand = Math.random() * total;
  for (const w of boosted) {
    rand -= w.weight;
    if (rand <= 0) return w;
  }
  return WORD_POOL[0];
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function loadDemoData(db: Database): void {
  const now        = Date.now();
  const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
  const startTime  = now - twoYearsMs;

  // Clear existing demo data
  db.run("DELETE FROM word_events WHERE profile_id = ?;",  [PROFILE_ID]);
  db.run("DELETE FROM sessions WHERE profile_id = ?;",     [PROFILE_ID]);

  let dayMs = startTime;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const totalDays = 730;
  let dayIndex = 0;

  while (dayMs < now) {
    const progress       = dayIndex / totalDays; // 0 → 1 over 2 years
    const sessionsToday  = randomBetween(1, 4);

    // Words per session grows from ~8 at start to ~35 at end
    const baseWords      = Math.round(8 + progress * 27);

    for (let s = 0; s < sessionsToday; s++) {
      const sessionId    = uuid();
      const sessionStart = dayMs + randomBetween(0, oneDayMs - 3600000);
      const wordCount    = randomBetween(
        Math.max(3, baseWords - 5),
        baseWords + 8
      );
      const sessionDuration = wordCount * randomBetween(2000, 5000);
      const sessionEnd   = sessionStart + sessionDuration;

      db.run(
        `INSERT OR IGNORE INTO sessions
         (id, profile_id, started_at, ended_at, word_count)
         VALUES (?, ?, ?, ?, ?);`,
        [sessionId, PROFILE_ID, sessionStart, sessionEnd, wordCount]
      );

      let tapTime = sessionStart;
      for (let i = 0; i < wordCount; i++) {
        const w       = weightedRandomWord(progress);
        const gap     = randomBetween(1500, 6000);
        tapTime      += gap;

        db.run(
          `INSERT INTO word_events
           (session_id, profile_id, word_id, word, category, position, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            sessionId,
            PROFILE_ID,
            `word-${w.word}`,
            w.word,
            w.category,
            i,
            tapTime,
          ]
        );
      }
    }

    dayMs   += oneDayMs;
    dayIndex++;
  }

  console.log("[Demo] Seeded 2 years of mock AAC data successfully.");
}