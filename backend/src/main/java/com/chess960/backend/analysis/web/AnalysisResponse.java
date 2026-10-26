package com.chess960.backend.analysis.web;

import com.chess960.backend.position.MoveDto;
import java.util.List;

public record AnalysisResponse(
        String fen,
        List<MoveDto> legalMoves,
        String turn,
        String status,
        String winner,
        String lastMoveSan,
        OverviewDto overview,
        EvaluationDto evaluation) {}
