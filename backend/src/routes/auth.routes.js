const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema } = require('../validators/schemas');

function createAuthRouter({ authService, auth }) {
  const router = express.Router();

  router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
    res.status(201).json(await authService.register(req.body));
  }));

  router.post('/verify-otp', validate(verifyOtpSchema), asyncHandler(async (req, res) => {
    res.json(await authService.verifyEmail(req.body));
  }));

  router.post('/resend-otp', validate(resendOtpSchema), asyncHandler(async (req, res) => {
    res.json(await authService.resendOtp(req.body));
  }));

  router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
    res.json(await authService.login(req.body));
  }));

  // The app calls this on start-up to restore a session and decide which screen to show.
  router.get('/me', auth, (req, res) => {
    res.json(authService.getMe(req.user));
  });

  return router;
}

module.exports = { createAuthRouter };
