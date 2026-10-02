const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createTestContext } = require('./helpers');

const PASSWORD = 'Passw0rd!';

async function register(ctx, email = 'user@test.com', password = PASSWORD) {
  return request(ctx.app).post('/api/auth/register').send({ email, password, confirmPassword: password });
}

async function registerAndVerify(ctx, email = 'user@test.com') {
  await register(ctx, email);
  return request(ctx.app).post('/api/auth/verify-otp').send({ email, code: ctx.mailer.lastCode() });
}

async function loginToken(ctx, email = 'user@test.com') {
  await registerAndVerify(ctx, email);
  const res = await request(ctx.app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.body.token;
}

test('register creates an unverified user, hashes the password and sends an OTP', async () => {
  const ctx = createTestContext();
  const res = await register(ctx);
  assert.equal(res.status, 201);
  assert.equal(res.body.resendAvailableInSeconds, 30);
  assert.equal(ctx.mailer.sent.length, 1);

  const user = ctx.db.prepare('SELECT * FROM users WHERE email = ?').get('user@test.com');
  assert.equal(user.email_verified, 0);
  assert.notEqual(user.password_hash, PASSWORD);
  assert.ok(user.password_hash.startsWith('$2')); // bcrypt hash
});

test('register validates input with field-level errors', async () => {
  const ctx = createTestContext();
  const weak = await request(ctx.app)
    .post('/api/auth/register')
    .send({ email: 'not-an-email', password: 'short', confirmPassword: 'different' });
  assert.equal(weak.status, 400);
  assert.equal(weak.body.error.code, 'VALIDATION_ERROR');
  const fields = weak.body.error.details.map((d) => d.field);
  assert.ok(fields.includes('email'));
  assert.ok(fields.includes('password'));

  const mismatch = await request(ctx.app)
    .post('/api/auth/register')
    .send({ email: 'a@test.com', password: PASSWORD, confirmPassword: 'Other1234' });
  assert.equal(mismatch.status, 400);
  assert.equal(mismatch.body.error.details[0].field, 'confirmPassword');
});

test('cannot register an email that is already verified', async () => {
  const ctx = createTestContext();
  await registerAndVerify(ctx);
  const again = await register(ctx);
  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, 'EMAIL_ALREADY_REGISTERED');
});

test('login is refused for unverified users and they are sent to verification', async () => {
  const ctx = createTestContext();
  await register(ctx);
  const res = await request(ctx.app).post('/api/auth/login').send({ email: 'user@test.com', password: PASSWORD });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'EMAIL_NOT_VERIFIED');
  assert.equal(res.body.error.details.email, 'user@test.com');
  assert.equal(res.body.token, undefined);
});

test('verify with a wrong code fails, then the right code works', async () => {
  const ctx = createTestContext();
  await register(ctx);
  const code = ctx.mailer.lastCode();
  const wrong = code === '000000' ? '111111' : '000000';

  const bad = await request(ctx.app).post('/api/auth/verify-otp').send({ email: 'user@test.com', code: wrong });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'OTP_INVALID');

  const good = await request(ctx.app).post('/api/auth/verify-otp').send({ email: 'user@test.com', code });
  assert.equal(good.status, 200);
});

test('verified user can log in and gets a token plus onboarding state', async () => {
  const ctx = createTestContext();
  await registerAndVerify(ctx);
  const res = await request(ctx.app).post('/api/auth/login').send({ email: 'USER@test.com', password: PASSWORD });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.deepEqual(res.body.onboarding, { profileCompleted: false, tasksSelected: false });
});

test('wrong password and unknown email give the same error', async () => {
  const ctx = createTestContext();
  await registerAndVerify(ctx);
  const wrongPw = await request(ctx.app).post('/api/auth/login').send({ email: 'user@test.com', password: 'Wrong1234' });
  const noUser = await request(ctx.app).post('/api/auth/login').send({ email: 'nobody@test.com', password: PASSWORD });
  assert.equal(wrongPw.status, 401);
  assert.equal(noUser.status, 401);
  assert.equal(wrongPw.body.error.message, noUser.body.error.message);
});

test('protected routes need a valid token', async () => {
  const ctx = createTestContext();
  const none = await request(ctx.app).get('/api/auth/me');
  assert.equal(none.status, 401);
  const fake = await request(ctx.app).get('/api/auth/me').set('Authorization', 'Bearer not.a.token');
  assert.equal(fake.status, 401);
  const token = await loginToken(ctx);
  const ok = await request(ctx.app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.email, 'user@test.com');
});

test('profile: validates mobile, normalises +91, business name is optional', async () => {
  const ctx = createTestContext();
  const token = await loginToken(ctx);
  const auth = { Authorization: `Bearer ${token}` };
  const base = { name: 'Test User', address: '12 MG Road, Bengaluru 560001' };

  const bad = await request(ctx.app).put('/api/profile').set(auth).send({ ...base, mobile: '12345' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.details[0].field, 'mobile');

  const ok = await request(ctx.app).put('/api/profile').set(auth).send({ ...base, mobile: '+91 98765 43210' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.profile.mobile, '9876543210');
  assert.equal(ok.body.profile.businessName, null);

  const me = await request(ctx.app).get('/api/auth/me').set(auth);
  assert.equal(me.body.onboarding.profileCompleted, true);
});

test('task catalogue has 20+ tasks in 4+ categories and supports search', async () => {
  const ctx = createTestContext();
  const token = await loginToken(ctx);
  const auth = { Authorization: `Bearer ${token}` };
  const all = await request(ctx.app).get('/api/tasks').set(auth);
  assert.ok(all.body.tasks.length >= 20);
  assert.ok(new Set(all.body.tasks.map((t) => t.category)).size >= 4);
  const found = await request(ctx.app).get('/api/tasks?q=grocery').set(auth);
  assert.ok(found.body.tasks.length >= 1);
});

test('task selection is saved and returned; unknown ids are rejected', async () => {
  const ctx = createTestContext();
  const token = await loginToken(ctx);
  const auth = { Authorization: `Bearer ${token}` };

  const empty = await request(ctx.app).put('/api/tasks/selection').set(auth).send({ taskIds: [] });
  assert.equal(empty.status, 400);

  const invalid = await request(ctx.app).put('/api/tasks/selection').set(auth).send({ taskIds: [1, 9999] });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'INVALID_TASK_IDS');

  const saved = await request(ctx.app).put('/api/tasks/selection').set(auth).send({ taskIds: [1, 2, 2, 3] });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.tasks.length, 3);

  const fetched = await request(ctx.app).get('/api/tasks/selection').set(auth);
  assert.equal(fetched.body.tasks.length, 3);
});
