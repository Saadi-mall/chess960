package com.chess960.backend.game;

import com.chess960.backend.rules.Chess960StartingPosition;
import com.chess960.backend.rules.Color;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.Position;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Creates and looks up games. Games live in memory only - there's no need to survive a
 * server restart for a take-home, and keeping live game state out of Postgres keeps this
 * simple (see docs/DECISIONS.md for the trade-off).
 */
@Service
public class GameService {

    private static final String ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/1/l/o
    private static final int ID_LENGTH = 8;

    private final Map<String, Game> games = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public record Created(Game game, Color color, String token) {}

    public Created createGame(PositionMode mode, Integer number, TimeControl timeControl) {
        int startingNumber =
                switch (mode) {
                    case RANDOM -> Chess960StartingPosition.randomNumber();
                    case NUMBER -> {
                        if (number == null || number < 0 || number > 959) {
                            throw new GameException("number must be 0-959");
                        }
                        yield number;
                    }
                    case DAILY -> DailyPosition.numberFor(LocalDate.now());
                };

        Position position = Fen.parse(Chess960StartingPosition.startingFen(startingNumber));
        String id = newGameId();
        Game game = new Game(id, position, timeControl, startingNumber);
        games.put(id, game);

        String token = game.join(); // creator claims White
        return new Created(game, Color.WHITE, token);
    }

    public Game get(String gameId) {
        Game game = games.get(gameId);
        if (game == null) {
            throw new GameException("No such game: " + gameId);
        }
        return game;
    }

    public Optional<Game> find(String gameId) {
        return Optional.ofNullable(games.get(gameId));
    }

    public Created join(String gameId) {
        Game game = get(gameId);
        String token = game.join(); // throws if already full
        Color color = game.colorForToken(token).orElseThrow();
        return new Created(game, color, token);
    }

    public Iterable<Game> allGames() {
        return games.values();
    }

    public record Rematch(Game game, String whiteToken, String blackToken) {}

    /** A fresh game, same time control and starting position pool, colors swapped. */
    public Rematch createRematch(Game finished) {
        Position position = Fen.parse(Chess960StartingPosition.startingFen(finished.startingNumber()));
        String id = newGameId();
        Game game = new Game(id, position, finished.timeControl(), finished.startingNumber());
        games.put(id, game);
        String whiteToken = game.join();
        String blackToken = game.join();
        return new Rematch(game, whiteToken, blackToken);
    }

    private String newGameId() {
        StringBuilder sb = new StringBuilder(ID_LENGTH);
        for (int i = 0; i < ID_LENGTH; i++) {
            sb.append(ID_ALPHABET.charAt(random.nextInt(ID_ALPHABET.length())));
        }
        return sb.toString();
    }
}
