const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const logger = require('../src/utils/logger');

let mongoServer;

// Silence logger during tests to keep output clean
logger.transports.forEach((t) => (t.silent = true));

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = mongoServer.getUri();

  // Ensure JWT secret is set
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});
