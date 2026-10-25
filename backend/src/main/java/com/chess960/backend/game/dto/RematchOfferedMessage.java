package com.chess960.backend.game.dto;

public record RematchOfferedMessage(String type, String by) {
    public RematchOfferedMessage(String by) {
        this("REMATCH_OFFERED", by);
    }
}
