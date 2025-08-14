/**
 * Global Mocks for Testing
 * Common mocks used across all test environments
 */

// Mock performance APIs for Node environment
if (typeof performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    timing: {},
    navigation: {}
  } as any;
}

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock PerformanceObserver
(global as any).PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));
(global as any).PerformanceObserver.supportedEntryTypes = ['measure', 'navigation'];

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn((callback) => {
  return setTimeout(callback, 0);
});

global.cancelIdleCallback = jest.fn((id) => {
  clearTimeout(id);
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock window methods
if (typeof window !== 'undefined') {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }));

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock
  });

  // Mock navigator
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent: 'test-user-agent',
      onLine: true,
      clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
        readText: jest.fn(() => Promise.resolve(''))
      }
    }
  });
}

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: 'http://localhost:3000',
    clone: jest.fn()
  })
) as jest.Mock;

// Mock crypto for Node.js environment
if (typeof crypto === 'undefined') {
  global.crypto = {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-123456789012'),
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
      decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16)))
    }
  } as any;
}

// Mock TextEncoder/TextDecoder for Node.js
if (typeof TextEncoder === 'undefined') {
  (global as any).TextEncoder = class {
    encoding = 'utf-8';
    encode(str: string): Uint8Array {
      return new Uint8Array(Buffer.from(str, 'utf-8'));
    }
    encodeInto(): { read: number; written: number } {
      return { read: 0, written: 0 };
    }
  };
}

if (typeof TextDecoder === 'undefined') {
  (global as any).TextDecoder = class {
    encoding = 'utf-8';
    fatal = false;
    ignoreBOM = false;
    decode(bytes?: Uint8Array): string {
      return bytes ? Buffer.from(bytes).toString('utf-8') : '';
    }
  };
}

// Mock WebSocket for testing
const WebSocketMock = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
}));
(WebSocketMock as any).CONNECTING = 0;
(WebSocketMock as any).OPEN = 1;
(WebSocketMock as any).CLOSING = 2;
(WebSocketMock as any).CLOSED = 3;
(global as any).WebSocket = WebSocketMock;

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.CI = 'true';

export {};
