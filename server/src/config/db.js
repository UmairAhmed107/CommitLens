// Database connection setup with automatic fallback to embedded in-memory MongoDB
const mongoose = require('mongoose');
const config = require('./env');

let mongoMemoryServerInstance = null;

/**
 * Connect to MongoDB using configured URI, or fallback to in-memory instance
 */
async function connectDB() {
  const isAuto = config.USE_IN_MEMORY_DB === 'auto';
  const forceInMemory = config.USE_IN_MEMORY_DB === 'true';

  if (forceInMemory) {
    console.log('[Database] USE_IN_MEMORY_DB is set to true. Starting embedded MongoDB...');
    await startInMemoryMongo();
    return;
  }

  try {
    console.log(`[Database] Connecting to MongoDB at ${config.MONGODB_URI}...`);
    // Connect with a 3-second timeout for quick fallback if local daemon is not running
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: isAuto ? 3000 : 30000
    });
    console.log('[Database] Successfully connected to MongoDB.');
  } catch (err) {
    if (isAuto) {
      console.warn(`[Database] Could not connect to local MongoDB (${err.message}).`);
      console.log('[Database] Falling back to embedded MongoDB Memory Server for seamless local execution...');
      await startInMemoryMongo();
    } else {
      console.error('[Database] MongoDB connection error:', err);
      process.exit(1);
    }
  }
}

/**
 * Starts an in-memory MongoDB server instance for zero-dependency local development & testing
 */
async function startInMemoryMongo() {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServerInstance = await MongoMemoryServer.create();
    const uri = mongoMemoryServerInstance.getUri();
    await mongoose.connect(uri);
    console.log(`[Database] In-memory MongoDB started and connected at ${uri}`);
  } catch (err) {
    console.error('[Database] Failed to initialize MongoMemoryServer:', err);
    throw err;
  }
}

/**
 * Disconnect and clean up resources
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServerInstance) {
      await mongoMemoryServerInstance.stop();
    }
    console.log('[Database] Disconnected.');
  } catch (err) {
    console.error('[Database] Error during disconnect:', err);
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
