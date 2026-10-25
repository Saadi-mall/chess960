package com.chess960.backend.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class FenTest {

    @Test
    void roundTripsAShredderFen() {
        String fen = "bbnrqrk1/pp2pppp/4n3/2pp4/P7/1N5P/BPPPPPP1/B2RQNKR w HD - 2 9";
        assertEquals(fen, Fen.toShredderFen(Fen.parse(fen)));
    }

    @Test
    void writesStandardChessCastlingAsShredderFileLetters() {
        Position position = Fen.parse(Fen.STANDARD_START);
        assertEquals(
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1",
                Fen.toShredderFen(position));
    }

    @Test
    void noCastlingRightsRoundTrips() {
        String fen = "bnkrnbrq/ppppp1p1/B6p/5p2/8/4P3/PPPP1PPP/BNKRN1RQ w - - 0 9";
        assertEquals(fen, Fen.toShredderFen(Fen.parse(fen)));
    }
}
