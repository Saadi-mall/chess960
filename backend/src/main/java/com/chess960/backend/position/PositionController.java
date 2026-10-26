package com.chess960.backend.position;

import com.chess960.backend.game.DailyPosition;
import com.chess960.backend.rules.Chess960StartingPosition;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Stateless rules endpoints behind the Analyze tab's sandbox - see {@link PositionService}. */
@RestController
public class PositionController {

    private final PositionService positionService;

    public PositionController(PositionService positionService) {
        this.positionService = positionService;
    }

    @PostMapping("/api/positions/legal-moves")
    public PositionStateResponse legalMoves(@RequestBody FenRequest request) {
        return positionService.legalMovesFor(request.fen());
    }

    public record ReplayRequest(String fen, List<MoveDto> moves) {}

    @PostMapping("/api/positions/replay")
    public List<PositionStateResponse> replay(@RequestBody ReplayRequest request) {
        return positionService.replay(request.fen(), request.moves() == null ? List.of() : request.moves());
    }

    @PostMapping("/api/positions/move")
    public PositionStateResponse move(@RequestBody MoveRequest request) {
        return positionService.applyMove(request);
    }

    /** Just the FEN for a starting position, so a live preview board can update as the
     * user changes position mode/number without running the full analyzer+Stockfish
     * pipeline. "NUMBER" always echoes back the requested number; "RANDOM" rolls a fresh
     * one each call (the preview is meant to shuffle); "DAILY" resolves today's lesson
     * number. */
    @GetMapping("/api/positions/starting")
    public StartingPositionResponse starting(
            @RequestParam String mode, @RequestParam(required = false) Integer number) {
        int resolved =
                switch (mode) {
                    case "RANDOM" -> Chess960StartingPosition.randomNumber();
                    case "DAILY" -> DailyPosition.numberFor(LocalDate.now());
                    case "NUMBER" -> {
                        if (number == null) {
                            throw new IllegalArgumentException("number is required for mode NUMBER");
                        }
                        yield number;
                    }
                    default -> throw new IllegalArgumentException("Unknown position mode: " + mode);
                };
        return new StartingPositionResponse(resolved, Chess960StartingPosition.startingFen(resolved));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorBody handleIllegalArgument(IllegalArgumentException e) {
        return new ErrorBody(e.getMessage());
    }

    public record ErrorBody(String message) {}
}
