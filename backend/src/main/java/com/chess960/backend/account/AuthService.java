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
import org.springframework.beans.factory.annotation.Value;
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
    static final Duration VERIFICATION_LENGTH = Duration.ofHours(24);
    /** A repeat sign-up for the same email within this window doesn't send another email. */
    static final Duration RESEND_COOLDOWN = Duration.ofMinutes(1);
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int MIN_PASSWORD_LENGTH = 8;
    /** BCrypt only looks at the first 72 bytes; longer passwords would be silently truncated. */
    private static final int MAX_PASSWORD_BYTES = 72;

    private final UserRepository users;
    private final SessionRepository sessions;
    private final PendingSignupRepository pending;
    private final EmailSender email;
    private final String appBaseUrl;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();
    /** Checked against when an email isn't registered, so a login takes as long either way
     * and its timing doesn't reveal which emails have accounts. */
    private final String unknownUserHash = encoder.encode("no-such-user");

    public AuthService(
            UserRepository users,
            SessionRepository sessions,
            PendingSignupRepository pending,
            EmailSender email,
            @Value("${chess960.app-base-url:http://localhost:5173}") String appBaseUrl) {
        this.users = users;
        this.sessions = sessions;
        this.pending = pending;
        this.email = email;
        this.appBaseUrl = appBaseUrl.replaceAll("/+$", "");
    }

    public record NewSession(UserEntity user, String token) {}

    /**
     * Signs someone up. Whether their email is confirmed first depends on whether email can
     * be sent ({@link EmailSender#available}):
     *
     * <ul>
     *   <li>Yes: nothing can sign in yet. The details (password already hashed) wait in
     *       pending_signups and a one-time link is emailed; the account is only created when
     *       that link is opened ({@link #verifyEmail}). Returns empty.
     *   <li>No (no email service configured on the live site): the account is created and
     *       signed in straight away, unconfirmed. Returns its session.
     * </ul>
     */
    public Optional<NewSession> register(String emailAddress, String password, String displayName) {
        String normalizedEmail = normalize(emailAddress);
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
        if (!email.available()) {
            return Optional.of(createAccount(normalizedEmail, name, encoder.encode(password)));
        }
        // Don't let repeated submissions turn this into a way to flood someone's inbox.
        boolean justSent = pending.findByEmail(normalizedEmail).stream()
                .anyMatch(p -> p.createdAt().isAfter(Instant.now().minus(RESEND_COOLDOWN)));
        if (justSent) return Optional.empty();

        pending.deleteByEmail(normalizedEmail);
        String token = randomToken();
        pending.save(new PendingSignupEntity(
                hash(token), normalizedEmail, name, encoder.encode(password), Instant.now().plus(VERIFICATION_LENGTH)));
        email.send(
                normalizedEmail,
                "Confirm your Chess960 account",
                "Hi " + name + ",\n\n"
                        + "Open this link to confirm your email and create your Chess960 account:\n\n"
                        + appBaseUrl + "/verify-email?token=" + token + "\n\n"
                        + "The link works once and expires in 24 hours. If you didn't sign up, ignore this email"
                        + " - no account is created without it.");
        return Optional.empty();
    }

    /** Opens an emailed sign-up link: creates the account and signs it in. */
    public NewSession verifyEmail(String token) {
        PendingSignupEntity signup = token == null
                ? null
                : pending.findById(hash(token)).filter(p -> !p.isExpired()).orElse(null);
        if (signup == null) {
            throw new AccountException(HttpStatus.BAD_REQUEST, "This link has expired or was already used - sign up again");
        }
        pending.deleteByEmail(signup.email());
        if (users.findByEmail(signup.email()).isPresent()) {
            throw new AccountException(HttpStatus.CONFLICT, "That email is already confirmed - log in instead");
        }
        return createAccount(signup.email(), signup.displayName(), signup.passwordHash());
    }

    private NewSession createAccount(String normalizedEmail, String displayName, String passwordHash) {
        try {
            UserEntity user = users.save(new UserEntity(normalizedEmail, displayName, passwordHash));
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
    void deleteExpired() {
        sessions.deleteExpired(Instant.now());
        pending.deleteExpired(Instant.now());
    }

    private String startSession(UserEntity user) {
        String token = randomToken();
        sessions.save(new SessionEntity(hash(token), user.id(), Instant.now().plus(SESSION_LENGTH)));
        return token;
    }

    /** 32 random bytes, base64url - used for both session tokens and email links. */
    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
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
