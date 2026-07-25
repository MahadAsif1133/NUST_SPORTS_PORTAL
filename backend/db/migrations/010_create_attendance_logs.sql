-- Migration 010: Create attendance_logs table

CREATE TYPE scan_status AS ENUM ('SUCCESS', 'DENIED');

CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id),
  card_id UUID NOT NULL REFERENCES cards(id),
  user_id UUID NOT NULL REFERENCES users(id),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  scanned_by UUID NOT NULL REFERENCES users(id),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_slot_id UUID,
  status scan_status NOT NULL,
  denial_reason VARCHAR(255),
  is_freeze_violation BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_attendance_membership ON attendance_logs(membership_id);
CREATE INDEX idx_attendance_user ON attendance_logs(user_id);
CREATE INDEX idx_attendance_facility ON attendance_logs(facility_id);
CREATE INDEX idx_attendance_scanned_at ON attendance_logs(scanned_at);
CREATE INDEX idx_attendance_freeze_violation ON attendance_logs(is_freeze_violation) WHERE is_freeze_violation = true;
