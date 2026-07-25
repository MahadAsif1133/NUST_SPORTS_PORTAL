-- Migration 011: Create audit_logs table
-- IMMUTABLE — append-only by application convention

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id),
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  reason TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Prevent UPDATE and DELETE on audit_logs (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_audit_logs
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER no_delete_audit_logs
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();
