// Configuration and environment variable loader
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server/.env or parent .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/scit_db',
  USE_IN_MEMORY_DB: process.env.USE_IN_MEMORY_DB || 'auto',
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtkey_scit_system_2026_change_impact_secure',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  AES_ENCRYPTION_KEY: process.env.AES_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || 'scit_github_webhook_secret_key_12345'
};
