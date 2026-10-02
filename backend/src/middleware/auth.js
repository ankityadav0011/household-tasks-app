const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

/** Requires "Authorization: Bearer <jwt>" and loads the user into req.user. */
function requireAuth({ db, config }) {
  return (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.'));
    }
    try {
      const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
      const user = db
        .prepare('SELECT id, email, email_verified FROM users WHERE id = ?')
        .get(payload.sub);
      if (!user || !user.email_verified) throw new Error('user not valid');
      req.user = { id: user.id, email: user.email };
      next();
    } catch (err) {
      next(new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please log in again.'));
    }
  };
}

module.exports = { requireAuth };
