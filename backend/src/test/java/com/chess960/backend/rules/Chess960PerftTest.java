package com.chess960.backend.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * Perft counts for real Chess960 starting positions, published at
 * https://www.chessprogramming.org/Chess960_Perft_Results. Each row there is a position
 * reached a few random plies into a game from one of the 960 starting arrays, which is a
 * better correctness test than the raw starting array: it exercises captures, checks and
 * (because the king or a rook has often already moved) partial or fully lost castling
 * rights, not just the opening position's empty board.
 *
 * <p>These positions are picked for variety: a king starting between two rooks (SP1, SP4),
 * a non-corner rook identified by a middle file letter like "D" (SP128), positions with no
 * castling rights left at all (SP274, SP380), the standard chess array written in
 * Shredder-FEN instead of "KQkq" (SP518), and a few heavily-constrained, nearly-forced
 * positions (SP845, SP905, SP957) where the branching factor stays low enough to check all
 * the way to depth 5 quickly.
 */
class Chess960PerftTest {

    static Stream<Arguments> positions() {
        return Stream.of(
                Arguments.of(
                        "bqnb1rkr/pp3ppp/3ppn2/2p5/5P2/P2P4/NPP1P1PP/BQ1BNRKR w HFhf - 2 9",
                        new long[] {21, 528, 12189, 326672}),
                Arguments.of(
                        "qbbnnrkr/2pp2pp/p7/1p2pp2/8/P3PP2/1PPP1KPP/QBBNNR1R w hf - 0 9",
                        new long[] {22, 593, 13440, 382958}),
                Arguments.of(
                        "bbnrqrk1/pp2pppp/4n3/2pp4/P7/1N5P/BPPPPPP1/B2RQNKR w HD - 2 9",
                        new long[] {23, 708, 17164, 554089}),
                Arguments.of(
                        "bnkrnbrq/ppppp1p1/B6p/5p2/8/4P3/PPPP1PPP/BNKRN1RQ w - - 0 9",
                        new long[] {26, 417, 11124, 217095}),
                Arguments.of(
                        "nb1rrnbq/ppkp1ppp/8/2p1p3/P7/1N2P3/1PPP1PPP/1BKRRNBQ w - - 1 9",
                        new long[] {19, 451, 9655, 235472}),
                Arguments.of(
                        "rn1qkbnr/p1p1pp1p/bp4p1/3p4/1P6/4P3/P1PP1PPP/RNBQKBNR w HAha - 0 9",
                        new long[] {30, 794, 24319, 690811}),
                Arguments.of(
                        "rbk1r1bn/ppppp1pp/4n3/5p2/1P3P2/4N2P/PqPPP1P1/RBK1RQBN w EAea - 1 9",
                        new long[] {2, 60, 1319, 41765}),
                Arguments.of(
                        "r1kqbrnn/pp1pp1p1/7p/2P2p2/5b2/3P4/P1P1P1PP/RBKQBRNN w FAfa - 0 9",
                        new long[] {5, 161, 4745, 154885}),
                Arguments.of(
                        "r1krnnbq/pp1ppp1p/6p1/2p5/2P5/P3P3/Rb1P1PPP/1BKRNNBQ w Dda - 0 9",
                        new long[] {2, 61, 1312, 40072}));
    }

    @ParameterizedTest
    @MethodSource("positions")
    void perftUpToDepth4(String fen, long[] expectedByDepth) {
        for (int depth = 1; depth <= expectedByDepth.length; depth++) {
            Position position = Fen.parse(fen);
            assertEquals(
                    expectedByDepth[depth - 1],
                    Perft.count(position, depth),
                    fen + " at depth " + depth);
        }
    }

    @ParameterizedTest
    @MethodSource("depth5Positions")
    void perftDepth5(String fen, long expected) {
        assertEquals(expected, Perft.count(Fen.parse(fen), 5), fen);
    }

    static Stream<Arguments> depth5Positions() {
        return Stream.of(
                Arguments.of(
                        "rn1qkbnr/p1p1pp1p/bp4p1/3p4/1P6/4P3/P1PP1PPP/RNBQKBNR w HAha - 0 9",
                        21657601L),
                Arguments.of(
                        "rbk1r1bn/ppppp1pp/4n3/5p2/1P3P2/4N2P/PqPPP1P1/RBK1RQBN w EAea - 1 9",
                        1017864L),
                Arguments.of(
                        "r1kqbrnn/pp1pp1p1/7p/2P2p2/5b2/3P4/P1P1P1PP/RBKQBRNN w FAfa - 0 9",
                        4734999L),
                Arguments.of(
                        "r1krnnbq/pp1ppp1p/6p1/2p5/2P5/P3P3/Rb1P1PPP/1BKRNNBQ w Dda - 0 9",
                        937188L));
    }
}
