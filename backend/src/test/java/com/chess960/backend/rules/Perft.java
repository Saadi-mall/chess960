package com.chess960.backend.rules;

/**
 * Perft ("performance test") counts the leaf nodes of the full move tree to a fixed
 * depth. It's the standard way to test a chess move generator: a single wrong count at
 * some depth means the generator allows an illegal move, forbids a legal one, or miscounts
 * promotions/en passant/castling somewhere in the tree - and published perft numbers for
 * well-known positions let us check against an independent, trusted source instead of our
 * own judgment of what "looks right".
 */
final class Perft {

    private Perft() {}

    static long count(Position position, int depth) {
        if (depth == 0) {
            return 1;
        }
        long nodes = 0;
        for (Move move : MoveGenerator.legalMoves(position)) {
            Position.UndoInfo undo = position.makeMove(move);
            nodes += count(position, depth - 1);
            position.undoMove(move, undo);
        }
        return nodes;
    }
}
