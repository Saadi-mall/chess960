package com.chess960.backend.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "lesson_results")
public class LessonResultEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "lesson_date", nullable = false)
    private LocalDate lessonDate;

    @Column(name = "position_number", nullable = false)
    private Integer positionNumber;

    @Column(name = "weakest_pawn_correct", nullable = false)
    private Boolean weakestPawnCorrect;

    @Column(name = "white_found", nullable = false)
    private Integer whiteFound;

    @Column(name = "black_found", nullable = false)
    private Integer blackFound;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt;

    protected LessonResultEntity() {} // JPA

    LessonResultEntity(Long userId, LocalDate lessonDate, int positionNumber, boolean weakestPawnCorrect, int whiteFound, int blackFound) {
        this.userId = userId;
        this.lessonDate = lessonDate;
        this.positionNumber = positionNumber;
        this.weakestPawnCorrect = weakestPawnCorrect;
        this.whiteFound = whiteFound;
        this.blackFound = blackFound;
        this.completedAt = Instant.now();
    }

    LocalDate lessonDate() {
        return lessonDate;
    }

    int positionNumber() {
        return positionNumber;
    }

    boolean weakestPawnCorrect() {
        return weakestPawnCorrect;
    }

    int whiteFound() {
        return whiteFound;
    }

    int blackFound() {
        return blackFound;
    }
}
