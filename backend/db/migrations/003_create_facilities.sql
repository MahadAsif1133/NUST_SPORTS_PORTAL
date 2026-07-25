-- Migration 003: Create facilities table

CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  cumulative_missed_months_limit INTEGER NOT NULL DEFAULT 2,
  closed_day VARCHAR(10),
  is_active BOOLEAN NOT NULL DEFAULT true
);
