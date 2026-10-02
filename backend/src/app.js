const express = require('express');
const rateLimit = require('express-rate-limit');
const { AppError } = require('./utils/errors');
const { requireAuth } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { createOtpService } = require('./services/otpService');
const { createAuthService } = require('./services/authService');
const { createProfileService } = require('./services/profileService');
const { createTaskService } = require('./services/taskService');
const { createAuthRouter } = require('./routes/auth.routes');
const { createProfileRouter } = require('./routes/profile.routes');
const { createTasksRouter } = require('./routes/tasks.routes');

/**
 * Builds the Express app. Everything it depends on (db, mailer, clock) is passed in,
 * which is what makes the app easy to test.
 */
function createApp({ db, config, mailer, now = Date.now, enableRateLimit = true }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  const otpService = createOtpService({ db, mailer, config, now });
  const authService = createAuthService({ db, otpService, config });
  const profileService = createProfileService({ db, now });
  const taskService = createTaskService({ db });
  const auth = requireAuth({ db, config });

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  const api = express.Router();
  if (enableRateLimit) {
    api.use(
      '/auth',
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next) =>
          next(new AppError(429, 'TOO_MANY_REQUESTS', 'Too many requests. Please try again later.')),
      }),
    );
  }
  api.use('/auth', createAuthRouter({ authService, auth }));
  api.use('/profile', createProfileRouter({ profileService, auth }));
  api.use('/tasks', createTasksRouter({ taskService, auth }));
  app.use('/api', api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
