module.exports = {
  roots: ['<rootDir>/src'],
  globalSetup: '<rootDir>/jest.globalSetup.js',
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|js|tsx)$': 'ts-jest'
  }
};
