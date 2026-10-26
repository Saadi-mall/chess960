package com.chess960.backend.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "pending_signups")
public class PendingSignupEntity {

    /** SHA-256 of the emailed link's token - the token itself is never stored. */
    @Id
    @Column(name = "token_hash")
    private String tokenHash;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    protected PendingSignupEntity() {} // JPA

    PendingSignupEntity(String tokenHash, String email, String displayName, String passwordHash, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.email = email;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.createdAt = Instant.now();
        this.expiresAt = expiresAt;
    }

    String email() {
        return email;
    }

    String displayName() {
        return displayName;
    }

    String passwordHash() {
        return passwordHash;
    }

    Instant createdAt() {
        return createdAt;
    }

    boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
