const { query, withTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('./audit.service');
const { activateMembership } = require('./membership.service');
const { createCard } = require('./card.service');
const { checkIdempotencyKey, storeIdempotencyKey } = require('../utils/idempotency');
const { PAYMENT_STATUS, PAYMENT_TYPE, PAYMENT_METHOD, MEMBERSHIP_STATUS, AUDIT_ACTIONS } = require('../utils/constants');
const { AppError } = require('../middleware/errorHandler');
const env = require('../config/env');

// Lazy-loaded payment provider
let paymentProvider = null;
const getPaymentProvider = () => {
  if (!paymentProvider) {
    if (env.PAYMENT_PROVIDER === 'mock') {
      const MockJazzCash = require('../providers/payment/MockJazzCashSandboxProvider');
      paymentProvider = new MockJazzCash();
    }
  }
  return paymentProvider;
};

/**
 * Initiate a gateway payment for a membership.
 * Idempotent via X-Idempotency-Key header.
 */
const initiatePayment = async ({ membershipId, paymentType, idempotencyKey, userId }, ipAddress) => {
  // Check idempotency
  if (idempotencyKey) {
    const cached = await checkIdempotencyKey(idempotencyKey);
    if (cached) {
      return cached;
    }
  }

  // Get membership and rate details
  const membershipResult = await query(
    `SELECT m.*, rt.registration_fee, rt.monthly_fee, rt.category_label
     FROM memberships m
     JOIN rate_tables rt ON m.rate_table_id = rt.id
     WHERE m.id = $1 AND m.user_id = $2`,
    [membershipId, userId]
  );

  if (membershipResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Membership not found');
  }

  const membership = membershipResult.rows[0];

  // Determine amount based on payment type
  let amount;
  if (paymentType === PAYMENT_TYPE.REGISTRATION) {
    if (membership.registration_fee_paid || membership.status === MEMBERSHIP_STATUS.ACTIVE) {
      throw new AppError(400, 'AlreadyPaid', 'Your sports card registration fee has already been paid and verified.');
    }
    amount = membership.registration_fee;
  } else if (paymentType === PAYMENT_TYPE.MONTHLY) {
    const subResult = await query(
      `SELECT SUM(monthly_fee) as monthly_total 
       FROM facility_subscriptions 
       WHERE membership_id = $1 AND status IN ('PENDING_PAYMENT', 'OVERDUE')`,
      [membershipId]
    );
    amount = parseInt(subResult.rows[0]?.monthly_total || 0);
    if (amount <= 0) {
      throw new AppError(400, 'NoDuesPending', 'You already have active subscriptions for these facilities and no payment is currently due.');
    }
  } else if (paymentType === PAYMENT_TYPE.DUPLICATE_CARD_FEE) {
    amount = 500; // Fixed fee for duplicate card
  } else if (paymentType === PAYMENT_TYPE.LATE_FEE) {
    amount = 200; // Fixed late fee
  } else {
    throw new AppError(400, 'InvalidPaymentType', `Unknown payment type: ${paymentType}`);
  }

  // Get user email
  const userResult = await query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];

  // Reuse existing pending payment if it matches the current amount to prevent duplicate payment initialization
  const existingPending = await query(
    `SELECT * FROM payments 
     WHERE membership_id = $1 AND payment_type = $2 AND status = 'PENDING'`,
    [membershipId, paymentType]
  );
  if (existingPending.rows.length > 0) {
    const payment = existingPending.rows[0];
    if (parseInt(payment.amount) === amount) {
      const provider = getPaymentProvider();
      const gatewayResult = await provider.initiatePayment({
        paymentId: payment.id,
        amount,
        description: `${paymentType} — ${membership.category_label}`,
        customerEmail: user.email || `${userId}@nust.edu.pk`,
        callbackUrl: `${env.FRONTEND_URL}/api/v1/payments/gateway/callback`,
        idempotencyKey: payment.idempotency_key,
      });
      await query(
        'UPDATE payments SET gateway_transaction_id = $1, updated_at = NOW() WHERE id = $2',
        [gatewayResult.transactionId, payment.id]
      );
      return {
        payment: { ...payment, gateway_transaction_id: gatewayResult.transactionId },
        checkoutUrl: gatewayResult.checkoutUrl,
      };
    } else {
      // Amount changed (user updated subscriptions), mark old as FAILED and proceed to create new
      await query("UPDATE payments SET status = 'FAILED', updated_at = NOW() WHERE id = $1", [payment.id]);
    }
  }

  const paymentIdempotencyKey = idempotencyKey || uuidv4();

  return await withTransaction(async (client) => {
    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (id, membership_id, user_id, amount, payment_type, payment_method, status,
       idempotency_key, billing_period_start, billing_period_end, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', NOW(), NOW())
       RETURNING *`,
      [membershipId, userId, amount, paymentType, PAYMENT_METHOD.GATEWAY, PAYMENT_STATUS.PENDING, paymentIdempotencyKey]
    );

    const payment = paymentResult.rows[0];

    // Initiate with payment provider
    const provider = getPaymentProvider();
    const gatewayResult = await provider.initiatePayment({
      paymentId: payment.id,
      amount,
      description: `${paymentType} — ${membership.category_label}`,
      customerEmail: user.email || `${userId}@nust.edu.pk`,
      callbackUrl: `${env.FRONTEND_URL}/api/v1/payments/gateway/callback`,
      idempotencyKey: paymentIdempotencyKey,
    });

    // Store gateway transaction ID
    await client.query(
      'UPDATE payments SET gateway_transaction_id = $1, updated_at = NOW() WHERE id = $2',
      [gatewayResult.transactionId, payment.id]
    );

    // Audit
    await logAudit({
      action: AUDIT_ACTIONS.PAYMENT_INITIATED,
      actorId: userId,
      targetType: 'PAYMENT',
      targetId: payment.id,
      details: { amount, paymentType, transactionId: gatewayResult.transactionId },
      ipAddress,
      client,
    });

    const response = {
      payment: { ...payment, gateway_transaction_id: gatewayResult.transactionId },
      checkoutUrl: gatewayResult.checkoutUrl,
    };

    // Cache idempotency
    if (idempotencyKey) {
      await storeIdempotencyKey(idempotencyKey, response);
    }

    return response;
  });
};

/**
 * Handle gateway callback after payment.
 */
const handleGatewayCallback = async (payload) => {
  const provider = getPaymentProvider();
  const callbackResult = await provider.processCallback(payload);

  if (!callbackResult.transactionId) {
    throw new AppError(400, 'InvalidCallback', 'Missing transaction ID in callback');
  }

  const paymentResult = await query(
    'SELECT * FROM payments WHERE gateway_transaction_id = $1 OR id::text = $1',
    [callbackResult.transactionId]
  );

  if (paymentResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Payment not found for this transaction');
  }

  const payment = paymentResult.rows[0];

  if (payment.status !== PAYMENT_STATUS.PENDING) {
    return { message: 'Payment already processed', payment };
  }

  return await withTransaction(async (client) => {
    if (callbackResult.verified) {
      // Update payment status
      await client.query(
        `UPDATE payments SET status = $1, gateway_response = $2, updated_at = NOW() WHERE id = $3`,
        [PAYMENT_STATUS.VERIFIED, JSON.stringify(callbackResult), payment.id]
      );

      // If this is a registration payment, activate the membership AND create the card
      if (payment.payment_type === PAYMENT_TYPE.REGISTRATION) {
        await activateMembership(payment.membership_id, client);

        // Auto-create digital card immediately after activation
        const memInfo = await client.query('SELECT family_member_id FROM memberships WHERE id = $1', [payment.membership_id]);
        const famMemberId = memInfo.rows[0]?.family_member_id || null;
        await createCard(payment.membership_id, payment.user_id, client, famMemberId);

        await logAudit({
          action: AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED,
          actorId: payment.user_id,
          targetType: 'MEMBERSHIP',
          targetId: payment.membership_id,
          details: { paymentId: payment.id, method: 'GATEWAY' },
          client,
        });
      }

      // If monthly payment, reactivate subscriptions and the membership if overdue
      if (payment.payment_type === PAYMENT_TYPE.MONTHLY) {
        // Set all pending/overdue facility subscriptions to ACTIVE
        await client.query(
          `UPDATE facility_subscriptions 
           SET status = 'ACTIVE', next_due_date = CURRENT_DATE + INTERVAL '1 month', updated_at = NOW() 
           WHERE membership_id = $1 AND status IN ('PENDING_PAYMENT', 'OVERDUE')`,
          [payment.membership_id]
        );

        const membershipResult = await client.query(
          'SELECT status FROM memberships WHERE id = $1',
          [payment.membership_id]
        );
        if (membershipResult.rows[0]?.status === MEMBERSHIP_STATUS.OVERDUE) {
          await activateMembership(payment.membership_id, client);
        }
      }

      await logAudit({
        action: AUDIT_ACTIONS.PAYMENT_VERIFIED,
        actorId: payment.user_id,
        targetType: 'PAYMENT',
        targetId: payment.id,
        details: { amount: payment.amount, method: 'GATEWAY' },
        client,
      });

      return { message: 'Payment verified successfully', status: 'VERIFIED' };
    } else {
      await client.query(
        `UPDATE payments SET status = $1, gateway_response = $2, updated_at = NOW() WHERE id = $3`,
        [PAYMENT_STATUS.FAILED, JSON.stringify(callbackResult), payment.id]
      );

      await logAudit({
        action: AUDIT_ACTIONS.PAYMENT_FAILED,
        actorId: payment.user_id,
        targetType: 'PAYMENT',
        targetId: payment.id,
        details: { reason: 'Gateway verification failed' },
        client,
      });

      return { message: 'Payment verification failed', status: 'FAILED' };
    }
  });
};

/**
 * Upload a bank deposit slip for manual verification.
 */
const uploadBankSlip = async ({ membershipId, paymentType, userId, slipPath }, ipAddress) => {
  // Get membership and rate info
  const membershipResult = await query(
    `SELECT m.*, rt.registration_fee, rt.monthly_fee
     FROM memberships m
     JOIN rate_tables rt ON m.rate_table_id = rt.id
     WHERE m.id = $1 AND m.user_id = $2`,
    [membershipId, userId]
  );

  if (membershipResult.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Membership not found');
  }

  const membership = membershipResult.rows[0];
  const amount = paymentType === PAYMENT_TYPE.REGISTRATION
    ? membership.registration_fee
    : membership.monthly_fee;

  return await withTransaction(async (client) => {
    const paymentResult = await client.query(
      `INSERT INTO payments (id, membership_id, user_id, amount, payment_type, payment_method, status,
       bank_slip_path, idempotency_key, billing_period_start, billing_period_end, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', NOW(), NOW())
       RETURNING *`,
      [
        membershipId, userId, amount, paymentType,
        PAYMENT_METHOD.BANK_SLIP, PAYMENT_STATUS.PENDING_VERIFICATION,
        slipPath, uuidv4(),
      ]
    );

    await logAudit({
      action: AUDIT_ACTIONS.BANK_SLIP_UPLOADED,
      actorId: userId,
      targetType: 'PAYMENT',
      targetId: paymentResult.rows[0].id,
      details: { amount, paymentType },
      ipAddress,
      client,
    });

    return paymentResult.rows[0];
  });
};

/**
 * List payments for a user.
 */
const getUserPayments = async (userId) => {
  const result = await query(
    `SELECT p.*, m.category_code, f.name as facility_name
     FROM payments p
     LEFT JOIN memberships m ON p.membership_id = m.id
     LEFT JOIN facilities f ON m.facility_id = f.id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Get a single payment's details.
 */
const getPaymentById = async (paymentId, userId) => {
  const result = await query(
    `SELECT p.*, m.category_code, f.name as facility_name, u.full_name as user_name
     FROM payments p
     LEFT JOIN memberships m ON p.membership_id = m.id
     LEFT JOIN facilities f ON m.facility_id = f.id
     LEFT JOIN users u ON p.user_id = u.id
     WHERE p.id = $1`,
    [paymentId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'NotFound', 'Payment not found');
  }

  if (userId && result.rows[0].user_id !== userId) {
    throw new AppError(403, 'Forbidden', 'You can only view your own payments');
  }

  return result.rows[0];
};

module.exports = {
  initiatePayment,
  handleGatewayCallback,
  uploadBankSlip,
  getUserPayments,
  getPaymentById,
};
