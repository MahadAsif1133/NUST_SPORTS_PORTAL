const { query, withTransaction } = require('../config/database');
const { logAudit } = require('./audit.service');
const { activateMembership } = require('./membership.service');
const { createCard } = require('./card.service');
const { MEMBERSHIP_STATUS, PAYMENT_STATUS, FREEZE_STATUS, CARD_STATUS, AUDIT_ACTIONS, VERIFICATION_REQUIRED_ROLES } = require('../utils/constants');
const { AppError } = require('../middleware/errorHandler');

/**
 * List users with optional filters and pagination.
 */
const listUsers = async ({ role, isVerified, isActive, search, page = 1, limit = 20 }) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (role) { conditions.push(`u.role = $${paramIndex++}`); params.push(role); }
  if (isVerified !== undefined) { conditions.push(`u.is_verified = $${paramIndex++}`); params.push(isVerified); }
  if (isActive !== undefined) { conditions.push(`u.is_active = $${paramIndex++}`); params.push(isActive); }
  if (search) {
    conditions.push(`(u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.registration_number ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM users u ${whereClause}`, params);
  const dataResult = await query(
    `SELECT u.id, u.email, u.role, u.is_verified, u.is_active, u.is_foreigner, u.full_name,
            u.contact_number, u.department, u.degree_program, u.registration_number, 
            u.verification_doc_path, u.photo_url, u.created_at
     FROM users u ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: {
      page, limit,
      total: parseInt(countResult.rows[0].count, 10),
      pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
    },
  };
};

/**
 * Verify (approve/reject) a pending user account.
 */
const verifyUser = async (targetUserId, adminId, { approved, reason }, ipAddress) => {
  const userResult = await query('SELECT * FROM users WHERE id = $1', [targetUserId]);
  if (userResult.rows.length === 0) throw new AppError(404, 'NotFound', 'User not found');

  const user = userResult.rows[0];
  if (!VERIFICATION_REQUIRED_ROLES.includes(user.role)) {
    throw new AppError(400, 'NoVerificationNeeded', 'This user type does not require verification');
  }

  return await withTransaction(async (client) => {
    if (approved) {
      await client.query(
        'UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1',
        [targetUserId]
      );
      await logAudit({
        action: AUDIT_ACTIONS.ACCOUNT_VERIFIED,
        actorId: adminId,
        targetType: 'USER',
        targetId: targetUserId,
        reason,
        ipAddress,
        client,
      });
      return { message: 'User account approved' };
    } else {
      await client.query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [targetUserId]
      );
      await logAudit({
        action: AUDIT_ACTIONS.ACCOUNT_REJECTED,
        actorId: adminId,
        targetType: 'USER',
        targetId: targetUserId,
        reason: reason || 'Rejected by admin',
        ipAddress,
        client,
      });
      return { message: 'User account rejected' };
    }
  });
};

/**
 * List all memberships with filters.
 */
const listMemberships = async ({ status, facilityId, search, page = 1, limit = 20 }) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (status) { conditions.push(`m.status = $${paramIndex++}`); params.push(status); }
  if (facilityId) { conditions.push(`m.facility_id = $${paramIndex++}`); params.push(facilityId); }
  if (search) {
    conditions.push(`u.full_name ILIKE $${paramIndex}`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) FROM memberships m LEFT JOIN users u ON m.user_id = u.id ${whereClause}`,
    params
  );

  const dataResult = await query(
    `SELECT m.*, u.full_name as user_name, u.email as user_email, u.role as user_role,
            f.name as facility_name, f.code as facility_code,
            rt.category_label, rt.registration_fee, rt.monthly_fee
     FROM memberships m
     LEFT JOIN users u ON m.user_id = u.id
     LEFT JOIN facilities f ON m.facility_id = f.id
     LEFT JOIN rate_tables rt ON m.rate_table_id = rt.id
     ${whereClause}
     ORDER BY m.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: {
      page, limit,
      total: parseInt(countResult.rows[0].count, 10),
      pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
    },
  };
};

/**
 * List bank slips pending verification.
 */
const getPendingBankSlips = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT p.*, u.full_name as user_name, u.email as user_email,
            m.category_code, f.name as facility_name
     FROM payments p
     JOIN users u ON p.user_id = u.id
     JOIN memberships m ON p.membership_id = m.id
     LEFT JOIN facilities f ON m.facility_id = f.id
     WHERE p.status = $1 AND p.payment_method = 'BANK_SLIP'
     ORDER BY p.created_at ASC
     LIMIT $2 OFFSET $3`,
    [PAYMENT_STATUS.PENDING_VERIFICATION, limit, offset]
  );
  return result.rows;
};

