export interface StoredSeat {
  token: string;
  color: "white" | "black";
}

/**
 * Remembers which color/token this tab is in each game, so a refresh rejoins as the same
 * player instead of as a new spectator. sessionStorage rather than localStorage: it is
 * per-tab, so opening the invite link in a second tab of the same browser joins as the
 * other color instead of silently reusing the first tab's seat - with localStorage both
 * tabs were White and the game never started.
 */
const keyFor = (gameId: string) => `chess960:game:${gameId}`;

export function getSeat(gameId: string): StoredSeat | null {
  try {
    const raw = sessionStorage.getItem(keyFor(gameId));
    return raw ? (JSON.parse(raw) as StoredSeat) : null;
  } catch {
    return null;
  }
}

export function setSeat(gameId: string, seat: StoredSeat): void {
  try {
    sessionStorage.setItem(keyFor(gameId), JSON.stringify(seat));
  } catch {
    // Storage disabled - the player can still play, just won't survive a refresh as themselves.
  }
}
