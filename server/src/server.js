// Server Entrypoint
const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');
const { seedDatabase } = require('./services/seedService');

async function startServer() {
  try {
    // Connect to database
    await connectDB();

    // Auto-seed demo data if system is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Database is empty. Auto-seeding demo project data...');
      await seedDatabase();
    }

    const server = app.listen(config.PORT, () => {
      console.log(`=======================================================`);
      console.log(` SCIT System Server running on port ${config.PORT}`);
      console.log(` API Base: http://localhost:${config.PORT}/api`);
      console.log(`=======================================================`);
    });

    server.on('error', (err) => {
      console.error('[Server Error]', err);
    });

    // Handle process termination gracefully
    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', (err) => {
      console.error('[Uncaught Exception]', err);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('[Unhandled Rejection]', reason);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
