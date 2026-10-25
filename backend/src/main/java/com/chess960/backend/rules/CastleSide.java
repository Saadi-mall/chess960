package com.chess960.backend.rules;

/**
 * Which rook a castling right refers to: KINGSIDE is the rook that started on a higher
 * file than the king, QUEENSIDE the one on a lower file. In Chess960 that rook can be
 * right next to the king, not necessarily in the corner.
 */
public enum CastleSide {
    KINGSIDE,
    QUEENSIDE
}
