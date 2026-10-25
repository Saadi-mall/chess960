package com.chess960.backend.game.web;

import com.chess960.backend.game.Game;
import com.chess960.backend.game.GameException;
import com.chess960.backend.game.GameService;
import com.chess960.backend.game.PositionMode;
import com.chess960.backend.game.TimeControl;
import com.chess960.backend.game.dto.CreateGameRequest;
import com.chess960.backend.game.dto.CreateGameResponse;
import com.chess960.backend.game.dto.GameInfoResponse;
import com.chess960.backend.game.dto.GameMessages;
import com.chess960.backend.game.dto.JoinResponse;
import com.chess960.backend.rules.Color;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping("/api/games")
    public CreateGameResponse createGame(@RequestBody CreateGameRequest request) {
        PositionMode mode = PositionMode.valueOf(request.positionMode());
        TimeControl timeControl =
                new TimeControl(
                        request.initialSeconds() != null ? request.initialSeconds() : TimeControl.DEFAULT.initialSeconds(),
                        request.incrementSeconds() != null ? request.incrementSeconds() : TimeControl.DEFAULT.incrementSeconds());

        GameService.Created created = gameService.createGame(mode, request.number(), timeControl);
        return new CreateGameResponse(
                created.game().id(),
                GameMessages.colorName(created.color()),
                created.token(),
                created.game().startingNumber());
    }

    @PostMapping("/api/games/{gameId}/join")
    public JoinResponse join(@PathVariable String gameId) {
        GameService.Created joined = gameService.join(gameId);
        return new JoinResponse(GameMessages.colorName(joined.color()), joined.token());
    }

    @GetMapping("/api/games/{gameId}")
    public GameInfoResponse info(@PathVariable String gameId) {
        Game game = gameService.get(gameId);
        return new GameInfoResponse(
                game.id(),
                game.hasPlayer(Color.WHITE),
                game.hasPlayer(Color.BLACK),
                game.timeControl().initialSeconds(),
                game.timeControl().incrementSeconds(),
                game.status().name());
    }

    @ExceptionHandler(GameException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorBody handleGameException(GameException e) {
        return new ErrorBody(e.getMessage());
    }

    public record ErrorBody(String message) {}
}
