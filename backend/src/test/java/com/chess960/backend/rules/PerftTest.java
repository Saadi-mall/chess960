package com.chess960.backend.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * Perft counts for the standard chess starting position. These are the most widely
 * published perft numbers there are - see https://www.chessprogramming.org/Perft_Results
 * - so a mismatch here means a bug in the generic move generation logic, before even
 * getting to anything Chess960-specific.
 */
class PerftTest {

    @Test
    void standardStartingPositionPerft() {
        Position position = Fen.parse(Fen.STANDARD_START);

        assertEquals(20, Perft.count(position, 1));
        assertEquals(400, Perft.count(position, 2));
        assertEquals(8902, Perft.count(position, 3));
        assertEquals(197281, Perft.count(position, 4));
        assertEquals(4865609, Perft.count(position, 5));
    }

    @Test
    void standardStartingPositionPerftDepth6() {
        Position position = Fen.parse(Fen.STANDARD_START);
        assertEquals(119060324, Perft.count(position, 6));
    }
}
