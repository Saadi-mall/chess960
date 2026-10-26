package com.chess960.backend.account;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface LessonResultRepository extends JpaRepository<LessonResultEntity, Long> {
    List<LessonResultEntity> findByUserIdOrderByLessonDateDesc(Long userId);

    Optional<LessonResultEntity> findByUserIdAndLessonDate(Long userId, LocalDate lessonDate);
}
