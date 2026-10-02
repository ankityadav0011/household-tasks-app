// This project uses Node's built-in SQLite, which needs Node 22.13 or newer.
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 13)) {
  console.error(`Node.js 22.13 or newer is required. You are running ${process.versions.node}.`);
  console.error('Install the LTS version from https://nodejs.org and open a new terminal.');
  process.exit(1);
}

require('dotenv').config();
const os = require('os');
const { loadConfig } = require('./config');
const { openDatabase } = require('./db/database');
const { seedTasks } = require('./db/seed');
const { createMailer } = require('./services/mailService');
const { createApp } = require('./app');

const config = loadConfig();
const db = openDatabase(config.dbPath);
seedTasks(db);
const app = createApp({ db, config, mailer: createMailer(config) });

// Listen on all network interfaces so a phone on the same Wi-Fi can reach the API.
app.listen(config.port, '0.0.0.0', () => {
  console.log(`PadosiPro API running on port ${config.port}`);
  console.log(`  Local:   http://localhost:${config.port}/health`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  Network: http://${net.address}:${config.port}   <- use this address in the mobile app`);
      }
    }
  }
});
