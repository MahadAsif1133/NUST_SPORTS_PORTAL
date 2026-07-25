const cron = require('node-cron');
const { query, withTransaction } = require('../config/database');
const { MEMBERSHIP_STATUS, AUDIT_ACTIONS } = require('../utils/constants');

/**
 * Start all scheduled background jobs.
 */
const startScheduledJobs = () => {
  // Check for overdue payments daily at 00:05
  cron.schedule('5 0 * * *', async () => {
    console.log('[JOB] Running payment overdue checker...');
    await checkOverduePayments();
  });

  // Handle expired freeze periods daily at 00:10
  cron.schedule('10 0 * * *', async () => {
    console.log('[JOB] Running freeze expiry handler...');
    await handleExpiredFreezes();
  });

  console.log('[JOBS] Scheduled jobs registered');
};

/**
 * POLICY_TODO: Non-payment rules differ between facilities.
 * Pool SOP: Cancel after missing 5th of any month (0 grace days).
 * Saddle Club SOP: Late fee at day 5, cancellation at day 10 (5 grace days).
 * Cumulative: 2 missed months in a calendar year → cancellation.
 * 
 * Uses per-facility configurable values from the facilities table.
 */
async function checkOverduePayments() {
  try {
    // Find ACTIVE memberships past their payment due date
    const overdueResult = await query(`
      SELECT m.id, m.user_id, m.facility_id, m.missed_months_this_year, m.is_master_card,
             f.grace_period_days, f.cumulative_missed_months_limit, f.name as facility_name
      FROM memberships m
      LEFT JOIN facilities f ON m.facility_id = f.id
      WHERE m.status = $1
        AND m.next_payment_due IS NOT NULL
        AND m.next_payment_due < CURRENT_DATE
    `, [MEMBERSHIP_STATUS.ACTIVE]);

    for (const membership of overdueResult.rows) {
      const daysPastDue = Math.floor(
        (Date.now() - new Date(membership.next_payment_due).getTime()) / (1000 * 60 * 60 * 24)
      );

      const graceDays = membership.grace_period_days || 0;
      const cumulativeLimit = membership.cumulative_missed_months_limit || 2;
      const newMissedMonths = membership.missed_months_this_year + 1;

      await withTransaction(async (client) => {
        if (daysPastDue > graceDays || newMissedMonths >= cumulativeLimit) {
          // Cancel the membership
          await client.query(`
            UPDATE memberships 
            SET status = $1, cancelled_at = NOW(), 
                cancellation_reason = $2,
                missed_months_this_year = $3,
                updated_at = NOW()
            WHERE id = $4
          `, [
            MEMBERSHIP_STATUS.CANCELLED,
            daysPastDue > graceDays
              ? `Non-payment: ${daysPastDue} days past due (grace: ${graceDays} days)`
              : `Cumulative non-payment: ${newMissedMonths} missed months this year (limit: ${cumulativeLimit})`,
            newMissedMonths,
            membership.id,
          ]);

          // Audit log
          await client.query(`
            INSERT INTO audit_logs (id, action, actor_id, target_type, target_id, details, reason, created_at)
            VALUES (gen_random_uuid(), $1, $2, 'MEMBERSHIP', $3, $4, $5, NOW())
          `, [
            AUDIT_ACTIONS.MEMBERSHIP_CANCELLED,
            membership.user_id, // System action attributed to user
            membership.id,
            JSON.stringify({ daysPastDue, graceDays, missedMonths: newMissedMonths }),
            'Automatic cancellation due to non-payment',
          ]);

          console.log(`[JOB] Cancelled membership ${membership.id} — ${daysPastDue} days past due`);
        } else {
          // Mark as overdue
          await client.query(`
            UPDATE memberships 
            SET status = $1, missed_months_this_year = $2, updated_at = NOW()
            WHERE id = $3
          `, [MEMBERSHIP_STATUS.OVERDUE, newMissedMonths, membership.id]);

          await client.query(`
            INSERT INTO audit_logs (id, action, actor_id, target_type, target_id, details, created_at)
            VALUES (gen_random_uuid(), $1, $2, 'MEMBERSHIP', $3, $4, NOW())
          `, [
            AUDIT_ACTIONS.MEMBERSHIP_OVERDUE,
            membership.user_id,
            membership.id,
            JSON.stringify({ daysPastDue, graceDays }),
          ]);

          console.log(`[JOB] Marked membership ${membership.id} as OVERDUE`);
        }
      });
    }

    console.log(`[JOB] Overdue check complete. Processed ${overdueResult.rows.length} memberships.`);
  } catch (err) {
    console.error('[JOB] Error in overdue checker:', err);
  }
}

/**
 * Handle freeze periods that have ended.
 * If the monthly fee isn't paid by the 5th of the month following freeze end,
 * auto-flip to OVERDUE.
 */
async function handleExpiredFreezes() {
  try {
    const expiredResult = await query(`
      SELECT fr.id as freeze_id, fr.membership_id, fr.user_id, fr.freeze_end,
             m.status as membership_status
      FROM freeze_requests fr
      JOIN memberships m ON fr.membership_id = m.id
      WHERE fr.status = 'APPROVED'
        AND fr.freeze_end < CURRENT_DATE
        AND m.status = $1
    `, [MEMBERSHIP_STATUS.FROZEN]);

    for (const freeze of expiredResult.rows) {
      await withTransaction(async (client) => {
        // Check if payment was made for the post-freeze month
        const paymentCheck = await client.query(`
          SELECT id FROM payments
          WHERE membership_id = $1
            AND status = 'VERIFIED'
            AND billing_period_start >= $2
          LIMIT 1
        `, [freeze.membership_id, freeze.freeze_end]);

        const newStatus = paymentCheck.rows.length > 0
          ? MEMBERSHIP_STATUS.ACTIVE
          : MEMBERSHIP_STATUS.OVERDUE;

        await client.query(`
          UPDATE memberships SET status = $1, updated_at = NOW() WHERE id = $2
        `, [newStatus, freeze.membership_id]);

        await client.query(`
          INSERT INTO audit_logs (id, action, actor_id, target_type, target_id, details, created_at)
          VALUES (gen_random_uuid(), $1, $2, 'MEMBERSHIP', $3, $4, NOW())
        `, [
          AUDIT_ACTIONS.MEMBERSHIP_UNFROZEN,
          freeze.user_id,
          freeze.membership_id,
          JSON.stringify({ freezeEnd: freeze.freeze_end, newStatus }),
        ]);

        console.log(`[JOB] Unfroze membership ${freeze.membership_id} → ${newStatus}`);
      });
    }

    console.log(`[JOB] Freeze expiry check complete. Processed ${expiredResult.rows.length} freezes.`);
  } catch (err) {
    console.error('[JOB] Error in freeze expiry handler:', err);
  }
}

module.exports = { startScheduledJobs };
