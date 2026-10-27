package com.chess960.backend.account;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Sends account emails through Brevo's HTTP API (an HTTP API rather than SMTP because free
 * hosts commonly block outgoing mail ports). With no API key configured it either logs
 * the message - for local development, so the confirmation flow can be tried without an
 * email account - or, where that's switched off (production), reports itself unavailable,
 * so sign-up skips confirmation rather than ever writing a working link into a log.
 */
@Service
public class EmailService implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final String apiKey;
    private final String fromAddress;
    private final String fromName;
    private final boolean logWhenUnconfigured;
    private final RestClient http;

    public EmailService(
            @Value("${chess960.mail.brevo-api-key:}") String apiKey,
            @Value("${chess960.mail.from-address:}") String fromAddress,
            @Value("${chess960.mail.from-name:Chess960}") String fromName,
            @Value("${chess960.mail.log-when-unconfigured:true}") boolean logWhenUnconfigured,
            RestClient.Builder http) {
        this.apiKey = apiKey;
        this.fromAddress = fromAddress;
        this.fromName = fromName;
        this.logWhenUnconfigured = logWhenUnconfigured;
        this.http = http.baseUrl("https://api.brevo.com/v3").build();
    }

    @Override
    public boolean available() {
        return configured() || logWhenUnconfigured;
    }

    @Override
    public void send(String to, String subject, String text) {
        if (!configured()) {
            if (!logWhenUnconfigured) {
                throw new AccountException(HttpStatus.SERVICE_UNAVAILABLE, "Sign-up is unavailable right now");
            }
            log.info("Email not configured - would have sent to {}: {}\n{}", to, subject, text);
            return;
        }
        try {
            http.post()
                    .uri("/smtp/email")
                    .header("api-key", apiKey)
                    .body(Map.of(
                            "sender", Map.of("name", fromName, "email", fromAddress),
                            "to", List.of(Map.of("email", to)),
                            "subject", subject,
                            "textContent", text))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("Brevo rejected an email to {}: {}", to, e.getMessage());
            throw new AccountException(HttpStatus.BAD_GATEWAY, "Couldn't send the verification email - try again");
        }
    }

    private boolean configured() {
        return !apiKey.isBlank() && !fromAddress.isBlank();
    }
}
