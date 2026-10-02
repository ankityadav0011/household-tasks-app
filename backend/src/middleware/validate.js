const { AppError } = require('../utils/errors');

/** Validates req.body against a zod schema and replaces it with the cleaned data. */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new AppError(400, 'VALIDATION_ERROR', details[0].message, details));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
