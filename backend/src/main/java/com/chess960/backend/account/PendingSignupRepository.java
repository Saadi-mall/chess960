package com.chess960.backend.account;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

interface PendingSignupRepository extends JpaRepository<PendingSignupEntity, String> {

    List<PendingSignupEntity> findByEmail(String email);

    @Modifying
    @Transactional
    @Query("delete from PendingSignupEntity p where p.email = :email")
    void deleteByEmail(String email);

    @Modifying
    @Transactional
    @Query("delete from PendingSignupEntity p where p.expiresAt < :now")
    int deleteExpired(Instant now);
}
