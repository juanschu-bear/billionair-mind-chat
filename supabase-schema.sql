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

-- Migration for existing databases:
-- ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_summary TEXT;
-- ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summary_count INT DEFAULT 0;
