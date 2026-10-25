package com.chess960.backend.game.dto;

/** {@code positionMode} is "RANDOM", "NUMBER" (with {@code number} 0-959) or "DAILY". */
public record CreateGameRequest(
        String positionMode, Integer number, Integer initialSeconds, Integer incrementSeconds) {}
