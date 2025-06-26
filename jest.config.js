module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Using 'node' for backend tests, can be 'jsdom' for frontend
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  setupFilesAfterEnv: ['./jest.setup.js'], // Optional: for global test setup
};
