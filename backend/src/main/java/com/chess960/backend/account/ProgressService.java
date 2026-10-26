package com.chess960.backend.account;

import com.chess960.backend.lesson.Lesson;
import com.chess960.backend.lesson.LessonGrader;
import com.chess960.backend.lesson.LessonService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/** A signed-in user's daily-lesson results and the streaks worked out from them. */
@Service
public class ProgressService {

    private static final int RECENT = 30;

    private final LessonResultRepository results;
    private final LessonService lessons;

    public ProgressService(LessonResultRepository results, LessonService lessons) {
        this.results = results;
        this.lessons = lessons;
    }

    public record ResultDto(String date, int number, boolean weakestPawnCorrect, int whiteFound, int blackFound) {
        static ResultDto of(LessonResultEntity e) {
            return new ResultDto(e.lessonDate().toString(), e.positionNumber(), e.weakestPawnCorrect(), e.whiteFound(), e.blackFound());
        }
    }

    public record Progress(
            int currentStreak,
            int longestStreak,
            int lessonsCompleted,
            int weakestPawnsFound,
            int bestMovesFound,
            ResultDto today,
            List<ResultDto> recent) {}

    /**
     * Grades today's answers against the server's copy of today's lesson and stores the
     * result. Only today's lesson counts (no backfilling a streak), and only the first
     * finished attempt each day is kept.
     */
    public Progress recordToday(UserEntity user, LessonGrader.Answers answers) {
        LocalDate today = LocalDate.now();
        if (results.findByUserIdAndLessonDate(user.id(), today).isEmpty()) {
            Lesson lesson = lessons.forDate(today);
            LessonGrader.Grade grade = LessonGrader.grade(lesson, answers);
            try {
                results.save(new LessonResultEntity(
                        user.id(), today, lesson.number(), grade.weakestPawnCorrect(), grade.whiteFound(), grade.blackFound()));
            } catch (DataIntegrityViolationException e) {
                // A second tab finished at the same moment - the first result stands.
            }
        }
        return progress(user);
    }

    public Progress progress(UserEntity user) {
        List<LessonResultEntity> all = results.findByUserIdOrderByLessonDateDesc(user.id());
        List<LocalDate> dates = all.stream().map(LessonResultEntity::lessonDate).toList();
        LocalDate today = LocalDate.now();
        return new Progress(
                Streaks.current(dates, today),
                Streaks.longest(dates),
                all.size(),
                (int) all.stream().filter(LessonResultEntity::weakestPawnCorrect).count(),
                all.stream().mapToInt(r -> r.whiteFound() + r.blackFound()).sum(),
                all.stream().filter(r -> r.lessonDate().equals(today)).findFirst().map(ResultDto::of).orElse(null),
                all.stream().limit(RECENT).map(ResultDto::of).toList());
    }
}
