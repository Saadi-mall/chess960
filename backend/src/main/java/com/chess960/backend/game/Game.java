package com.chess960.backend.game;

import com.chess960.backend.rules.Color;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.Move;
import com.chess960.backend.rules.MoveGenerator;
import com.chess960.backend.rules.Piece;
import com.chess960.backend.rules.PieceType;
import com.chess960.backend.rules.Position;
import com.chess960.backend.rules.Square;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * One live game: the position, the clocks, who's playing, and every way the game can end.
 * All state-changing methods are {@code synchronized} - a move arriving over the WebSocket
 * and the periodic timeout sweep ({@link ClockSweeper}) can both touch the same game from
 * different threads, and a game only has two players, so a simple lock costs nothing.
 */
public final class Game {

    private final String id;
    private final Position position;
    private final TimeControl timeControl;
    private final int startingNumber;

    private String whiteToken;
    private String blackToken;
    private boolean whiteConnected;
    private boolean blackConnected;

    private GameStatus status = GameStatus.WAITING_FOR_OPPONENT;
    private Color winner;
    private Color drawOfferBy;

    private long whiteRemainingMillis;
    private long blackRemainingMillis;
    private long lastMoveEpochMillis;

    private final List<String> moveHistory = new ArrayList<>();
    private final Map<String, Integer> positionCounts = new HashMap<>();

    public Game(String id, Position position, TimeControl timeControl, int startingNumber) {
        this.id = id;
        this.position = position;
        this.timeControl = timeControl;
        this.startingNumber = startingNumber;
        this.whiteRemainingMillis = timeControl.initialSeconds() * 1000L;
        this.blackRemainingMillis = timeControl.initialSeconds() * 1000L;
        positionCounts.merge(repetitionKey(), 1, Integer::sum);
    }

    public String id() {
        return id;
    }

    public int startingNumber() {
        return startingNumber;
    }

    public TimeControl timeControl() {
        return timeControl;
    }

    public synchronized Position position() {
        return position;
    }

    public synchronized GameStatus status() {
        return status;
    }

    public synchronized Color winner() {
        return winner;
    }

    public synchronized Color drawOfferBy() {
        return drawOfferBy;
    }

    public synchronized List<String> moveHistory() {
        return List.copyOf(moveHistory);
    }

    /** Remaining time right now, accounting for the clock that's currently ticking. */
    public synchronized long remainingMillis(Color color) {
        long base = color == Color.WHITE ? whiteRemainingMillis : blackRemainingMillis;
        if (status != GameStatus.IN_PROGRESS || position.sideToMove() != color) {
            return base;
        }
        return Math.max(0, base - (System.currentTimeMillis() - lastMoveEpochMillis));
    }

    public synchronized boolean isConnected(Color color) {
        return color == Color.WHITE ? whiteConnected : blackConnected;
    }

    public synchronized void setConnected(Color color, boolean connected) {
        if (color == Color.WHITE) {
            whiteConnected = connected;
        } else {
            blackConnected = connected;
        }
    }

    /** Claims the open color slot for a new player and returns their bearer token. */
    public synchronized String join() {
        if (whiteToken == null) {
            whiteToken = UUID.randomUUID().toString();
            return whiteToken;
        }
        if (blackToken == null) {
            blackToken = UUID.randomUUID().toString();
            status = GameStatus.IN_PROGRESS;
            lastMoveEpochMillis = System.currentTimeMillis();
            return blackToken;
        }
        throw new GameException("Game already has two players");
    }

    public synchronized boolean hasPlayer(Color color) {
        return (color == Color.WHITE ? whiteToken : blackToken) != null;
    }

    public synchronized Optional<Color> colorForToken(String token) {
        if (token == null) return Optional.empty();
        if (token.equals(whiteToken)) return Optional.of(Color.WHITE);
        if (token.equals(blackToken)) return Optional.of(Color.BLACK);
        return Optional.empty();
    }

    public synchronized List<Move> legalMoves() {
        if (status != GameStatus.IN_PROGRESS) {
            return List.of();
        }
        return MoveGenerator.legalMoves(position);
    }

    public synchronized void applyMove(Color mover, int from, int to, PieceType promotion) {
        requireInProgress();
        if (position.sideToMove() != mover) {
            throw new GameException("It's not your turn");
        }

        Move move =
                MoveGenerator.legalMoves(position).stream()
                        .filter(m -> m.from() == from && m.to() == to && m.promotion() == promotion)
                        .findFirst()
                        .orElseThrow(() -> new GameException("Illegal move"));

        long elapsed = System.currentTimeMillis() - lastMoveEpochMillis;
        long remaining = remainingBeforeMove(mover) - elapsed;
        if (remaining <= 0) {
            applyTimeout(mover);
            return;
        }
        setRemaining(mover, remaining + timeControl.incrementSeconds() * 1000L);
        lastMoveEpochMillis = System.currentTimeMillis();

        position.makeMove(move);
        moveHistory.add(toUci(move));
        drawOfferBy = null;

        updateStatusAfterMove(mover);
    }

