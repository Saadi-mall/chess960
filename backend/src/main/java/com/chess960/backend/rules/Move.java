package com.chess960.backend.rules;

/**
 * @param promotion the piece a pawn promotes to, or null for every other move
 */
public record Move(int from, int to, MoveFlag flag, PieceType promotion) {

    public Move(int from, int to) {
        this(from, to, MoveFlag.NORMAL, null);
    }

    public static Move castle(int kingFrom, int rookFrom) {
        return new Move(kingFrom, rookFrom, MoveFlag.CASTLE, null);
    }

    public static Move enPassant(int from, int to) {
        return new Move(from, to, MoveFlag.EN_PASSANT, null);
    }

    public static Move promotion(int from, int to, PieceType promotion) {
        return new Move(from, to, MoveFlag.NORMAL, promotion);
    }
}
