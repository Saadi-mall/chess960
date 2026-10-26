package com.chess960.backend.lesson;

import com.chess960.backend.analysis.PositionAnalyzer;
import com.chess960.backend.engine.EngineLine;
import com.chess960.backend.lesson.Lesson.Arrow;
import com.chess960.backend.lesson.Lesson.CandidateMove;
import com.chess960.backend.lesson.Lesson.Feature;
import com.chess960.backend.lesson.Lesson.LegalMoveSan;
import com.chess960.backend.lesson.Lesson.MoveQuiz;
import com.chess960.backend.lesson.Lesson.Plan;
import com.chess960.backend.lesson.Lesson.WeakestPawnQuiz;
import com.chess960.backend.rules.CastleSide;
import com.chess960.backend.rules.Chess960StartingPosition;
import com.chess960.backend.rules.Color;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.Move;
import com.chess960.backend.rules.MoveFlag;
import com.chess960.backend.rules.MoveGenerator;
import com.chess960.backend.rules.Piece;
import com.chess960.backend.rules.PieceType;
import com.chess960.backend.rules.Position;
import com.chess960.backend.rules.San;
import com.chess960.backend.rules.Square;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Turns a starting position plus Stockfish's top lines into a {@link Lesson}. Every
 * sentence is a fixed template filled with numbers read off the board (defenders,
 * blockers, what a bishop's diagonal reaches) or moves Stockfish actually chose - so the
 * lesson never states anything that wasn't computed.
 *
 * <p>Chess960 starting positions are mirror images of each other, so features are
 * described from White's side once, with a note that Black's are the same.
 */
public final class LessonBuilder {

    /** How many half-moves of Stockfish's main line the plans are drawn from. */
    static final int MAIN_LINE_PLIES = 8;

    private LessonBuilder() {}

    /**
     * @param whiteLines Stockfish's top lines from the starting position (White to move)
     * @param blackLines Stockfish's top lines after White's best move (Black to move)
     */
    public static Lesson build(LocalDate date, int number, List<EngineLine> whiteLines, List<EngineLine> blackLines) {
        String startFen = Chess960StartingPosition.startingFen(number);
        Position start = Fen.parse(startFen);
        String bestWhite = whiteLines.get(0).pv().get(0);
        String blackFen = fenAfter(startFen, bestWhite);
        String bestWhiteSan = San.ofUci(Fen.parse(startFen), bestWhite).orElseThrow();

        List<String> mainLineUci = new ArrayList<>();
        mainLineUci.add(bestWhite);
        mainLineUci.addAll(blackLines.get(0).pv());
        MainLine mainLine = replay(startFen, mainLineUci);

        return new Lesson(
                date.toString(),
                number,
                startFen,
                formatScore(whiteLines.get(0), Color.WHITE),
                features(start, whiteLines.get(0)),
                weakestPawn(start),
                new MoveQuiz(
                        startFen,
                        "white",
                        "Find White's three best first moves, in any order.",
                        candidates(startFen, whiteLines, Color.WHITE),
                        legalMovesWithSan(startFen)),
                new MoveQuiz(
                        blackFen,
                        "black",
                        "After 1. " + bestWhiteSan + ", find Black's three best replies, in any order.",
                        candidates(blackFen, blackLines, Color.BLACK),
                        legalMovesWithSan(blackFen)),
                mainLineText(startFen, mainLineUci),
                mainLine.moves(),
                mainLine.fens(),
                plans(startFen, mainLineUci));
    }

    /** The position after one UCI move, as Shredder-FEN. */
    public static String fenAfter(String fen, String uci) {
        Position position = Fen.parse(fen);
        position.makeMove(find(position, uci).orElseThrow(() -> new IllegalArgumentException("Illegal: " + uci)));
        return Fen.toShredderFen(position);
    }

    // ---------- Key features ----------

    static List<Feature> features(Position start, EngineLine best) {
        List<Feature> features = new ArrayList<>();
        features.add(new Feature(
                "The verdict",
                "Stockfish rates the starting position " + formatScore(best, Color.WHITE) + ": " + verdict(best)
                        + ". Like every Chess960 start it is mirror-symmetric, so each point below applies to Black"
                        + " on the other side of the board.",
                List.of(),
                List.of()));
        features.add(kings(start));
        longDiagonalBishops(start).ifPresent(features::add);
        undefendedPawns(start).ifPresent(features::add);
        return features;
    }

    private static Feature kings(Position start) {
        int king = start.findKing(Color.WHITE);
        List<String> parts = new ArrayList<>();
        List<Arrow> arrows = new ArrayList<>();
        for (CastleSide side : CastleSide.values()) {
            Integer blockers = PositionAnalyzer.castlingBlockers(start, Color.WHITE, side);
            if (blockers == null) continue;
            boolean kingside = side == CastleSide.KINGSIDE;
            int kingDest = Square.of(kingside ? 6 : 2, 0);
            int rookFrom = Square.of(start.castling().rookFile(Color.WHITE, side), 0);
            int rookDest = Square.of(kingside ? 5 : 3, 0);
            String kingPart = kingDest == king
                    ? "leaves the king on " + alg(kingDest)
                    : "takes the king to " + alg(kingDest);
            String rookPart = rookDest == rookFrom
                    ? "leaves the rook on " + alg(rookDest)
                    : "brings the " + alg(rookFrom) + " rook to " + alg(rookDest);
            parts.add((kingside ? "Castling kingside (O-O) " : "Castling queenside (O-O-O) ")
                    + kingPart + " and " + rookPart + ", with " + blockersPhrase(blockers) + " in the way.");
            // One arrow per castle - the king's path, or the rook's when the king stays put -
            // so the two castles' arrows don't pile up along the back rank.
            if (kingDest != king) arrows.add(new Arrow(alg(king), alg(kingDest), "feature"));
            else if (rookDest != rookFrom) arrows.add(new Arrow(alg(rookFrom), alg(rookDest), "feature"));
        }
        return new Feature(
                "Kings and castling",
                "White's king starts on " + alg(king) + ". " + String.join(" ", parts),
                arrows,
                List.of(alg(king)));
    }

    /** Bishops on a1/h1: what their long diagonal reaches once their own pawn moves out of the way. */
    private static Optional<Feature> longDiagonalBishops(Position start) {
        List<String> sentences = new ArrayList<>();
        List<Arrow> arrows = new ArrayList<>();
        for (int file : new int[] {0, 7}) {
            int square = Square.of(file, 0);
            Piece piece = start.pieceAt(square);
            if (piece == null || piece.type() != PieceType.BISHOP || piece.color() != Color.WHITE) continue;

            int fileStep = file == 0 ? 1 : -1;
            Integer blocker = null;
            Integer target = null;
            for (int f = file + fileStep, r = 1; f >= 0 && f < 8 && r < 8; f += fileStep, r++) {
                Piece on = start.pieceAt(Square.of(f, r));
                if (on == null) continue;
                if (on.color() == Color.WHITE && on.type() == PieceType.PAWN && blocker == null) {
                    blocker = Square.of(f, r);
                } else {
                    if (on.color() == Color.BLACK) target = Square.of(f, r);
                    break;
                }
            }
            String diagonal = file == 0 ? "a1-h8" : "h1-a8";
            String sentence = "White's bishop on " + alg(square) + " sits on the long " + diagonal + " diagonal.";
            if (blocker != null && target != null) {
                sentence += " Its own pawn on " + alg(blocker) + " blocks it for now; once that pawn moves, it looks"
                        + " straight at Black's " + pieceName(start.pieceAt(target)) + " on " + alg(target) + ".";
                arrows.add(new Arrow(alg(square), alg(target), "feature"));
            }
            sentences.add(sentence);
        }
        if (sentences.isEmpty()) return Optional.empty();
        return Optional.of(new Feature("Long-diagonal bishops", String.join(" ", sentences), arrows, List.of()));
    }

    private static Optional<Feature> undefendedPawns(Position start) {
        List<String> squares = new ArrayList<>();
        for (int file = 0; file < 8; file++) {
            int square = Square.of(file, 1);
            if (isPawn(start, square, Color.WHITE) && MoveGenerator.countAttackers(start, square, Color.WHITE) == 0) {
                squares.add(alg(square));
            }
        }
        if (squares.isEmpty()) {
            return Optional.of(new Feature(
                    "Pawn cover",
                    "Every White pawn has at least one defender to start with.",
                    List.of(),
                    List.of()));
        }
        boolean one = squares.size() == 1;
        return Optional.of(new Feature(
                "Undefended pawns",
                "Nothing defends White's " + (one ? "pawn on " : "pawns on ") + joinList(squares)
                        + " yet, so " + (one ? "it is a natural early target" : "they are natural early targets")
                        + " - and the same goes for Black's " + joinList(squares.stream().map(LessonBuilder::mirror).toList())
                        + ".",
                List.of(),
                squares));
    }

    // ---------- Weakest pawn ----------

    /**
     * White's weakest pawn: fewest defenders, ties broken by how many Black bishops/queens
     * are already aimed at it down a diagonal (with only Black's own pawns in between,
     * since those can move out of the way). Any pawn tied on both counts is accepted.
     */
    static WeakestPawnQuiz weakestPawn(Position start) {
        record Candidate(int square, int defenders, List<Integer> aimers) {}
        List<Candidate> pawns = new ArrayList<>();
        for (int square = 0; square < 64; square++) {
            if (isPawn(start, square, Color.WHITE)) {
                pawns.add(new Candidate(
                        square, MoveGenerator.countAttackers(start, square, Color.WHITE), diagonalAimers(start, square)));
            }
        }
        Comparator<Candidate> weakestFirst = Comparator.comparingInt(Candidate::defenders)
                .thenComparing(c -> -c.aimers().size());
        pawns.sort(weakestFirst);
        Candidate top = pawns.get(0);
        List<Candidate> tied = pawns.stream().filter(c -> weakestFirst.compare(c, top) == 0).toList();
        List<String> answers = tied.stream().map(c -> alg(c.square())).toList();

        String defenders = switch (top.defenders()) {
            case 0 -> "no defenders";
            case 1 -> "only one defender";
            default -> top.defenders() + " defenders";
        };
        StringBuilder explanation = new StringBuilder();
        explanation.append(tied.size() == 1
                ? answers.get(0) + " is White's weakest pawn: it has " + defenders
                : joinList(answers) + " are equally weak: each has " + defenders);
        if (!top.aimers().isEmpty()) {
            for (Candidate c : tied) {
                List<String> by = c.aimers().stream()
                        .map(s -> "Black's " + pieceName(start.pieceAt(s)) + " on " + alg(s))
                        .toList();
                explanation.append(tied.size() == 1 ? ", and " : "; at " + alg(c.square()) + " ")
                        .append(joinList(by))
                        .append(by.size() == 1 ? " is" : " are")
                        .append(" already aimed at it down the diagonal");
            }
        }
        explanation.append(". Black's ")
                .append(joinList(answers.stream().map(LessonBuilder::mirror).toList()))
                .append(tied.size() == 1 ? " is" : " are")
                .append(" just as weak - the position is symmetric.");

        return new WeakestPawnQuiz("Which of White's pawns is the weakest?", answers, explanation.toString());
    }

    private static List<Integer> diagonalAimers(Position position, int square) {
        List<Integer> aimers = new ArrayList<>();
        int[][] directions = {{1, 1}, {-1, 1}, {1, -1}, {-1, -1}};
        for (int[] d : directions) {
            for (int f = Square.file(square) + d[0], r = Square.rank(square) + d[1];
                    Square.onBoard(f, r);
                    f += d[0], r += d[1]) {
                Piece on = position.pieceAt(Square.of(f, r));
                if (on == null) continue;
                if (on.color() == Color.BLACK && on.type() == PieceType.PAWN) continue;
                if (on.color() == Color.BLACK && (on.type() == PieceType.BISHOP || on.type() == PieceType.QUEEN)) {
                    aimers.add(Square.of(f, r));
                }
                break;
            }
        }
        return aimers;
    }

    // ---------- Best moves and plans ----------

    static List<CandidateMove> candidates(String fen, List<EngineLine> lines, Color sideToMove) {
        List<CandidateMove> out = new ArrayList<>();
        for (EngineLine line : lines) {
            Position position = Fen.parse(fen);
            Optional<Move> move = find(position, line.pv().get(0));
            if (move.isEmpty()) continue;
            Move m = move.get();
            out.add(new CandidateMove(
                    San.of(position, m),
                    alg(m.from()),
                    alg(m.to()),
                    promotionLetter(m.promotion()),
                    alg(landingSquare(m)),
                    formatScore(line, sideToMove)));
        }
        return out;
    }

    static List<LegalMoveSan> legalMovesWithSan(String fen) {
        Position position = Fen.parse(fen);
        return MoveGenerator.legalMoves(position).stream()
                .map(m -> new LegalMoveSan(
                        alg(m.from()), alg(m.to()), promotionLetter(m.promotion()), San.of(position, m), alg(landingSquare(m))))
                .toList();
    }

    private record MainLine(List<String> moves, List<String> fens) {}

    private static MainLine replay(String startFen, List<String> uciLine) {
        Position position = Fen.parse(startFen);
        List<String> moves = new ArrayList<>();
        List<String> fens = new ArrayList<>(List.of(startFen));
        for (String uci : uciLine) {
            if (moves.size() == MAIN_LINE_PLIES) break;
            Optional<Move> move = find(position, uci);
            if (move.isEmpty()) break;
            moves.add(San.of(position, move.get()));
            position.makeMove(move.get());
            fens.add(Fen.toShredderFen(position));
        }
        return new MainLine(moves, fens);
    }

    private static String mainLineText(String startFen, List<String> uciLine) {
        Position position = Fen.parse(startFen);
        StringBuilder text = new StringBuilder();
        int plies = 0;
        for (String uci : uciLine) {
            if (plies == MAIN_LINE_PLIES) break;
            Optional<Move> move = find(position, uci);
            if (move.isEmpty()) break;
            if (plies % 2 == 0) text.append(plies / 2 + 1).append(". ");
            text.append(San.of(position, move.get())).append(' ');
            position.makeMove(move.get());
            plies++;
        }
        return text.toString().trim();
    }

    /** Each side's moves in the main line, as arrows from where the piece starts to where it lands. */
    static List<Plan> plans(String startFen, List<String> uciLine) {
        Position position = Fen.parse(startFen);
        List<String> whiteMoves = new ArrayList<>();
        List<String> blackMoves = new ArrayList<>();
        List<Arrow> whiteArrows = new ArrayList<>();
        List<Arrow> blackArrows = new ArrayList<>();
        int plies = 0;
        for (String uci : uciLine) {
            if (plies == MAIN_LINE_PLIES) break;
            Optional<Move> move = find(position, uci);
            if (move.isEmpty()) break;
            Move m = move.get();
            boolean white = plies % 2 == 0;
            (white ? whiteMoves : blackMoves).add(San.of(position, m));
            (white ? whiteArrows : blackArrows)
                    .add(new Arrow(alg(m.from()), alg(landingSquare(m)), white ? "white" : "black"));
            position.makeMove(m);
            plies++;
        }
        return List.of(
                new Plan("white", whiteMoves, whiteArrows,
                        "In Stockfish's main line White plays " + joinList(whiteMoves) + "."),
                new Plan("black", blackMoves, blackArrows,
                        "Black answers with " + joinList(blackMoves) + "."));
    }

    // ---------- Helpers ----------

    static String formatScore(EngineLine line, Color sideToMove) {
        int sign = sideToMove == Color.WHITE ? 1 : -1;
        if (line.mateInMoves() != null) {
            int mate = sign * line.mateInMoves();
            return mate > 0 ? "White mates in " + mate : "Black mates in " + -mate;
        }
        return String.format(Locale.ROOT, "%+.2f", sign * line.scoreCentipawns() / 100.0);
    }

    private static String verdict(EngineLine whiteToMove) {
        if (whiteToMove.mateInMoves() != null) return "a forced mate";
        int cp = whiteToMove.scoreCentipawns();
        String side = cp > 0 ? "White" : "Black";
        if (Math.abs(cp) <= 30) return "roughly level";
        if (Math.abs(cp) <= 90) return side + " has a slight edge";
        return side + " is clearly better";
    }

    private static Optional<Move> find(Position position, String uci) {
        if (uci == null || uci.length() < 4) return Optional.empty();
        int from = Square.fromAlgebraic(uci.substring(0, 2));
        int to = Square.fromAlgebraic(uci.substring(2, 4));
        String promo = uci.length() > 4 ? uci.substring(4) : null;
        return MoveGenerator.legalMoves(position).stream()
                .filter(m -> m.from() == from && m.to() == to && java.util.Objects.equals(promotionLetter(m.promotion()), promo))
                .findFirst();
    }

    /** Where the moving piece ends up - for castling (stored as king-takes-rook) the king's g/c square. */
    private static int landingSquare(Move move) {
        if (move.flag() != MoveFlag.CASTLE) return move.to();
        boolean kingside = Square.file(move.to()) > Square.file(move.from());
        return Square.of(kingside ? 6 : 2, Square.rank(move.from()));
    }

    private static boolean isPawn(Position position, int square, Color color) {
        Piece piece = position.pieceAt(square);
        return piece != null && piece.type() == PieceType.PAWN && piece.color() == color;
    }

    private static String mirror(String square) {
        return square.charAt(0) + String.valueOf(9 - Character.getNumericValue(square.charAt(1)));
    }

    private static String pieceName(Piece piece) {
        return piece.type().name().toLowerCase(Locale.ROOT);
    }

    private static String promotionLetter(PieceType type) {
        return type == null ? null : String.valueOf(Character.toLowerCase(new Piece(type, Color.WHITE).fenChar()));
    }

    private static String blockersPhrase(int n) {
        if (n == 0) return "nothing";
        if (n == 1) return "one of White's own pieces";
        return n + " of White's own pieces";
    }

    private static String joinList(List<String> items) {
        if (items.size() <= 1) return String.join("", items);
        return String.join(", ", items.subList(0, items.size() - 1)) + " and " + items.get(items.size() - 1);
    }

    private static String alg(int square) {
        return Square.toAlgebraic(square);
    }
}
