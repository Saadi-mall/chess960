package com.chess960.backend.position;

import java.util.List;

public record PositionStateResponse(
        String fen, List<MoveDto> legalMoves, String turn, String status, String winner) {}
