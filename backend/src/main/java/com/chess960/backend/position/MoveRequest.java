package com.chess960.backend.position;

public record MoveRequest(String fen, String from, String to, String promotion) {}
