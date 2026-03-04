-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE conversations (
  id BIGSERIAL PRIMARY KEY,
  user_hash VARCHAR(12) NOT NULL,
  ceo_id VARCHAR(50) NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_hash, ceo_id)
);

-- Index for fast lookups
CREATE INDEX idx_conversations_lookup ON conversations (user_hash, ceo_id);
