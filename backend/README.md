# PadosiPro Backend

Express + SQLite API for register, email OTP, login, profile and task selection.

## Run

```bash
npm install
npm start        # http://localhost:3000/health
npm test         # OTP, expiry, attempt limits, login rules and API tests
```

Requires **Node.js 22.13 or newer** (SQLite is built into Node, so there is nothing native to compile).
Check with `node -v`. You may see an "ExperimentalWarning: SQLite" message; it is harmless. In development the app works without a `.env` file
(it generates temporary secrets). To configure it, copy `.env.example` to `.env`.

## Email

By default OTP emails go to an **Ethereal** fake inbox. When the server sends an email it prints a
`Preview the email here: https://ethereal.email/message/...` link in the terminal. Open it to read the code.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/register | no | email, password, confirmPassword |
| POST | /api/auth/verify-otp | no | email, code |
| POST | /api/auth/resend-otp | no | email |
| POST | /api/auth/login | no | email, password |
| GET | /api/auth/me | yes | current user and onboarding state |
| GET / PUT | /api/profile | yes | name, mobile, address, businessName |
| GET | /api/tasks?q= | yes | task catalogue (optional search) |
| GET / PUT | /api/tasks/selection | yes | read / replace selected tasks (`taskIds`) |

Errors always look like `{ "error": { "code", "message", "details?" } }`.
