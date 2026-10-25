package com.chess960.backend.analysis;

import com.chess960.backend.rules.CastleSide;
import com.chess960.backend.rules.CastlingRights;
import com.chess960.backend.rules.Chess960StartingPosition;
import com.chess960.backend.rules.Color;
import com.chess960.backend.rules.MoveGenerator;
import com.chess960.backend.rules.Piece;
import com.chess960.backend.rules.PieceType;
import com.chess960.backend.rules.Position;
import com.chess960.backend.rules.Square;
import java.util.ArrayList;
import java.util.List;

/**
 * Computes the facts shown on the Analyze tab's position overview card. Everything here is
 * read off the board directly - no search, no evaluation, just counting - so it's cheap
 * enough to recompute on every position change.
 */
public final class PositionAnalyzer {

    private PositionAnalyzer() {}

    public static PositionOverview analyze(Position position) {
        return new PositionOverview(
                positionNumber(position), sideOverview(position, Color.WHITE), sideOverview(position, Color.BLACK));
    }

    private static Integer positionNumber(Position position) {
        char[] rank = new char[8];
        for (int file = 0; file < 8; file++) {
            Piece piece = position.pieceAt(Square.of(file, 0));
            rank[file] = (piece != null && piece.color() == Color.WHITE) ? piece.fenChar() : '.';
        }
        return Chess960StartingPosition.numberOf(rank);
    }

    private static SideOverview sideOverview(Position position, Color color) {
        List<Integer> undefendedPawns = new ArrayList<>();
        List<Integer> longDiagonalBishops = new ArrayList<>();
        Integer weakestSquare = null;
        int weakestDefenders = Integer.MAX_VALUE;

        for (int square = 0; square < 64; square++) {
            Piece piece = position.pieceAt(square);
            if (piece == null || piece.color() != color) {
                continue;
            }

            if (piece.type() == PieceType.PAWN
                    && MoveGenerator.countAttackers(position, square, color) == 0) {
                undefendedPawns.add(square);
            }
            if (piece.type() == PieceType.BISHOP && onLongDiagonal(square)) {
                longDiagonalBishops.add(square);
            }
            if (piece.type() != PieceType.KING) {
                int defenders = MoveGenerator.countAttackers(position, square, color);
                if (defenders < weakestDefenders) {
                    weakestDefenders = defenders;
                    weakestSquare = square;
                }
            }
        }

        return new SideOverview(
                undefendedPawns,
                longDiagonalBishops,
                castlingDistance(position, color),
                weakestSquare,
                weakestSquare == null ? 0 : weakestDefenders);
    }

    private static boolean onLongDiagonal(int square) {
        int file = Square.file(square);
        int rank = Square.rank(square);
        return file == rank || file + rank == 7;
    }

    /**
     * How many of this side's own pieces sit in the way of its quickest available
     * castling move - the minimum, across whichever rights it still has, of the pieces
     * occupying the squares the king and rook would need to cross. A simple stand-in for
     * "how many moves until this side could castle", not an exact move count.
     */
    private static Integer castlingDistance(Position position, Color color) {
        int kingFrom = position.findKing(color);
        int backRank = Square.rank(kingFrom);
        Integer best = null;

        for (CastleSide side : CastleSide.values()) {
            int rookFile = position.castling().rookFile(color, side);
            if (rookFile == CastlingRights.NONE) {
                continue;
            }
            int rookFrom = Square.of(rookFile, backRank);
            int kingDest = Square.of(side == CastleSide.KINGSIDE ? 6 : 2, backRank);
            int rookDest = Square.of(side == CastleSide.KINGSIDE ? 5 : 3, backRank);

            int blockers = countBlockers(position, kingFrom, kingDest, rookFrom, rookDest, backRank);
            if (best == null || blockers < best) {
                best = blockers;
            }
        }
        return best;
    }

    private static int countBlockers(
            Position position, int kingFrom, int kingDest, int rookFrom, int rookDest, int backRank) {
        int kingLow = Math.min(Square.file(kingFrom), Square.file(kingDest));
        int kingHigh = Math.max(Square.file(kingFrom), Square.file(kingDest));
        int rookLow = Math.min(Square.file(rookFrom), Square.file(rookDest));
        int rookHigh = Math.max(Square.file(rookFrom), Square.file(rookDest));

        int blockers = 0;
        for (int file = 0; file < 8; file++) {
            boolean onPath = (file >= kingLow && file <= kingHigh) || (file >= rookLow && file <= rookHigh);
            if (!onPath) {
                continue;
            }
            int square = Square.of(file, backRank);
            if (square == kingFrom || square == rookFrom) {
                continue;
            }
            if (position.pieceAt(square) != null) {
                blockers++;
            }
        }
        return blockers;
    }
}
