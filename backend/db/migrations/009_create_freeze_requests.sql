-- Migration 009: Create freeze_requests table

CREATE TYPE freeze_status AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'VIOLATED'
);

CREATE TABLE freeze_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id),
  user_id UUID NOT NULL REFERENCES users(id),
  freeze_start DATE NOT NULL,
  freeze_end DATE NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months BETWEEN 1 AND 3),
  reason TEXT,
  status freeze_status NOT NULL DEFAULT 'PENDING',
  admin_id UUID REFERENCES users(id),
  admin_reason TEXT,
  decided_at TIMESTAMPTZ,
  violation_details JSONB,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_freeze_membership ON freeze_requests(membership_id);
CREATE INDEX idx_freeze_user ON freeze_requests(user_id);
CREATE INDEX idx_freeze_status ON freeze_requests(status);
CREATE INDEX idx_freeze_year ON freeze_requests(year);
