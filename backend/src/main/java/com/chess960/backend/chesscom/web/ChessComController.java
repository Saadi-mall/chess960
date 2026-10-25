package com.chess960.backend.chesscom.web;

import com.chess960.backend.chesscom.ChessComException;
import com.chess960.backend.chesscom.ChessComImportService;
import com.chess960.backend.chesscom.ChessComStats;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChessComController {

    private final ChessComImportService importService;

    public ChessComController(ChessComImportService importService) {
        this.importService = importService;
    }

    @GetMapping("/api/chesscom/{username}/import")
    public ChessComStats importStats(@PathVariable String username) {
        return importService.importStats(username);
    }

    @ExceptionHandler(ChessComException.class)
    public ResponseEntity<ErrorBody> handleChessComException(ChessComException e) {
        HttpStatus status = HttpStatus.resolve(e.statusCode());
        return ResponseEntity.status(status != null ? status : HttpStatus.BAD_GATEWAY)
                .body(new ErrorBody(e.getMessage()));
    }

    public record ErrorBody(String message) {}
}
