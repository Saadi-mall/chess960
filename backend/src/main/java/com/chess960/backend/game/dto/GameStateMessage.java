package com.chess960.backend.game.dto;

import java.util.List;

/** Broadcast to everyone in a game's room after anything about the game changes. */
public record GameStateMessage(
        String type,
        String fen,
        int startingNumber,
        List<MoveDto> legalMoves,
        String turn,
        String status,
        String winner,
        String drawOfferBy,
        long whiteMillis,
        long blackMillis,
        List<String> moveHistory,
        boolean whiteConnected,
        boolean blackConnected) {

    public GameStateMessage {
        type = "STATE";
    }
}
