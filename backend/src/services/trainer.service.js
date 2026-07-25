const { query, withTransaction } = require('../config/database');
const { logAudit } = require('./audit.service');
const { verifyQRToken } = require('../utils/qrSigner');
const { SCAN_STATUS, MEMBERSHIP_STATUS, FREEZE_STATUS, AUDIT_ACTIONS } = require('../utils/constants');
const { AppError } = require('../middleware/errorHandler');

/**
 * Scan a member's QR code at a facility gate.
 * Validates the QR token, checks membership status, time slots, and freeze violations.
 */
const scanQRCode = async ({ qrToken, facilityId, scannedById }, ipAddress) => {
  let decoded = null;
  let card = null;
  let token = qrToken;

  // Handle URL wrapper in qrToken
  if (qrToken.startsWith('http://') || qrToken.startsWith('https://')) {
    try {
      const url = new URL(qrToken);
      token = url.searchParams.get('token') || qrToken;
    } catch (err) {
      // Treat as raw token
    }
  }

  // Extract card ID from the token payload (JWT has 3 parts, middle is payload)
  try {
    const payloadB64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    
    if (!payload.cid) {
      throw new Error('No card ID in token');
    }

    const cardResult = await query(
      `SELECT c.*, m.status as membership_status, m.is_master_card,
              m.user_id, m.facility_id as membership_facility_id,
              f.name as facility_name
       FROM cards c
       JOIN memberships m ON c.membership_id = m.id
       LEFT JOIN facilities f ON m.facility_id = f.id
       WHERE c.id = $1 AND c.is_active = true`,
      [payload.cid]
    );

    if (cardResult.rows.length === 0) {
      return createDeniedLog({
        facilityId, scannedById, ipAddress,
        reason: 'Card not found or inactive',
      });
    }

    card = cardResult.rows[0];

    // Check if token is obsolete/invalidated
    if (card.current_qr_token && token !== card.current_qr_token) {
      return createDeniedLog({
        membershipId: card.membership_id,
        cardId: card.id,
        userId: card.user_id,
        facilityId, scannedById, ipAddress,
        reason: 'QR token is obsolete',
      });
    }

    // Verify the QR token signature using the card's signing secret
    decoded = verifyQRToken(token, card.qr_signing_secret);
    if (!decoded) {
      return createDeniedLog({
        membershipId: card.membership_id,
        cardId: card.id,
        userId: card.user_id,
        facilityId, scannedById, ipAddress,
        reason: 'QR token expired or invalid signature',
      });
    }
  } catch (err) {
    return createDeniedLog({
      facilityId, scannedById, ipAddress,
      reason: `Invalid QR token format: ${err.message}`,
    });
  }

  // Check membership status
  if (card.membership_status !== MEMBERSHIP_STATUS.ACTIVE) {
    return createDeniedLog({
      membershipId: card.membership_id,
      cardId: card.id,
      userId: card.user_id,
      facilityId, scannedById, ipAddress,
      reason: `Membership is ${card.membership_status}`,
    });
  }

  // Check facility subscription
  const facilityMapping = {
    'a1000000-0000-0000-0000-000000000001': 'SWIMMING',
    'a1000000-0000-0000-0000-000000000002': 'GYM',
    'a1000000-0000-0000-0000-000000000003': 'SADDLE'
  };

  const requiredSub = facilityMapping[facilityId];
  if (!requiredSub) {
    return createDeniedLog({
      membershipId: card.membership_id,
      cardId: card.id,
      userId: card.user_id,
      facilityId, scannedById, ipAddress,
      reason: 'Unknown facility',
    });
  }

  const subResult = await query(
    `SELECT * FROM facility_subscriptions 
     WHERE membership_id = $1 AND facility = $2 AND status = 'ACTIVE'`,
    [card.membership_id, requiredSub]
  );

  if (subResult.rows.length === 0) {
    return createDeniedLog({
      membershipId: card.membership_id,
      cardId: card.id,
      userId: card.user_id,
      facilityId, scannedById, ipAddress,
      reason: `No active subscription for ${requiredSub.toLowerCase()}`,
    });
  }

  // Check for active freeze (freeze violation detection)
  const freezeResult = await query(
    `SELECT * FROM freeze_requests 
     WHERE membership_id = $1 AND status = $2
     AND freeze_start <= CURRENT_DATE AND freeze_end >= CURRENT_DATE`,
    [card.membership_id, FREEZE_STATUS.APPROVED]
  );

  const isFreezeViolation = freezeResult.rows.length > 0;

  // Check time slot validity
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday
  const currentTime = now.toTimeString().substring(0, 5); // HH:MM

  const timeSlotResult = await query(
    `SELECT * FROM time_slots 
     WHERE facility_id = $1 AND day_of_week = $2
     AND start_time <= $3::time AND end_time > $3::time`,
    [facilityId, dayOfWeek, currentTime]
  );

  // Check if today is a holiday
  const holidayResult = await query(
    'SELECT * FROM holidays WHERE date = CURRENT_DATE'
  );

  // Check if facility is closed today
  const facilityResult = await query(
    'SELECT closed_day FROM facilities WHERE id = $1',
    [facilityId]
  );
  const closedDay = facilityResult.rows[0]?.closed_day;
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  if (closedDay && dayNames[dayOfWeek] === closedDay) {
    return createDeniedLog({
      membershipId: card.membership_id,
      cardId: card.id,
      userId: card.user_id,
      facilityId, scannedById, ipAddress,
      reason: `Facility is closed on ${closedDay}`,
    });
  }

  // Log successful scan
  return await withTransaction(async (client) => {
    const logResult = await client.query(
      `INSERT INTO attendance_logs (id, membership_id, card_id, user_id, facility_id, scanned_by, 
       scanned_at, time_slot_id, status, is_freeze_violation)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, $7, $8)
       RETURNING *`,
      [
        card.membership_id, card.id, card.user_id, facilityId,
        scannedById, timeSlotResult.rows[0]?.id || null,
        SCAN_STATUS.SUCCESS, isFreezeViolation,
      ]
    );

    // If freeze violation, update the freeze request
    if (isFreezeViolation) {
      const freeze = freezeResult.rows[0];
      await client.query(
        `UPDATE freeze_requests SET status = $1, violation_details = $2 WHERE id = $3`,
        [
          FREEZE_STATUS.VIOLATED,
          JSON.stringify({ attendanceLogId: logResult.rows[0].id, scannedAt: new Date() }),
          freeze.id,
        ]
      );

      // Unfreeze the membership (violation = you're using it)
      await client.query(
        `UPDATE memberships SET status = $1, updated_at = NOW() WHERE id = $2`,
        [MEMBERSHIP_STATUS.ACTIVE, card.membership_id]
      );

      await logAudit({
        action: AUDIT_ACTIONS.FREEZE_VIOLATED,
        actorId: card.user_id,
        targetType: 'FREEZE_REQUEST',
        targetId: freeze.id,
        details: { attendanceLogId: logResult.rows[0].id },
        ipAddress,
        client,
      });
    }

    // Get user and family member info for display
    const userResult = await client.query(
      `SELECT u.full_name as parent_name, u.role as user_role, u.photo_url as parent_photo, u.registration_number as parent_reg_no,
              fm.full_name as family_member_name, fm.relation as family_member_relation, fm.photo_url as family_member_photo
       FROM cards c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN family_members fm ON c.family_member_id = fm.id
       WHERE c.id = $1`,
      [card.id]
    );

    const cardUser = userResult.rows[0] || {};
    const isChildCard = Boolean(card.family_member_id);

    const memberObj = {
      full_name: isChildCard ? cardUser.family_member_name : cardUser.parent_name,
      parent_name: isChildCard ? cardUser.parent_name : null,
      role: isChildCard ? `Dependent Child (${cardUser.family_member_relation})` : cardUser.user_role,
      photo_url: isChildCard ? (cardUser.family_member_photo || cardUser.parent_photo) : cardUser.parent_photo,
      registration_number: isChildCard ? (cardUser.parent_reg_no ? `Parent Reg: ${cardUser.parent_reg_no}` : null) : cardUser.parent_reg_no,
    };

    return {
      status: 'SUCCESS',
      attendanceLog: logResult.rows[0],
      member: memberObj,
      membership: {
        status: card.membership_status,
        is_master_card: card.is_master_card,
        facility_name: card.is_master_card ? 'Pool + Gym (Master Card)' : card.facility_name,
      },
      card: {
        card_number: card.card_number
      },
      isFreezeViolation,
      warning: isFreezeViolation ? 'Freeze violation detected. Membership unfrozen automatically.' : null,
      holiday: holidayResult.rows[0] || null,
    };
  });
};

