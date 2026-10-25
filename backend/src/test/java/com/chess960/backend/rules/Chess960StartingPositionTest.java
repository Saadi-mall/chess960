package com.chess960.backend.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class Chess960StartingPositionTest {

    @Test
    void number0IsBbqnnrkr() {
        assertEquals("BBQNNRKR", new String(Chess960StartingPosition.backRank(0)));
    }

    @Test
    void number518IsStandardChess() {
        assertEquals("RNBQKBNR", new String(Chess960StartingPosition.backRank(518)));
    }

    @Test
    void number959IsRkrnnqbb() {
        assertEquals("RKRNNQBB", new String(Chess960StartingPosition.backRank(959)));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2, 128, 274, 380, 518, 845, 959})
    void everyArrangementFollowsChess960Rules(int number) {
        char[] rank = Chess960StartingPosition.backRank(number);
        assertEquals(8, rank.length);

        int bishops = 0, knights = 0, rooks = 0, queens = 0, kings = 0;
        int firstBishopFile = -1, secondBishopFile = -1;
        int firstRookFile = -1, secondRookFile = -1, kingFile = -1;
        for (int file = 0; file < 8; file++) {
            switch (rank[file]) {
                case 'B' -> {
                    bishops++;
                    if (firstBishopFile == -1) firstBishopFile = file;
                    else secondBishopFile = file;
                }
                case 'N' -> knights++;
                case 'R' -> {
                    rooks++;
                    if (firstRookFile == -1) firstRookFile = file;
                    else secondRookFile = file;
                }
                case 'Q' -> queens++;
                case 'K' -> {
                    kings++;
                    kingFile = file;
                }
                default -> throw new AssertionError("Unexpected piece: " + rank[file]);
            }
        }

        assertEquals(2, bishops);
        assertEquals(2, knights);
        assertEquals(2, rooks);
        assertEquals(1, queens);
        assertEquals(1, kings);
        assertTrue(
                (firstBishopFile + 0) % 2 != (secondBishopFile + 0) % 2,
                "bishops must be on opposite-colored squares");
        assertTrue(
                firstRookFile < kingFile && kingFile < secondRookFile,
                "king must start between the two rooks");
    }

    @Test
    void startingFenIsAValidShredderFenForEachRook() {
        String fen = Chess960StartingPosition.startingFen(1);
        Position position = Fen.parse(fen);
        assertEquals(fen, Fen.toShredderFen(position));
        assertEquals(20, Perft.count(position, 1));
    }
}
