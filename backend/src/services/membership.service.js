const { query, withTransaction } = require('../config/database');
const { logAudit } = require('./audit.service');
const { MEMBERSHIP_STATUS, PAYMENT_TYPE, AUDIT_ACTIONS, MEMBER_ROLES } = require('../utils/constants');
const { AppError } = require('../middleware/errorHandler');
const { generateQRToken, generateSigningSecret } = require('../utils/qrSigner');

/**
 * Apply for a new membership.
 * Validates role, selects the appropriate rate table, creates the membership record.
 */
const applyForMembership = async ({ userId, categoryCode, medicalClearancePath, notes }, ipAddress) => {
  // Verify user exists and is allowed to hold memberships
  const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'User not found');
  }
  const user = userResult.rows[0];

  if (!MEMBER_ROLES.includes(user.role)) {
    throw new AppError(403, 'Forbidden', `Role ${user.role} cannot hold memberships`);
  }

  // Find a rate table matching the user's role to get their registration fee
  const rateResult = await query(
    `SELECT * FROM rate_tables 
     WHERE $1 = ANY(applies_to_roles) AND is_active = true
     LIMIT 1`,
    [user.role]
  );
  if (rateResult.rows.length === 0) {
    throw new AppError(400, 'NoRateTable', 'No applicable rate found for your role');
  }
  const rateTable = rateResult.rows[0];

  // Check for existing active or pending membership card
  const existingResult = await query(
    `SELECT id FROM memberships 
     WHERE user_id = $1 AND status NOT IN ('CANCELLED')`,
    [userId]
  );
  if (existingResult.rows.length > 0) {
    throw new AppError(409, 'AlreadyExists', 'You already have an active or pending membership card.');
  }

  return await withTransaction(async (client) => {
    const membershipResult = await client.query(
      `INSERT INTO memberships (id, user_id, rate_table_id, category_code, status, registration_fee_paid, notes, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'PENDING_PAYMENT', false, $4, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        rateTable.id,
        rateTable.category_code,
        notes || null,
      ]
    );

    const membership = membershipResult.rows[0];

    // Audit
    await logAudit({
      action: AUDIT_ACTIONS.MEMBERSHIP_CREATED,
      actorId: userId,
      targetType: 'MEMBERSHIP',
      targetId: membership.id,
      details: {
        categoryCode: rateTable.category_code,
        registrationFee: rateTable.registration_fee,
      },
      ipAddress,
      client,
    });

    return {
      membership,
      rateTable: {
        id: rateTable.id,
        categoryLabel: rateTable.category_label,
        registrationFee: rateTable.registration_fee,
      },
    };
  });
};

/**
 * List current user's memberships with sub-queries for facility subscriptions.
 */
const getUserMemberships = async (userId) => {
  const result = await query(
    `SELECT m.*, 
            rt.category_label, rt.registration_fee, rt.monthly_fee as base_monthly_fee,
            fm.full_name as family_member_name,
            fm.relation as family_member_relation,
            fm.photo_url as family_member_photo,
            COALESCE(
              (SELECT json_agg(fs.*) 
               FROM facility_subscriptions fs 
               WHERE fs.membership_id = m.id),
              '[]'::json
            ) as subscriptions
     FROM memberships m
     LEFT JOIN rate_tables rt ON m.rate_table_id = rt.id
     LEFT JOIN family_members fm ON m.family_member_id = fm.id
     WHERE m.user_id = $1
     ORDER BY m.created_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Get a single membership's details with subscriptions loaded.
 */
const getMembershipById = async (membershipId, userId) => {
  const result = await query(
    `SELECT m.*, 
            rt.category_label, rt.registration_fee, rt.monthly_fee as base_monthly_fee,
            u.full_name as user_name, u.email as user_email, u.role as user_role,
            fm.full_name as family_member_name,
            fm.relation as family_member_relation,
            COALESCE(
              (SELECT json_agg(fs.*) 
               FROM facility_subscriptions fs 
               WHERE fs.membership_id = m.id),
              '[]'::json
            ) as subscriptions
     FROM memberships m
     LEFT JOIN rate_tables rt ON m.rate_table_id = rt.id
     JOIN users u ON m.user_id = u.id
     LEFT JOIN family_members fm ON m.family_member_id = fm.id
     WHERE m.id = $1 AND ($2::uuid IS NULL OR m.user_id = $2)`,
    [membershipId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Membership not found');
  }

  return result.rows[0];
};

/**
 * Cancel a membership.
 */
const cancelMembership = async (membershipId, userId, reason, ipAddress) => {
  const membershipResult = await query(
    'SELECT * FROM memberships WHERE id = $1 AND user_id = $2',
    [membershipId, userId]
  );

  if (membershipResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Membership not found');
  }

  return await withTransaction(async (client) => {
    await client.query(
      `UPDATE memberships 
       SET status = $1, cancelled_at = NOW(), cancellation_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [MEMBERSHIP_STATUS.CANCELLED, reason || 'Self-cancelled by member', membershipId]
    );

    // Also cancel all active subscriptions
    await client.query(
      `UPDATE facility_subscriptions 
       SET status = 'CANCELLED', updated_at = NOW() 
       WHERE membership_id = $1 AND status != 'CANCELLED'`,
      [membershipId]
    );

    await logAudit({
      action: AUDIT_ACTIONS.MEMBERSHIP_CANCELLED,
      actorId: userId,
      targetType: 'MEMBERSHIP',
      targetId: membershipId,
      reason: reason || 'Self-cancelled by member',
      ipAddress,
      client,
    });

    return { message: 'Membership cancelled successfully' };
  });
};

/**
 * Add a family member (child dependent) for a Faculty user.
 */
const addFamilyMember = async (userId, { fullName, relation, age, photoUrl, medicalClearancePath }, ipAddress) => {
  const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'User not found');
  }
  const user = userResult.rows[0];
  if (user.role !== 'FACULTY') {
    throw new AppError(403, 'Forbidden', 'Only Faculty members can add dependent family members');
  }

  const trimmedName = (fullName || '').trim();
  if (!trimmedName) {
    throw new AppError(400, 'ValidationError', 'Child full name is required');
  }

  // Prevent adding duplicate child under the same faculty account
  const existingChild = await query(
    `SELECT id FROM family_members 
     WHERE user_id = $1 AND LOWER(TRIM(full_name)) = LOWER($2) AND status != 'CANCELLED'`,
    [userId, trimmedName]
  );
  if (existingChild.rows.length > 0) {
    throw new AppError(400, 'DuplicateChild', `A child with the name "${trimmedName}" has already been registered under your account.`);
  }

  return await withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO family_members (id, user_id, full_name, relation, age, photo_url, medical_clearance_path, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'PENDING_APPROVAL', NOW(), NOW())
       RETURNING *`,
      [userId, trimmedName, relation, age ? parseInt(age, 10) : null, photoUrl || null, medicalClearancePath || null]
    );

    await logAudit({
      action: AUDIT_ACTIONS.FAMILY_MEMBER_ADDED || 'FAMILY_MEMBER_ADDED',
      actorId: userId,
      targetType: 'FAMILY_MEMBER',
      targetId: result.rows[0].id,
      details: { fullName: trimmedName, relation, age },
      ipAddress,
      client,
    });

    return result.rows[0];
  });
};

/**
 * Resubmit a rejected family member with updated details/documents.
 */
const resubmitFamilyMember = async (familyMemberId, userId, { fullName, relation, age, photoUrl, medicalClearancePath }, ipAddress) => {
  const memberRes = await query('SELECT * FROM family_members WHERE id = $1 AND user_id = $2', [familyMemberId, userId]);
  if (memberRes.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Family member not found');
  }
  const member = memberRes.rows[0];
  if (member.status !== 'REJECTED') {
    throw new AppError(400, 'InvalidStatus', 'Only rejected family members can be resubmitted');
  }

  return await withTransaction(async (client) => {
    const newName = (fullName || member.full_name || '').trim();
    const newRelation = relation || member.relation;
    const newAge = age !== undefined ? (age ? parseInt(age, 10) : null) : member.age;
    const newPhoto = photoUrl || member.photo_url;
    const newDoc = medicalClearancePath || member.medical_clearance_path;

    // Check duplicate name on resubmit
    const existingChild = await client.query(
      `SELECT id FROM family_members 
       WHERE user_id = $1 AND LOWER(TRIM(full_name)) = LOWER($2) AND id != $3 AND status != 'CANCELLED'`,
      [userId, newName, familyMemberId]
    );
    if (existingChild.rows.length > 0) {
      throw new AppError(400, 'DuplicateChild', `Another child with the name "${newName}" is already registered under your account.`);
    }

    const result = await client.query(
      `UPDATE family_members 
       SET full_name = $1, relation = $2, age = $3, photo_url = $4, medical_clearance_path = $5,
           status = 'PENDING_APPROVAL', rejection_reason = NULL, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [newName, newRelation, newAge, newPhoto, newDoc, familyMemberId, userId]
    );

    await logAudit({
      action: 'FAMILY_MEMBER_RESUBMITTED',
      actorId: userId,
      targetType: 'FAMILY_MEMBER',
      targetId: familyMemberId,
      details: { fullName: newName },
      ipAddress,
      client,
    });

    return result.rows[0];
  });
};

/**
 * List family members (children) registered by a faculty user.
 */
const getFamilyMembers = async (userId) => {
  const result = await query(
    `SELECT fm.*, 
            m.id as child_membership_id, 
            m.status as membership_status,
            c.id as card_id,
            c.card_number,
            c.current_qr_token,
            COALESCE(
              (SELECT json_agg(fs.*) 
               FROM facility_subscriptions fs 
               WHERE fs.membership_id = fm.membership_id),
              '[]'::json
            ) as subscriptions
     FROM family_members fm
     LEFT JOIN memberships m ON fm.membership_id = m.id
     LEFT JOIN cards c ON c.family_member_id = fm.id AND c.is_active = true
     WHERE fm.user_id = $1 AND fm.is_active = true
     ORDER BY fm.created_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Update facility subscriptions for an approved child.
 */
const updateChildSubscriptions = async (familyMemberId, userId, selectedFacilities) => {
  const memberRes = await query(
    `SELECT fm.*, m.id as child_membership_id
     FROM family_members fm
     LEFT JOIN memberships m ON fm.membership_id = m.id
     WHERE fm.id = $1 AND fm.user_id = $2`,
    [familyMemberId, userId]
  );

  if (memberRes.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Family member not found');
  }

  const member = memberRes.rows[0];
  if (member.status !== 'ACTIVE') {
    throw new AppError(400, 'InvalidStatus', 'Facility subscriptions can only be selected after admin approval');
  }

  if (!member.child_membership_id) {
    throw new AppError(400, 'NoMembership', 'Child membership record not initialized');
  }

  return await updateFacilitySubscriptions(member.child_membership_id, selectedFacilities);
};

/**
 * Remove a family member.
 */
const removeFamilyMember = async (membershipId, familyMemberId, userId, ipAddress) => {
  return await withTransaction(async (client) => {
    const result = await client.query(
      'UPDATE family_members SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING *',
      [familyMemberId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'NotFound', 'Family member not found');
    }

    await logAudit({
      action: AUDIT_ACTIONS.FAMILY_MEMBER_REMOVED,
      actorId: userId,
      targetType: 'FAMILY_MEMBER',
      targetId: familyMemberId,
      details: { familyMemberId },
      ipAddress,
      client,
    });

    return { message: 'Family member removed' };
  });
};

/**
 * Pricing calculation utility. Returns total fee and breakdowns.
 */
const calculateMonthlyFee = (selectedFacilities) => {
  const hasGym = selectedFacilities.includes('GYM');
  const hasSwimming = selectedFacilities.includes('SWIMMING');
  const hasSaddle = selectedFacilities.includes('SADDLE');

  const breakdown = [];
  let totalFee = 0;

  if (hasGym && hasSwimming) {
    totalFee += 1500;
    breakdown.push(
      { facility: 'GYM', monthly_fee: 750, is_part_of_combo: true },
      { facility: 'SWIMMING', monthly_fee: 750, is_part_of_combo: true }
    );
  } else {
    if (hasGym) {
      totalFee += 1000;
      breakdown.push({ facility: 'GYM', monthly_fee: 1000, is_part_of_combo: false });
    }
    if (hasSwimming) {
      totalFee += 1000;
      breakdown.push({ facility: 'SWIMMING', monthly_fee: 1000, is_part_of_combo: false });
    }
  }

  if (hasSaddle) {
    totalFee += 1000;
    breakdown.push({ facility: 'SADDLE', monthly_fee: 1000, is_part_of_combo: false });
  }

  return { totalFee, breakdown };
};

/**
 * Manage facility subscriptions (Apply/Update selection)
 */
const updateFacilitySubscriptions = async (membershipId, selectedFacilities) => {
  const { breakdown } = calculateMonthlyFee(selectedFacilities);

  return await withTransaction(async (client) => {
    // Get existing subscriptions
    const existingResult = await client.query(
      'SELECT * FROM facility_subscriptions WHERE membership_id = $1',
      [membershipId]
    );
    const existing = existingResult.rows;

    // Check if the subscriptions list actually changed compared to the active/pending list
    const existingActiveOrPending = existing
      .filter(e => ['ACTIVE', 'PENDING_PAYMENT', 'OVERDUE', 'FROZEN'].includes(e.status))
      .map(e => e.facility);
    
    const hasChanged = selectedFacilities.length !== existingActiveOrPending.length || 
                       !selectedFacilities.every(f => existingActiveOrPending.includes(f));

    // Process removals (only delete if they are cancelled or not active/pending/overdue/frozen)
    for (const ext of existing) {
      if (!selectedFacilities.includes(ext.facility)) {
        if (['ACTIVE', 'PENDING_PAYMENT', 'OVERDUE', 'FROZEN'].includes(ext.status)) {
          continue; // Protect active subscriptions from being deleted during updates
        }
        await client.query(
          'DELETE FROM facility_subscriptions WHERE id = $1',
          [ext.id]
        );
      }
    }

    // Process additions & updates
    for (const item of breakdown) {
      const match = existing.find(e => e.facility === item.facility);
      if (match) {
        await client.query(
          `UPDATE facility_subscriptions 
           SET monthly_fee = $1, is_part_of_combo = $2, updated_at = NOW() 
           WHERE id = $3`,
          [item.monthly_fee, item.is_part_of_combo, match.id]
        );
      } else {
        const membershipRes = await client.query('SELECT next_payment_due FROM memberships WHERE id = $1', [membershipId]);
        const nextDue = membershipRes.rows[0]?.next_payment_due || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5);

        await client.query(
          `INSERT INTO facility_subscriptions (membership_id, facility, monthly_fee, status, next_due_date, is_part_of_combo, created_at, updated_at)
           VALUES ($1, $2, $3, 'PENDING_PAYMENT', $4, $5, NOW(), NOW())`,
          [membershipId, item.facility, item.monthly_fee, nextDue, item.is_part_of_combo]
        );
      }
    }

    // If subscriptions changed, invalidate and regenerate the card QR token
    if (hasChanged) {
      const cardResult = await client.query(
        'SELECT * FROM cards WHERE membership_id = $1 AND is_active = true',
        [membershipId]
      );
      if (cardResult.rows.length > 0) {
        const card = cardResult.rows[0];
        const newSigningSecret = generateSigningSecret();
        const newToken = generateQRToken({
          cardId: card.id,
          membershipId: card.membership_id,
          userId: card.user_id,
          signingSecret: newSigningSecret,
        });
        await client.query(
          `UPDATE cards 
           SET qr_signing_secret = $1, current_qr_token = $2, updated_at = NOW() 
           WHERE id = $3`,
          [newSigningSecret, newToken, card.id]
        );
        console.log('[QR DEBUG] Subscriptions changed. Regenerated and invalidated QR for card:', card.card_number);
      }
    }

    return { message: 'Subscriptions updated successfully' };
  });
};

/**
 * Activate a membership after payment is verified.
 * Called by payment service — not directly by users.
 */
const activateMembership = async (membershipId, client) => {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 5); // 5th of next month

  const dbClient = client || { query };
  await dbClient.query(
    `UPDATE memberships 
     SET status = $1, start_date = COALESCE(start_date, CURRENT_DATE),
         current_period_start = CURRENT_DATE, current_period_end = $2,
         next_payment_due = $3, registration_fee_paid = true, updated_at = NOW()
     WHERE id = $4`,
    [MEMBERSHIP_STATUS.ACTIVE, periodEnd, nextDue, membershipId]
  );

  // Check if this membership belongs to a family_member (child)
  const mRes = await dbClient.query('SELECT family_member_id, user_id FROM memberships WHERE id = $1', [membershipId]);
  const famId = mRes.rows[0]?.family_member_id;
  const userId = mRes.rows[0]?.user_id;

  if (famId) {
    await dbClient.query(
      `UPDATE family_members SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`,
      [famId]
    );
    // Auto-create child card
    const { createCard } = require('./card.service');
    await createCard(membershipId, userId, dbClient, famId);
  }
};

module.exports = {
  applyForMembership,
  getUserMemberships,
  getMembershipById,
  cancelMembership,
  addFamilyMember,
  resubmitFamilyMember,
  getFamilyMembers,
  updateChildSubscriptions,
  removeFamilyMember,
  calculateMonthlyFee,
  updateFacilitySubscriptions,
  activateMembership,
};
