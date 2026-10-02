const test = require('node:test');
const assert = require('node:assert/strict');
const { createOtpService } = require('../src/services/otpService');
const { createTestContext } = require('./helpers');

function setup() {
  const ctx = createTestContext({ withApp: false });
  const otp = createOtpService({ db: ctx.db, mailer: ctx.mailer, config: ctx.config, now: () => ctx.clock.now() });
  const info = ctx.db
    .prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)')
    .run('otp@test.com', 'x', ctx.clock.now());
  const user = { id: Number(info.lastInsertRowid), email: 'otp@test.com' };
  return { ...ctx, otp, user };
}

const wrongCodeFor = (code) => (code === '000000' ? '111111' : '000000');
const TEN_MINUTES = 10 * 60 * 1000;

test('generates a 6-digit numeric code and emails it', async () => {
  const { otp, user, mailer } = setup();
  const result = await otp.issue(user);
  assert.equal(result.sent, true);
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, user.email);
  assert.match(mailer.lastCode(), /^\d{6}$/);
});

test('stores only a hash of the code, never the code', async () => {
  const { otp, user, mailer, db } = setup();
  await otp.issue(user);
  const row = db.prepare('SELECT * FROM otps').get();
  assert.notEqual(row.code_hash, mailer.lastCode());
  assert.equal(row.code_hash.length, 64); // hex SHA-256 HMAC
});

test('correct code verifies, and a code can only be used once', async () => {
  const { otp, user, mailer } = setup();
  await otp.issue(user);
  const code = mailer.lastCode();
  assert.doesNotThrow(() => otp.verify(user, code));
  assert.throws(() => otp.verify(user, code), { code: 'OTP_NOT_FOUND' });
});

test('code is still valid just before 10 minutes', async () => {
  const { otp, user, mailer, clock } = setup();
  await otp.issue(user);
  clock.advance(TEN_MINUTES - 1000);
  assert.doesNotThrow(() => otp.verify(user, mailer.lastCode()));
});

test('code expires after 10 minutes', async () => {
  const { otp, user, mailer, clock } = setup();
  await otp.issue(user);
  clock.advance(TEN_MINUTES);
  assert.throws(() => otp.verify(user, mailer.lastCode()), { code: 'OTP_EXPIRED' });
});

test('reports remaining attempts and locks after 5 wrong attempts', async () => {
  const { otp, user, mailer } = setup();
  await otp.issue(user);
  const code = mailer.lastCode();
  const wrong = wrongCodeFor(code);

  assert.throws(() => otp.verify(user, wrong), (err) => err.code === 'OTP_INVALID' && err.details.attemptsLeft === 4);
  for (let i = 0; i < 3; i += 1) assert.throws(() => otp.verify(user, wrong), { code: 'OTP_INVALID' });
  assert.throws(() => otp.verify(user, wrong), (err) => err.code === 'OTP_INVALID' && err.details.attemptsLeft === 0);

  // Even the CORRECT code is rejected once attempts are used up.
  assert.throws(() => otp.verify(user, code), { code: 'OTP_ATTEMPTS_EXCEEDED' });
});

test('enforces a 30 second resend cooldown', async () => {
  const { otp, user, mailer, clock } = setup();
  await otp.issue(user);

  clock.advance(10 * 1000);
  const blocked = await otp.issue(user);
  assert.equal(blocked.sent, false);
  assert.equal(blocked.resendAvailableInSeconds, 20);
  assert.equal(mailer.sent.length, 1);

  clock.advance(20 * 1000);
  const allowed = await otp.issue(user);
  assert.equal(allowed.sent, true);
  assert.equal(mailer.sent.length, 2);
});

test('requesting a new code invalidates the previous one', async () => {
  const { otp, user, mailer, clock } = setup();
  await otp.issue(user);
  const first = mailer.lastCode();
  clock.advance(31 * 1000);
  await otp.issue(user);
  const second = mailer.lastCode();
  if (first === second) return; // 1-in-a-million collision: nothing to assert
  assert.throws(() => otp.verify(user, first), { code: 'OTP_INVALID' });
  assert.doesNotThrow(() => otp.verify(user, second));
});

test('a failed email send does not leave a code or start a cooldown', async () => {
  const { user, db, config, clock } = setup();
  const failing = { async sendOtpEmail() { throw new Error('smtp down'); } };
  const otp = createOtpService({ db, mailer: failing, config, now: () => clock.now() });
  await assert.rejects(() => otp.issue(user), { code: 'EMAIL_SEND_FAILED' });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM otps').get().n, 0);
});
