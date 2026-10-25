package com.chess960.backend.chesscom;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/**
 * Exercises the counting/classification logic directly against hand-built fixtures shaped
 * like real Chess.com API responses, rather than over HTTP - see docs/DECISIONS.md for why
 * this feature doesn't have a full HTTP-level test.
 */
class ChessComImportServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ChessComImportService service = new ChessComImportService(null);

    private JsonNode games(String json) throws Exception {
        return objectMapper.readTree(json).path("games");
    }

    @Test
    void onlyCountsChess960GamesForTheGivenPlayer() throws Exception {
        JsonNode games =
                games(
                        """
                        {"games": [
                          {"rules": "chess", "time_class": "blitz",
                           "white": {"username": "alice", "result": "win"},
                           "black": {"username": "bob", "result": "resigned"}},
                          {"rules": "chess960", "time_class": "blitz",
                           "white": {"username": "alice", "result": "win"},
                           "black": {"username": "bob", "result": "resigned"}},
                          {"rules": "chess960", "time_class": "rapid",
                           "white": {"username": "carol", "result": "win"},
                           "black": {"username": "dave", "result": "resigned"}}
                        ]}
                        """);

        AtomicInteger wins = new AtomicInteger();
        AtomicInteger losses = new AtomicInteger();
        AtomicInteger draws = new AtomicInteger();
        Map<String, Integer> byTimeClass = new HashMap<>();

        service.scanMonth(games, "alice", wins, losses, draws, byTimeClass);

        assertEquals(1, wins.get());
        assertEquals(0, losses.get());
        assertEquals(0, draws.get());
        assertEquals(Map.of("blitz", 1), byTimeClass);
    }

    @Test
    void classifiesWinsLossesAndDrawsByResultCode() throws Exception {
        JsonNode games =
                games(
                        """
                        {"games": [
                          {"rules": "chess960", "time_class": "bullet",
                           "white": {"username": "alice", "result": "win"},
                           "black": {"username": "bob", "result": "resigned"}},
                          {"rules": "chess960", "time_class": "bullet",
                           "white": {"username": "bob", "result": "win"},
                           "black": {"username": "alice", "result": "checkmated"}},
                          {"rules": "chess960", "time_class": "bullet",
                           "white": {"username": "alice", "result": "agreed"},
                           "black": {"username": "bob", "result": "agreed"}},
                          {"rules": "chess960", "time_class": "bullet",
                           "white": {"username": "alice", "result": "stalemate"},
                           "black": {"username": "bob", "result": "stalemate"}}
                        ]}
                        """);

        AtomicInteger wins = new AtomicInteger();
        AtomicInteger losses = new AtomicInteger();
        AtomicInteger draws = new AtomicInteger();
        Map<String, Integer> byTimeClass = new HashMap<>();

        service.scanMonth(games, "alice", wins, losses, draws, byTimeClass);

        assertEquals(1, wins.get());
        assertEquals(1, losses.get());
        assertEquals(2, draws.get());
    }

    @Test
    void usernameMatchIsCaseInsensitive() throws Exception {
        JsonNode games =
                games(
                        """
                        {"games": [
                          {"rules": "chess960", "time_class": "daily",
                           "white": {"username": "AlIcE", "result": "win"},
                           "black": {"username": "bob", "result": "resigned"}}
                        ]}
                        """);

        AtomicInteger wins = new AtomicInteger();
        AtomicInteger losses = new AtomicInteger();
        AtomicInteger draws = new AtomicInteger();
        Map<String, Integer> byTimeClass = new HashMap<>();

        service.scanMonth(games, "alice", wins, losses, draws, byTimeClass);

        assertEquals(1, wins.get());
    }
}
