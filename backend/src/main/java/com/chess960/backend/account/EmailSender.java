package com.chess960.backend.account;

/** Sends account emails (verification links). See {@link EmailService}. */
public interface EmailSender {

    /** Whether an email can be sent right now (or, in development, logged). */
    boolean available();

    void send(String to, String subject, String text);
}
