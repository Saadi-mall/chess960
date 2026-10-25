package com.chess960.backend.game;

public enum GameStatus {
    WAITING_FOR_OPPONENT,
    IN_PROGRESS,
    CHECKMATE,
    STALEMATE,
    DRAW_AGREEMENT,
    DRAW_FIFTY_MOVE,
    DRAW_REPETITION,
    DRAW_INSUFFICIENT_MATERIAL,
    RESIGNED,
    TIMEOUT;

    public boolean isOver() {
        return this != WAITING_FOR_OPPONENT && this != IN_PROGRESS;
    }
}
