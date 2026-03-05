module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  testTimeout: 60000,
  clearMocks: true,
  verbose: false
};
