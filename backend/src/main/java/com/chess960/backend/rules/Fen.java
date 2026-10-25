package com.chess960.backend.rules;

/**
 * Reads and writes FEN. Castling rights are always written as Shredder-FEN: the file
 * letter of the castling rook (e.g. "HAha", or "HD" if only two rights remain), never
 * "KQkq". Those letters are ambiguous in Chess960 - if two rooks start either side of the
 * king, "K" alone can't say which one. Parsing accepts classic "KQkq" too, for FENs pasted
 * in from elsewhere, by resolving "the kingside/queenside rook" against the king's actual
 * file on the board being parsed.
 */
public final class Fen {

    public static final String STANDARD_START =
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    private Fen() {}

    public static Position parse(String fen) {
        String[] fields = fen.trim().split("\\s+");
        Position position = new Position();

        parsePiecePlacement(position, fields[0]);
        position.setSideToMove(fields[1].equals("w") ? Color.WHITE : Color.BLACK);
        parseCastling(position, fields[2]);
        position.setEnPassantSquare(
                fields[3].equals("-") ? Square.NONE : Square.fromAlgebraic(fields[3]));
        position.setHalfmoveClock(fields.length > 4 ? Integer.parseInt(fields[4]) : 0);
        position.setFullmoveNumber(fields.length > 5 ? Integer.parseInt(fields[5]) : 1);

        return position;
    }

    private static void parsePiecePlacement(Position position, String placement) {
        String[] ranks = placement.split("/");
        for (int r = 0; r < 8; r++) {
            // FEN lists rank 8 first, rank 1 last.
            int rank = 7 - r;
            int file = 0;
            for (char c : ranks[r].toCharArray()) {
                if (Character.isDigit(c)) {
                    file += c - '0';
                } else {
                    position.place(Square.of(file, rank), Piece.fromFenChar(c));
                    file++;
                }
            }
        }
    }

    private static void parseCastling(Position position, String field) {
        if (field.equals("-")) {
            return;
        }
        for (char c : field.toCharArray()) {
            Color color = Character.isUpperCase(c) ? Color.WHITE : Color.BLACK;
            int kingFile = Square.file(position.findKing(color));
            char letter = Character.toLowerCase(c);

            int rookFile;
            CastleSide side;
            if (letter == 'k' || letter == 'q') {
                side = letter == 'k' ? CastleSide.KINGSIDE : CastleSide.QUEENSIDE;
                rookFile = findOutermostRookFile(position, color, kingFile, side);
            } else {
                rookFile = letter - 'a';
                side = rookFile > kingFile ? CastleSide.KINGSIDE : CastleSide.QUEENSIDE;
            }
            position.castling().set(color, side, rookFile);
        }
    }

    private static int findOutermostRookFile(
            Position position, Color color, int kingFile, CastleSide side) {
        int backRank = color == Color.WHITE ? 0 : 7;
        int step = side == CastleSide.KINGSIDE ? 1 : -1;
        int limit = side == CastleSide.KINGSIDE ? 7 : 0;
        for (int file = kingFile + step; ; file += step) {
            Piece piece = position.pieceAt(Square.of(file, backRank));
            if (piece != null && piece.type() == PieceType.ROOK && piece.color() == color) {
                return file;
            }
            if (file == limit) {
                throw new IllegalArgumentException(
                        "No " + color + " rook found for classic castling letter on " + side);
            }
        }
    }

    public static String toShredderFen(Position position) {
        StringBuilder sb = new StringBuilder();
        for (int rank = 7; rank >= 0; rank--) {
            int emptyRun = 0;
            for (int file = 0; file < 8; file++) {
                Piece piece = position.pieceAt(Square.of(file, rank));
                if (piece == null) {
                    emptyRun++;
                } else {
                    if (emptyRun > 0) {
                        sb.append(emptyRun);
                        emptyRun = 0;
                    }
                    sb.append(piece.fenChar());
                }
            }
            if (emptyRun > 0) {
                sb.append(emptyRun);
            }
            if (rank > 0) {
                sb.append('/');
            }
        }

        sb.append(' ').append(position.sideToMove() == Color.WHITE ? 'w' : 'b');

        sb.append(' ').append(castlingField(position));

        sb.append(' ')
                .append(
                        position.enPassantSquare() == Square.NONE
                                ? "-"
                                : Square.toAlgebraic(position.enPassantSquare()));

        sb.append(' ').append(position.halfmoveClock());
        sb.append(' ').append(position.fullmoveNumber());

        return sb.toString();
    }

    private static String castlingField(Position position) {
        CastlingRights rights = position.castling();
        StringBuilder sb = new StringBuilder();
        appendRight(sb, rights, Color.WHITE, CastleSide.KINGSIDE);
        appendRight(sb, rights, Color.WHITE, CastleSide.QUEENSIDE);
        appendRight(sb, rights, Color.BLACK, CastleSide.KINGSIDE);
        appendRight(sb, rights, Color.BLACK, CastleSide.QUEENSIDE);
        return sb.isEmpty() ? "-" : sb.toString();
    }

    private static void appendRight(
            StringBuilder sb, CastlingRights rights, Color color, CastleSide side) {
        int rookFile = rights.rookFile(color, side);
        if (rookFile == CastlingRights.NONE) {
            return;
        }
        char letter = (char) ('a' + rookFile);
        sb.append(color == Color.WHITE ? Character.toUpperCase(letter) : letter);
    }
}
