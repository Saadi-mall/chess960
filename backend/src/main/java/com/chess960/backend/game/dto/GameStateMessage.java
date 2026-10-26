package com.chess960.backend.game.dto;

import java.util.List;

/**
 * Broadcast to everyone in a game's room after anything about the game changes.
 *
 * @param moveHistory every move so far, in SAN
 * @param fenHistory the starting FEN, then the FEN after each move (one longer than
 *     moveHistory), so the client can show any earlier position
 */
public record GameStateMessage(
        String type,
        String fen,
        int startingNumber,
        int initialSeconds,
        int incrementSeconds,
        List<MoveDto> legalMoves,
        String turn,
        String status,
        String winner,
        String drawOfferBy,
        long whiteMillis,
        long blackMillis,
        List<String> moveHistory,
        List<String> fenHistory,
        boolean whiteConnected,
        boolean blackConnected) {

    public GameStateMessage {
        type = "STATE";
    }
}
