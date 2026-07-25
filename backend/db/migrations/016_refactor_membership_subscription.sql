-- Migration 016: Refactor membership to support subscriptions
CREATE TYPE subscription_facility AS ENUM ('GYM', 'SWIMMING', 'SADDLE');

-- Create facility_subscriptions table
CREATE TABLE facility_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  facility subscription_facility NOT NULL,
  monthly_fee INTEGER NOT NULL,
  status membership_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  next_due_date DATE,
  is_part_of_combo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_membership_facility UNIQUE (membership_id, facility)
);

-- Modify memberships table
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS card_id UUID;

-- We will link memberships.card_id to cards(id) once cards are created
-- To avoid circular constraints, we do NOT enforce hard foreign key constraints immediately on card_id, or we make it nullable.
-- Indexing for performance
CREATE INDEX idx_facility_subscriptions_membership ON facility_subscriptions(membership_id);
CREATE INDEX idx_facility_subscriptions_status ON facility_subscriptions(status);
