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
