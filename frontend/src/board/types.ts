/**
 * A square's occupant, written the way FEN does: one letter, uppercase for White,
 * lowercase for Black (p n b r q k).
 */
export type PieceChar = string;

export type Squares = Partial<Record<string, PieceChar>>;

/**
 * One destination the server says is legal from a given square. The board only ever
 * offers moves the server already approved - it never decides for itself whether a move
 * is legal.
 */
export interface LegalMove {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export function fileOf(square: string): number {
  return square.charCodeAt(0) - "a".charCodeAt(0);
}

export function rankOf(square: string): number {
  return square.charCodeAt(1) - "1".charCodeAt(0);
}

export function squareAt(file: number, rank: number): string {
  return String.fromCharCode("a".charCodeAt(0) + file) + (rank + 1);
}
