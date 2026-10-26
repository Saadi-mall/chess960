package com.chess960.backend.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.chess960.backend.rules.Fen;
import org.junit.jupiter.api.Test;

/**
 * Exercises the real Stockfish binary (must be on PATH, or set via the
 * chess960.stockfish-path property / STOCKFISH_PATH) rather than mocking the process -
 * the whole point of this class is the UCI wire format, which a mock can't catch bugs in.
 */
class StockfishEngineTest {

    private final StockfishEngine engine = new StockfishEngine("stockfish");

    @Test
    void evaluatesTheStandardOpeningPosition() {
        EngineEvaluation evaluation = engine.evaluate(Fen.STANDARD_START, 300);

        assertNotNull(evaluation.bestMoveUci());
        assertEquals(4, evaluation.bestMoveUci().length());
        assertTrue(evaluation.depth() > 0);
        // The opening position isn't a forced mate for either side.
        assertEquals(null, evaluation.mateInMoves());
        assertNotNull(evaluation.scoreCentipawns());
    }

    @Test
    void returnsThreeDistinctLinesBestFirst() {
        var lines = engine.topLines(Fen.STANDARD_START, 400, 3);

        assertEquals(3, lines.size());
        assertEquals(3, lines.stream().map(l -> l.pv().get(0)).distinct().count());
        assertTrue(lines.get(0).scoreCentipawns() >= lines.get(2).scoreCentipawns());
        assertTrue(lines.get(0).pv().size() > 1, "a line should hold more than its first move");
    }

    @Test
    void findsABackRankMateInOne() {
        EngineEvaluation evaluation = engine.evaluate("6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1", 300);

        assertEquals("e1e8", evaluation.bestMoveUci());
        assertEquals(1, evaluation.mateInMoves());
    }

    @Test
    void readsChess960CastlingRightsAndAnswersInTheSameNotation() {
        // King on b1 between both rooks - only reachable via Shredder-FEN's file letters,
        // not classic KQkq. If UCI_Chess960 weren't on, Stockfish would misread this FEN.
        EngineEvaluation evaluation = engine.evaluate("4k3/8/8/8/8/8/8/RK5R w HA - 0 1", 300);

        assertNotNull(evaluation.bestMoveUci());
    }
}
