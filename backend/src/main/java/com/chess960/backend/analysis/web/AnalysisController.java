package com.chess960.backend.analysis.web;

import com.chess960.backend.analysis.PositionAnalyzer;
import com.chess960.backend.analysis.PositionOverview;
import com.chess960.backend.engine.EngineEvaluation;
import com.chess960.backend.engine.StartingPositionEvaluationService;
import com.chess960.backend.engine.StockfishEngine;
import com.chess960.backend.position.MoveRequest;
import com.chess960.backend.position.PositionService;
import com.chess960.backend.position.PositionStateResponse;
import com.chess960.backend.rules.Chess960StartingPosition;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.Position;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Backs the Analyze tab: load a starting position with its overview card and an opening
 * evaluation, then evaluate each move the user makes. The overview card isn't recomputed
 * per move - CLAUDE.md's "see an overview card... then make moves with a Stockfish
 * evaluation" treats it as a fact about the starting array, not something that needs
 * updating after every move the way the evaluation does.
 */
@RestController
public class AnalysisController {

    /** Live analysis moves don't need deep, slow searches the way the cached starting-
     * position evaluations do; this keeps the Analyze tab responsive after each move. */
    private static final int LIVE_MOVETIME_MILLIS = 800;

    private final StartingPositionEvaluationService startingPositionEvaluationService;
    private final StockfishEngine engine;
    private final PositionService positionService;

    public AnalysisController(
            StartingPositionEvaluationService startingPositionEvaluationService,
            StockfishEngine engine,
            PositionService positionService) {
        this.startingPositionEvaluationService = startingPositionEvaluationService;
        this.engine = engine;
        this.positionService = positionService;
    }

    @GetMapping("/api/analysis/starting/{number}")
    public AnalysisResponse analyzeStartingPosition(@PathVariable int number) {
        String fen = Chess960StartingPosition.startingFen(number);
        Position position = Fen.parse(fen);
        EngineEvaluation evaluation = startingPositionEvaluationService.evaluate(number);
        PositionStateResponse rules = positionService.legalMovesFor(fen);
        return toResponse(rules, PositionAnalyzer.analyze(position), evaluation);
    }

    @PostMapping("/api/analysis/evaluate")
    public AnalysisResponse evaluate(@RequestBody EvaluateRequest request) {
        PositionStateResponse rules = positionService.legalMovesFor(request.fen());
        EngineEvaluation evaluation = engine.evaluate(request.fen(), LIVE_MOVETIME_MILLIS);
        return toResponse(rules, null, evaluation);
    }

    @PostMapping("/api/analysis/move")
    public AnalysisResponse move(@RequestBody MoveRequest request) {
        PositionStateResponse rules = positionService.applyMove(request);
        EngineEvaluation evaluation = engine.evaluate(rules.fen(), LIVE_MOVETIME_MILLIS);
        return toResponse(rules, null, evaluation);
    }

    private AnalysisResponse toResponse(
            PositionStateResponse rules, PositionOverview overview, EngineEvaluation evaluation) {
        return new AnalysisResponse(
                rules.fen(),
                rules.legalMoves(),
                rules.turn(),
                rules.status(),
                rules.winner(),
                rules.lastMoveSan(),
                overview == null ? null : AnalysisMessages.toDto(overview),
                AnalysisMessages.toDto(evaluation, rules.fen()));
    }
}
