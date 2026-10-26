package com.chess960.backend.account;

import java.time.LocalDate;
import java.util.Collection;
import java.util.TreeSet;

/** Daily-lesson streaks, worked out from the dates a user finished a lesson. */
public final class Streaks {

    private Streaks() {}

    /**
     * Consecutive days ending today - or ending yesterday, so a streak isn't shown as broken
     * just because today's lesson hasn't been done yet.
     */
    public static int current(Collection<LocalDate> completedDates, LocalDate today) {
        TreeSet<LocalDate> dates = new TreeSet<>(completedDates);
        LocalDate day = dates.contains(today) ? today : today.minusDays(1);
        int streak = 0;
        while (dates.contains(day)) {
            streak++;
            day = day.minusDays(1);
        }
        return streak;
    }

    public static int longest(Collection<LocalDate> completedDates) {
        int longest = 0;
        int run = 0;
        LocalDate previous = null;
        for (LocalDate date : new TreeSet<>(completedDates)) {
            run = previous != null && previous.plusDays(1).equals(date) ? run + 1 : 1;
            longest = Math.max(longest, run);
            previous = date;
        }
        return longest;
    }
}
