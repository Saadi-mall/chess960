package com.chess960.backend.analysis.web;

import java.util.List;

public record SideOverviewDto(
        List<String> undefendedPawnSquares,
        List<String> longDiagonalBishopSquares,
        Integer castlingDistance,
        String weakestSquare,
        int weakestSquareDefenders) {}
