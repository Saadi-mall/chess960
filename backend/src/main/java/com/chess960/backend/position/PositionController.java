package com.chess960.backend.position;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PostMapping("/api/positions/move")
    public PositionStateResponse move(@RequestBody MoveRequest request) {
        return positionService.applyMove(request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorBody handleIllegalArgument(IllegalArgumentException e) {
        return new ErrorBody(e.getMessage());
    }

    public record ErrorBody(String message) {}
}
