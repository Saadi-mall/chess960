package com.chess960.backend.analysis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.chess960.backend.rules.Chess960StartingPosition;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.Position;
import com.chess960.backend.rules.Square;
import org.junit.jupiter.api.Test;

class PositionAnalyzerTest {

    @Test
    void standardChessHasNoUndefendedPawnsAndNoLongDiagonalBishops() {
        PositionOverview overview = PositionAnalyzer.analyze(Fen.parse(Fen.STANDARD_START));

        assertEquals(518, overview.positionNumber());
        assertTrue(overview.white().undefendedPawnSquares().isEmpty());
        assertTrue(overview.black().undefendedPawnSquares().isEmpty());
        assertTrue(overview.white().longDiagonalBishopSquares().isEmpty());
    }

    @Test
    void standardChessCastlesFasterKingsideThanQueenside() {
        PositionOverview overview = PositionAnalyzer.analyze(Fen.parse(Fen.STANDARD_START));

        // Kingside only needs the bishop and knight on f1/g1 to move; queenside needs
        // three pieces (b1, c1, d1) out of the way.
        assertEquals(2, overview.white().castlingDistance());
    }

    @Test
    void position0HasAnUndefendedE2AndABishopOnTheLongDiagonal() {
        // Chess960 #0 is BBQNNRKR: with the king already on g1 next to its rook, e2 ends
        // up defended by nothing - a real quirk of this particular starting array.
        Position position = Fen.parse(Chess960StartingPosition.startingFen(0));
        PositionOverview overview = PositionAnalyzer.analyze(position);

        assertEquals(0, overview.positionNumber());
        assertEquals(java.util.List.of(Square.fromAlgebraic("e2")), overview.white().undefendedPawnSquares());
        assertEquals(
                java.util.List.of(Square.fromAlgebraic("a1")), overview.white().longDiagonalBishopSquares());
        assertEquals(1, overview.white().castlingDistance());
    }

    @Test
    void positionNumberIsNullOnceTheBackRankHasBeenDisturbed() {
        Position position = Fen.parse(Fen.STANDARD_START);
        // Simulate the king having moved off e1 (to the empty e3) without disturbing
        // anything else - still a single legal white king, just not on the back rank.
        position.place(Square.fromAlgebraic("e3"), position.pieceAt(Square.fromAlgebraic("e1")));
        position.place(Square.fromAlgebraic("e1"), null);

        PositionOverview overview = PositionAnalyzer.analyze(position);

        assertEquals(null, overview.positionNumber());
    }
}
