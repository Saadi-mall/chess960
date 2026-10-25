-- One row per Chess960 starting position number (0-959): the Stockfish evaluation of
-- that position at move 1, computed once and reused on every later request instead of
-- re-running the engine.
CREATE TABLE starting_position_evaluations (
    position_number INTEGER PRIMARY KEY CHECK (position_number BETWEEN 0 AND 959),
    best_move_uci VARCHAR(8) NOT NULL,
    score_centipawns INTEGER,
    mate_in_moves INTEGER,
    depth INTEGER NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
