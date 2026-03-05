-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE conversations (
  id BIGSERIAL PRIMARY KEY,
  user_hash VARCHAR(12) NOT NULL,
  ceo_id VARCHAR(50) NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  conversation_summary TEXT,
  summary_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_hash, ceo_id)
);

-- Index for fast lookups
CREATE INDEX idx_conversations_lookup ON conversations (user_hash, ceo_id);

-- User profiles for longitudinal context
CREATE TABLE user_profiles (
  user_hash VARCHAR(12) PRIMARY KEY,
  profile JSONB DEFAULT '{}'::jsonb,
  summary_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_hash VARCHAR(12) NOT NULL,
  subscription JSONB NOT NULL,          -- Web Push subscription object (endpoint, keys)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_hash)
);

-- Track sent nudges to avoid spamming
CREATE TABLE nudge_log (
  id BIGSERIAL PRIMARY KEY,
  user_hash VARCHAR(12) NOT NULL,
  ceo_id VARCHAR(50) NOT NULL,
  nudge_text TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_nudge_log_lookup ON nudge_log (user_hash, ceo_id, sent_at);

-- Migration for existing databases:
-- ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_summary TEXT;
-- ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summary_count INT DEFAULT 0;
--
-- Push notifications migration:
-- CREATE TABLE IF NOT EXISTS push_subscriptions (id BIGSERIAL PRIMARY KEY, user_hash VARCHAR(12) NOT NULL UNIQUE, subscription JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
-- CREATE TABLE IF NOT EXISTS nudge_log (id BIGSERIAL PRIMARY KEY, user_hash VARCHAR(12) NOT NULL, ceo_id VARCHAR(50) NOT NULL, nudge_text TEXT, sent_at TIMESTAMPTZ DEFAULT NOW());
-- CREATE INDEX IF NOT EXISTS idx_nudge_log_lookup ON nudge_log (user_hash, ceo_id, sent_at);
