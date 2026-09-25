const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Runs once before all tests in a file: start an in-memory Mongo instance
// and connect mongoose to it, so tests never touch a real database.
beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}, 30000);

// Clears all collections between individual tests so they stay isolated.
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// Runs once after all tests in a file: disconnect and stop the in-memory server.
afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
