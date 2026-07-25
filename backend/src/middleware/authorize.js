/**
 * Role-based authorization middleware.
 * Must be used AFTER authenticate middleware.
 * 
 * @param  {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 * 
 * Usage: authorize('ADMIN', 'TRAINER')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware that checks if user owns the resource OR is an admin.
 * Requires a param or body field to match against user ID.
 * 
 * @param {string} userIdField - Field name in req.params containing the resource owner's user ID
 */
const authorizeOwnerOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    if (req.user.role === 'ADMIN' || req.user.id === resourceUserId) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own resources',
    });
  };
};

module.exports = { authorize, authorizeOwnerOrAdmin };
