package com.chess960.backend.game.dto;

public record ErrorMessage(String type, String message) {
    public ErrorMessage(String message) {
        this("ERROR", message);
    }
}
