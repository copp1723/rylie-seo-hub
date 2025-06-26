// This file can be used for global test setup
// For example, mocking global objects or setting up test-specific environment variables

// jest.mock('some-module', () => ({
//   // ...mock implementation
// }));

// jest.fn() is globally available in Jest environments, no need to import 'jest' from '@jest/globals' here.
const mockAuditLogInstance = jest.fn();
global.auditLog = mockAuditLogInstance; // Standard JS assignment
// console.log('Jest global setup file loaded and global.auditLog mocked.');

// Reset mocks before each test if needed globally, or do it in test files.
beforeEach(() => {
  mockAuditLogInstance.mockClear();
});