async function createDeniedLog({ membershipId, cardId, userId, facilityId, scannedById, ipAddress, reason }) {
  if (!membershipId || !cardId || !userId) {
    return { status: 'DENIED', reason };
  }

  try {
    const result = await query(
      `INSERT INTO attendance_logs (id, membership_id, card_id, user_id, facility_id, scanned_by,
       scanned_at, status, denial_reason)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, $7)
       RETURNING *`,
      [membershipId, cardId, userId, facilityId, scannedById, SCAN_STATUS.DENIED, reason]
    );

    // Fetch details to help the trainer see what went wrong
    const userResult = await query(
      `SELECT u.full_name as parent_name, u.role as user_role, u.photo_url as parent_photo, u.registration_number as parent_reg_no,
              fm.full_name as family_member_name, fm.relation as family_member_relation, fm.photo_url as family_member_photo
       FROM cards c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN family_members fm ON c.family_member_id = fm.id
       WHERE c.id = $1`,
      [cardId]
    );
    const cardUser = userResult.rows[0] || {};
    const isChildCard = Boolean(cardUser.family_member_name);

    const memberObj = {
      full_name: isChildCard ? cardUser.family_member_name : cardUser.parent_name,
      parent_name: isChildCard ? cardUser.parent_name : null,
      role: isChildCard ? `Dependent Child (${cardUser.family_member_relation})` : cardUser.user_role,
      photo_url: isChildCard ? (cardUser.family_member_photo || cardUser.parent_photo) : cardUser.parent_photo,
      registration_number: isChildCard ? (cardUser.parent_reg_no ? `Parent Reg: ${cardUser.parent_reg_no}` : null) : cardUser.parent_reg_no,
    };

    const membershipResult = await query(
      `SELECT m.status, m.is_master_card, f.name as facility_name 
       FROM memberships m
       LEFT JOIN facilities f ON m.facility_id = f.id
       WHERE m.id = $1`,
      [membershipId]
    );
    const cardResult = await query('SELECT card_number FROM cards WHERE id = $1', [cardId]);

    return {
      status: 'DENIED',
      reason,
      attendanceLog: result.rows[0],
      member: memberObj,
      membership: {
        status: membershipResult.rows[0]?.status,
        is_master_card: membershipResult.rows[0]?.is_master_card,
        facility_name: membershipResult.rows[0]?.is_master_card 
          ? 'Pool + Gym (Master Card)' 
          : membershipResult.rows[0]?.facility_name,
      },
      card: cardResult.rows[0],
    };
  } catch (err) {
    return { status: 'DENIED', reason };
  }
}

