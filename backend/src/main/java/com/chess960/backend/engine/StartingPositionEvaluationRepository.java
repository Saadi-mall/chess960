package com.chess960.backend.engine;

import org.springframework.data.jpa.repository.JpaRepository;

interface StartingPositionEvaluationRepository
        extends JpaRepository<StartingPositionEvaluationEntity, Integer> {}
