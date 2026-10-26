package com.chess960.backend.game.ws;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final GameWebSocketHandler gameWebSocketHandler;
    private final String[] allowedOrigins;

    /**
     * @param allowedOrigins comma-separated origin patterns allowed to open a game socket,
     *     e.g. "https://chess960.vercel.app,https://*.vercel.app". "*" by default, which is
     *     safe here because a socket authenticates with the seat token in its URL, not a
     *     cookie, so another site can't act as a player just by opening one.
     */
    public WebSocketConfig(
            GameWebSocketHandler gameWebSocketHandler,
            @Value("${chess960.allowed-origins:*}") String allowedOrigins) {
        this.gameWebSocketHandler = gameWebSocketHandler;
        this.allowedOrigins = allowedOrigins.split("\\s*,\\s*");
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(gameWebSocketHandler, "/ws/games/*").setAllowedOriginPatterns(allowedOrigins);
    }
}
