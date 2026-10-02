# Household Tasks: Onboarding App (Full-Stack Take-Home)

A native mobile app with its own backend for the first-user journey:
**register → verify email with OTP → log in → profile (once) → pick tasks → home.**

- `backend/` Node.js + Express API, SQLite database, JWT auth, email OTP
- `mobile/` React Native (Expo) app, plain JavaScript, every screen built natively (no WebView)

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | **22.13 or newer** (24 LTS is fine) | Backend uses Node's built-in SQLite, so nothing needs compiling |
| npm | comes with Node | |
| Android phone with **Expo Go**, or an Android emulator | | To run the app |
| Expo account (free) | only for building the APK | https://expo.dev |

Check with `node -v`. No Docker, no database server and no C++ build tools are required.

## 1. Backend setup

```bash
cd backend
npm install
npm start
```

The server listens on port 3000 and prints something like:

```
PadosiPro API running on port 3000
  Network: http://192.168.1.4:3000   <- use this address in the mobile app
```

Open `http://localhost:3000/health`. It should return `{"status":"ok"}`.
The database file is created automatically at `backend/data/padosipro.db` and 25 tasks are seeded on first start.

Run the tests (OTP generation, expiry, attempt limits, resend cooldown, login rules, validation, task selection):

```bash
npm test
```

### Environment variables

Copy `backend/.env.example` to `backend/.env` to change any of these. **The file is optional in development**:
if it is missing, the server uses temporary random secrets (tokens are invalidated on every restart).

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | API port |
| `DB_PATH` | `./data/padosipro.db` | SQLite file |
| `JWT_SECRET` | random (dev only) | Signs login tokens. **Required in production**, 32+ chars |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `OTP_HMAC_SECRET` | random (dev only) | Key used to hash OTP codes. **Required in production** |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | empty | Real SMTP server. If `SMTP_HOST` is empty, Ethereal is used |
| `MAIL_FROM` | `PadosiPro <no-reply@padosipro.local>` | Sender address |
| `LOG_OTP_TO_CONSOLE` | `false` | Dev only: also print the OTP in the server console |

### How email / OTP works (please read)

- By default the server sends mail through **Ethereal**, a free fake SMTP inbox. Nothing is delivered to real inboxes.
  When a code is sent, the server console prints a link:
  `[mail] Preview the email here: https://ethereal.email/message/...`. Open it to read the 6-digit code.
- Any real or local SMTP server (for example Mailpit on `localhost:1025`) works by setting `SMTP_HOST` and `SMTP_PORT`.
- **If your network or antivirus blocks Ethereal** (error `self-signed certificate in certificate chain`), set
  `LOG_OTP_TO_CONSOLE=true` in `backend/.env` and restart. The code is then printed in the server console as
  `[mail] (dev) OTP for <email>: 123456`. Never enable this in production.

### API summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | no | email, password, confirmPassword |
| POST | `/api/auth/verify-otp` | no | email, code |
| POST | `/api/auth/resend-otp` | no | email |
| POST | `/api/auth/login` | no | email, password (verified users only) |
| GET | `/api/auth/me` | yes | current user and onboarding state |
| GET / PUT | `/api/profile` | yes | name, mobile (+91, 10 digits), address, businessName |
| GET | `/api/tasks?q=` | yes | task catalogue, optional search |
| GET / PUT | `/api/tasks/selection` | yes | read / replace the selected tasks (`taskIds`) |

Errors always have the same shape: `{ "error": { "code", "message", "details?" } }`.

## 2. Run the mobile app (development)

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (phone and laptop on the same Wi-Fi). In development the app finds your laptop's IP
automatically and calls `http://<laptop-ip>:3000`.

- If Windows Firewall asks, allow Node.js on **Private networks**.
- If the QR code cannot connect, try `npx expo start --tunnel`. In tunnel mode the IP cannot be detected, so create
  `mobile/.env` with `EXPO_PUBLIC_API_URL=http://<laptop-ip>:3000` and restart with `npx expo start -c`.
- Android emulator: it reaches the laptop at `http://10.0.2.2:3000` (the default when no host is detected).

## 3. Build the APK

```bash
cd mobile
npx eas-cli login          # free Expo account
npx eas-cli init           # links the project, writes the project id into app.json
npx eas-cli build --platform android --profile preview
```

The build runs in Expo's cloud (a free-tier queue can take 10 to 40 minutes). When it finishes, open the link shown in the
terminal (or the build page on expo.dev) and download the `.apk`.

Before building, make sure `mobile/.env` does not exist (or has no `EXPO_PUBLIC_API_URL` line), so a local IP is not baked in.

### Using the APK with your local backend

1. Start the backend (`cd backend && npm start`) and note the `Network:` address it prints.
2. Install the APK on an Android phone on the **same Wi-Fi** (allow "install unknown apps" when asked).
3. On the login screen tap **Server settings**, enter `http://<that-ip>:3000`, tap **Test connection**, then **Save**.
   On an Android emulator the default `http://10.0.2.2:3000` already works.

The APK allows plain `http://` so it can talk to a laptop on the local network. A real deployment would use HTTPS.

## Try the whole flow

1. Register with a test email (for example `reviewer@example.com`) and a password such as `Passw0rd!`.
2. Read the OTP from the server console (Ethereal link or `LOG_OTP_TO_CONSOLE`), enter it, then log in.
3. Fill the profile once (Business Name is optional), pick tasks, confirm, and see them on Home.
4. Close and reopen the app: you stay logged in. Log out and in again: the profile screen does not reappear.

Use test data only; no real personal information.

## Decisions worth knowing

- **Business Name is optional.** Many households are not businesses, and forcing a value would produce fake data.
- **Users can edit their task selection later** (Home → Edit tasks); saving replaces the previous selection.
- The profile screen is decided by the **server** (`onboarding.profileCompleted`), so it is shown once even after reinstalling.
- See `DESIGN.md` for architecture, trade-offs, what was left out, and next steps.

## Troubleshooting

| Problem | Fix |
|---|---|
| `No such built-in module: node:sqlite` | Node is older than 22.13. Install the current LTS and open a new terminal |
| `npm.ps1 cannot be loaded` (Windows PowerShell) | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, or use Command Prompt |
| `EADDRINUSE ... 3000` | Another backend is running. Stop it, or set `PORT` in `backend/.env` |
| App says "Cannot reach the server" | Backend not running, different Wi-Fi, firewall, or wrong address. Check `http://<ip>:3000/health` in the phone browser, then use Server settings |
| OTP email never arrives | It goes to a fake inbox. Use the Ethereal link in the server console, or `LOG_OTP_TO_CONSOLE=true` |
| `ENOSPC: no space left on device` | Free disk space (Expo and npm caches live on the system drive) |
