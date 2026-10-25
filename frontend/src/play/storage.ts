export interface StoredSeat {
  token: string;
  color: "white" | "black";
}

/** Remembers which color/token this browser is in each game, so a refresh rejoins as the
 * same player instead of as a new spectator. */
const keyFor = (gameId: string) => `chess960:game:${gameId}`;

export function getSeat(gameId: string): StoredSeat | null {
  try {
    const raw = localStorage.getItem(keyFor(gameId));
    return raw ? (JSON.parse(raw) as StoredSeat) : null;
  } catch {
    return null;
  }
}

export function setSeat(gameId: string, seat: StoredSeat): void {
  try {
    localStorage.setItem(keyFor(gameId), JSON.stringify(seat));
  } catch {
    // Private browsing / storage disabled - the player can still watch, just won't
    // survive a refresh as themselves.
  }
}
