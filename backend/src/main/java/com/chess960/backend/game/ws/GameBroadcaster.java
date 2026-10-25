package com.chess960.backend.game.ws;

import com.chess960.backend.game.GameService;
import com.chess960.backend.game.dto.GameMessages;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

/**
 * Tracks who's connected to each game's room and sends them messages. Separate from
 * {@link GameWebSocketHandler} so {@link com.chess960.backend.game.ClockSweeper}, which
 * isn't itself a WebSocket handler, can still push a state update when a clock runs out.
 */
@Component
public class GameBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(GameBroadcaster.class);

    private final GameService gameService;
    private final ObjectMapper objectMapper;
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();

    public GameBroadcaster(GameService gameService, ObjectMapper objectMapper) {
        this.gameService = gameService;
        this.objectMapper = objectMapper;
    }

    GameRoom roomFor(String gameId) {
        return rooms.computeIfAbsent(gameId, id -> new GameRoom());
    }

    GameRoom existingRoom(String gameId) {
        return rooms.get(gameId);
    }

    void removeRoomIfEmpty(String gameId, GameRoom room) {
        if (room.isEmpty()) {
            rooms.remove(gameId);
        }
    }

    public void broadcastState(String gameId) {
        GameRoom room = rooms.get(gameId);
        if (room == null) return;
        try {
            broadcast(room, GameMessages.stateOf(gameService.get(gameId)));
        } catch (IOException e) {
            log.warn("Failed to broadcast state for game {}", gameId, e);
        }
    }

    void broadcast(GameRoom room, Object message) throws IOException {
        String json = objectMapper.writeValueAsString(message);
        for (WebSocketSession session : room.allSessions()) {
            sendRaw(session, json);
        }
    }

    void send(WebSocketSession session, Object message) throws IOException {
        sendRaw(session, objectMapper.writeValueAsString(message));
    }

    /**
     * A game's room can get several broadcasts in flight at once (e.g. two players'
     * connections both opening around the same time, each triggering its own state
     * broadcast) - Tomcat's WebSocket remote endpoint isn't safe for concurrent writes
     * from different threads, so sends to one session are serialized on that session.
     */
    private void sendRaw(WebSocketSession session, String json) throws IOException {
        if (!session.isOpen()) return;
        synchronized (session) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(json));
            }
        }
    }
}
