package com.chess960.backend.rules;

public record Piece(PieceType type, Color color) {

    /** The FEN letter for this piece: uppercase for White, lowercase for Black. */
    public char fenChar() {
        char letter =
                switch (type) {
                    case PAWN -> 'p';
                    case KNIGHT -> 'n';
                    case BISHOP -> 'b';
                    case ROOK -> 'r';
                    case QUEEN -> 'q';
                    case KING -> 'k';
                };
        return color == Color.WHITE ? Character.toUpperCase(letter) : letter;
    }

    public static Piece fromFenChar(char c) {
        Color color = Character.isUpperCase(c) ? Color.WHITE : Color.BLACK;
        PieceType type =
                switch (Character.toLowerCase(c)) {
                    case 'p' -> PieceType.PAWN;
                    case 'n' -> PieceType.KNIGHT;
                    case 'b' -> PieceType.BISHOP;
                    case 'r' -> PieceType.ROOK;
                    case 'q' -> PieceType.QUEEN;
                    case 'k' -> PieceType.KING;
                    default -> throw new IllegalArgumentException("Not a piece letter: " + c);
                };
        return new Piece(type, color);
    }
}
