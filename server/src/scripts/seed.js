// Standalone CLI Seed Script
const { connectDB, disconnectDB } = require('../config/db');
const { seedDatabase } = require('../services/seedService');

async function runSeed() {
  try {
    await connectDB();
    await seedDatabase();
    await disconnectDB();
    console.log('[Seed Script] Seeding finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Script] Seeding error:', err);
    process.exit(1);
  }
}

runSeed();
