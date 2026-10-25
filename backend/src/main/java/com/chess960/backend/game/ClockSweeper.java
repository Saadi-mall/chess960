package com.chess960.backend.game;

import com.chess960.backend.game.dto.GameMessages;
import com.chess960.backend.game.ws.GameBroadcaster;
import java.util.Optional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Flags a game as timed out once the side to move has run out of time, even if neither
 * player does anything else to trigger a check (a move, a resignation, ...). Runs often
 * enough that a flag fall shows up within about a second, which is good enough outside of
 * bullet time controls.
 */
@Component
public class ClockSweeper {

    private final GameService gameService;
    private final GameBroadcaster broadcaster;

    public ClockSweeper(GameService gameService, GameBroadcaster broadcaster) {
        this.gameService = gameService;
        this.broadcaster = broadcaster;
    }

    @Scheduled(fixedRate = 1000)
    public void sweep() {
        for (Game game : gameService.allGames()) {
            Optional<GameStatus> timedOut = game.checkTimeout();
            if (timedOut.isPresent()) {
                broadcaster.broadcastState(game.id());
            }
        }
    }
}
