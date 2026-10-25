package com.chess960.backend.game.dto;

public record RematchStartedMessage(String type, String gameId, String color, String token) {
    public RematchStartedMessage(String gameId, String color, String token) {
        this("REMATCH_STARTED", gameId, color, token);
    }
}
