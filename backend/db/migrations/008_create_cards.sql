-- Migration 008: Create cards table

CREATE TYPE card_physical_status AS ENUM (
  'PENDING', 'READY_FOR_PICKUP', 'COLLECTED', 'LOST'
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id),
  user_id UUID NOT NULL REFERENCES users(id),
  card_number VARCHAR(20) UNIQUE NOT NULL,
  ecard_pdf_path VARCHAR(500),
  qr_signing_secret VARCHAR(255) NOT NULL,
  current_qr_token TEXT,
  physical_card_status card_physical_status NOT NULL DEFAULT 'PENDING',
  physical_card_ready_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_membership ON cards(membership_id);
CREATE INDEX idx_cards_user ON cards(user_id);
CREATE INDEX idx_cards_number ON cards(card_number);

-- Sequence for card numbers
CREATE SEQUENCE card_number_seq START 10001;
