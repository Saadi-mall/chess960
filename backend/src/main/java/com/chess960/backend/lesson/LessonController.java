package com.chess960.backend.lesson;

import com.chess960.backend.engine.EngineException;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LessonController {

    private final LessonService lessonService;

    public LessonController(LessonService lessonService) {
        this.lessonService = lessonService;
    }

    @GetMapping("/api/lessons/today")
    public Lesson today() {
        return lessonService.forDate(LocalDate.now());
    }

    @ExceptionHandler(EngineException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ErrorBody handleEngine(EngineException e) {
        return new ErrorBody("Stockfish is unavailable, so today's lesson couldn't be prepared");
    }

    public record ErrorBody(String message) {}
}
