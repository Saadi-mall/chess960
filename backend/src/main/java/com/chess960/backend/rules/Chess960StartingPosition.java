package com.chess960.backend.rules;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Turns a Chess960 start position number (0-959) into the actual back-rank arrangement,
 * using the standard derivation (attributed to Reinhard Scharnagl) described at
 * https://en.wikipedia.org/wiki/Chess960_numbering_scheme. Number 518 is always the
 * standard chess arrangement, RNBQKBNR.
 *
 * <p>The number is read as four mixed-radix digits: a file for the light-squared bishop
 * (base 4), a file for the dark-squared bishop (base 4), a slot for the queen among the
 * remaining empty files (base 6), and a pair of slots for the two knights among what's
 * left after that (base 10, one of the 10 ways to choose 2 of 5). Whatever three files
 * remain get rook, king, rook, left to right.
 */
public final class Chess960StartingPosition {

    /** Which two of the five still-empty files (in ascending order) the knights take,
     * indexed by the base-10 "knight digit" - the ten 2-combinations of {0,1,2,3,4} in
     * lexicographic order. */
    private static final int[][] KNIGHT_SLOT_PAIRS = {
        {0, 1}, {0, 2}, {0, 3}, {0, 4},
        {1, 2}, {1, 3}, {1, 4},
        {2, 3}, {2, 4},
        {3, 4}
    };

    private Chess960StartingPosition() {}

    public static int randomNumber() {
        return ThreadLocalRandom.current().nextInt(960);
    }

    /** White's back rank, as 8 piece letters from a-file to h-file, e.g. "RNBQKBNR". */
    public static char[] backRank(int number) {
        if (number < 0 || number > 959) {
            throw new IllegalArgumentException("Chess960 number must be 0-959: " + number);
        }
        char[] rank = new char[8];
        boolean[] occupied = new boolean[8];
        int n = number;

        int lightBishopFile = 2 * (n % 4) + 1; // one of b, d, f, h
        n /= 4;
        int darkBishopFile = 2 * (n % 4); // one of a, c, e, g
        n /= 4;
        int queenSlot = n % 6;
        n /= 6;
        int[] knightSlots = KNIGHT_SLOT_PAIRS[n];

        place(rank, occupied, lightBishopFile, 'B');
        place(rank, occupied, darkBishopFile, 'B');
        place(rank, occupied, nthEmptyFile(occupied, queenSlot), 'Q');

        List<Integer> beforeKnights = emptyFiles(occupied);
        place(rank, occupied, beforeKnights.get(knightSlots[0]), 'N');
        place(rank, occupied, beforeKnights.get(knightSlots[1]), 'N');

        List<Integer> last3 = emptyFiles(occupied);
        place(rank, occupied, last3.get(0), 'R');
        place(rank, occupied, last3.get(1), 'K');
        place(rank, occupied, last3.get(2), 'R');

        return rank;
    }

    /**
     * The inverse of {@link #backRank}: given a back-rank arrangement, returns its
     * Chess960 number, or {@code null} if it isn't a legal Chess960 arrangement at all
     * (wrong piece counts, bishops on the same color, or the king not between the rooks).
     */
    public static Integer numberOf(char[] backRank) {
        if (backRank.length != 8) {
            return null;
        }

        List<Integer> bishopFiles = filesOf(backRank, 'B');
        if (bishopFiles.size() != 2) {
            return null;
        }
        int fileA = bishopFiles.get(0);
        int fileB = bishopFiles.get(1);
        boolean fileALight = fileA % 2 == 1;
        if (fileALight == (fileB % 2 == 1)) {
            return null; // same-colored bishops isn't a legal arrangement
        }
        int lightBishopFile = fileALight ? fileA : fileB;
        int darkBishopFile = fileALight ? fileB : fileA;
        int b1 = (lightBishopFile - 1) / 2;
        int b2 = darkBishopFile / 2;

        boolean[] occupied = new boolean[8];
        occupied[lightBishopFile] = true;
        occupied[darkBishopFile] = true;

        List<Integer> queenFiles = filesOf(backRank, 'Q');
        if (queenFiles.size() != 1) {
            return null;
        }
        int q = emptyFiles(occupied).indexOf(queenFiles.get(0));
        if (q < 0) {
            return null;
        }
        occupied[queenFiles.get(0)] = true;

        List<Integer> knightFiles = filesOf(backRank, 'N');
        if (knightFiles.size() != 2) {
            return null;
        }
        List<Integer> beforeKnights = emptyFiles(occupied);
        int k1 = beforeKnights.indexOf(knightFiles.get(0));
        int k2 = beforeKnights.indexOf(knightFiles.get(1));
        if (k1 < 0 || k2 < 0) {
            return null;
        }
        int knightSlot = indexOfPair(Math.min(k1, k2), Math.max(k1, k2));
        if (knightSlot < 0) {
            return null;
        }
        occupied[knightFiles.get(0)] = true;
        occupied[knightFiles.get(1)] = true;

        List<Integer> last3 = emptyFiles(occupied);
        if (last3.size() != 3
                || backRank[last3.get(0)] != 'R'
                || backRank[last3.get(1)] != 'K'
                || backRank[last3.get(2)] != 'R') {
            return null;
        }

        return b1 + 4 * (b2 + 4 * (q + 6 * knightSlot));
    }

    private static List<Integer> filesOf(char[] backRank, char piece) {
        List<Integer> files = new ArrayList<>();
        for (int file = 0; file < 8; file++) {
            if (backRank[file] == piece) {
                files.add(file);
            }
        }
        return files;
    }

    private static int indexOfPair(int lo, int hi) {
        for (int i = 0; i < KNIGHT_SLOT_PAIRS.length; i++) {
            if (KNIGHT_SLOT_PAIRS[i][0] == lo && KNIGHT_SLOT_PAIRS[i][1] == hi) {
                return i;
            }
        }
        return -1;
    }

    /** The full game-start Shredder-FEN for this Chess960 number. */
    public static String startingFen(int number) {
        char[] white = backRank(number);
        StringBuilder blackRank = new StringBuilder();
        StringBuilder whiteRank = new StringBuilder();
        StringBuilder castling = new StringBuilder();
        for (int file = 0; file < 8; file++) {
            whiteRank.append(white[file]);
            blackRank.append(Character.toLowerCase(white[file]));
            if (white[file] == 'R') {
                castling.append((char) ('A' + file));
            }
        }
        // Rook files are listed low-to-high above; Shredder-FEN convention lists the
        // kingside (higher-file) rook first, then queenside, per side.
        String whiteRights = new StringBuilder(castling).reverse().toString();
        String blackRights = whiteRights.toLowerCase();

        return blackRank
                + "/pppppppp/8/8/8/8/PPPPPPPP/"
                + whiteRank
                + " w "
                + whiteRights
                + blackRights
                + " - 0 1";
    }

    private static void place(char[] rank, boolean[] occupied, int file, char piece) {
        rank[file] = piece;
        occupied[file] = true;
    }

    private static int nthEmptyFile(boolean[] occupied, int n) {
        return emptyFiles(occupied).get(n);
    }

    private static List<Integer> emptyFiles(boolean[] occupied) {
        List<Integer> files = new ArrayList<>();
        for (int file = 0; file < 8; file++) {
            if (!occupied[file]) {
                files.add(file);
            }
        }
        return files;
    }
}
