package com.chess960.backend.game;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.chess960.backend.rules.Color;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.PieceType;
import com.chess960.backend.rules.Position;
import com.chess960.backend.rules.Square;
import org.junit.jupiter.api.Test;

class GameTest {

    private Game newStartedGame() {
        Game game = new Game("test", Fen.parse(Fen.STANDARD_START), new TimeControl(300, 0), 518);
        game.join(); // white
        game.join(); // black
        return game;
    }

    private void move(Game game, Color color, String from, String to) {
        game.applyMove(color, Square.fromAlgebraic(from), Square.fromAlgebraic(to), null);
    }

    @Test
    void secondJoinStartsTheGame() {
        Game game = new Game("g", Fen.parse(Fen.STANDARD_START), new TimeControl(300, 0), 518);
        assertEquals(GameStatus.WAITING_FOR_OPPONENT, game.status());
        game.join();
        assertEquals(GameStatus.WAITING_FOR_OPPONENT, game.status());
        game.join();
        assertEquals(GameStatus.IN_PROGRESS, game.status());
    }

    @Test
    void recordsSanAndThePositionAfterEveryMove() {
        Game game = newStartedGame();
        move(game, Color.WHITE, "g1", "f3");
        move(game, Color.BLACK, "e7", "e5");

        assertEquals(java.util.List.of("Nf3", "e5"), game.moveHistory());
        assertEquals(3, game.fenHistory().size());
        assertEquals("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1", game.fenHistory().get(0));
        assertEquals(Fen.toShredderFen(game.position()), game.fenHistory().get(2));
    }

    @Test
    void aThirdJoinIsRejected() {
        Game game = newStartedGame();
        assertThrows(GameException.class, game::join);
    }

    @Test
    void wrongTurnIsRejected() {
        Game game = newStartedGame();
        assertThrows(GameException.class, () -> move(game, Color.BLACK, "e7", "e5"));
    }

    @Test
    void illegalMoveIsRejected() {
        Game game = newStartedGame();
        assertThrows(GameException.class, () -> move(game, Color.WHITE, "e2", "e5"));
    }

    @Test
    void foolsMateEndsInCheckmate() {
        Game game = newStartedGame();
        move(game, Color.WHITE, "f2", "f3");
        move(game, Color.BLACK, "e7", "e5");
        move(game, Color.WHITE, "g2", "g4");
        move(game, Color.BLACK, "d8", "h4");

        assertEquals(GameStatus.CHECKMATE, game.status());
        assertEquals(Color.BLACK, game.winner());
    }

    @Test
    void resignationEndsTheGameForTheOtherSide() {
        Game game = newStartedGame();
        game.resign(Color.WHITE);
        assertEquals(GameStatus.RESIGNED, game.status());
        assertEquals(Color.BLACK, game.winner());
    }

    @Test
    void bothSidesAgreeingEndsInADraw() {
        Game game = newStartedGame();
        game.offerDraw(Color.WHITE);
        assertEquals(Color.WHITE, game.drawOfferBy());
        game.respondToDraw(Color.BLACK, true);
        assertEquals(GameStatus.DRAW_AGREEMENT, game.status());
    }

    @Test
    void decliningADrawKeepsPlaying() {
        Game game = newStartedGame();
        game.offerDraw(Color.WHITE);
        game.respondToDraw(Color.BLACK, false);
        assertEquals(GameStatus.IN_PROGRESS, game.status());
        assertNull(game.drawOfferBy());
    }

    @Test
    void aMoveClearsAStandingDrawOffer() {
        Game game = newStartedGame();
        game.offerDraw(Color.WHITE);
        move(game, Color.WHITE, "e2", "e4"); // White plays on instead of waiting for a reply
        assertNull(game.drawOfferBy());
    }

    @Test
    void kingAndBishopVsKingIsInsufficientMaterial() {
        // King + bishop vs king: neither side can force mate.
        Position position = Fen.parse("4k3/8/8/8/8/8/8/2B1K3 w - - 0 1");
        Game game = new Game("g", position, new TimeControl(300, 0), 518);
        game.join();
        game.join();

        move(game, Color.WHITE, "e1", "d2");

        assertEquals(GameStatus.DRAW_INSUFFICIENT_MATERIAL, game.status());
    }

    @Test
    void timeoutWithOpponentHavingMaterialIsAWin() {
        Game game = new Game("g", Fen.parse(Fen.STANDARD_START), new TimeControl(1, 0), 518);
        game.join();
        game.join();
        sleep(1100);

        assertEquals(GameStatus.TIMEOUT, game.checkTimeout().orElseThrow());
        assertEquals(GameStatus.TIMEOUT, game.status());
        assertEquals(Color.BLACK, game.winner());
    }

    @Test
    void timeoutWithOpponentLackingMaterialIsADraw() {
        Position position = Fen.parse("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
        Game game = new Game("g", position, new TimeControl(1, 0), 518);
        game.join();
        game.join();
        sleep(1100);

        assertEquals(GameStatus.DRAW_INSUFFICIENT_MATERIAL, game.checkTimeout().orElseThrow());
    }

    @Test
    void remainingTimeCountsDownWhileItsYourTurn() {
        Game game = newStartedGame();
        sleep(1100);
        assertTrue(game.remainingMillis(Color.WHITE) < 300_000);
        assertEquals(300_000, game.remainingMillis(Color.BLACK));
    }

    @Test
    void repetitionOfTheSamePositionThreeTimesIsADraw() {
        Game game = newStartedGame();
        for (int i = 0; i < 2; i++) {
            move(game, Color.WHITE, "g1", "f3");
            move(game, Color.BLACK, "g8", "f6");
            move(game, Color.WHITE, "f3", "g1");
            move(game, Color.BLACK, "f6", "g8");
        }
        assertEquals(GameStatus.DRAW_REPETITION, game.status());
    }

    @Test
    void castlingIsOfferedAndAppliedAsKingCapturesRook() {
        Position position = Fen.parse("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
        Game game = new Game("g", position, new TimeControl(300, 0), 518);
        game.join();
        game.join();

        game.applyMove(Color.WHITE, Square.fromAlgebraic("e1"), Square.fromAlgebraic("h1"), null);

        assertEquals(PieceType.KING, game.position().pieceAt(Square.fromAlgebraic("g1")).type());
        assertEquals(PieceType.ROOK, game.position().pieceAt(Square.fromAlgebraic("f1")).type());
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
