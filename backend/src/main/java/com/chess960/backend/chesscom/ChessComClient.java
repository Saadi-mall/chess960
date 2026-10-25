package com.chess960.backend.chesscom;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/** A thin wrapper around Chess.com's public, read-only "Published Data" API - no API key,
 * no auth, just https://api.chess.com/pub/... . */
@Component
class ChessComClient {

    private static final String USER_AGENT = "Chess960App/1.0 (take-home project)";

    private final HttpClient httpClient =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper objectMapper;

    ChessComClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    List<String> fetchArchiveUrls(String username) {
        JsonNode body = get("https://api.chess.com/pub/player/" + username + "/games/archives", username);
        List<String> urls = new ArrayList<>();
        body.path("archives").forEach(node -> urls.add(node.asText()));
        return urls;
    }

    JsonNode fetchGames(String archiveUrl) {
        return get(archiveUrl, null).path("games");
    }

    private JsonNode get(String url, String usernameForErrors) {
        HttpRequest request =
                HttpRequest.newBuilder(URI.create(url))
                        .header("User-Agent", USER_AGENT)
                        .timeout(Duration.ofSeconds(15))
                        .GET()
                        .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 404) {
                throw new ChessComException(
                        usernameForErrors != null
                                ? "No Chess.com user named \"" + usernameForErrors + "\""
                                : "Not found: " + url,
                        404);
            }
            if (response.statusCode() != 200) {
                throw new ChessComException("Chess.com API returned " + response.statusCode(), 502);
            }
            return objectMapper.readTree(response.body());
        } catch (IOException e) {
            throw new ChessComException("Could not reach the Chess.com API", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ChessComException("Interrupted while calling the Chess.com API", e);
        }
    }
}
