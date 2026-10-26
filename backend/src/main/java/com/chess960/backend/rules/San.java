package com.chess960.backend.rules;

import java.util.Optional;

/**
 * Standard Algebraic Notation (e4, Nbd7, exd5, O-O, e8=Q+) for a move in a given position.
 * SAN depends on the board, not just the move: whether it's a capture, which of two
 * knights moved, and whether it gives check all come from the position, so this lives on
 * the server with the rest of the rules rather than in the frontend.
 */
public final class San {

    private San() {}

    /**
     * SAN for {@code move}, which must be legal in {@code position}. The position is left
     * exactly as it was: the move is played and undone internally to test for check/mate.
     */
    public static String of(Position position, Move move) {
        String text = withoutCheckSuffix(position, move);

        Position.UndoInfo undo = position.makeMove(move);
        try {
            if (MoveGenerator.isInCheck(position, position.sideToMove())) {
                text += MoveGenerator.legalMoves(position).isEmpty() ? "#" : "+";
            }
        } finally {
            position.undoMove(move, undo);
        }
        return text;
    }

    /** SAN for a UCI-style move (e.g. Stockfish's "e1h1"), or empty if it isn't legal here. */
    public static Optional<String> ofUci(Position position, String uci) {
        if (uci == null || uci.length() < 4) {
            return Optional.empty();
        }
        int from = Square.fromAlgebraic(uci.substring(0, 2));
        int to = Square.fromAlgebraic(uci.substring(2, 4));
        PieceType promotion = uci.length() > 4 ? promotionType(uci.charAt(4)) : null;
        return MoveGenerator.legalMoves(position).stream()
                .filter(m -> m.from() == from && m.to() == to && m.promotion() == promotion)
                .findFirst()
                .map(m -> of(position, m));
    }

    private static String withoutCheckSuffix(Position position, Move move) {
        // Chess960 castling is stored as "king takes own rook"; which side is decided by
        // where that rook is relative to the king, exactly as Position.makeMove does.
        if (move.flag() == MoveFlag.CASTLE) {
            return Square.file(move.to()) > Square.file(move.from()) ? "O-O" : "O-O-O";
        }

        Piece moved = position.pieceAt(move.from());
        boolean capture = move.flag() == MoveFlag.EN_PASSANT || position.pieceAt(move.to()) != null;
        String destination = Square.toAlgebraic(move.to());

        if (moved.type() == PieceType.PAWN) {
            // Pawn captures name the file the pawn came from: exd5, not xd5.
            String text = capture ? fileLetter(move.from()) + "x" + destination : destination;
            if (move.promotion() != null) {
                text += "=" + pieceLetter(move.promotion());
            }
            return text;
        }

        return pieceLetter(moved.type()) + disambiguation(position, move, moved) + (capture ? "x" : "") + destination;
    }

    /**
     * When another piece of the same type and color could also legally move to the same
     * square, SAN adds the origin file (Nbd7), else the origin rank (R1e2), else both
     * (Qh4e1). Only legal alternatives count - a pinned knight doesn't make a move ambiguous.
     */
    private static String disambiguation(Position position, Move move, Piece moved) {
        boolean ambiguous = false;
        boolean shareFile = false;
        boolean shareRank = false;
        for (Move other : MoveGenerator.legalMoves(position)) {
            if (other.to() != move.to() || other.from() == move.from() || other.flag() == MoveFlag.CASTLE) {
                continue;
            }
            Piece otherPiece = position.pieceAt(other.from());
            if (otherPiece.type() != moved.type() || otherPiece.color() != moved.color()) {
                continue;
            }
            ambiguous = true;
            shareFile |= Square.file(other.from()) == Square.file(move.from());
            shareRank |= Square.rank(other.from()) == Square.rank(move.from());
        }
        if (!ambiguous) return "";
        if (!shareFile) return fileLetter(move.from());
        if (!shareRank) return String.valueOf(Square.rank(move.from()) + 1);
        return Square.toAlgebraic(move.from());
    }

    private static String fileLetter(int square) {
        return String.valueOf((char) ('a' + Square.file(square)));
    }

    private static char pieceLetter(PieceType type) {
        return switch (type) {
            case KNIGHT -> 'N';
            case BISHOP -> 'B';
            case ROOK -> 'R';
            case QUEEN -> 'Q';
            case KING -> 'K';
            case PAWN -> throw new IllegalArgumentException("Pawns have no SAN letter");
        };
    }

    private static PieceType promotionType(char letter) {
        return switch (Character.toLowerCase(letter)) {
            case 'q' -> PieceType.QUEEN;
            case 'r' -> PieceType.ROOK;
            case 'b' -> PieceType.BISHOP;
            case 'n' -> PieceType.KNIGHT;
            default -> throw new IllegalArgumentException("Not a promotion letter: " + letter);
        };
    }
}
