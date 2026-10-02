const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

function createAuthService({ db, otpService, config }) {
  // Used to keep login timing similar when the email does not exist (avoids revealing which emails are registered).
  const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', config.bcryptRounds);

  const findByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  function getOnboarding(userId) {
    const hasProfile = db.prepare('SELECT 1 FROM profiles WHERE user_id = ?').get(userId);
    const taskCount = db.prepare('SELECT COUNT(*) AS n FROM user_tasks WHERE user_id = ?').get(userId).n;
    return { profileCompleted: Boolean(hasProfile), tasksSelected: taskCount > 0 };
  }

  async function register({ email, password }) {
    const existing = findByEmail(email);
    if (existing && existing.email_verified) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists. Please log in.');
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    let user = existing;
    if (existing) {
      // Unverified account being re-registered: let the person continue with their new password.
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, existing.id);
    } else {
      const info = db
        .prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)')
        .run(email, passwordHash, Date.now());
      user = { id: Number(info.lastInsertRowid), email };
    }

    const { resendAvailableInSeconds } = await otpService.issue(user);
    return {
      message: 'Account created. We sent a 6-digit code to your email.',
      email: user.email,
      resendAvailableInSeconds,
    };
  }

  async function verifyEmail({ email, code }) {
    const user = findByEmail(email);
    if (!user) throw new AppError(400, 'OTP_NOT_FOUND', 'No active code found. Please request a new code.');
    if (user.email_verified) {
      throw new AppError(409, 'ALREADY_VERIFIED', 'This email is already verified. Please log in.');
    }
    otpService.verify(user, code);
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(user.id);
    return { message: 'Email verified. You can now log in.' };
  }

  async function resendOtp({ email }) {
    const user = findByEmail(email);
    // Same response for unknown or already verified emails, so this endpoint does not reveal who is registered.
    if (!user || user.email_verified) {
      return {
        message: 'If this email needs verification, a new code has been sent.',
        resendAvailableInSeconds: Math.ceil(config.otp.resendCooldownMs / 1000),
      };
    }
    const result = await otpService.issue(user);
    if (!result.sent) {
      throw new AppError(
        429,
        'OTP_RESEND_COOLDOWN',
        `Please wait ${result.resendAvailableInSeconds} seconds before requesting a new code.`,
        { retryAfterSeconds: result.resendAvailableInSeconds },
      );
    }
    return {
      message: 'A new code has been sent to your email.',
      resendAvailableInSeconds: result.resendAvailableInSeconds,
    };
  }

  async function login({ email, password }) {
    const user = findByEmail(email);
    const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !passwordOk) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    }

    if (!user.email_verified) {
      // Password was right, so it is safe to send them a fresh code and route them to verification.
      const { resendAvailableInSeconds } = await otpService.issue(user);
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email to continue.', {
        email: user.email,
        resendAvailableInSeconds,
      });
    }

    const token = jwt.sign({ sub: user.id }, config.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: config.jwt.expiresIn,
    });
    return {
      token,
      user: { id: user.id, email: user.email },
      onboarding: getOnboarding(user.id),
    };
  }

  function getMe(user) {
    return { user: { id: user.id, email: user.email }, onboarding: getOnboarding(user.id) };
  }

  return { register, verifyEmail, resendOtp, login, getMe };
}

module.exports = { createAuthService };
