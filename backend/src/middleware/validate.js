/**
 * Request validation middleware using Joi schemas.
 * 
 * @param {Object} schema - Object with optional `body`, `query`, `params` Joi schemas
 * @returns {Function} Express middleware
 * 
 * Usage: validate({ body: Joi.object({ email: Joi.string().email().required() }) })
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [source, joiSchema] of Object.entries(schema)) {
      if (!req[source]) continue;
      
      const { error, value } = joiSchema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        errors: { wrap: { label: '' } },
      });

      if (error) {
        errors.push(
          ...error.details.map((detail) => ({
            source,
            field: detail.path.join('.'),
            message: detail.message,
          }))
        );
      } else {
        // Replace req[source] with sanitized/validated values
        req[source] = value;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid request data',
        details: errors,
      });
    }

    next();
  };
};

module.exports = { validate };
