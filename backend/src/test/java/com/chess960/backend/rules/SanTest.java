package com.chess960.backend.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class SanTest {

    private static String san(String fen, String from, String to) {
        Position position = Fen.parse(fen);
        Move move =
                MoveGenerator.legalMoves(position).stream()
                        .filter(m -> m.from() == Square.fromAlgebraic(from) && m.to() == Square.fromAlgebraic(to))
                        .findFirst()
                        .orElseThrow();
        String before = Fen.toShredderFen(position);
        String result = San.of(position, move);
        assertEquals(before, Fen.toShredderFen(position), "San.of must leave the position unchanged");
        return result;
    }

    private static final String START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1";

    @Test
    void pawnAndPieceMovesFromTheStart() {
        assertEquals("e4", san(START, "e2", "e4"));
        assertEquals("Nf3", san(START, "g1", "f3"));
    }

    @Test
    void pawnCapturesNameTheirOriginFile() {
        assertEquals("exd5", san("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1", "e4", "d5"));
    }

    @Test
    void enPassantIsWrittenAsAnOrdinaryPawnCapture() {
        assertEquals("exd6", san("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1", "e5", "d6"));
    }

    @Test
    void disambiguatesByFileThenRank() {
        // Knights on b1 and f3 can both reach d2.
        String knights = "4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1";
        assertEquals("Nbd2", san(knights, "b1", "d2"));
        assertEquals("Nfd2", san(knights, "f3", "d2"));

        // Rooks on a1 and a5 share a file, so the rank tells them apart.
        String rooks = "4k3/8/8/R7/8/8/8/R3K3 w - - 0 1";
        assertEquals("R1a3", san(rooks, "a1", "a3"));
        assertEquals("R5a3", san(rooks, "a5", "a3"));
    }

    @Test
    void aPinnedPieceDoesNotMakeAMoveAmbiguous() {
        // The e2 knight could reach d4 but is pinned to the king by the e7 rook.
        assertEquals("Nd4", san("4k3/4r3/8/8/8/1N6/4N3/4K3 w - - 0 1", "b3", "d4"));
    }

    @Test
    void promotionCheckAndMate() {
        assertEquals("a8=Q+", san("4k3/P7/8/8/8/8/8/4K3 w - - 0 1", "a7", "a8"));
        assertEquals("Ra8#", san("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", "a1", "a8"));
    }

    @Test
    void castlingIsWrittenOOrOOOEvenThoughItIsStoredAsKingTakesRook() {
        String standard = "4k3/8/8/8/8/8/8/R3K2R w HA - 0 1";
        assertEquals("O-O", san(standard, "e1", "h1"));
        assertEquals("O-O-O", san(standard, "e1", "a1"));

        // Chess960: king on b1, rooks on a1 and h1. Queenside the rook is right next to
        // the king; kingside the king travels five squares.
        String chess960 = "1k6/8/8/8/8/8/8/RK5R w HA - 0 1";
        assertEquals("O-O-O", san(chess960, "b1", "a1"));
        assertEquals("O-O", san(chess960, "b1", "h1"));
    }

    @Test
    void convertsEngineUciMovesIncludingChess960Castling() {
        Position position = Fen.parse("1k6/8/8/8/8/8/8/RK5R w HA - 0 1");
        assertEquals("O-O-O", San.ofUci(position, "b1a1").orElseThrow());
        assertEquals("Rh8+", San.ofUci(position, "h1h8").orElseThrow());
        assertEquals(java.util.Optional.empty(), San.ofUci(position, "a1b2"));
    }
}
