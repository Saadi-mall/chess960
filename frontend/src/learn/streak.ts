const STREAK_KEY = "chess960:streak";

export interface StreakState {
  lastCompletedDate: string;
  currentStreak: number;
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
