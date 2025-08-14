/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  projects: [
    {
      displayName: 'backend',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
      testMatch: [
        '<rootDir>/__tests__/api/**/*.test.ts',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '<rootDir>/__tests__/e2e/',
        '<rootDir>/__tests__/unit/',
        '<rootDir>/__tests__/services/',
        '<rootDir>/__tests__/accessibility/',
        '.*\\.test\\.tsx$'
      ],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/backend/$1',
      },
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: 'tsconfig.backend.json',
          },
        ],
      },
    },
    {
      displayName: 'frontend',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/*.test.tsx',
        '<rootDir>/src/**/*.test.ts',
        '<rootDir>/__tests__/unit/**/*.test.ts',
        '<rootDir>/__tests__/services/**/*.test.ts',
        '<rootDir>/__tests__/accessibility/**/*.test.ts',
        '<rootDir>/__tests__/e2e/**/*.test.ts'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '<rootDir>/__tests__/api/'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/polyfills.ts', '<rootDir>/src/setupTests.ts'],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.json',
          },
        ],
      },
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'backend/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/serviceWorker.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
};
