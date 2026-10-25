package com.chess960.backend.analysis.web;

import com.chess960.backend.analysis.PositionOverview;
import com.chess960.backend.analysis.SideOverview;
import com.chess960.backend.engine.EngineEvaluation;
import com.chess960.backend.rules.Square;
import java.util.List;

final class AnalysisMessages {

    private AnalysisMessages() {}

    static OverviewDto toDto(PositionOverview overview) {
        return new OverviewDto(overview.positionNumber(), toDto(overview.white()), toDto(overview.black()));
    }

    private static SideOverviewDto toDto(SideOverview side) {
        return new SideOverviewDto(
                toAlgebraic(side.undefendedPawnSquares()),
                toAlgebraic(side.longDiagonalBishopSquares()),
                side.castlingDistance(),
                side.weakestSquare() == null ? null : Square.toAlgebraic(side.weakestSquare()),
                side.weakestSquareDefenders());
    }

    private static List<String> toAlgebraic(List<Integer> squares) {
        return squares.stream().map(Square::toAlgebraic).toList();
    }

    static EvaluationDto toDto(EngineEvaluation evaluation) {
        return new EvaluationDto(
                evaluation.bestMoveUci(),
                evaluation.scoreCentipawns(),
                evaluation.mateInMoves(),
                evaluation.depth());
    }
}
