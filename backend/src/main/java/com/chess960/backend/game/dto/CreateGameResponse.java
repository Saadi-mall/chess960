package com.chess960.backend.game.dto;

public record CreateGameResponse(String gameId, String color, String token, int startingNumber) {}
