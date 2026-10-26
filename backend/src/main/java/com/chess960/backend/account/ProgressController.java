package com.chess960.backend.account;

import com.chess960.backend.lesson.LessonGrader;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProgressController {

    private final AuthService auth;
    private final ProgressService progress;

    public ProgressController(AuthService auth, ProgressService progress) {
        this.auth = auth;
        this.progress = progress;
    }

    @PostMapping("/api/lessons/today/result")
    public ProgressService.Progress recordToday(HttpServletRequest request, @RequestBody LessonGrader.Answers answers) {
        return progress.recordToday(signedIn(request), answers);
    }

    @GetMapping("/api/me/progress")
    public ProgressService.Progress myProgress(HttpServletRequest request) {
        return progress.progress(signedIn(request));
    }

    private UserEntity signedIn(HttpServletRequest request) {
        return auth.userForToken(SessionCookies.read(request))
                .orElseThrow(() -> new AccountException(HttpStatus.UNAUTHORIZED, "Sign in to save your progress"));
    }

    @ExceptionHandler(AccountException.class)
    public ResponseEntity<AuthController.ErrorBody> handle(AccountException e) {
        return ResponseEntity.status(e.status()).body(new AuthController.ErrorBody(e.getMessage()));
    }
}
