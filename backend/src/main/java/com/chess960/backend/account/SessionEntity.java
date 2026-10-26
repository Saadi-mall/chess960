package com.chess960.backend.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "sessions")
public class SessionEntity {

    /** SHA-256 of the cookie's token - the token itself is never stored. */
    @Id
    @Column(name = "token_hash")
    private String tokenHash;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    protected SessionEntity() {} // JPA

    SessionEntity(String tokenHash, Long userId, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.userId = userId;
        this.createdAt = Instant.now();
        this.expiresAt = expiresAt;
    }

    Long userId() {
        return userId;
    }

    boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
