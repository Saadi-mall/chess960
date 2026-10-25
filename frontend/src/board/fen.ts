import { squareAt, type Squares } from "./types";

/**
 * Reads which piece sits on which square out of a FEN's piece-placement field. This is
 * just reading data off a string, the same as parsing any other server response - it
 * doesn't decide what's legal, so it's not chess rules logic.
 */
export function squaresFromFen(fen: string): Squares {
  const placement = fen.trim().split(/\s+/)[0];
  const squares: Squares = {};

  placement.split("/").forEach((rankStr, rowFromTop) => {
    const rank = 7 - rowFromTop;
    let file = 0;
    for (const char of rankStr) {
      if (/\d/.test(char)) {
        file += Number(char);
      } else {
        squares[squareAt(file, rank)] = char;
        file++;
      }
    }
  });

  return squares;
}
