-- Migration 007: Create payments table

CREATE TYPE payment_status AS ENUM (
  'PENDING', 'PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'REFUNDED'
);

CREATE TYPE payment_type AS ENUM (
  'REGISTRATION', 'MONTHLY', 'DUPLICATE_CARD_FEE', 'LATE_FEE'
);

CREATE TYPE payment_method AS ENUM (
  'GATEWAY', 'BANK_SLIP'
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id),
  user_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  payment_type payment_type NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'PENDING',
  gateway_transaction_id VARCHAR(255) UNIQUE,
  gateway_response JSONB,
  bank_slip_path VARCHAR(500),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_membership ON payments(membership_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX idx_payments_gateway_txn ON payments(gateway_transaction_id);
