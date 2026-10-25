package com.chess960.backend.chesscom;

import java.util.Map;

/**
 * @param monthsScanned how many of the player's most recent monthly archives were
 *     searched (capped - see {@link ChessComImportService}), so the caller knows these
 *     stats may not cover a player's entire Chess960 history
 */
public record ChessComStats(
        String username,
        int monthsScanned,
        int totalGames,
        int wins,
        int losses,
        int draws,
        double winRate,
        Map<String, Integer> gamesByTimeClass) {}
