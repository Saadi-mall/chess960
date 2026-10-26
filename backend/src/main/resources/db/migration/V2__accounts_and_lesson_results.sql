-- Email/password accounts. Emails are stored lowercased; passwords only as BCrypt hashes.
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    display_name VARCHAR(40) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login sessions. The cookie holds a random token; only its SHA-256 hash is stored, so a
-- leaked copy of this table can't be used to sign in.
CREATE TABLE sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

-- One row per user per daily lesson they finished, graded on the server. Streaks are
-- worked out from the dates.
CREATE TABLE lesson_results (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,
    position_number INTEGER NOT NULL CHECK (position_number BETWEEN 0 AND 959),
    weakest_pawn_correct BOOLEAN NOT NULL,
    white_found INTEGER NOT NULL CHECK (white_found BETWEEN 0 AND 3),
    black_found INTEGER NOT NULL CHECK (black_found BETWEEN 0 AND 3),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, lesson_date)
);
