package com.chess960.backend.account;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class StreaksTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);

    private static LocalDate daysAgo(int n) {
        return TODAY.minusDays(n);
    }

    @Test
    void countsConsecutiveDaysEndingToday() {
        assertEquals(3, Streaks.current(List.of(daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(4)), TODAY));
    }

    @Test
    void aStreakEndingYesterdayIsStillAlive() {
        assertEquals(2, Streaks.current(List.of(daysAgo(1), daysAgo(2)), TODAY));
    }

    @Test
    void aMissedDayBreaksIt() {
        assertEquals(0, Streaks.current(List.of(daysAgo(2), daysAgo(3)), TODAY));
        assertEquals(0, Streaks.current(List.of(), TODAY));
    }

    @Test
    void longestFindsTheBestRunAnywhere() {
        assertEquals(3, Streaks.longest(List.of(daysAgo(10), daysAgo(9), daysAgo(8), daysAgo(1), daysAgo(0))));
        assertEquals(0, Streaks.longest(List.of()));
    }
}
