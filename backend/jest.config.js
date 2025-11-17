// Jest Configuration
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/**/*.config.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000
};

