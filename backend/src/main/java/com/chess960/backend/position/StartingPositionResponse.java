package com.chess960.backend.position;

/** Just the FEN and resolved Chess960 number - cheap enough to call on every keystroke
 * for a live preview, unlike the full analyzer+Stockfish pipeline. */
public record StartingPositionResponse(int number, String fen) {}
