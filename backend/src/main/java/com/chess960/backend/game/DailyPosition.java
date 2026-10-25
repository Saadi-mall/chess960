package com.chess960.backend.game;

import java.time.LocalDate;
import java.util.Random;

/**
 * Picks "today's lesson position": the same Chess960 number for everyone on a given date.
 * {@link Random} with a fixed seed is deterministic by spec, so seeding it from the date
 * itself gives a stable, reproducible number per day without storing anything.
 */
public final class DailyPosition {

    private DailyPosition() {}

    public static int numberFor(LocalDate date) {
        return new Random(date.toEpochDay()).nextInt(960);
    }
}
