package com.chess960.backend.analysis.web;

public record AnalysisResponse(String fen, OverviewDto overview, EvaluationDto evaluation) {}
