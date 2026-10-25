package com.chess960.backend.game.dto;

public record GameInfoResponse(
        String gameId,
        boolean whiteJoined,
        boolean blackJoined,
        int initialSeconds,
        int incrementSeconds,
        String status) {}
