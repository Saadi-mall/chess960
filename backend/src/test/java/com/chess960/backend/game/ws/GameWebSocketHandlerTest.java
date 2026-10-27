package com.chess960.backend.game.ws;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.chess960.backend.game.Game;
import com.chess960.backend.game.GameService;
import com.chess960.backend.game.PositionMode;
import com.chess960.backend.game.TimeControl;
import com.chess960.backend.rules.Color;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Proxy;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

class GameWebSocketHandlerTest {

    private final GameService games = new GameService();
    private final ObjectMapper json = new ObjectMapper();
    private final GameWebSocketHandler handler =
            new GameWebSocketHandler(games, new GameBroadcaster(games, json), json);

    /** A fake connection to the game, as the browser would open it. Only answers what the
     * handler asks; it reports itself closed, so broadcasts skip it. (A plain proxy rather
     * than a Mockito mock, which can't mock this interface on newer JDKs.) */
    private WebSocketSession connect(Game game, String token) throws Exception {
        URI uri = URI.create("ws://localhost/ws/games/" + game.id() + "?token=" + token);
        Map<String, Object> attributes = new HashMap<>();
        WebSocketSession session = (WebSocketSession) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[] {WebSocketSession.class},
                (self, method, args) -> switch (method.getName()) {
                    case "getUri" -> uri;
                    case "getAttributes" -> attributes;
                    case "isOpen" -> false;
                    case "hashCode" -> System.identityHashCode(self);
                    case "equals" -> self == args[0];
                    default -> null;
                });
        handler.afterConnectionEstablished(session);
        return session;
    }

    @Test
    void anOldConnectionClosingLateDoesNotMarkAReconnectedPlayerAsGone() throws Exception {
        GameService.Created created = games.createGame(PositionMode.NUMBER, 518, TimeControl.DEFAULT);
        Game game = created.game();

        // A refresh or rematch: the new page connects before the old page's close arrives.
        WebSocketSession oldPage = connect(game, created.token());
        connect(game, created.token());
        handler.afterConnectionClosed(oldPage, CloseStatus.NORMAL);
        assertTrue(game.isConnected(created.color()));
    }

    @Test
    void closingTheOnlyConnectionMarksThePlayerAsGone() throws Exception {
        GameService.Created created = games.createGame(PositionMode.NUMBER, 518, TimeControl.DEFAULT);
        Game game = created.game();

        WebSocketSession page = connect(game, created.token());
        assertTrue(game.isConnected(created.color()));
        handler.afterConnectionClosed(page, CloseStatus.NORMAL);
        assertFalse(game.isConnected(created.color()));
        assertFalse(game.isConnected(created.color() == Color.WHITE ? Color.BLACK : Color.WHITE));
    }
}
