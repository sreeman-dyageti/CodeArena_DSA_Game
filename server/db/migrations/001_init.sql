-- Code Arena initial schema
-- Requires PostgreSQL 13+ (gen_random_uuid)

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  elo INTEGER NOT NULL DEFAULT 1000,
  streak INTEGER NOT NULL DEFAULT 0,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(255) NOT NULL,
  sub_topic VARCHAR(255) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  order_num INTEGER NOT NULL,
  problem_statement TEXT NOT NULL,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints TEXT NOT NULL DEFAULT '',
  starter_code TEXT NOT NULL DEFAULT ''
);

CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  player2_id UUID REFERENCES users (id) ON DELETE SET NULL,
  level_id UUID NOT NULL REFERENCES levels (id) ON DELETE RESTRICT,
  winner_id UUID REFERENCES users (id) ON DELETE SET NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('1v1', 'ghost')),
  player1_code TEXT,
  player2_code TEXT,
  player1_time_ms INTEGER,
  player2_time_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE ghost_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES levels (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  keystrokes JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_time_ms INTEGER NOT NULL,
  solution_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leaderboard_weekly (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  credits_weekly INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
