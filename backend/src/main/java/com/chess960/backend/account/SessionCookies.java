package com.chess960.backend.account;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * The session cookie: HttpOnly (page scripts can't read it), SameSite=Lax (other sites'
 * forms and fetches don't send it, which is what protects the POST endpoints from CSRF),
 * and Secure when the site is served over HTTPS.
 */
@Component
public class SessionCookies {

    static final String NAME = "chess960_session";

    private final boolean secure;

    public SessionCookies(@Value("${chess960.auth.secure-cookie:false}") boolean secure) {
        this.secure = secure;
    }

    ResponseCookie create(String token) {
        return base(token).maxAge(AuthService.SESSION_LENGTH).build();
    }

    ResponseCookie clear() {
        return base("").maxAge(0).build();
    }

    public static String read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        return Arrays.stream(cookies)
                .filter(c -> NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Lax").path("/");
    }
}
