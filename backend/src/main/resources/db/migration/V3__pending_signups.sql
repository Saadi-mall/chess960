-- A sign-up waiting for its email to be confirmed. The account (users row) is only
-- created when the emailed link is opened; until then nothing here can sign in. As with
-- sessions, only the SHA-256 of the link's token is stored.
CREATE TABLE pending_signups (
    token_hash VARCHAR(64) PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    display_name VARCHAR(40) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX pending_signups_email_idx ON pending_signups (email);
