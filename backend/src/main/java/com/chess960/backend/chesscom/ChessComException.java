package com.chess960.backend.chesscom;

public class ChessComException extends RuntimeException {

    private final int statusCode;

    public ChessComException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    public ChessComException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = 502;
    }

    public int statusCode() {
        return statusCode;
    }
}