/**
 * Verify or reject a bank slip payment.
 */
const verifyBankSlip = async (paymentId, adminId, { approved, reason }, ipAddress) => {
  const paymentResult = await query('SELECT * FROM payments WHERE id = $1', [paymentId]);
  if (paymentResult.rows.length === 0) throw new AppError(404, 'NotFound', 'Payment not found');

  const payment = paymentResult.rows[0];
  if (payment.status !== PAYMENT_STATUS.PENDING_VERIFICATION) {
    throw new AppError(400, 'AlreadyProcessed', 'This payment has already been processed');
  }

  return await withTransaction(async (client) => {
    if (approved) {
      await client.query(
        `UPDATE payments SET status = $1, verified_by = $2, verified_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [PAYMENT_STATUS.VERIFIED, adminId, paymentId]
      );

      // Activate membership if registration payment
      if (payment.payment_type === 'REGISTRATION') {
        await activateMembership(payment.membership_id, client);

        // Create a card for the member
        await createCard(payment.membership_id, payment.user_id, client);

        await logAudit({
          action: AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED,
          actorId: adminId,
          targetType: 'MEMBERSHIP',
          targetId: payment.membership_id,
          details: { paymentId, method: 'BANK_SLIP' },
          ipAddress,
          client,
        });
      }

      // Reactivate if overdue
      if (payment.payment_type === 'MONTHLY') {
        const mResult = await client.query('SELECT status FROM memberships WHERE id = $1', [payment.membership_id]);
        if (mResult.rows[0]?.status === MEMBERSHIP_STATUS.OVERDUE) {
          await activateMembership(payment.membership_id, client);
        }
      }

      await logAudit({
        action: AUDIT_ACTIONS.BANK_SLIP_VERIFIED,
        actorId: adminId,
        targetType: 'PAYMENT',
        targetId: paymentId,
        details: { amount: payment.amount },
        reason,
        ipAddress,
        client,
      });

      return { message: 'Bank slip approved. Payment verified.' };
    } else {
      await client.query(
        `UPDATE payments SET status = $1, verified_by = $2, verified_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [PAYMENT_STATUS.FAILED, adminId, paymentId]
      );

      await logAudit({
        action: AUDIT_ACTIONS.BANK_SLIP_REJECTED,
        actorId: adminId,
        targetType: 'PAYMENT',
        targetId: paymentId,
        reason: reason || 'Rejected by admin',
        ipAddress,
        client,
      });

      return { message: 'Bank slip rejected.' };
    }
  });
};

/**
 * List pending freeze requests.
 */
