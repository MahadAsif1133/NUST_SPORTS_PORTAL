-- Migration 006: Create family_members table
-- Dependents on Family Master Card memberships

CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  relation VARCHAR(50) NOT NULL,
  age INTEGER,
  photo_url VARCHAR(500),
  medical_clearance_path VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_family_members_membership ON family_members(membership_id);
