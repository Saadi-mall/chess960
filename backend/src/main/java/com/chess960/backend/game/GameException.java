package com.chess960.backend.game;

/** Any rejected game action: a bad move, wrong turn, game already over, game full, and so on. */
public class GameException extends RuntimeException {
    public GameException(String message) {
        super(message);
    }
}
