const { query, withTransaction } = require('../config/database');
const { logAudit } = require('./audit.service');
const { generateQRToken, generateSigningSecret } = require('../utils/qrSigner');
const { generateECardPDF, saveECardPDF } = require('./card-generator.service');
const { CARD_STATUS, AUDIT_ACTIONS, MEMBERSHIP_STATUS } = require('../utils/constants');
const { AppError } = require('../middleware/errorHandler');
const env = require('../config/env');

/**
 * Create a card for a membership after activation.
 * Called by admin or automatically after payment verification.
 */
const createCard = async (membershipId, userId, client, familyMemberId = null) => {
  const queryFn = client ? client.query.bind(client) : query;

  // Check if card already exists
  const existing = await queryFn(
    'SELECT id FROM cards WHERE membership_id = $1 AND is_active = true',
    [membershipId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Generate card ID using Node's crypto
  const cardId = require('crypto').randomUUID();

  // Generate card number from sequence
  const seqResult = await queryFn("SELECT nextval('card_number_seq') as num");
  const cardNumber = `NSP-${seqResult.rows[0].num}`;

  // Generate signing secret for QR codes
  const signingSecret = generateSigningSecret();

  // Generate the unique permanent QR token
  const token = generateQRToken({
    cardId,
    membershipId,
    userId,
    signingSecret,
  });

  const result = await queryFn(
    `INSERT INTO cards (id, membership_id, user_id, family_member_id, card_number, qr_signing_secret, current_qr_token, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [cardId, membershipId, userId, familyMemberId || null, cardNumber, signingSecret, token]
  );

  const card = result.rows[0];

  // Update membership's card_id
  await queryFn(
    'UPDATE memberships SET card_id = $1, updated_at = NOW() WHERE id = $2',
    [card.id, membershipId]
  );

  await logAudit({
    action: AUDIT_ACTIONS.CARD_CREATED,
    actorId: userId,
    targetType: 'CARD',
    targetId: card.id,
    details: { cardNumber, membershipId, familyMemberId },
    client,
  });

  return card;
};

const getUserCards = async (userId) => {
  const result = await query(
    `SELECT c.*, m.category_code, m.status as membership_status,
            fm.full_name as family_member_name,
            fm.relation as family_member_relation,
            fm.photo_url as family_member_photo,
            COALESCE(
              (SELECT json_agg(fs.*) 
               FROM facility_subscriptions fs 
               WHERE fs.membership_id = m.id),
              '[]'::json
            ) as subscriptions
     FROM cards c
     JOIN memberships m ON c.membership_id = m.id
     LEFT JOIN family_members fm ON c.family_member_id = fm.id
     WHERE c.user_id = $1 AND c.is_active = true
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Generate a fresh QR token for attendance scanning.
 * Under new logic, this returns the permanent QR verification URL.
 */
const generateQR = async (cardId, userId) => {
  const result = await query(
    `SELECT c.*, m.status as membership_status
     FROM cards c
     JOIN memberships m ON c.membership_id = m.id
     WHERE c.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [cardId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Card not found');
  }

  const card = result.rows[0];

  if (card.membership_status !== MEMBERSHIP_STATUS.ACTIVE) {
    throw new AppError(403, 'InactiveMembership', `Cannot generate QR — membership is ${card.membership_status}`);
  }

  let token = card.current_qr_token;
  if (!token) {
    token = generateQRToken({
      cardId: card.id,
      membershipId: card.membership_id,
      userId: card.user_id,
      signingSecret: card.qr_signing_secret,
    });
    await query(
      'UPDATE cards SET current_qr_token = $1, updated_at = NOW() WHERE id = $2',
      [token, card.id]
    );
  }

  const qrUrl = `${env.FRONTEND_URL}/verify-card?token=${token}`;

  return { qrToken: qrUrl, expiresIn: null };
};

/**
 * Generate and download e-card PDF.
 */
const getECard = async (cardId, userId) => {
  const result = await query(
    `SELECT c.*, m.category_code, m.start_date, m.status as membership_status,
            u.full_name, u.email, u.role, u.photo_url, u.registration_number,
            fm.full_name as family_member_name,
            fm.relation as family_member_relation,
            fm.photo_url as family_member_photo,
            COALESCE(
              (SELECT json_agg(fs.*) 
               FROM facility_subscriptions fs 
               WHERE fs.membership_id = m.id),
              '[]'::json
            ) as subscriptions
     FROM cards c
     JOIN memberships m ON c.membership_id = m.id
     JOIN users u ON c.user_id = u.id
     LEFT JOIN family_members fm ON c.family_member_id = fm.id
     WHERE c.id = $1 AND c.user_id = $2`,
    [cardId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Card not found');
  }

  const card = result.rows[0];
  if (card.family_member_name) {
    card.full_name = `${card.family_member_name} (${card.family_member_relation})`;
    if (card.family_member_photo) card.photo_url = card.family_member_photo;
  }
  const activeSubs = (card.subscriptions || []).filter(s => s.status === 'ACTIVE').map(s => s.facility);
  const gymCheck = activeSubs.includes('GYM') ? 'Gym ✓' : '';
  const swimCheck = activeSubs.includes('SWIMMING') ? 'Swimming ✓' : '';
  const saddleCheck = activeSubs.includes('SADDLE') ? 'Saddle Club ✓' : '';
  const facilityName = [gymCheck, swimCheck, saddleCheck].filter(Boolean).join(' | ') || 'No Active Subscriptions';

  let token = card.current_qr_token;
  if (!token) {
    token = generateQRToken({
      cardId: card.id,
      membershipId: card.membership_id,
      userId: card.user_id,
      signingSecret: card.qr_signing_secret,
    });
    await query(
      'UPDATE cards SET current_qr_token = $1, updated_at = NOW() WHERE id = $2',
      [token, card.id]
    );
  }

  const qrUrl = `${env.FRONTEND_URL}/verify-card?token=${token}`;

  const pdfBuffer = await generateECardPDF({
    user: card,
    membership: card,
    card,
    facilityName,
    qrData: qrUrl,
  });

  // Save to disk
  const pdfPath = await saveECardPDF(card.id, pdfBuffer);

  // Store path in card record
  await query(
    'UPDATE cards SET ecard_pdf_path = $1, updated_at = NOW() WHERE id = $2',
    [pdfPath, card.id]
  );

  return { pdfBuffer, filename: `ecard-${card.card_number}.pdf` };
};

/**
 * Report a card as lost.
 */
const reportLost = async (cardId, userId, ipAddress) => {
  const result = await query(
    `SELECT c.*, m.status as membership_status
     FROM cards c
     JOIN memberships m ON c.membership_id = m.id
     WHERE c.id = $1 AND c.user_id = $2 AND c.is_active = true`,
    [cardId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Card not found');
  }

  return await withTransaction(async (client) => {
    // Mark old card as lost
    await client.query(
      `UPDATE cards SET physical_card_status = $1, is_active = false, updated_at = NOW() WHERE id = $2`,
      [CARD_STATUS.LOST, cardId]
    );

    // Create new card
    const newCard = await createCard(result.rows[0].membership_id, userId, client);

    await logAudit({
      action: AUDIT_ACTIONS.CARD_LOST,
      actorId: userId,
      targetType: 'CARD',
      targetId: cardId,
      details: { newCardId: newCard.id },
      ipAddress,
      client,
    });

    return {
      message: 'Card reported as lost. A new card has been issued. You must pay the duplicate card fee.',
      oldCardId: cardId,
      newCard,
    };
  });
};

module.exports = {
  createCard,
  getUserCards,
  generateQR,
  getECard,
  reportLost,
};
