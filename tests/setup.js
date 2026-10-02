const mongoose = require('mongoose');

let mongod;

// Runs once before all tests in a file.
// In CI (TEST_MONGO_URI set) it uses a real MongoDB container;
// locally it falls back to an in-memory MongoDB.
beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  let uri;
  if (process.env.TEST_MONGO_URI) {
    uri = `${process.env.TEST_MONGO_URI}/test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
}, 60000);

// Clears all collections between individual tests so they stay isolated.
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// Runs once after all tests in a file.
afterAll(async () => {
  if (process.env.TEST_MONGO_URI) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});