const { query } = require('../config/database');

/**
 * Write an immutable audit log entry.
 * 
 * @param {Object} params
 * @param {string} params.action - AUDIT_ACTIONS constant
 * @param {string} params.actorId - UUID of the user performing the action
 * @param {string} params.targetType - Entity type (e.g., 'USER', 'MEMBERSHIP', 'PAYMENT')
 * @param {string} params.targetId - UUID of the target entity
 * @param {Object} [params.details] - Additional JSON details
 * @param {string} [params.reason] - Human-readable reason
 * @param {string} [params.ipAddress] - Request IP address
 * @param {Object} [params.client] - Database client for transactional logging
 */
const logAudit = async ({ action, actorId, targetType, targetId, details = null, reason = null, ipAddress = null, client = null }) => {
  const queryFn = client ? client.query.bind(client) : query;

  await queryFn(
    `INSERT INTO audit_logs (id, action, actor_id, target_type, target_id, details, reason, ip_address, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
    [action, actorId, targetType, targetId, details ? JSON.stringify(details) : null, reason, ipAddress]
  );
};

/**
 * Query audit logs with pagination and optional filters.
 * 
 * @param {Object} filters
 * @param {string} [filters.action] - Filter by action type
 * @param {string} [filters.actorId] - Filter by actor
 * @param {string} [filters.targetType] - Filter by target type
 * @param {string} [filters.targetId] - Filter by target
 * @param {string} [filters.startDate] - ISO date string
 * @param {string} [filters.endDate] - ISO date string
 * @param {number} [filters.page] - Page number (1-based)
 * @param {number} [filters.limit] - Items per page
 */
const queryAuditLogs = async (filters = {}) => {
  const { action, actorId, targetType, targetId, startDate, endDate, page = 1, limit = 50 } = filters;
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (action) {
    conditions.push(`al.action = $${paramIndex++}`);
    params.push(action);
  }
  if (actorId) {
    conditions.push(`al.actor_id = $${paramIndex++}`);
    params.push(actorId);
  }
  if (targetType) {
    conditions.push(`al.target_type = $${paramIndex++}`);
    params.push(targetType);
  }
  if (targetId) {
    conditions.push(`al.target_id = $${paramIndex++}`);
    params.push(targetId);
  }
  if (startDate) {
    conditions.push(`al.created_at >= $${paramIndex++}`);
    params.push(startDate);
  }
  if (endDate) {
    conditions.push(`al.created_at <= $${paramIndex++}`);
    params.push(endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
    params
  );

  const dataResult = await query(
    `SELECT al.*, u.full_name as actor_name, u.email as actor_email, u.role as actor_role
     FROM audit_logs al
     LEFT JOIN users u ON al.actor_id = u.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count, 10),
      pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
    },
  };
};

module.exports = { logAudit, queryAuditLogs };
