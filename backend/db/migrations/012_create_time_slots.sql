-- Migration 012: Create time_slots table

CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  gender VARCHAR(10),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  category_restriction VARCHAR(100),
  label VARCHAR(100)
);

CREATE INDEX idx_time_slots_facility ON time_slots(facility_id);
CREATE INDEX idx_time_slots_day ON time_slots(day_of_week);

-- Holidays table
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holidays_date ON holidays(date);
