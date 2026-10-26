package com.chess960.backend.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class AuthServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final SessionRepository sessions = mock(SessionRepository.class);
    private final AuthService auth = new AuthService(users, sessions);

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
    void storesOnlyAHashOfThePasswordAndOfTheSessionToken() {
        when(users.findByEmail("a@b.co")).thenReturn(Optional.empty());
        when(users.save(any())).thenAnswer(i -> i.getArgument(0));

        AuthService.NewSession session = auth.register("  A@B.co ", "correct horse", "Ann");

        assertEquals("a@b.co", session.user().email());
        assertNotEquals("correct horse", session.user().passwordHash());
        assertTrue(new BCryptPasswordEncoder().matches("correct horse", session.user().passwordHash()));

        ArgumentCaptor<SessionEntity> saved = ArgumentCaptor.forClass(SessionEntity.class);
        verify(sessions).save(saved.capture());
        assertEquals(43, session.token().length(), "32 random bytes, base64url");
        when(sessions.findById(AuthService.hash(session.token()))).thenReturn(Optional.of(saved.getValue()));
        when(users.findById(any())).thenReturn(Optional.of(session.user()));
        assertTrue(auth.userForToken(session.token()).isPresent());
        assertTrue(auth.userForToken("some other token").isEmpty());
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSameAnswer() {
        UserEntity user = new UserEntity("a@b.co", "Ann", new BCryptPasswordEncoder().encode("correct horse"));
        when(users.findByEmail("a@b.co")).thenReturn(Optional.of(user));
        when(users.findByEmail("nobody@b.co")).thenReturn(Optional.empty());

        AccountException wrongPassword = assertThrows(AccountException.class, () -> auth.login("a@b.co", "nope"));
        AccountException unknown = assertThrows(AccountException.class, () -> auth.login("nobody@b.co", "nope"));
        assertEquals(wrongPassword.getMessage(), unknown.getMessage());
        assertEquals(HttpStatus.UNAUTHORIZED, unknown.status());
    }
}
