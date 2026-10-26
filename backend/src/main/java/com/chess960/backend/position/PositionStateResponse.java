package com.chess960.backend.position;

import java.util.List;

/**
 * @param lastMoveSan SAN of the move that produced this position, or null when no move was
 *     just played (e.g. a freshly loaded starting position)
 */
public record PositionStateResponse(
        String fen, List<MoveDto> legalMoves, String turn, String status, String winner, String lastMoveSan) {}
