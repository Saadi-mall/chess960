package com.chess960.backend.rules;

/**
 * Which rooks each side may still castle with, as Shredder-FEN does it: the file of the
 * rook, not a letter like "K"/"Q". That file is unambiguous in Chess960, where the king
 * and rooks can start on almost any square and "kingside"/"queenside" letters alone
 * could point at two different rooks.
 *
 * <p>A right is lost the first time its king or that specific rook moves or is captured,
 * and never comes back - so whenever a right is still set here, the king and that rook
 * are guaranteed to still be on their starting squares.
 */
public final class CastlingRights {

    public static final int NONE = -1;

    private int whiteKingside = NONE;
    private int whiteQueenside = NONE;
    private int blackKingside = NONE;
    private int blackQueenside = NONE;

    public int rookFile(Color color, CastleSide side) {
        if (color == Color.WHITE) {
            return side == CastleSide.KINGSIDE ? whiteKingside : whiteQueenside;
        }
        return side == CastleSide.KINGSIDE ? blackKingside : blackQueenside;
    }

    public void set(Color color, CastleSide side, int rookFile) {
        if (color == Color.WHITE) {
            if (side == CastleSide.KINGSIDE) {
                whiteKingside = rookFile;
            } else {
                whiteQueenside = rookFile;
            }
        } else {
            if (side == CastleSide.KINGSIDE) {
                blackKingside = rookFile;
            } else {
                blackQueenside = rookFile;
            }
        }
    }

    public boolean has(Color color, CastleSide side) {
        return rookFile(color, side) != NONE;
    }

    /** Called when a king moves or is captured: both of that color's rights are lost. */
    public void clearAll(Color color) {
        set(color, CastleSide.KINGSIDE, NONE);
        set(color, CastleSide.QUEENSIDE, NONE);
    }

    /**
     * Called when the piece on {@code square} moves or is captured: clears {@code color}'s
     * right for that rook if {@code square} is exactly where it started. Matching on the
     * full square (not just the file) matters - otherwise capturing some other piece that
     * happens to share a file with a still-unmoved castling rook, on a different rank,
     * would wrongly void a right that's still good.
     */
    public void clearRook(Color color, int square) {
        int backRank = color == Color.WHITE ? 0 : 7;
        if (Square.rank(square) != backRank) {
            return;
        }
        int file = Square.file(square);
        if (rookFile(color, CastleSide.KINGSIDE) == file) {
            set(color, CastleSide.KINGSIDE, NONE);
        }
        if (rookFile(color, CastleSide.QUEENSIDE) == file) {
            set(color, CastleSide.QUEENSIDE, NONE);
        }
    }

    public CastlingRights copy() {
        CastlingRights copy = new CastlingRights();
        copy.whiteKingside = whiteKingside;
        copy.whiteQueenside = whiteQueenside;
        copy.blackKingside = blackKingside;
        copy.blackQueenside = blackQueenside;
        return copy;
    }
}