const getPendingFreezeRequests = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT fr.*, u.full_name as user_name, u.email as user_email,
            m.category_code, f.name as facility_name
     FROM freeze_requests fr
     JOIN users u ON fr.user_id = u.id
     JOIN memberships m ON fr.membership_id = m.id
     LEFT JOIN facilities f ON m.facility_id = f.id
     WHERE fr.status = $1
     ORDER BY fr.created_at ASC
     LIMIT $2 OFFSET $3`,
    [FREEZE_STATUS.PENDING, limit, offset]
  );
  return result.rows;
};

/**
 * Approve or reject a freeze request.
 */
const decideFreezeRequest = async (freezeId, adminId, { approved, reason }, ipAddress) => {
  const freezeResult = await query('SELECT * FROM freeze_requests WHERE id = $1', [freezeId]);
  if (freezeResult.rows.length === 0) throw new AppError(404, 'NotFound', 'Freeze request not found');

  const freeze = freezeResult.rows[0];
  if (freeze.status !== FREEZE_STATUS.PENDING) {
    throw new AppError(400, 'AlreadyProcessed', 'This freeze request has already been processed');
  }

  return await withTransaction(async (client) => {
    const newStatus = approved ? FREEZE_STATUS.APPROVED : FREEZE_STATUS.REJECTED;

    await client.query(
      `UPDATE freeze_requests SET status = $1, admin_id = $2, admin_reason = $3, decided_at = NOW() WHERE id = $4`,
      [newStatus, adminId, reason || null, freezeId]
    );

    if (approved) {
      // Freeze the membership
      await client.query(
        `UPDATE memberships SET status = $1, updated_at = NOW() WHERE id = $2`,
        [MEMBERSHIP_STATUS.FROZEN, freeze.membership_id]
      );

      await logAudit({
        action: AUDIT_ACTIONS.FREEZE_APPROVED,
        actorId: adminId,
        targetType: 'FREEZE_REQUEST',
        targetId: freezeId,
        details: { membershipId: freeze.membership_id, freezeStart: freeze.freeze_start, freezeEnd: freeze.freeze_end },
        ipAddress,
        client,
      });

      await logAudit({
        action: AUDIT_ACTIONS.MEMBERSHIP_FROZEN,
        actorId: adminId,
        targetType: 'MEMBERSHIP',
        targetId: freeze.membership_id,
        details: { freezeId, freezeStart: freeze.freeze_start, freezeEnd: freeze.freeze_end },
        ipAddress,
        client,
      });
    } else {
      await logAudit({
        action: AUDIT_ACTIONS.FREEZE_REJECTED,
        actorId: adminId,
        targetType: 'FREEZE_REQUEST',
        targetId: freezeId,
        reason: reason || 'Rejected by admin',
        ipAddress,
        client,
      });
    }

    return { message: approved ? 'Freeze request approved' : 'Freeze request rejected' };
  });
};

/**
 * Mark physical card as ready for pickup.
 */
const markCardReady = async (cardId, adminId, ipAddress) => {
  const result = await query(
    `UPDATE cards SET physical_card_status = $1, physical_card_ready_date = NOW(), updated_at = NOW() 
     WHERE id = $2 RETURNING *`,
    [CARD_STATUS.READY_FOR_PICKUP, cardId]
  );

  if (result.rows.length === 0) throw new AppError(404, 'NotFound', 'Card not found');

  await logAudit({
    action: AUDIT_ACTIONS.CARD_READY,
    actorId: adminId,
    targetType: 'CARD',
    targetId: cardId,
    ipAddress,
  });

  return result.rows[0];
};

/**
 * Mark physical card as collected.
 */
const markCardCollected = async (cardId, adminId, ipAddress) => {
  const result = await query(
    `UPDATE cards SET physical_card_status = $1, updated_at = NOW() 
     WHERE id = $2 RETURNING *`,
    [CARD_STATUS.COLLECTED, cardId]
  );

  if (result.rows.length === 0) throw new AppError(404, 'NotFound', 'Card not found');

  await logAudit({
    action: AUDIT_ACTIONS.CARD_COLLECTED,
    actorId: adminId,
    targetType: 'CARD',
    targetId: cardId,
    ipAddress,
  });

  return result.rows[0];
};

/**
 * List pending family member approval requests.
 */
const getPendingFamilyMembers = async () => {
  const result = await query(
    `SELECT fm.*, u.full_name as parent_name, u.email as parent_email, u.department as parent_department
     FROM family_members fm
     JOIN users u ON fm.user_id = u.id
     WHERE fm.status = 'PENDING_APPROVAL' AND fm.is_active = true
     ORDER BY fm.created_at ASC`
  );
  return result.rows;
};

/**
 * Approve or reject a child family member request.
 */
const decideFamilyMember = async (familyMemberId, adminId, { approved, reason }, ipAddress) => {
  const memberRes = await query('SELECT * FROM family_members WHERE id = $1', [familyMemberId]);
  if (memberRes.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Family member request not found');
  }

  const member = memberRes.rows[0];
  if (member.status !== 'PENDING_APPROVAL') {
    throw new AppError(400, 'AlreadyProcessed', 'This request has already been processed');
  }

  return await withTransaction(async (client) => {
    if (approved) {
      // Find a rate table for FACULTY / DEPENDENT
      const rateResult = await client.query(
        `SELECT id, category_code FROM rate_tables WHERE 'FACULTY' = ANY(applies_to_roles) AND is_active = true LIMIT 1`
      );
      const rateTable = rateResult.rows[0] || { id: 'b1000000-0000-0000-0000-000000000002', category_code: 'FACULTY' };

      // Create a dedicated membership record for the child with PENDING_PAYMENT status
      const membershipRes = await client.query(
        `INSERT INTO memberships (id, user_id, family_member_id, rate_table_id, category_code, status, registration_fee_paid, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'PENDING_PAYMENT', false, NOW(), NOW())
         RETURNING *`,
        [member.user_id, familyMemberId, rateTable.id, 'FACULTY_DEPENDENT']
      );
      const childMembership = membershipRes.rows[0];

      // Update family_members status to PENDING_PAYMENT and link membership_id
      await client.query(
        `UPDATE family_members 
         SET status = 'PENDING_PAYMENT', membership_id = $1, rejection_reason = NULL, updated_at = NOW() 
         WHERE id = $2`,
        [childMembership.id, familyMemberId]
      );

      await logAudit({
        action: AUDIT_ACTIONS.FAMILY_MEMBER_APPROVED || 'FAMILY_MEMBER_APPROVED',
        actorId: adminId,
        targetType: 'FAMILY_MEMBER',
        targetId: familyMemberId,
        details: { childName: member.full_name, membershipId: childMembership.id },
        ipAddress,
        client,
      });

      return { message: 'Child family member approved. Registration fee payment pending.', childMembership };
    } else {
      await client.query(
        `UPDATE family_members 
         SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW() 
         WHERE id = $2`,
        [reason || 'Rejected by admin', familyMemberId]
      );

      await logAudit({
        action: AUDIT_ACTIONS.FAMILY_MEMBER_REJECTED || 'FAMILY_MEMBER_REJECTED',
        actorId: adminId,
        targetType: 'FAMILY_MEMBER',
        targetId: familyMemberId,
        reason: reason || 'Rejected by admin',
        ipAddress,
        client,
      });

      return { message: 'Child family member request rejected' };
    }
  });
};

/**
 * Get dashboard statistics.
 */
const getStats = async () => {
  const [members, memberships, revenue, pendingSlips, pendingFreezes, pendingUsers, pendingChildren] = await Promise.all([
    query(`SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role`),
    query(`SELECT status, COUNT(*) as count FROM memberships GROUP BY status`),
    query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'VERIFIED'`),
    query(`SELECT COUNT(*) as count FROM payments WHERE status = 'PENDING_VERIFICATION'`),
    query(`SELECT COUNT(*) as count FROM freeze_requests WHERE status = 'PENDING'`),
    query(`SELECT COUNT(*) as count FROM users WHERE is_verified = false AND is_active = true`),
    query(`SELECT COUNT(*) as count FROM family_members WHERE status = 'PENDING_APPROVAL' AND is_active = true`),
  ]);

  // Facility breakdown (refactored to count active subscriptions)
  const facilityStats = await query(
    `SELECT f.name, f.code, COUNT(fs.id) as active_members
     FROM facilities f
     LEFT JOIN facility_subscriptions fs ON 
       (CASE fs.facility::text
          WHEN 'SWIMMING' THEN 'POOL'
          WHEN 'SADDLE' THEN 'SADDLE_CLUB'
          ELSE fs.facility::text
        END) = f.code AND fs.status = 'ACTIVE'
     GROUP BY f.id, f.name, f.code`
  );

  // Monthly revenue (last 6 months)
  const monthlyRevenue = await query(
    `SELECT DATE_TRUNC('month', verified_at) as month, SUM(amount) as total
     FROM payments WHERE status = 'VERIFIED' AND verified_at IS NOT NULL
     GROUP BY DATE_TRUNC('month', verified_at)
     ORDER BY month DESC LIMIT 6`
  );

  return {
    usersByRole: members.rows,
    membershipsByStatus: memberships.rows,
    totalRevenue: parseInt(revenue.rows[0].total, 10),
    pendingBankSlips: parseInt(pendingSlips.rows[0].count, 10),
    pendingFreezeRequests: parseInt(pendingFreezes.rows[0].count, 10),
    pendingUserVerifications: parseInt(pendingUsers.rows[0].count, 10),
    pendingFamilyMembers: parseInt(pendingChildren.rows[0].count, 10),
    facilityStats: facilityStats.rows,
    monthlyRevenue: monthlyRevenue.rows,
  };
};

/**
 * Get active members list for a specific facility.
 */
const getFacilityMembers = async (facilityCode) => {
  const result = await query(
    `SELECT fs.id as subscription_id, fs.created_at as subscribed_at, fs.next_due_date, fs.status,
            u.id as user_id, u.full_name, u.email, u.registration_number, u.role
     FROM facility_subscriptions fs
     JOIN memberships m ON fs.membership_id = m.id
     JOIN users u ON m.user_id = u.id
     WHERE (CASE fs.facility::text
              WHEN 'SWIMMING' THEN 'POOL'
              WHEN 'SADDLE' THEN 'SADDLE_CLUB'
              ELSE fs.facility::text
            END) = $1 AND fs.status = 'ACTIVE'
     ORDER BY fs.created_at DESC`,
    [facilityCode]
  );
  return result.rows;
};

module.exports = {
  listUsers,
  verifyUser,
  listMemberships,
  getPendingBankSlips,
  verifyBankSlip,
  getPendingFreezeRequests,
  decideFreezeRequest,
  getPendingFamilyMembers,
  decideFamilyMember,
  markCardReady,
  markCardCollected,
  getStats,
  getFacilityMembers,
};
