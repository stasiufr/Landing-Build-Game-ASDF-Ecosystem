// Test setup file
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.GITHUB_TOKEN = 'test-token';
process.env.GITHUB_OWNER = 'test-owner';
process.env.GITHUB_REPO = 'test-repo';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };

// Increase timeout for integration tests
jest.setTimeout(10000);
