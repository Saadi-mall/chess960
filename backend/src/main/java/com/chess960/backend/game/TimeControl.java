package com.chess960.backend.game;

public record TimeControl(int initialSeconds, int incrementSeconds) {

    public static final TimeControl DEFAULT = new TimeControl(5 * 60, 0);

    public TimeControl {
        if (initialSeconds <= 0 || initialSeconds > 3 * 60 * 60) {
            throw new IllegalArgumentException("initialSeconds out of range: " + initialSeconds);
        }
        if (incrementSeconds < 0 || incrementSeconds > 60) {
            throw new IllegalArgumentException("incrementSeconds out of range: " + incrementSeconds);
        }
    }
}
