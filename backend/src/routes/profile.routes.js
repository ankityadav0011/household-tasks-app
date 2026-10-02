const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { profileSchema } = require('../validators/schemas');

function createProfileRouter({ profileService, auth }) {
  const router = express.Router();

  router.get('/', auth, asyncHandler((req, res) => {
    res.json({ profile: profileService.get(req.user.id) });
  }));

  router.put('/', auth, validate(profileSchema), asyncHandler((req, res) => {
    res.json({ profile: profileService.save(req.user.id, req.body) });
  }));

  return router;
}

module.exports = { createProfileRouter };
