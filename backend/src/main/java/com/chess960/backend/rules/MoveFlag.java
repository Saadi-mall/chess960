package com.chess960.backend.rules;

public enum MoveFlag {
    NORMAL,

    /**
     * Castling, represented as the king capturing its own rook (the Chess960-friendly
     * encoding: {@code from} is the king's square, {@code to} is that rook's square,
     * however far apart or close together they start). Where the king and rook actually
     * end up is fixed by the rules (g/f file for kingside, c/d file for queenside) and is
     * worked out in {@link MoveGenerator}, not stored on the move itself.
     */
    CASTLE,

    /** A pawn capturing en passant: {@code to} is the empty square it lands on. */
    EN_PASSANT
}
