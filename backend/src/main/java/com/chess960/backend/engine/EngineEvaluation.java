package com.chess960.backend.engine;

/**
 * @param bestMoveUci the engine's chosen move, e.g. "e2e4" or (castling, Chess960-style)
 *     "e1h1" - same from/to encoding this app's own {@code Move} uses
 * @param scoreCentipawns the position's value in hundredths of a pawn, from the side to
 *     move's perspective; null when {@code mateInMoves} is set instead
 * @param mateInMoves moves to forced mate from the side to move's perspective (negative
 *     means they get mated), or null when there's no forced mate within the search
 * @param depth how many plies deep the engine searched
 */
public record EngineEvaluation(
        String bestMoveUci, Integer scoreCentipawns, Integer mateInMoves, int depth) {}
