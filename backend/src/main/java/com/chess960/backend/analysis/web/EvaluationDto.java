package com.chess960.backend.analysis.web;

public record EvaluationDto(String bestMoveUci, Integer scoreCentipawns, Integer mateInMoves, int depth) {}
