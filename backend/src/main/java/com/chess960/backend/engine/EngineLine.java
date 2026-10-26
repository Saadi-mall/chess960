package com.chess960.backend.engine;

import java.util.List;

/**
 * One of Stockfish's candidate lines from a MultiPV search.
 *
 * @param scoreCentipawns the line's value from the side to move's perspective, or null
 *     when {@code mateInMoves} is set
 * @param mateInMoves moves to mate from the side to move's perspective (negative: getting
 *     mated), or null
 * @param pv the line's moves in UCI form (Chess960 castling as king-takes-rook)
 */
public record EngineLine(Integer scoreCentipawns, Integer mateInMoves, int depth, List<String> pv) {}
