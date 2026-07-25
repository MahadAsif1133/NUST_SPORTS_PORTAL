const { query, withTransaction } = require('../config/database');
const { logAudit } = require('./audit.service');
const { FREEZE_STATUS, MEMBERSHIP_STATUS, AUDIT_ACTIONS } = require('../utils/constants');
const { AppError } = require('../middleware/errorHandler');

/**
 * Request a membership freeze.
 * Rules:
 * - Only ACTIVE memberships can be frozen
 * - Duration: 1–3 months
 * - Max 2 approved freeze requests per year per membership
 */
const requestFreeze = async ({ membershipId, userId, freezeStart, durationMonths, reason }, ipAddress) => {
  // Verify membership
  const membershipResult = await query(
    `SELECT * FROM memberships WHERE id = $1 AND user_id = $2`,
    [membershipId, userId]
  );

  if (membershipResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Membership not found');
  }

  const membership = membershipResult.rows[0];

  if (membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    throw new AppError(400, 'InvalidStatus', 'Only active memberships can be frozen');
  }

  if (durationMonths < 1 || durationMonths > 3) {
    throw new AppError(400, 'InvalidDuration', 'Freeze duration must be 1–3 months');
  }

  // Check freeze limit (max 2 per year)
  const currentYear = new Date().getFullYear();
  const existingFreezes = await query(
    `SELECT COUNT(*) FROM freeze_requests 
     WHERE membership_id = $1 AND year = $2 AND status IN ($3, $4)`,
    [membershipId, currentYear, FREEZE_STATUS.APPROVED, FREEZE_STATUS.PENDING]
  );

  if (parseInt(existingFreezes.rows[0].count, 10) >= 2) {
    throw new AppError(400, 'FreezeLimitReached', 'Maximum 2 freeze requests per year');
  }

  // Calculate freeze end date
  const start = new Date(freezeStart);
  if (isNaN(start.getTime())) {
    throw new AppError(400, 'InvalidDate', 'Freeze start date is invalid');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    throw new AppError(400, 'InvalidDate', 'Freeze start date must be from today onwards');
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);

  return await withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO freeze_requests (id, membership_id, user_id, freeze_start, freeze_end, duration_months, reason, status, year, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [membershipId, userId, start, end, durationMonths, reason || null, FREEZE_STATUS.PENDING, currentYear]
    );

    await logAudit({
      action: AUDIT_ACTIONS.FREEZE_REQUESTED,
      actorId: userId,
      targetType: 'FREEZE_REQUEST',
      targetId: result.rows[0].id,
      details: { membershipId, freezeStart: start, freezeEnd: end, durationMonths },
      ipAddress,
      client,
    });

    return result.rows[0];
  });
};

/**
 * Get freeze requests for a user.
 */
const getUserFreezeRequests = async (userId) => {
  const result = await query(
    `SELECT fr.*, m.category_code, f.name as facility_name,
            fm.full_name as family_member_name,
            fm.relation as family_member_relation
     FROM freeze_requests fr
     JOIN memberships m ON fr.membership_id = m.id
     LEFT JOIN family_members fm ON m.family_member_id = fm.id
     LEFT JOIN facilities f ON m.facility_id = f.id
     WHERE fr.user_id = $1
     ORDER BY fr.created_at DESC`,
    [userId]
  );
  return result.rows;
};

module.exports = {
  requestFreeze,
  getUserFreezeRequests,
};
