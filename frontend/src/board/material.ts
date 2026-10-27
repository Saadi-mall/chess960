import { squaresFromFen } from "./fen";

/** The usual point values. Kings aren't counted - they're never captured. */
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** Every Chess960 start has the same army for each side, only the back rank is shuffled. */
const START_COUNT: Record<string, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };

/** Highest value first, the order captured pieces are shown in. */
const ORDER = ["q", "r", "b", "n", "p"];

export interface SideMaterial {
  /** Opponent pieces this side has taken, as FEN letters in the opponent's case, e.g. "nppp". */
  captured: string[];
  /** Points ahead of the opponent; 0 when level or behind. */
  lead: number;
}

/**
 * What each side has captured and who's ahead on material, read off the position alone
 * (counting pieces, not replaying moves - so it works for any position in the history).
 *
 * A captured piece is one missing from the opponent's starting army. After a promotion
 * that's slightly off - the promoted pawn counts as "captured" and the extra queen as
 * nothing - but the lead is computed from the material actually on the board, so the
 * +N is always right.
 */
export function materialFromFen(fen: string): { white: SideMaterial; black: SideMaterial } {
  const count: Record<string, number> = {};
  for (const piece of Object.values(squaresFromFen(fen))) {
    if (piece) count[piece] = (count[piece] ?? 0) + 1;
  }

  // Pieces of `ownerCase` that are gone from the board, written in that case.
  const missing = (upper: boolean): string[] =>
    ORDER.flatMap((type) => {
      const letter = upper ? type.toUpperCase() : type;
      const gone = Math.max(0, START_COUNT[type] - (count[letter] ?? 0));
      return Array<string>(gone).fill(letter);
    });

  const points = (upper: boolean) =>
    ORDER.reduce((sum, type) => sum + VALUE[type] * (count[upper ? type.toUpperCase() : type] ?? 0), 0);
  const diff = points(true) - points(false);

  return {
    white: { captured: missing(false), lead: Math.max(0, diff) },
    black: { captured: missing(true), lead: Math.max(0, -diff) },
  };
}
