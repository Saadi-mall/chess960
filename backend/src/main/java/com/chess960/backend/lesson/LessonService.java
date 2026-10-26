package com.chess960.backend.lesson;

import com.chess960.backend.engine.EngineLine;
import com.chess960.backend.engine.StockfishEngine;
import com.chess960.backend.game.DailyPosition;
import com.chess960.backend.rules.Chess960StartingPosition;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

/**
 * Builds each day's lesson once and keeps it in memory: it takes two multi-line Stockfish
 * searches (~2s each), and every visitor that day gets the same lesson. Like live games,
 * this cache is per backend instance (see DECISIONS.md) - a restart just recomputes it.
 */
@Service
public class LessonService {

    private static final Logger log = LoggerFactory.getLogger(LessonService.class);
    private static final int MOVETIME_MILLIS = 2000;
    private static final int BEST_MOVES = 3;

    private final StockfishEngine engine;
    private final Map<LocalDate, Lesson> cache = new ConcurrentHashMap<>();

    public LessonService(StockfishEngine engine) {
        this.engine = engine;
    }

    public Lesson forDate(LocalDate date) {
        Lesson cached = cache.get(date);
        if (cached != null) return cached;
        // One build at a time, so a burst of first visitors doesn't start a burst of engines.
        synchronized (this) {
            return cache.computeIfAbsent(date, this::build);
        }
    }

    /** Builds today's lesson in the background at startup, so the first visitor doesn't wait. */
    @EventListener(ApplicationReadyEvent.class)
    public void warmUp() {
        Thread.ofVirtual().start(() -> {
            try {
                forDate(LocalDate.now());
            } catch (RuntimeException e) {
                log.warn("Could not prepare today's lesson at startup: {}", e.getMessage());
            }
        });
    }

    private Lesson build(LocalDate date) {
        cache.keySet().removeIf(d -> d.isBefore(date.minusDays(1)));
        int number = DailyPosition.numberFor(date);
        String startFen = Chess960StartingPosition.startingFen(number);
        List<EngineLine> whiteLines = engine.topLines(startFen, MOVETIME_MILLIS, BEST_MOVES);
        String afterBest = LessonBuilder.fenAfter(startFen, whiteLines.get(0).pv().get(0));
        List<EngineLine> blackLines = engine.topLines(afterBest, MOVETIME_MILLIS, BEST_MOVES);
        return LessonBuilder.build(date, number, whiteLines, blackLines);
    }
}
