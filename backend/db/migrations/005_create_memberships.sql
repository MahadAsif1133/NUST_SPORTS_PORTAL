-- Migration 005: Create memberships table

CREATE TYPE membership_status AS ENUM (
  'PENDING_PAYMENT', 'ACTIVE', 'OVERDUE', 'FROZEN', 'CANCELLED'
);

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  facility_id UUID REFERENCES facilities(id),
  rate_table_id UUID NOT NULL REFERENCES rate_tables(id),
  category_code VARCHAR(50) NOT NULL,
  status membership_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  is_master_card BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  current_period_start DATE,
  current_period_end DATE,
  next_payment_due DATE,
  missed_months_this_year INTEGER NOT NULL DEFAULT 0,
  medical_clearance_path VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_facility ON memberships(facility_id);
CREATE INDEX idx_memberships_user_facility ON memberships(user_id, facility_id, status);
