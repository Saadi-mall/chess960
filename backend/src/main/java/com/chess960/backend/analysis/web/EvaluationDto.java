package com.chess960.backend.analysis.web;

/**
 * @param bestMoveUci Stockfish's move in from/to form, which the frontend uses to compare
 *     against a move the user played
 * @param bestMoveSan the same move in SAN, for display
 */
public record EvaluationDto(
        String bestMoveUci, String bestMoveSan, Integer scoreCentipawns, Integer mateInMoves, int depth) {}
