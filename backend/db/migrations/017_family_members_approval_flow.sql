-- Migration 017: Enhance family_members for approval workflow and individual cards/memberships

-- Make membership_id nullable on family_members since pending children don't have a membership yet
ALTER TABLE family_members ALTER COLUMN membership_id DROP NOT NULL;

-- Add user_id (parent faculty user) to family_members
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add status (PENDING_APPROVAL, ACTIVE, REJECTED)
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL';

-- Add rejection_reason
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add updated_at
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add family_member_id to memberships table
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE;

-- Add family_member_id to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_status ON family_members(status);
CREATE INDEX IF NOT EXISTS idx_memberships_family_member ON memberships(family_member_id);
CREATE INDEX IF NOT EXISTS idx_cards_family_member ON cards(family_member_id);
