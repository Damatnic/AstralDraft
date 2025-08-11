// Global test setup for Node.js polyfills
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock localStorage for Node.js environment
const localStorageMock = {
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete localStorageMock.store[key];
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {};
  }),
  store: {}
};

global.localStorage = localStorageMock;

// Mock window for localStorage tests
global.window = {
  localStorage: localStorageMock
};

// Add any other necessary polyfills
if (typeof global.fetch === 'undefined') {
  global.fetch = require('node-fetch');
}
