package com.chess960.backend.lesson;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.chess960.backend.engine.EngineLine;
import com.chess960.backend.lesson.Lesson.Arrow;
import com.chess960.backend.lesson.Lesson.CandidateMove;
import com.chess960.backend.rules.Chess960StartingPosition;
import com.chess960.backend.rules.Color;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.MoveGenerator;
import com.chess960.backend.rules.Position;
import com.chess960.backend.rules.Square;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Uses position #0 (BBQNNRKR): the a1 bishop sits on a long diagonal and the e2 pawn
 * starts with no defenders. The engine lines are written by hand so the test doesn't
 * depend on Stockfish's exact choices.
 */
class LessonBuilderTest {

    private static final List<EngineLine> WHITE_LINES = List.of(
            new EngineLine(35, null, 20, List.of("e2e4", "e7e5", "d1e3", "g7g6")),
            new EngineLine(25, null, 20, List.of("g2g3")),
            new EngineLine(20, null, 20, List.of("d1e3")));
    private static final List<EngineLine> BLACK_LINES = List.of(
            new EngineLine(-30, null, 20, List.of("e7e5", "d1e3", "g7g6")),
            new EngineLine(-40, null, 20, List.of("d8e6")),
            new EngineLine(-45, null, 20, List.of("g7g6")));

    private final Lesson lesson = LessonBuilder.build(LocalDate.of(2026, 10, 26), 0, WHITE_LINES, BLACK_LINES);

    @Test
    void theWeakestPawnHasTheFewestDefenders() {
        assertEquals(List.of("e2"), lesson.weakestPawn().answers());
        assertTrue(lesson.weakestPawn().explanation().startsWith("e2 is White's weakest pawn: it has no defenders"));
        assertTrue(lesson.weakestPawn().explanation().contains("Black's e7"));

        Position start = Fen.parse(Chess960StartingPosition.startingFen(0));
        for (int file = 0; file < 8; file++) {
            int square = Square.of(file, 1);
            assertTrue(MoveGenerator.countAttackers(start, square, Color.WHITE)
                    >= MoveGenerator.countAttackers(start, Square.fromAlgebraic("e2"), Color.WHITE));
        }
    }

    @Test
    void explainsWhatTheLongDiagonalBishopIsAimedAt() {
        Lesson.Feature bishops = lesson.features().stream()
                .filter(f -> f.title().equals("Long-diagonal bishops"))
                .findFirst()
                .orElseThrow();
        assertTrue(bishops.text().contains("bishop on a1 sits on the long a1-h8 diagonal"));
        assertTrue(bishops.text().contains("own pawn on b2"));
        assertTrue(bishops.text().contains("Black's pawn on g7"));
        assertEquals(List.of(new Arrow("a1", "g7", "feature")), bishops.arrows());
    }

    @Test
    void theVerdictUsesStockfishsScore() {
        assertEquals("+0.35", lesson.evaluation());
        assertTrue(lesson.features().get(0).text().contains("+0.35: White has a slight edge"));
    }

    @Test
    void bestMovesAreInSanWithScoresFromWhitesSide() {
        assertEquals(List.of("e4", "g3", "Ne3"), lesson.whiteMoves().bestMoves().stream().map(CandidateMove::san).toList());
        assertEquals(List.of("e5", "Ne6", "g6"), lesson.blackMoves().bestMoves().stream().map(CandidateMove::san).toList());
        assertEquals("+0.30", lesson.blackMoves().bestMoves().get(0).score());
        assertTrue(lesson.blackMoves().prompt().startsWith("After 1. e4,"));
        assertEquals("black", lesson.blackMoves().sideToMove());
    }

    @Test
    void everyLegalMoveComesWithItsSan() {
        assertEquals(
                MoveGenerator.legalMoves(Fen.parse(lesson.whiteMoves().fen())).size(),
                lesson.whiteMoves().legalMoves().size());
        assertTrue(lesson.whiteMoves().legalMoves().stream().anyMatch(m -> m.san().equals("Ne3")));
    }

    @Test
    void plansSplitTheMainLineBySide() {
        assertEquals("1. e4 e5 2. Ne3 g6", lesson.mainLine());
        assertEquals(List.of("e4", "e5", "Ne3", "g6"), lesson.mainLineMoves());
        assertEquals(5, lesson.mainLineFens().size());
        assertEquals(List.of("e4", "Ne3"), lesson.plans().get(0).moves());
        assertEquals(List.of("e5", "g6"), lesson.plans().get(1).moves());
        assertEquals(new Arrow("d1", "e3", "white"), lesson.plans().get(0).arrows().get(1));
    }
}
