/**
 * An error we throw on purpose. The error handler turns it into a JSON response:
 * { "error": { "code": "...", "message": "...", "details": ... } }
 */
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { AppError };
