package com.chess960.backend.rules;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates legal moves for a {@link Position}. The approach is the simple, standard one:
 * generate pseudo-legal moves (legal except possibly for leaving your own king in check),
 * then play each one and keep it only if the king survives. That's O(moves) make/unmake
 * calls per position, which is slower than tracking pins incrementally, but it's the
 * version that's easy to read and easy to get right - and this board is small enough that
 * the extra work doesn't matter.
 */
public final class MoveGenerator {

    private static final int[][] KNIGHT_DELTAS = {
        {1, 2}, {2, 1}, {2, -1}, {1, -2}, {-1, -2}, {-2, -1}, {-2, 1}, {-1, 2}
    };
    private static final int[][] KING_DELTAS = {
        {1, 0}, {1, 1}, {0, 1}, {-1, 1}, {-1, 0}, {-1, -1}, {0, -1}, {1, -1}
    };
    private static final int[][] BISHOP_DIRECTIONS = {{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
    private static final int[][] ROOK_DIRECTIONS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    private MoveGenerator() {}

    public static List<Move> legalMoves(Position position) {
        Color side = position.sideToMove();
        List<Move> legal = new ArrayList<>();
        for (Move move : pseudoLegalMoves(position)) {
            Position.UndoInfo undo = position.makeMove(move);
            if (!isInCheck(position, side)) {
                legal.add(move);
            }
            position.undoMove(move, undo);
        }
        return legal;
    }

    public static boolean isInCheck(Position position, Color color) {
        return isSquareAttacked(position, position.findKing(color), color.opposite());
    }

    public static List<Move> pseudoLegalMoves(Position position) {
        List<Move> moves = new ArrayList<>();
        Color side = position.sideToMove();
        for (int square = 0; square < 64; square++) {
            Piece piece = position.pieceAt(square);
            if (piece == null || piece.color() != side) {
                continue;
            }
            switch (piece.type()) {
                case PAWN -> addPawnMoves(position, square, side, moves);
                case KNIGHT -> addLeaperMoves(position, square, side, KNIGHT_DELTAS, moves);
                case BISHOP -> addSlidingMoves(position, square, side, BISHOP_DIRECTIONS, moves);
                case ROOK -> addSlidingMoves(position, square, side, ROOK_DIRECTIONS, moves);
                case QUEEN -> {
                    addSlidingMoves(position, square, side, BISHOP_DIRECTIONS, moves);
                    addSlidingMoves(position, square, side, ROOK_DIRECTIONS, moves);
                }
                case KING -> {
                    addLeaperMoves(position, square, side, KING_DELTAS, moves);
                    addCastlingMoves(position, square, side, moves);
                }
            }
        }
        return moves;
    }

    private static void addPawnMoves(Position position, int from, Color side, List<Move> moves) {
        int forward = side == Color.WHITE ? 1 : -1;
        int startRank = side == Color.WHITE ? 1 : 6;
        int promotionRank = side == Color.WHITE ? 7 : 0;
        int file = Square.file(from);
        int rank = Square.rank(from);

        int oneStepRank = rank + forward;
        if (Square.onBoard(file, oneStepRank)) {
            int to = Square.of(file, oneStepRank);
            if (position.pieceAt(to) == null) {
                addPawnAdvance(from, to, oneStepRank == promotionRank, moves);

                int twoStepRank = rank + 2 * forward;
                if (rank == startRank && position.pieceAt(Square.of(file, twoStepRank)) == null) {
                    moves.add(new Move(from, Square.of(file, twoStepRank)));
                }
            }
        }

        for (int fileDelta : new int[] {-1, 1}) {
            int captureFile = file + fileDelta;
            int captureRank = rank + forward;
            if (!Square.onBoard(captureFile, captureRank)) {
                continue;
            }
            int to = Square.of(captureFile, captureRank);
            Piece target = position.pieceAt(to);
            if (target != null && target.color() != side) {
                addPawnAdvance(from, to, captureRank == promotionRank, moves);
            } else if (to == position.enPassantSquare()) {
                moves.add(Move.enPassant(from, to));
            }
        }
    }

    private static void addPawnAdvance(int from, int to, boolean promotes, List<Move> moves) {
        if (!promotes) {
            moves.add(new Move(from, to));
            return;
        }
        for (PieceType promotion :
                new PieceType[] {
                    PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT
                }) {
            moves.add(Move.promotion(from, to, promotion));
        }
    }

    private static void addLeaperMoves(
            Position position, int from, Color side, int[][] deltas, List<Move> moves) {
        int file = Square.file(from);
        int rank = Square.rank(from);
        for (int[] delta : deltas) {
            int toFile = file + delta[0];
            int toRank = rank + delta[1];
            if (!Square.onBoard(toFile, toRank)) {
                continue;
            }
            int to = Square.of(toFile, toRank);
            Piece target = position.pieceAt(to);
            if (target == null || target.color() != side) {
                moves.add(new Move(from, to));
            }
        }
    }

    private static void addSlidingMoves(
            Position position, int from, Color side, int[][] directions, List<Move> moves) {
        int file = Square.file(from);
        int rank = Square.rank(from);
        for (int[] direction : directions) {
            int toFile = file + direction[0];
            int toRank = rank + direction[1];
            while (Square.onBoard(toFile, toRank)) {
                int to = Square.of(toFile, toRank);
                Piece target = position.pieceAt(to);
                if (target == null) {
                    moves.add(new Move(from, to));
                } else {
                    if (target.color() != side) {
                        moves.add(new Move(from, to));
                    }
                    break;
                }
                toFile += direction[0];
                toRank += direction[1];
            }
        }
    }

    /**
     * Chess960 castling, represented as the king capturing its own rook. Wherever the king
     * and rook actually start, the destination is always fixed: king to the g/c-file, rook
     * to the f/d-file of the back rank (FIDE's Chess960 rule, chosen so castled positions
     * always look the same regardless of the starting array).
     */
    private static void addCastlingMoves(
            Position position, int kingFrom, Color side, List<Move> moves) {
        for (CastleSide castleSide : CastleSide.values()) {
            int rookFile = position.castling().rookFile(side, castleSide);
            if (rookFile == CastlingRights.NONE) {
                continue;
            }

            int backRank = Square.rank(kingFrom);
            int rookFrom = Square.of(rookFile, backRank);
            int kingDest = Square.of(castleSide == CastleSide.KINGSIDE ? 6 : 2, backRank);
            int rookDest = Square.of(castleSide == CastleSide.KINGSIDE ? 5 : 3, backRank);

            if (!pathClear(position, kingFrom, kingDest, rookFrom, rookDest)
                    || kingPathAttacked(position, kingFrom, kingDest, side.opposite())) {
                continue;
            }
            moves.add(Move.castle(kingFrom, rookFrom));
        }
    }

    /**
     * Every square the king or rook passes over (including both ends) must be empty,
     * except for the king and rook themselves - they're allowed to swap past each other.
     */
    private static boolean pathClear(
            Position position, int kingFrom, int kingDest, int rookFrom, int rookDest) {
        int backRank = Square.rank(kingFrom);
        int kingLow = Math.min(Square.file(kingFrom), Square.file(kingDest));
        int kingHigh = Math.max(Square.file(kingFrom), Square.file(kingDest));
        int rookLow = Math.min(Square.file(rookFrom), Square.file(rookDest));
        int rookHigh = Math.max(Square.file(rookFrom), Square.file(rookDest));

        for (int file = 0; file < 8; file++) {
            boolean onKingPath = file >= kingLow && file <= kingHigh;
            boolean onRookPath = file >= rookLow && file <= rookHigh;
            if (!onKingPath && !onRookPath) {
                continue;
            }
            int square = Square.of(file, backRank);
            if (square == kingFrom || square == rookFrom) {
                continue;
            }
            if (position.pieceAt(square) != null) {
                return false;
            }
        }
        return true;
    }

    private static boolean kingPathAttacked(
            Position position, int kingFrom, int kingDest, Color byColor) {
        int backRank = Square.rank(kingFrom);
        int low = Math.min(Square.file(kingFrom), Square.file(kingDest));
        int high = Math.max(Square.file(kingFrom), Square.file(kingDest));
        for (int file = low; file <= high; file++) {
            if (isSquareAttacked(position, Square.of(file, backRank), byColor)) {
                return true;
            }
        }
        return false;
    }

    public static boolean isSquareAttacked(Position position, int square, Color byColor) {
        int file = Square.file(square);
        int rank = Square.rank(square);

        // A pawn attacks diagonally forward, so look one square "backward" from its
        // point of view for an enemy pawn that could be attacking us.
        int pawnRank = rank - (byColor == Color.WHITE ? 1 : -1);
        for (int pawnFile : new int[] {file - 1, file + 1}) {
            if (Square.onBoard(pawnFile, pawnRank)
                    && isPiece(position, Square.of(pawnFile, pawnRank), PieceType.PAWN, byColor)) {
                return true;
            }
        }

        for (int[] delta : KNIGHT_DELTAS) {
            int f = file + delta[0];
            int r = rank + delta[1];
            if (Square.onBoard(f, r) && isPiece(position, Square.of(f, r), PieceType.KNIGHT, byColor)) {
                return true;
            }
        }

        for (int[] delta : KING_DELTAS) {
            int f = file + delta[0];
            int r = rank + delta[1];
            if (Square.onBoard(f, r) && isPiece(position, Square.of(f, r), PieceType.KING, byColor)) {
                return true;
            }
        }

        if (slidingAttack(position, file, rank, BISHOP_DIRECTIONS, byColor, PieceType.BISHOP)) {
            return true;
        }
        return slidingAttack(position, file, rank, ROOK_DIRECTIONS, byColor, PieceType.ROOK);
    }

    private static boolean slidingAttack(
            Position position,
            int file,
            int rank,
            int[][] directions,
            Color byColor,
            PieceType straightOrDiagonalType) {
        for (int[] direction : directions) {
            int f = file + direction[0];
            int r = rank + direction[1];
            while (Square.onBoard(f, r)) {
                Piece piece = position.pieceAt(Square.of(f, r));
                if (piece != null) {
                    if (piece.color() == byColor
                            && (piece.type() == straightOrDiagonalType
                                    || piece.type() == PieceType.QUEEN)) {
                        return true;
                    }
                    break;
                }
                f += direction[0];
                r += direction[1];
            }
        }
        return false;
    }

    private static boolean isPiece(Position position, int square, PieceType type, Color color) {
        Piece piece = position.pieceAt(square);
        return piece != null && piece.type() == type && piece.color() == color;
    }
}
