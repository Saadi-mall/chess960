package com.chess960.backend.game.ws;

import com.chess960.backend.game.Game;
import com.chess960.backend.game.GameException;
import com.chess960.backend.game.GameService;
import com.chess960.backend.game.dto.ClientMessage;
import com.chess960.backend.game.dto.ErrorMessage;
import com.chess960.backend.game.dto.GameMessages;
import com.chess960.backend.game.dto.RematchOfferedMessage;
import com.chess960.backend.game.dto.RematchStartedMessage;
import com.chess960.backend.rules.Color;
import com.chess960.backend.rules.PieceType;
import com.chess960.backend.rules.Square;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * One WebSocket connection per browser tab watching or playing a game, at
 * {@code /ws/games/{gameId}?token=...}. The token (from {@link GameService#join}) says
 * which color the connection may move as; no token, or one that doesn't match, means a
 * read-only spectator.
 */
@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private final GameService gameService;
    private final GameBroadcaster broadcaster;
    private final ObjectMapper objectMapper;

    public GameWebSocketHandler(GameService gameService, GameBroadcaster broadcaster, ObjectMapper objectMapper) {
        this.gameService = gameService;
        this.broadcaster = broadcaster;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        String gameId = gameIdFrom(session);
        Optional<Game> game = gameService.find(gameId);
        if (game.isEmpty()) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("No such game"));
            return;
        }

        Color color = game.get().colorForToken(tokenFrom(session)).orElse(null);
        GameRoom room = broadcaster.roomFor(gameId);
        session.getAttributes().put("gameId", gameId);
        if (color != null) {
            // The attributes map (a ConcurrentHashMap under the hood) rejects null values,
            // so a spectator - who has no color - just leaves this key unset rather than
            // null; reading it back with get() still yields null either way.
            session.getAttributes().put("color", color);
        }

        if (color != null) {
            room.players.put(session, color);
            game.get().setConnected(color, true);
        } else {
            room.spectators.add(session);
        }

        broadcaster.broadcastState(gameId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        String gameId = (String) session.getAttributes().get("gameId");
        Color color = (Color) session.getAttributes().get("color");
        Game game = gameService.get(gameId);

        ClientMessage clientMessage;
        try {
            clientMessage = objectMapper.readValue(message.getPayload(), ClientMessage.class);
        } catch (Exception e) {
            broadcaster.send(session, new ErrorMessage("Malformed message"));
            return;
        }

        try {
            handle(gameId, game, color, session, clientMessage);
        } catch (GameException e) {
            broadcaster.send(session, new ErrorMessage(e.getMessage()));
        }
    }

    private void handle(
            String gameId, Game game, Color color, WebSocketSession session, ClientMessage message)
            throws IOException {
        switch (message.type()) {
            case "MOVE" -> {
                requirePlayer(color);
                PieceType promotion = GameMessages.promotionType(message.promotion());
                game.applyMove(
                        color,
                        Square.fromAlgebraic(message.from()),
                        Square.fromAlgebraic(message.to()),
                        promotion);
                broadcaster.broadcastState(gameId);
            }
            case "RESIGN" -> {
                requirePlayer(color);
                game.resign(color);
                broadcaster.broadcastState(gameId);
            }
            case "OFFER_DRAW" -> {
                requirePlayer(color);
                game.offerDraw(color);
                broadcaster.broadcastState(gameId);
            }
            case "RESPOND_DRAW" -> {
                requirePlayer(color);
                game.respondToDraw(color, Boolean.TRUE.equals(message.accept()));
                broadcaster.broadcastState(gameId);
            }
            case "REMATCH" -> {
                requirePlayer(color);
                handleRematch(gameId, game, color);
            }
            default -> broadcaster.send(session, new ErrorMessage("Unknown message type: " + message.type()));
        }
    }

    private void handleRematch(String gameId, Game finishedGame, Color color) throws IOException {
        GameRoom room = broadcaster.existingRoom(gameId);
        if (room == null) return;

        if (room.rematchOfferedBy == null) {
            room.rematchOfferedBy = color;
            broadcaster.broadcast(room, new RematchOfferedMessage(GameMessages.colorName(color)));
            return;
        }
        if (room.rematchOfferedBy == color) {
            return; // already offered, waiting on the opponent
        }

        GameService.Rematch rematch = gameService.createRematch(finishedGame);
        room.rematchOfferedBy = null;
        for (Map.Entry<WebSocketSession, Color> entry : room.players.entrySet()) {
            // Colors swap each rematch: whoever was White becomes Black, and vice versa.
            String token = entry.getValue() == Color.WHITE ? rematch.blackToken() : rematch.whiteToken();
            Color newColor = entry.getValue() == Color.WHITE ? Color.BLACK : Color.WHITE;
            broadcaster.send(
                    entry.getKey(),
                    new RematchStartedMessage(rematch.game().id(), GameMessages.colorName(newColor), token));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String gameId = (String) session.getAttributes().get("gameId");
        Color color = (Color) session.getAttributes().get("color");
        if (gameId == null) return;

        GameRoom room = broadcaster.existingRoom(gameId);
        if (room != null) {
            room.players.remove(session);
            room.spectators.remove(session);
            broadcaster.removeRoomIfEmpty(gameId, room);
        }

        if (color != null) {
            gameService.find(gameId).ifPresent(g -> g.setConnected(color, false));
            broadcaster.broadcastState(gameId);
        }
    }

    private void requirePlayer(Color color) {
        if (color == null) {
            throw new GameException("Spectators can't do that");
        }
    }

    private static String gameIdFrom(WebSocketSession session) {
        String path = session.getUri().getPath();
        String[] segments = path.split("/");
        return segments[segments.length - 1];
    }

    private static String tokenFrom(WebSocketSession session) {
        String query = session.getUri().getQuery();
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] kv = param.split("=", 2);
            if (kv.length == 2 && kv[0].equals("token")) {
                return kv[1];
            }
        }
        return null;
    }
}
