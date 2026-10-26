package com.chess960.backend.account;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Email/password accounts and login sessions. Passwords are stored only as BCrypt hashes;
 * a session is a random 256-bit token in an HttpOnly cookie, stored only as its SHA-256
 * hash, so neither a database leak nor reading the cookie jar of another site exposes it.
 */
@Service
public class AuthService {

    static final Duration SESSION_LENGTH = Duration.ofDays(30);
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int MIN_PASSWORD_LENGTH = 8;
    /** BCrypt only looks at the first 72 bytes; longer passwords would be silently truncated. */
    private static final int MAX_PASSWORD_BYTES = 72;

    private final UserRepository users;
    private final SessionRepository sessions;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();
    /** Checked against when an email isn't registered, so a login takes as long either way
     * and its timing doesn't reveal which emails have accounts. */
    private final String unknownUserHash = encoder.encode("no-such-user");

    public AuthService(UserRepository users, SessionRepository sessions) {
        this.users = users;
        this.sessions = sessions;
    }

    public record NewSession(UserEntity user, String token) {}

    public NewSession register(String email, String password, String displayName) {
        String normalizedEmail = normalize(email);
        if (!EMAIL.matcher(normalizedEmail).matches() || normalizedEmail.length() > 254) {
            throw new AccountException(HttpStatus.BAD_REQUEST, "Enter a valid email address");
        }
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new AccountException(HttpStatus.BAD_REQUEST, "Use a password of at least 8 characters");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new AccountException(HttpStatus.BAD_REQUEST, "Use a password of at most 72 bytes");
        }
        String name = displayName == null ? "" : displayName.trim();
        if (name.isEmpty() || name.length() > 40) {
            throw new AccountException(HttpStatus.BAD_REQUEST, "Choose a display name of 1-40 characters");
        }
        if (users.findByEmail(normalizedEmail).isPresent()) {
            throw new AccountException(HttpStatus.CONFLICT, "An account with that email already exists");
        }
        try {
            UserEntity user = users.save(new UserEntity(normalizedEmail, name, encoder.encode(password)));
            return new NewSession(user, startSession(user));
        } catch (DataIntegrityViolationException e) {
            // Two sign-ups with the same email at once - the unique constraint catches the second.
            throw new AccountException(HttpStatus.CONFLICT, "An account with that email already exists");
        }
    }

    public NewSession login(String email, String password) {
        Optional<UserEntity> user = users.findByEmail(normalize(email));
        String hash = user.map(UserEntity::passwordHash).orElse(unknownUserHash);
        boolean matches = password != null && encoder.matches(password, hash);
        if (user.isEmpty() || !matches) {
            throw new AccountException(HttpStatus.UNAUTHORIZED, "Wrong email or password");
        }
        return new NewSession(user.get(), startSession(user.get()));
    }

    public void logout(String token) {
        if (token != null) sessions.deleteById(hash(token));
    }

    public Optional<UserEntity> userForToken(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        return sessions.findById(hash(token))
                .filter(s -> !s.isExpired())
                .flatMap(s -> users.findById(s.userId()));
    }

    @Scheduled(fixedRate = 60 * 60 * 1000)
    void deleteExpiredSessions() {
        sessions.deleteExpired(Instant.now());
    }

    private String startSession(UserEntity user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        sessions.save(new SessionEntity(hash(token), user.id(), Instant.now().plus(SESSION_LENGTH)));
        return token;
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is always available", e);
        }
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