    public synchronized void resign(Color who) {
        requireInProgress();
        status = GameStatus.RESIGNED;
        winner = who.opposite();
    }

    public synchronized void offerDraw(Color who) {
        requireInProgress();
        drawOfferBy = who;
    }

    public synchronized void respondToDraw(Color who, boolean accept) {
        requireInProgress();
        if (drawOfferBy == null || drawOfferBy == who) {
            throw new GameException("No draw offer to respond to");
        }
        if (accept) {
            status = GameStatus.DRAW_AGREEMENT;
        }
        drawOfferBy = null;
    }

    /** Called periodically; ends the game if whoever's turn it is has run out of time. */
    public synchronized Optional<GameStatus> checkTimeout() {
        if (status != GameStatus.IN_PROGRESS) {
            return Optional.empty();
        }
        Color toMove = position.sideToMove();
        long elapsed = System.currentTimeMillis() - lastMoveEpochMillis;
        if (remainingBeforeMove(toMove) - elapsed > 0) {
            return Optional.empty();
        }
        applyTimeout(toMove);
        return Optional.of(status);
    }

    private void applyTimeout(Color whoseFlagFell) {
        setRemaining(whoseFlagFell, 0);
        Color opponent = whoseFlagFell.opposite();
        if (hasSufficientMatingMaterial(opponent)) {
            status = GameStatus.TIMEOUT;
            winner = opponent;
        } else {
            // FIDE 6.9: if the flag falls but the opponent couldn't checkmate with any
            // sequence of legal moves, it's a draw rather than a loss.
            status = GameStatus.DRAW_INSUFFICIENT_MATERIAL;
        }
    }

    private void updateStatusAfterMove(Color mover) {
        List<Move> replies = MoveGenerator.legalMoves(position);
        boolean inCheck = MoveGenerator.isInCheck(position, position.sideToMove());

        if (replies.isEmpty()) {
            status = inCheck ? GameStatus.CHECKMATE : GameStatus.STALEMATE;
            winner = inCheck ? mover : null;
        } else if (!hasSufficientMatingMaterial(Color.WHITE) && !hasSufficientMatingMaterial(Color.BLACK)) {
            status = GameStatus.DRAW_INSUFFICIENT_MATERIAL;
        } else if (position.halfmoveClock() >= 100) {
            status = GameStatus.DRAW_FIFTY_MOVE;
        } else if (positionCounts.merge(repetitionKey(), 1, Integer::sum) >= 3) {
            status = GameStatus.DRAW_REPETITION;
        }
    }

    /**
     * Whether {@code color} alone has enough material to deliver checkmate against any
     * defense. Simplified like most implementations: a lone king or king-plus-one-minor
     * is insufficient, everything else (including two minors, which technically still
     * can't force mate) counts as sufficient.
     */
    private boolean hasSufficientMatingMaterial(Color color) {
        int minorPieces = 0;
        for (int square = 0; square < 64; square++) {
            Piece piece = position.pieceAt(square);
            if (piece == null || piece.color() != color || piece.type() == PieceType.KING) {
                continue;
            }
            if (piece.type() == PieceType.PAWN
                    || piece.type() == PieceType.ROOK
                    || piece.type() == PieceType.QUEEN) {
                return true;
            }
            minorPieces++;
        }
        return minorPieces >= 2;
    }

    /** The piece placement, side to move, castling rights and en passant square - what
     * FIDE's threefold repetition rule actually compares, ignoring the move clocks. */
    private String repetitionKey() {
        String[] fields = Fen.toShredderFen(position).split(" ");
        return fields[0] + " " + fields[1] + " " + fields[2] + " " + fields[3];
    }

    private long remainingBeforeMove(Color color) {
        return color == Color.WHITE ? whiteRemainingMillis : blackRemainingMillis;
    }

    private void setRemaining(Color color, long millis) {
        if (color == Color.WHITE) {
            whiteRemainingMillis = Math.max(0, millis);
        } else {
            blackRemainingMillis = Math.max(0, millis);
        }
    }

    private void requireInProgress() {
        if (status != GameStatus.IN_PROGRESS) {
            throw new GameException("Game is not in progress");
        }
    }

    private static String toUci(Move move) {
        String uci = Square.toAlgebraic(move.from()) + Square.toAlgebraic(move.to());
        if (move.promotion() != null) {
            uci += Character.toLowerCase(new Piece(move.promotion(), Color.WHITE).fenChar());
        }
        return uci;
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Game other && Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
