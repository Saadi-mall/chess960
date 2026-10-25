package com.chess960.backend.chesscom;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Imports a Chess.com player's Chess960 game history and reduces it to simple counts -
 * CLAUDE.md asks for "simple stats", not analysis of the games themselves.
 */
@Service
public class ChessComImportService {

    /** How many of the player's most recent monthly archives to search. Chess.com has no
     * way to ask "just the Chess960 games", so importing means downloading every game
     * from each month and filtering client-side; capping this keeps the request from
     * taking minutes for a player with years of history. */
    private static final int MAX_MONTHS = 24;

    private static final Logger log = LoggerFactory.getLogger(ChessComImportService.class);

    private static final Set<String> DRAW_RESULTS =
            Set.of("agreed", "repetition", "stalemate", "50move", "insufficient", "timevsinsufficient");

    private final ChessComClient client;

    public ChessComImportService(ChessComClient client) {
        this.client = client;
    }

    public ChessComStats importStats(String username) {
        List<String> archives = client.fetchArchiveUrls(username);
        List<String> recent = archives.subList(Math.max(0, archives.size() - MAX_MONTHS), archives.size());

        AtomicInteger wins = new AtomicInteger();
        AtomicInteger losses = new AtomicInteger();
        AtomicInteger draws = new AtomicInteger();
        Map<String, Integer> byTimeClass = new ConcurrentHashMap<>();

        int failedMonths = 0;
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> futures = new ArrayList<>();
            for (String url : recent) {
                futures.add(
                        executor.submit(
                                () -> scanMonth(client.fetchGames(url), username, wins, losses, draws, byTimeClass)));
            }
            for (Future<?> future : futures) {
                try {
                    future.get();
                } catch (ExecutionException e) {
                    // One bad month (rate limiting, a transient error) shouldn't fail the
                    // whole import - log it and report partial stats instead.
                    log.warn("Failed to import a Chess.com archive for {}", username, e.getCause());
                    failedMonths++;
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new ChessComException("Interrupted while importing Chess.com games", e);
                }
            }
        }
        if (failedMonths == recent.size() && !recent.isEmpty()) {
            throw new ChessComException("Could not reach the Chess.com API for any month", 502);
        }

        int total = wins.get() + losses.get() + draws.get();
        double winRate = total == 0 ? 0.0 : (double) wins.get() / total;
        return new ChessComStats(
                username,
                recent.size() - failedMonths,
                total,
                wins.get(),
                losses.get(),
                draws.get(),
                winRate,
                byTimeClass);
    }

    void scanMonth(
            JsonNode games,
            String username,
            AtomicInteger wins,
            AtomicInteger losses,
            AtomicInteger draws,
            Map<String, Integer> byTimeClass) {
        for (JsonNode game : games) {
            if (!"chess960".equals(game.path("rules").asText())) {
                continue;
            }
            JsonNode player = playerNode(game, username);
            if (player == null) {
                continue;
            }
            switch (classify(player.path("result").asText())) {
                case WIN -> wins.incrementAndGet();
                case DRAW -> draws.incrementAndGet();
                case LOSS -> losses.incrementAndGet();
            }
            byTimeClass.merge(game.path("time_class").asText("unknown"), 1, Integer::sum);
        }
    }

    private JsonNode playerNode(JsonNode game, String username) {
        for (String color : List.of("white", "black")) {
            JsonNode player = game.path(color);
            if (username.equalsIgnoreCase(player.path("username").asText())) {
                return player;
            }
        }
        return null;
    }

    private enum Outcome {
        WIN,
        LOSS,
        DRAW
    }

    private Outcome classify(String result) {
        if ("win".equals(result)) return Outcome.WIN;
        if (DRAW_RESULTS.contains(result)) return Outcome.DRAW;
        return Outcome.LOSS;
    }
}
