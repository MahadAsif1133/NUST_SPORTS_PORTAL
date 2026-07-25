-- Migration 004: Create rate_tables
-- Configurable fee structure — NOT hardcoded

CREATE TABLE rate_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id),
  category_code VARCHAR(50) NOT NULL,
  category_label VARCHAR(255) NOT NULL,
  registration_fee INTEGER NOT NULL,
  monthly_fee INTEGER NOT NULL,
  applies_to_roles TEXT[] NOT NULL,
  covers_facilities UUID[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL,
  effective_until DATE
);

CREATE INDEX idx_rate_tables_facility ON rate_tables(facility_id);
CREATE INDEX idx_rate_tables_category ON rate_tables(category_code);
CREATE INDEX idx_rate_tables_active ON rate_tables(is_active);
