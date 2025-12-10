-- Eachie Database Schema
-- Created: December 2024
--
-- Run this in the Neon SQL Editor to set up your database.
-- Dashboard: https://console.neon.tech
--
-- Tables:
--   anonymous_usage  - Free tier tracking by device
--   users            - Authenticated users (synced from Clerk)
--   sessions         - Research sessions (conversations)
--   conversation_rounds - Individual research queries within sessions
--   invite_codes     - Friend credit codes

-- ============================================================
-- ANONYMOUS USAGE (Pre-auth free tier)
-- ============================================================
-- Tracks usage by device fingerprint for $12 free tier.
-- device_id is a FingerprintJS visitorId (stable across sessions).

CREATE TABLE IF NOT EXISTS anonymous_usage (
  device_id VARCHAR(64) PRIMARY KEY,
  total_cost_cents INTEGER DEFAULT 0,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Rate limiting columns
  requests_today INTEGER DEFAULT 0,
  requests_this_hour INTEGER DEFAULT 0,
  last_request_at TIMESTAMP WITH TIME ZONE,
  hour_window_start TIMESTAMP WITH TIME ZONE,
  day_window_start DATE
);

-- Migration: Add rate limiting columns if table exists without them
-- Run these if upgrading an existing database:
-- ALTER TABLE anonymous_usage ADD COLUMN IF NOT EXISTS requests_today INTEGER DEFAULT 0;
-- ALTER TABLE anonymous_usage ADD COLUMN IF NOT EXISTS requests_this_hour INTEGER DEFAULT 0;
-- ALTER TABLE anonymous_usage ADD COLUMN IF NOT EXISTS last_request_at TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE anonymous_usage ADD COLUMN IF NOT EXISTS hour_window_start TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE anonymous_usage ADD COLUMN IF NOT EXISTS day_window_start DATE;

-- ============================================================
-- USERS (Synced from Clerk via webhook)
-- ============================================================
-- Created when user signs up. Clerk webhook populates this.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,              -- Clerk user ID (user_xxx)
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  credits_cents INTEGER DEFAULT 0,          -- Purchased credits balance
  total_spent_cents INTEGER DEFAULT 0,      -- Lifetime spend
  stripe_customer_id VARCHAR(64),
  redeemed_code VARCHAR(32),                -- One invite code per account
  device_id VARCHAR(64),                    -- Link to anonymous usage for migration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- RESEARCH SESSIONS (Conversations)
-- ============================================================
-- A session is a research conversation (initial query + follow-ups).
-- Can be owned by a user OR tracked by device_id for anonymous users.

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(64),                    -- For anonymous users
  title VARCHAR(255),                       -- Auto-generated from first query
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions(device_id);

-- ============================================================
-- CONVERSATION ROUNDS (Individual queries)
-- ============================================================
-- Each research query within a session.

CREATE TABLE IF NOT EXISTS conversation_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  query TEXT NOT NULL,
  synthesis TEXT,
  model_responses JSONB,                    -- Full responses for history
  cost_cents INTEGER DEFAULT 0,
  orchestrator VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rounds_session ON conversation_rounds(session_id);

-- ============================================================
-- INVITE CODES (Friend credits)
-- ============================================================
-- $12, $24, or $36 tiers. One code per account, max $72 total discount.

CREATE TABLE IF NOT EXISTS invite_codes (
  code VARCHAR(32) PRIMARY KEY,
  created_by VARCHAR(64) REFERENCES users(id),
  credits_cents INTEGER NOT NULL,
  redeemed_by VARCHAR(64) REFERENCES users(id),
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_credit_amount CHECK (credits_cents IN (1200, 2400, 3600))
);

-- ============================================================
-- ABUSE FLAGS (System alerts and device blocks)
-- ============================================================
-- Tracks abuse events and system-wide alerts.
-- flag_type: 'rate_limit', 'cost_spike', 'low_confidence', 'system_alert'

CREATE TABLE IF NOT EXISTS abuse_flags (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64),                      -- NULL for system-wide alerts
  flag_type VARCHAR(32) NOT NULL,
  details JSONB,                              -- Context about the flag
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abuse_flags_device ON abuse_flags(device_id);
CREATE INDEX IF NOT EXISTS idx_abuse_flags_type ON abuse_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_abuse_flags_unresolved ON abuse_flags(resolved) WHERE resolved = FALSE;

-- ============================================================
-- SYSTEM STATE (Global settings and circuit breakers)
-- ============================================================
-- Key-value store for system state like "free_tier_paused".

CREATE TABLE IF NOT EXISTS system_state (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
