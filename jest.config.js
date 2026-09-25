module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  collectCoverageFrom: ['src/**/*.js', 'server.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/src/config/db.js'],
  testTimeout: 20000,
};
