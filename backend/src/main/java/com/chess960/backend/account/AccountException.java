package com.chess960.backend.account;

import org.springframework.http.HttpStatus;

/** A sign-up/sign-in/progress request that can't be done, with the status to answer with. */
public class AccountException extends RuntimeException {

    private final HttpStatus status;

    public AccountException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
