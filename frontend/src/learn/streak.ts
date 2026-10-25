const LEARNER_ID_KEY = "chess960:learnerId";
const STREAK_KEY = "chess960:streak";

export interface StreakState {
  lastCompletedDate: string;
  currentStreak: number;
}

/**
 * An anonymous per-browser id - there are no accounts. Nothing is sent to the server with
 * it today; it's generated and kept so a future server-side streak (surviving a localStorage
 * clear, or a leaderboard) could be added without changing what identifies a learner.
 */
export function getOrCreateLearnerId(): string {
  try {
    let id = localStorage.getItem(LEARNER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(LEARNER_ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function getStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as StreakState) : { lastCompletedDate: "", currentStreak: 0 };
  } catch {
    return { lastCompletedDate: "", currentStreak: 0 };
  }
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Call once when today's lesson is finished. Safe to call more than once in a day -
 * only the first completion of a given date advances the streak. */
export function recordCompletionToday(): StreakState {
  const today = dateString(new Date());
  const current = getStreak();
  if (current.lastCompletedDate === today) {
    return current;
  }
  const yesterday = dateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const next: StreakState = {
    lastCompletedDate: today,
    currentStreak: current.lastCompletedDate === yesterday ? current.currentStreak + 1 : 1,
  };
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    // No persistence available - the streak just won't survive a refresh.
  }
  return next;
}
