package com.chess960.backend.position;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.chess960.backend.rules.Fen;
import org.junit.jupiter.api.Test;

class PositionServiceTest {

    private final PositionService service = new PositionService();

    @Test
    void appliesALegalMoveAndReturnsTheNewLegalMoves() {
        PositionStateResponse response =
                service.applyMove(new MoveRequest(Fen.STANDARD_START, "e2", "e4", null));

        assertEquals("black", response.turn());
        assertEquals("IN_PROGRESS", response.status());
        assertTrue(response.legalMoves().stream().anyMatch(m -> m.from().equals("e7") && m.to().equals("e5")));
    }

    @Test
    void replaysAWholeLineIncludingChess960Castling() {
        // Position #0-style back rank with the king on b1 and a rook on a1 next to it.
        var positions = service.replay("1k6/8/8/8/8/8/P7/RK5R w HA - 0 1", java.util.List.of(
                new MoveDto("b1", "a1", null),
                new MoveDto("b8", "c8", null)));

        assertEquals(2, positions.size());
        assertEquals("O-O-O", positions.get(0).lastMoveSan());
        assertEquals("Kc8", positions.get(1).lastMoveSan());
        assertEquals("white", positions.get(1).turn());
    }

    @Test
    void replayStopsAtAnIllegalMove() {
        assertThrows(IllegalArgumentException.class, () -> service.replay(Fen.STANDARD_START, java.util.List.of(
                new MoveDto("e2", "e4", null),
                new MoveDto("e2", "e4", null))));
    }

    @Test
    void rejectsAnIllegalMove() {
        assertThrows(
                IllegalArgumentException.class,
                () -> service.applyMove(new MoveRequest(Fen.STANDARD_START, "e2", "e5", null)));
    }

    @Test
    void detectsCheckmate() {
        // Fool's mate: after 1.f3 e5 2.g4, Black plays Qh4#.
        String beforeMatingMove = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b HAha g3 0 2";
        PositionStateResponse response = service.applyMove(new MoveRequest(beforeMatingMove, "d8", "h4", null));

        assertEquals("CHECKMATE", response.status());
        assertEquals("black", response.winner());
    }

    @Test
    void detectsStalemate() {
        // A standard stalemate study: Black to move, no legal moves, not in check.
        PositionStateResponse response = service.legalMovesFor("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");

        assertEquals("STALEMATE", response.status());
    }

    @Test
    void appliesAPromotion() {
        PositionStateResponse response =
                service.applyMove(new MoveRequest("k7/4P3/8/8/8/8/8/4K3 w - - 0 1", "e7", "e8", "q"));

        assertTrue(response.fen().startsWith("k3Q3"));
    }
}