/**
 * Get recent attendance logs for a facility.
 */
const getAttendanceLogs = async (facilityId, { page = 1, limit = 50 } = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (facilityId) {
    conditions.push(`al.facility_id = $${paramIndex++}`);
    params.push(facilityId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT al.*, u.full_name as member_name, u.role as member_role,
            f.name as facility_name, c.card_number,
            scanner.full_name as scanner_name
     FROM attendance_logs al
     JOIN users u ON al.user_id = u.id
     JOIN facilities f ON al.facility_id = f.id
     JOIN cards c ON al.card_id = c.id
     JOIN users scanner ON al.scanned_by = scanner.id
     ${whereClause}
     ORDER BY al.scanned_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return result.rows;
};

/**
 * Verify a member's card status live from the database.
 * Does not create an entry log unless requested.
 */
const verifyCard = async ({ qrToken, scannedById }, ipAddress) => {
  let payload = null;
  // Decode JWT payload without verification first to get the card ID
  try {
    const payloadB64 = qrToken.split('.')[1];
    if (!payloadB64) {
      throw new AppError(400, 'InvalidToken', 'Invalid QR token format');
    }
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  } catch (err) {
    throw new AppError(400, 'InvalidToken', `Invalid QR token format: ${err.message}`);
  }

  const cardId = payload.cid;
  if (!cardId) {
    throw new AppError(400, 'InvalidToken', 'Invalid QR token: missing card ID');
  }

  // Look up card and active membership + user info from database
  const cardResult = await query(
    `SELECT c.*,
            u.full_name as parent_name,
            u.email as parent_email,
            u.role as user_role,
            u.photo_url as parent_photo,
            u.registration_number as parent_reg_no,
            fm.full_name as family_member_name,
            fm.relation as family_member_relation,
            fm.photo_url as family_member_photo,
            m.id as membership_id, m.status as membership_status, m.is_master_card
     FROM cards c
     JOIN memberships m ON c.membership_id = m.id
     JOIN users u ON c.user_id = u.id
     LEFT JOIN family_members fm ON c.family_member_id = fm.id
     WHERE c.id = $1 AND c.is_active = true`,
    [cardId]
  );

  if (cardResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Card not found or is inactive');
  }

  const card = cardResult.rows[0];

  // Verify signature and expiration using verifyQRToken
  const decoded = verifyQRToken(qrToken, card.qr_signing_secret);
  if (!decoded) {
    throw new AppError(400, 'InvalidToken', 'QR token expired or has an invalid signature');
  }

  // Look up actual status from database live for EACH FacilitySubscription
  const subResult = await query(
    `SELECT facility, status, next_due_date 
     FROM facility_subscriptions 
     WHERE membership_id = $1`,
    [card.membership_id]
  );

  // Map facility subscription statuses
  const facilities = {
    GYM: 'NOT_SUBSCRIBED',
    SWIMMING: 'NOT_SUBSCRIBED',
    SADDLE: 'NOT_SUBSCRIBED',
  };

  subResult.rows.forEach(sub => {
    facilities[sub.facility] = sub.status;
  });

  const isChildCard = Boolean(card.family_member_id);

  return {
    status: 'SUCCESS',
    member: {
      full_name: isChildCard ? card.family_member_name : card.parent_name,
      parent_name: isChildCard ? card.parent_name : null,
      role: isChildCard ? `Dependent Child (${card.family_member_relation})` : card.user_role,
      photo_url: isChildCard ? (card.family_member_photo || card.parent_photo) : card.parent_photo,
      registration_number: isChildCard ? (card.parent_reg_no ? `Parent Reg: ${card.parent_reg_no}` : null) : card.parent_reg_no,
    },
    membership: {
      id: card.membership_id,
      status: card.membership_status,
      is_master_card: card.is_master_card,
      facilities,
    },
    card: {
      id: card.id,
      card_number: card.card_number,
    },
  };
};

/**
 * Look up a member's status directly by card number (manual lookup, no QR token).
 * Returns the same shape as verifyCard so the frontend can use the same result renderer.
 */
const lookupCardByNumber = async ({ cardNumber, scannedById }, ipAddress) => {
  if (!cardNumber || typeof cardNumber !== 'string' || !cardNumber.trim()) {
    throw new AppError(400, 'ValidationError', 'Card number is required');
  }

  const normalized = cardNumber.trim().toUpperCase();

  const cardResult = await query(
    `SELECT c.*,
            u.full_name as parent_name,
            u.email as parent_email,
            u.role as user_role,
            u.photo_url as parent_photo,
            u.registration_number as parent_reg_no,
            fm.full_name as family_member_name,
            fm.relation as family_member_relation,
            fm.photo_url as family_member_photo,
            m.id as membership_id, m.status as membership_status, m.is_master_card
     FROM cards c
     JOIN memberships m ON c.membership_id = m.id
     JOIN users u ON c.user_id = u.id
     LEFT JOIN family_members fm ON c.family_member_id = fm.id
     WHERE UPPER(c.card_number) = $1 AND c.is_active = true`,
    [normalized]
  );

  if (cardResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', `No active card found matching "${cardNumber.trim()}". Check the number and try again.`);
  }

  const card = cardResult.rows[0];

  // Fetch live per-facility subscription statuses
  const subResult = await query(
    `SELECT facility, status, next_due_date
     FROM facility_subscriptions
     WHERE membership_id = $1`,
    [card.membership_id]
  );

  const facilities = {
    GYM: 'NOT_SUBSCRIBED',
    SWIMMING: 'NOT_SUBSCRIBED',
    SADDLE: 'NOT_SUBSCRIBED',
  };
  subResult.rows.forEach(sub => {
    facilities[sub.facility] = sub.status;
  });

  const isChildCard = Boolean(card.family_member_id);

  return {
    status: 'SUCCESS',
    method: 'MANUAL_LOOKUP',
    member: {
      full_name: isChildCard ? card.family_member_name : card.parent_name,
      parent_name: isChildCard ? card.parent_name : null,
      role: isChildCard ? `Dependent Child (${card.family_member_relation})` : card.user_role,
      photo_url: isChildCard ? (card.family_member_photo || card.parent_photo) : card.parent_photo,
      registration_number: isChildCard ? (card.parent_reg_no ? `Parent Reg: ${card.parent_reg_no}` : null) : card.parent_reg_no,
    },
    membership: {
      id: card.membership_id,
      status: card.membership_status,
      is_master_card: card.is_master_card,
      facilities,
    },
    card: {
      id: card.id,
      card_number: card.card_number,
    },
  };
};

module.exports = {
  scanQRCode,
  getAttendanceLogs,
  verifyCard,
  lookupCardByNumber,
};
