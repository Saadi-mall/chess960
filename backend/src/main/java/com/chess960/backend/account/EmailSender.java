package com.chess960.backend.account;

/** Sends account emails (verification links). See {@link EmailService}. */
public interface EmailSender {

    /** Whether an email can be sent (or, in development, logged). When it can't, sign-up
     * skips email confirmation - see AuthService#register. */
    boolean available();

    void send(String to, String subject, String text);
}
