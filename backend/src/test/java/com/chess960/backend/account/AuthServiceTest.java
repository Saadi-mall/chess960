package com.chess960.backend.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class AuthServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final SessionRepository sessions = mock(SessionRepository.class);
    private final PendingSignupRepository pending = mock(PendingSignupRepository.class);
    private final EmailSender email = mock(EmailSender.class);
    private final AuthService auth = new AuthService(users, sessions, pending, email, "https://chess960.example/");

    AuthServiceTest() {
        when(email.available()).thenReturn(true);
        when(users.findByEmail(anyString())).thenReturn(Optional.empty());
        when(pending.findByEmail(anyString())).thenReturn(List.of());
        when(users.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    /** Signs up and returns the token from the emailed link. */
    private String signUpAndReadLink(String address) {
        auth.register(address, "correct horse", "Ann");
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(email).send(eq("a@b.co"), anyString(), body.capture());
        Matcher link = Pattern.compile("https://chess960\\.example/verify-email\\?token=([A-Za-z0-9_-]+)").matcher(body.getValue());
        assertTrue(link.find(), "the email should contain the verification link");
        return link.group(1);
    }

    @Test
    void rejectsBadSignUpsWithAReason() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AccountException.class,
                () -> auth.register("not-an-email", "long enough", "A")).status());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AccountException.class,
                () -> auth.register("a@b.co", "short", "A")).status());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AccountException.class,
                () -> auth.register("a@b.co", "x".repeat(73), "A")).status());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(AccountException.class,
                () -> auth.register("a@b.co", "long enough", "  ")).status());
    }

    @Test
    void signingUpCreatesNoAccountUntilTheEmailedLinkIsOpened() {
        String token = signUpAndReadLink("  A@B.co ");
        verify(users, never()).save(any());

        ArgumentCaptor<PendingSignupEntity> saved = ArgumentCaptor.forClass(PendingSignupEntity.class);
        verify(pending).save(saved.capture());
        assertEquals("a@b.co", saved.getValue().email());
        assertNotEquals("correct horse", saved.getValue().passwordHash());
        when(pending.findById(AuthService.hash(token))).thenReturn(Optional.of(saved.getValue()));

        AuthService.NewSession session = auth.verifyEmail(token);
        assertEquals("a@b.co", session.user().email());
        assertTrue(new BCryptPasswordEncoder().matches("correct horse", session.user().passwordHash()));
        assertEquals(43, session.token().length());
        // Cleared once when the sign-up replaced any earlier one, once more when the link was used.
        verify(pending, org.mockito.Mockito.times(2)).deleteByEmail("a@b.co");
    }

    @Test
    void anUnknownOrExpiredLinkCreatesNothing() {
        when(pending.findById(anyString())).thenReturn(Optional.empty());
        AccountException e = assertThrows(AccountException.class, () -> auth.verifyEmail("made-up-token"));
        assertEquals(HttpStatus.BAD_REQUEST, e.status());

        PendingSignupEntity expired = new PendingSignupEntity(
                "h", "a@b.co", "Ann", "hash", java.time.Instant.now().minusSeconds(1));
        when(pending.findById(AuthService.hash("old"))).thenReturn(Optional.of(expired));
        assertThrows(AccountException.class, () -> auth.verifyEmail("old"));
        verify(users, never()).save(any());
    }

    @Test
    void doesNotEmailAgainWithinAMinute() {
        PendingSignupEntity recent = new PendingSignupEntity(
                "h", "a@b.co", "Ann", "hash", java.time.Instant.now().plusSeconds(3600));
        when(pending.findByEmail("a@b.co")).thenReturn(List.of(recent));
        auth.register("a@b.co", "correct horse", "Ann");
        verify(email, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void refusesSignUpWhenEmailCantBeSent() {
        when(email.available()).thenReturn(false);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, assertThrows(AccountException.class,
                () -> auth.register("a@b.co", "correct horse", "Ann")).status());
    }

    @Test
    void sessionTokensAreStoredOnlyAsHashes() {
        UserEntity user = new UserEntity("a@b.co", "Ann", new BCryptPasswordEncoder().encode("correct horse"));
        when(users.findByEmail("a@b.co")).thenReturn(Optional.of(user));
        AuthService.NewSession session = auth.login("a@b.co", "correct horse");

        ArgumentCaptor<SessionEntity> saved = ArgumentCaptor.forClass(SessionEntity.class);
        verify(sessions).save(saved.capture());
        when(sessions.findById(AuthService.hash(session.token()))).thenReturn(Optional.of(saved.getValue()));
        when(users.findById(any())).thenReturn(Optional.of(user));
        assertTrue(auth.userForToken(session.token()).isPresent());
        assertTrue(auth.userForToken("some other token").isEmpty());
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSameAnswer() {
        UserEntity user = new UserEntity("a@b.co", "Ann", new BCryptPasswordEncoder().encode("correct horse"));
        when(users.findByEmail("a@b.co")).thenReturn(Optional.of(user));

        AccountException wrongPassword = assertThrows(AccountException.class, () -> auth.login("a@b.co", "nope"));
        AccountException unknown = assertThrows(AccountException.class, () -> auth.login("nobody@b.co", "nope"));
        assertEquals(wrongPassword.getMessage(), unknown.getMessage());
        assertEquals(HttpStatus.UNAUTHORIZED, unknown.status());
    }
}
