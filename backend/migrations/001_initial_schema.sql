CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  avatar VARCHAR(20) NOT NULL DEFAULT 'neon',
  play_time_seconds BIGINT NOT NULL DEFAULT 0 CHECK (play_time_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_username_length CHECK (char_length(username) BETWEEN 3 AND 20),
  CONSTRAINT users_role_allowed CHECK (role IN ('user', 'admin')),
  CONSTRAINT users_avatar_allowed CHECK (avatar IN ('neon', 'cyber', 'astro', 'ghost', 'robot'))
);

CREATE UNIQUE INDEX users_username_lower_unique ON users (LOWER(username));

CREATE TABLE scores (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game VARCHAR(16) NOT NULL,
  score INTEGER NOT NULL,
  winner CHAR(1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scores_game_allowed CHECK (game IN ('CARO', 'SNAKE', 'BLOCK')),
  CONSTRAINT scores_score_nonnegative CHECK (score >= 0),
  CONSTRAINT scores_winner_allowed CHECK (winner IS NULL OR winner IN ('X', 'O')),
  CONSTRAINT scores_caro_shape CHECK (
    (game = 'CARO' AND score IN (0, 1)) OR
    (game IN ('SNAKE', 'BLOCK') AND winner IS NULL)
  )
);

CREATE INDEX scores_user_created_idx ON scores (user_id, created_at DESC);
CREATE INDEX scores_game_score_idx ON scores (game, score DESC);
