package com.chess960.backend.engine;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "starting_position_evaluations")
public class StartingPositionEvaluationEntity {

    @Id
    @Column(name = "position_number")
    private Integer positionNumber;

    @Column(name = "best_move_uci", nullable = false)
    private String bestMoveUci;

    @Column(name = "score_centipawns")
    private Integer scoreCentipawns;

    @Column(name = "mate_in_moves")
    private Integer mateInMoves;

    @Column(name = "depth", nullable = false)
    private int depth;

    @Column(name = "computed_at", nullable = false)
    private Instant computedAt;

    protected StartingPositionEvaluationEntity() {} // JPA

    StartingPositionEvaluationEntity(int positionNumber, EngineEvaluation evaluation) {
        this.positionNumber = positionNumber;
        this.bestMoveUci = evaluation.bestMoveUci();
        this.scoreCentipawns = evaluation.scoreCentipawns();
        this.mateInMoves = evaluation.mateInMoves();
        this.depth = evaluation.depth();
        this.computedAt = Instant.now();
    }

    EngineEvaluation toEvaluation() {
        return new EngineEvaluation(bestMoveUci, scoreCentipawns, mateInMoves, depth);
    }
}
