# DESIGN

## Architecture
A small monorepo: `backend/` (Express 4, built-in `node:sqlite`) and `mobile/` (React Native with Expo, React Navigation, plain JavaScript).
I kept the backend as **one service**: the scope is a handful of endpoints, so microservices would add moving parts without adding value.

**Backend layers:** routes (HTTP + zod validation) → services (all rules: OTP, auth, profile, tasks) → db (schema, seed).
The database, mailer and clock are *injected*, so the OTP rules are unit-tested with a fake clock and fake mailer: no waiting, no SMTP.

**Auth:** bcrypt (`bcryptjs`, 10 rounds), JWT (HS256, 7 days) sent as a Bearer token. The app stores the token in `expo-secure-store`
and calls `GET /auth/me` on start-up to restore the session.

**OTP:** 6 digits from a CSPRNG, stored only as `HMAC-SHA256(secret, userId:code)` (a plain hash of 10^6 values could be brute-forced
instantly), valid 10 minutes, single use, 5 wrong attempts per code, 30 second resend cooldown, and a new code invalidates the old one.
Comparison uses `timingSafeEqual`.

**Onboarding routing:** the server returns `onboarding { profileCompleted, tasksSelected }`, and the navigator derives the screen from it.
So "profile shown once" survives reinstalling and needs no local flag.

**Errors:** every failure is `{ error: { code, message, details? } }`; field-level `details` become inline form errors in the app.

## Main trade-offs
- **SQLite via `node:sqlite`.** Zero setup for reviewers. It needs Node 22.13+ and prints an "experimental" notice. I first used `better-sqlite3`,
  but it needs C++ build tools on Windows, which would hurt the "runs in 15 minutes" goal.
- **Ethereal (fake inbox) for email.** No credentials needed; real SMTP works through env variables. A console fallback exists for networks that block it.
- **Stateless JWT.** Simple, but no server-side revocation: logout only clears the token on the device.
- **Anti-enumeration where cheap:** wrong password and unknown email give the same message; resend-otp always answers generically.
  Registration still reveals an existing verified email, which I accepted for clearer UX.
- **Server address setting.** A built APK cannot auto-detect a laptop, so the login screen has a "Server settings" box. The APK allows
  cleartext HTTP for local demos; production would use HTTPS.
- **Business Name optional**, because not every household is a business.
- **Task catalogue** is seeded by hand (I did not call the production site); names and categories live in one file, `seed.js`.

## Left out
Password reset, refresh tokens, email change, account deletion; per-account lockout beyond the OTP limits (only a coarse
100 requests / 15 min limit on `/auth`); automated tests for the mobile app; iOS build; Postgres and migrations; Docker; accessibility audit; offline mode.

## With another week
1. Password reset and refresh tokens with revocation.
2. PostgreSQL with migrations, deploy the backend behind HTTPS, and remove cleartext traffic from the APK.
3. Mobile tests (React Native Testing Library) plus an end-to-end run, and CI for both projects.
4. Per-email and per-IP throttling for OTP resend and verify, plus audit logging.
5. A design pass against the live product (exact colours, spacing, copy) and an accessibility review.
