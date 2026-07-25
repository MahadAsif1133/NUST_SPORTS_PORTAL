-- Migration 015: Create idempotency_keys table

CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_key ON idempotency_keys(key);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
