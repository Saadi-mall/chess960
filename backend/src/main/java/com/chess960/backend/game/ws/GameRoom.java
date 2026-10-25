package com.chess960.backend.game.ws;

import com.chess960.backend.rules.Color;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.web.socket.WebSocketSession;

/** Everyone currently connected to one game: players (with their color) and spectators. */
final class GameRoom {

    final Map<WebSocketSession, Color> players = new ConcurrentHashMap<>();
    final Set<WebSocketSession> spectators = ConcurrentHashMap.newKeySet();

    /** Set by whichever player clicks "rematch" first; cleared once the rematch starts. */
    volatile Color rematchOfferedBy;

    Set<WebSocketSession> allSessions() {
        Set<WebSocketSession> all = ConcurrentHashMap.newKeySet();
        all.addAll(players.keySet());
        all.addAll(spectators);
        return all;
    }

    boolean isEmpty() {
        return players.isEmpty() && spectators.isEmpty();
    }
}
