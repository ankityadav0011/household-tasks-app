const crypto = require('crypto');

/**
 * Builds the app configuration from environment variables.
 * Taking `env` as a parameter (instead of reading process.env directly)
 * lets tests pass their own values.
 */
function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';

  function secret(name) {
    const value = env[name];
    if (value && value.length >= 16) return value;
    if (nodeEnv === 'production') {
      throw new Error(`${name} must be set (min 16 characters) in production.`);
    }
    console.warn(`[config] ${name} not set: using a temporary random secret (development only).`);
    return crypto.randomBytes(32).toString('hex');
  }

  return {
    nodeEnv,
    port: Number(env.PORT) || 3000,
    dbPath: env.DB_PATH || './data/padosipro.db',
    // Low cost in tests keeps them fast; 10 rounds is a sensible default otherwise.
    bcryptRounds: nodeEnv === 'test' ? 4 : 10,
    jwt: {
      secret: secret('JWT_SECRET'),
      expiresIn: env.JWT_EXPIRES_IN || '7d',
    },
    otp: {
      secret: secret('OTP_HMAC_SECRET'),
      length: 6,
      ttlMs: 10 * 60 * 1000, // valid for 10 minutes
      maxAttempts: 5, // wrong attempts allowed per code
      resendCooldownMs: 30 * 1000, // ~30 seconds between codes
    },
    smtp: {
      host: env.SMTP_HOST || '',
      port: Number(env.SMTP_PORT) || 587,
      secure: env.SMTP_SECURE === 'true',
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
      from: env.MAIL_FROM || 'PadosiPro <no-reply@padosipro.local>',
    },
    logOtpToConsole: env.LOG_OTP_TO_CONSOLE === 'true' && nodeEnv !== 'production',
  };
}

module.exports = { loadConfig };
