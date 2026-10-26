package com.chess960.backend.lesson;

import com.chess960.backend.lesson.Lesson.CandidateMove;
import java.util.List;
import java.util.Objects;

/**
 * Grades a learner's answers against the lesson on the server, so a stored result can't
 * be made up by the browser. Guesses are compared in the board's move encoding (castling
 * as king-to-rook-square); duplicates count once.
 */
public final class LessonGrader {

    private LessonGrader() {}

    public record Guess(String from, String to, String promotion) {}

    public record Answers(String weakestPawn, List<Guess> whiteGuesses, List<Guess> blackGuesses) {}

    public record Grade(boolean weakestPawnCorrect, int whiteFound, int blackFound) {}

    public static Grade grade(Lesson lesson, Answers answers) {
        return new Grade(
                answers.weakestPawn() != null && lesson.weakestPawn().answers().contains(answers.weakestPawn()),
                found(lesson.whiteMoves().bestMoves(), answers.whiteGuesses()),
                found(lesson.blackMoves().bestMoves(), answers.blackGuesses()));
    }

    private static int found(List<CandidateMove> best, List<Guess> guesses) {
        if (guesses == null) return 0;
        return (int) best.stream()
                .filter(b -> guesses.stream().anyMatch(g ->
                        b.from().equals(g.from()) && b.to().equals(g.to()) && Objects.equals(b.promotion(), g.promotion())))
                .count();
    }
}
