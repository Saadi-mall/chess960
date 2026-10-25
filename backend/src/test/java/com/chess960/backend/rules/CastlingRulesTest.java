package com.chess960.backend.rules;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Perft catches most castling bugs by sheer volume, but these positions are built to pin
 * down exactly which Chess960 castling rule fired, since a perft mismatch alone doesn't
 * say that.
 */
class CastlingRulesTest {

    private static boolean canCastle(Position position, int kingFrom, int rookFrom) {
        return MoveGenerator.legalMoves(position).contains(Move.castle(kingFrom, rookFrom));
    }

    @Test
    void cannotCastleThroughAPieceInTheWay() {
        // Knight on g1 sits between the king and the kingside rook.
        Position position = Fen.parse("4k3/8/8/8/8/8/8/R3K1NR w KQ - 0 1");

        assertFalse(canCastle(position, Square.fromAlgebraic("e1"), Square.fromAlgebraic("h1")));
        assertTrue(canCastle(position, Square.fromAlgebraic("e1"), Square.fromAlgebraic("a1")));
    }

    @Test
    void cannotCastleOutOfCheck() {
        // Black rook on e2 gives check along the e-file.
        Position position = Fen.parse("4k3/8/8/8/8/8/4r3/R3K2R w KQ - 0 1");

        assertFalse(canCastle(position, Square.fromAlgebraic("e1"), Square.fromAlgebraic("h1")));
        assertFalse(canCastle(position, Square.fromAlgebraic("e1"), Square.fromAlgebraic("a1")));
    }

    @Test
    void cannotCastleThroughAnAttackedSquareEvenIfTheLandingSquareIsSafe() {
        // The queen on a6 attacks f1 (a6-b5-c4-d3-e2-f1 diagonal) but not g1 or e1.
        Position position = Fen.parse("4k3/8/q7/8/8/8/8/R3K2R w KQ - 0 1");

        assertFalse(
                canCastle(position, Square.fromAlgebraic("e1"), Square.fromAlgebraic("h1")),
                "f1 is on the king's path for kingside castling");
        assertTrue(canCastle(position, Square.fromAlgebraic("e1"), Square.fromAlgebraic("a1")));
    }

    @Test
    void kingAndRookCanPassThroughEachOthersSquares() {
        // A Chess960 arrangement where the king (b1) starts inside both rooks' paths.
        Position position = Fen.parse("4k3/8/8/8/8/8/8/RK5R w HA - 0 1");
        int kingFrom = Square.fromAlgebraic("b1");
        int kingsideRook = Square.fromAlgebraic("h1");
        int queensideRook = Square.fromAlgebraic("a1");

        assertTrue(canCastle(position, kingFrom, kingsideRook));
        assertTrue(canCastle(position, kingFrom, queensideRook));

        Position afterKingside = Fen.parse("4k3/8/8/8/8/8/8/RK5R w HA - 0 1");
        afterKingside.makeMove(Move.castle(kingFrom, kingsideRook));
        assertTrue(afterKingside.pieceAt(Square.fromAlgebraic("g1")).type() == PieceType.KING);
        assertTrue(afterKingside.pieceAt(Square.fromAlgebraic("f1")).type() == PieceType.ROOK);
        assertTrue(afterKingside.pieceAt(Square.fromAlgebraic("a1")).type() == PieceType.ROOK);

        Position afterQueenside = Fen.parse("4k3/8/8/8/8/8/8/RK5R w HA - 0 1");
        afterQueenside.makeMove(Move.castle(kingFrom, queensideRook));
        assertTrue(afterQueenside.pieceAt(Square.fromAlgebraic("c1")).type() == PieceType.KING);
        assertTrue(afterQueenside.pieceAt(Square.fromAlgebraic("d1")).type() == PieceType.ROOK);
        assertTrue(afterQueenside.pieceAt(Square.fromAlgebraic("h1")).type() == PieceType.ROOK);
    }

    @Test
    void rightIsLostOnceTheRookMovesEvenIfItReturns() {
        Position position = Fen.parse("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
        int kingFrom = Square.fromAlgebraic("e1");
        int rookFrom = Square.fromAlgebraic("h1");

        List<Move> rookMoves = MoveGenerator.legalMoves(position);
        Move rookOut = rookMoves.stream()
                .filter(m -> m.from() == rookFrom && m.to() == Square.fromAlgebraic("g1"))
                .findFirst()
                .orElseThrow();
        position.makeMove(rookOut); // Rh1-g1
        position.makeMove(new Move(Square.fromAlgebraic("e8"), Square.fromAlgebraic("d8")));
        Move rookBack = MoveGenerator.legalMoves(position).stream()
                .filter(m -> m.to() == rookFrom)
                .findFirst()
                .orElseThrow();
        position.makeMove(rookBack); // Rg1-h1, back where it started

        assertFalse(canCastle(position, kingFrom, rookFrom));
    }
}
