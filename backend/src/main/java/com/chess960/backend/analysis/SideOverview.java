package com.chess960.backend.analysis;

import java.util.List;

/**
 * @param undefendedPawnSquares pawns no friendly piece currently defends
 * @param longDiagonalBishopSquares bishops sitting on the a1-h8 or a8-h1 diagonal
 * @param castlingDistance how many of this side's own pieces are in the way of its
 *     quickest available castling move, or null if it has no castling rights left
 * @param weakestSquare the square among this side's own pieces with the fewest
 *     defenders - null if this side has no pieces left besides the king
 * @param weakestSquareDefenders how many friendly pieces defend {@code weakestSquare}
 */
public record SideOverview(
        List<Integer> undefendedPawnSquares,
        List<Integer> longDiagonalBishopSquares,
        Integer castlingDistance,
        Integer weakestSquare,
        int weakestSquareDefenders) {}
