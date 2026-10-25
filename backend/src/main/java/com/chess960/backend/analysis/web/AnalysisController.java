package com.chess960.backend.analysis.web;

import com.chess960.backend.analysis.PositionAnalyzer;
import com.chess960.backend.engine.EngineEvaluation;
import com.chess960.backend.engine.StartingPositionEvaluationService;
import com.chess960.backend.engine.StockfishEngine;
import com.chess960.backend.rules.Chess960StartingPosition;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.Position;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AnalysisController {

    /** Live analysis moves don't need deep, slow searches the way the cached starting-
     * position evaluations do; this keeps the Analyze tab responsive after each move. */
    private static final int LIVE_MOVETIME_MILLIS = 800;

    private final StartingPositionEvaluationService startingPositionEvaluationService;
    private final StockfishEngine engine;

    public AnalysisController(
            StartingPositionEvaluationService startingPositionEvaluationService, StockfishEngine engine) {
        this.startingPositionEvaluationService = startingPositionEvaluationService;
        this.engine = engine;
    }

    @GetMapping("/api/analysis/starting/{number}")
    public AnalysisResponse analyzeStartingPosition(@PathVariable int number) {
        String fen = Chess960StartingPosition.startingFen(number);
        Position position = Fen.parse(fen);
        EngineEvaluation evaluation = startingPositionEvaluationService.evaluate(number);
        return toResponse(fen, position, evaluation);
    }

    @PostMapping("/api/analysis/evaluate")
    public AnalysisResponse evaluate(@RequestBody EvaluateRequest request) {
        Position position = Fen.parse(request.fen());
        EngineEvaluation evaluation = engine.evaluate(request.fen(), LIVE_MOVETIME_MILLIS);
        return toResponse(request.fen(), position, evaluation);
    }

    private AnalysisResponse toResponse(String fen, Position position, EngineEvaluation evaluation) {
        return new AnalysisResponse(
                fen,
                AnalysisMessages.toDto(PositionAnalyzer.analyze(position)),
                AnalysisMessages.toDto(evaluation));
    }
}
