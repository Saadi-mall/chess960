package com.chess960.backend.engine;

import com.chess960.backend.rules.Chess960StartingPosition;
import org.springframework.stereotype.Service;

/**
 * Evaluates one of the 960 starting positions, caching the result in Postgres: there are
 * only 960 of them and they're requested repeatedly (every time the Analyze or Learn tab
 * loads a given position number), so there's no reason to ask Stockfish twice for the same
 * one. Positions reached by actually playing moves aren't cached - there are too many of
 * those for caching to make sense, so those always go straight to {@link StockfishEngine}.
 */
@Service
public class StartingPositionEvaluationService {

    private static final int MOVETIME_MILLIS = 1500;

    private final StartingPositionEvaluationRepository repository;
    private final StockfishEngine engine;

    public StartingPositionEvaluationService(
            StartingPositionEvaluationRepository repository, StockfishEngine engine) {
        this.repository = repository;
        this.engine = engine;
    }

    public EngineEvaluation evaluate(int positionNumber) {
        return repository
                .findById(positionNumber)
                .map(StartingPositionEvaluationEntity::toEvaluation)
                .orElseGet(() -> computeAndStore(positionNumber));
    }

    private EngineEvaluation computeAndStore(int positionNumber) {
        String fen = Chess960StartingPosition.startingFen(positionNumber);
        EngineEvaluation evaluation = engine.evaluate(fen, MOVETIME_MILLIS);
        repository.save(new StartingPositionEvaluationEntity(positionNumber, evaluation));
        return evaluation;
    }
}
