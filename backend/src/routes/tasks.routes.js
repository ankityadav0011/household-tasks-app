const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { taskSelectionSchema } = require('../validators/schemas');

function createTasksRouter({ taskService, auth }) {
  const router = express.Router();

  // GET /api/tasks?q=clean  (q is an optional search term)
  router.get('/', auth, asyncHandler((req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    res.json({ tasks: taskService.list(q) });
  }));

  router.get('/selection', auth, asyncHandler((req, res) => {
    res.json({ tasks: taskService.getSelected(req.user.id) });
  }));

  router.put('/selection', auth, validate(taskSelectionSchema), asyncHandler((req, res) => {
    res.json({ tasks: taskService.select(req.user.id, req.body.taskIds) });
  }));

  return router;
}

module.exports = { createTasksRouter };
