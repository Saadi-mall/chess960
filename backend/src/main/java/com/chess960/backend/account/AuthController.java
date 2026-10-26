package com.chess960.backend.account;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final AuthService auth;
    private final SessionCookies cookies;

    public AuthController(AuthService auth, SessionCookies cookies) {
        this.auth = auth;
        this.cookies = cookies;
    }

    public record RegisterRequest(String email, String password, String displayName) {}

    public record LoginRequest(String email, String password) {}

    public record UserDto(String email, String displayName) {
        static UserDto of(UserEntity user) {
            return new UserDto(user.email(), user.displayName());
        }
    }

    /** {@code user} is null for a guest - answered with 200 rather than 401 so the page's
     * "who am I" check on every load doesn't log an error for every guest. */
    public record MeResponse(UserDto user) {}

    public record VerifyRequest(String token) {}

    /** A sign-up waiting for its email link - nothing to sign in with yet. */
    public record PendingResponse(String email) {}

    @PostMapping("/api/auth/register")
    public ResponseEntity<PendingResponse> register(@RequestBody RegisterRequest request) {
        auth.register(request.email(), request.password(), request.displayName());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new PendingResponse(request.email().trim().toLowerCase(java.util.Locale.ROOT)));
    }

    @PostMapping("/api/auth/verify-email")
    public ResponseEntity<MeResponse> verifyEmail(@RequestBody VerifyRequest request) {
        AuthService.NewSession session = auth.verifyEmail(request.token());
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookies.create(session.token()).toString())
                .body(new MeResponse(UserDto.of(session.user())));
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<MeResponse> login(@RequestBody LoginRequest request) {
        AuthService.NewSession session = auth.login(request.email(), request.password());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.create(session.token()).toString())
                .body(new MeResponse(UserDto.of(session.user())));
    }

    @PostMapping("/api/auth/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        auth.logout(SessionCookies.read(request));
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    @GetMapping("/api/auth/me")
    public MeResponse me(HttpServletRequest request) {
        return new MeResponse(auth.userForToken(SessionCookies.read(request)).map(UserDto::of).orElse(null));
    }

    @ExceptionHandler(AccountException.class)
    public ResponseEntity<ErrorBody> handle(AccountException e) {
        return ResponseEntity.status(e.status()).body(new ErrorBody(e.getMessage()));
    }

    public record ErrorBody(String message) {}
}
