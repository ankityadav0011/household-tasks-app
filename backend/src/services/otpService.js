const crypto = require('crypto');
const { AppError } = require('../utils/errors');
const { runInTransaction } = require('../db/database');

/**
 * All OTP rules live here, so they are easy to read and unit test:
 *  - 6-digit code from a cryptographically secure generator
 *  - only an HMAC hash of the code is stored
 *  - valid for 10 minutes, single use
 *  - at most 5 wrong attempts per code
 *  - 30 second cooldown between codes
 *
 * `now` is injectable so tests can move the clock without waiting.
 */
function createOtpService({ db, mailer, config, now = Date.now }) {
  const { ttlMs, maxAttempts, resendCooldownMs, secret, length } = config.otp;

  // HMAC (keyed hash) instead of plain SHA-256: a 6-digit code has only 1,000,000 possibilities,
  // so a plain hash could be brute-forced instantly if the database leaked.
  const hashCode = (userId, code) =>
    crypto.createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');

  const generateCode = () => String(crypto.randomInt(0, 10 ** length)).padStart(length, '0');

  const latestFor = (userId) =>
    db.prepare('SELECT * FROM otps WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId);

  function secondsUntilResend(userId) {
    const last = latestFor(userId);
    if (!last) return 0;
    const remainingMs = last.created_at + resendCooldownMs - now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  /**
   * Creates and emails a new code. If the cooldown is still running, nothing is sent.
   * Returns { sent, resendAvailableInSeconds }.
   */
  async function issue(user) {
    const wait = secondsUntilResend(user.id);
    if (wait > 0) return { sent: false, resendAvailableInSeconds: wait };

    const code = generateCode();
    const createdAt = now();
    let otpId;
    runInTransaction(db, () => {
      // Invalidate any earlier code so only the newest one works.
      db.prepare('UPDATE otps SET consumed = 1 WHERE user_id = ? AND consumed = 0').run(user.id);
      otpId = db
        .prepare('INSERT INTO otps (user_id, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .run(user.id, hashCode(user.id, code), createdAt + ttlMs, createdAt).lastInsertRowid;
    });

    try {
      await mailer.sendOtpEmail(user.email, code);
    } catch (err) {
      console.error('[otp] email send failed:', err.message);
      db.prepare('DELETE FROM otps WHERE id = ?').run(otpId); // do not start a cooldown for an unsent code
      throw new AppError(502, 'EMAIL_SEND_FAILED', 'We could not send the verification email. Please try again.');
    }
    return { sent: true, resendAvailableInSeconds: Math.ceil(resendCooldownMs / 1000) };
  }

  /** Checks a code. Throws an AppError describing exactly what went wrong; returns nothing on success. */
  function verify(user, code) {
    const otp = latestFor(user.id);
    if (!otp || otp.consumed) {
      throw new AppError(400, 'OTP_NOT_FOUND', 'No active code found. Please request a new code.');
    }
    if (otp.expires_at <= now()) {
      throw new AppError(400, 'OTP_EXPIRED', 'This code has expired. Please request a new code.');
    }
    if (otp.attempts >= maxAttempts) {
      throw new AppError(429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many wrong attempts. Please request a new code.');
    }

    const expected = Buffer.from(otp.code_hash, 'hex');
    const actual = Buffer.from(hashCode(user.id, code), 'hex');
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!matches) {
      const attempts = otp.attempts + 1;
      db.prepare('UPDATE otps SET attempts = ? WHERE id = ?').run(attempts, otp.id);
      const attemptsLeft = maxAttempts - attempts;
      const message =
        attemptsLeft > 0
          ? `Incorrect code. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`
          : 'Incorrect code. No attempts left. Please request a new code.';
      throw new AppError(400, 'OTP_INVALID', message, { attemptsLeft });
    }

    db.prepare('UPDATE otps SET consumed = 1 WHERE id = ?').run(otp.id); // single use
  }

  return { issue, verify, secondsUntilResend };
}

module.exports = { createOtpService };
