package com.chess960.backend.rules;

/**
 * Squares are plain ints 0-63: index = rank * 8 + file, a1 = 0, h1 = 7, a8 = 56, h8 = 63.
 * Kept as a utility of static methods rather than a class so the board can stay a simple
 * {@code Piece[64]} array with no wrapper objects.
 */
public final class Square {

    public static final int NONE = -1;

    private Square() {}

    public static int of(int file, int rank) {
        return rank * 8 + file;
    }

    public static int file(int square) {
        return square % 8;
    }

    public static int rank(int square) {
        return square / 8;
    }

    public static boolean onBoard(int file, int rank) {
        return file >= 0 && file < 8 && rank >= 0 && rank < 8;
    }

    /** Parses algebraic notation, e.g. "e4" -> 28. */
    public static int fromAlgebraic(String s) {
        int file = s.charAt(0) - 'a';
        int rank = s.charAt(1) - '1';
        return of(file, rank);
    }

    public static String toAlgebraic(int square) {
        char file = (char) ('a' + file(square));
        char rank = (char) ('1' + rank(square));
        return "" + file + rank;
    }
}
