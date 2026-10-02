const { loadConfig } = require('../src/config');
const { openDatabase } = require('../src/db/database');
const { seedTasks } = require('../src/db/seed');

// A clock we control, so tests can jump forward 10 minutes instantly.
function createClock(start = 1_700_000_000_000) {
  return {
    t: start,
    now() { return this.t; },
    advance(ms) { this.t += ms; },
  };
}

// Captures emails instead of sending them, so tests can read the OTP.
function createFakeMailer() {
  const sent = [];
  return {
    sent,
    async sendOtpEmail(to, code) { sent.push({ to, code }); },
    lastCode() { return sent.length ? sent[sent.length - 1].code : undefined; },
  };
}

// withApp: false gives fast unit tests that only need the database, clock and mailer.
function createTestContext({ withApp = true } = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 't'.repeat(32),
    OTP_HMAC_SECRET: 'o'.repeat(32),
  });
  const db = openDatabase(':memory:');
  seedTasks(db);
  const clock = createClock();
  const mailer = createFakeMailer();
  const ctx = { config, db, clock, mailer };
  if (withApp) {
    const { createApp } = require('../src/app');
    ctx.app = createApp({ db, config, mailer, now: () => clock.now(), enableRateLimit: false });
  }
  return ctx;
}

module.exports = { createTestContext };
