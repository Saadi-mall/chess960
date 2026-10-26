package com.chess960.backend.lesson;

import java.util.List;

/**
 * Today's lesson, fully computed on the server: every sentence is a template filled from
 * the analyzer's counts or Stockfish's lines, never free-written chess advice.
 *
 * @param evaluation Stockfish's score for the start, from White's side, e.g. "+0.31"
 * @param features the key features of the position, each with arrows/squares to show
 * @param mainLine Stockfish's main line in numbered SAN, e.g. "1. Nf3 Nf6 2. d4"
 * @param mainLineMoves the same line as a list of SAN moves
 * @param mainLineFens the starting FEN, then the FEN after each main-line move
 * @param mainLineSquares each main-line move's from/to squares, for highlighting the last move
 * @param plans what each side does in that main line, drawn as arrows
 */
public record Lesson(
        String date,
        int number,
        String fen,
        String evaluation,
        List<Feature> features,
        WeakestPawnQuiz weakestPawn,
        MoveQuiz whiteMoves,
        MoveQuiz blackMoves,
        String mainLine,
        List<String> mainLineMoves,
        List<String> mainLineFens,
        List<Arrow> mainLineSquares,
        List<Plan> plans) {

    /** @param color "feature", "white" or "black" - which colour the board draws it in */
    public record Arrow(String from, String to, String color) {}

    /** @param squares squares to highlight on the board while this feature is shown */
    public record Feature(String title, String text, List<Arrow> arrows, List<String> squares) {}

    /** @param answers every pawn that counts as correct - ties are all accepted */
    public record WeakestPawnQuiz(String question, List<String> answers, String explanation) {}

    /**
     * One of Stockfish's top moves. {@code from}/{@code to}/{@code promotion} use the same
     * encoding as the board's legal moves (castling is king-to-rook-square) so a guess can
     * be compared directly; {@code arrowTo} is where the moving piece actually lands.
     */
    public record CandidateMove(String san, String from, String to, String promotion, String arrowTo, String score) {}

    /** A legal move with its SAN (and where the piece lands, for drawing an arrow), so the
     * page can name and draw a guess without knowing the rules. */
    public record LegalMoveSan(String from, String to, String promotion, String san, String arrowTo) {}

    public record MoveQuiz(
            String fen, String sideToMove, String prompt, List<CandidateMove> bestMoves, List<LegalMoveSan> legalMoves) {}

    public record Plan(String side, List<String> moves, List<Arrow> arrows, String text) {}
}
