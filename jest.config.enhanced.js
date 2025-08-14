/**
 * Enhanced Jest Configuration for Comprehensive Testing
 * Supports multiple testing environments and strategies
 */

export default {
  projects: [
    // Frontend/React Testing Environment
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
        '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/__tests__/components/**/*.(ts|tsx|js)',
        '<rootDir>/__tests__/frontend/**/*.(ts|tsx|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/components/$1',
        '^@services/(.*)$': '<rootDir>/services/$1',
        '^@hooks/(.*)$': '<rootDir>/hooks/$1',
        '^@utils/(.*)$': '<rootDir>/utils/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js'
      },
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/index.tsx',
        '!src/serviceWorker.ts',
        '!**/*.stories.*',
        '!**/*.test.*'
      ],
      coverageThreshold: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Backend/API Testing Environment
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/backend/**/__tests__/**/*.(ts|js)',
        '<rootDir>/backend/**/*.(test|spec).(ts|js)',
        '<rootDir>/__tests__/backend/**/*.(ts|js)',
        '<rootDir>/__tests__/api/**/*.(ts|js)',
        '<rootDir>/__tests__/services/**/*.(ts|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/backend/setupTests.ts'],
      moduleNameMapper: {
        '^@backend/(.*)$': '<rootDir>/backend/$1'
      },
      transform: {
        '^.+\\.(ts)$': 'ts-jest'
      },
      collectCoverageFrom: [
        'backend/**/*.{ts,js}',
        'services/**/*.{ts,js}',
        '!backend/**/*.d.ts',
        '!backend/server.ts',
        '!**/*.test.*'
      ],
      coverageThreshold: {
        global: {
          branches: 65,
          functions: 65,
          lines: 65,
          statements: 65
        }
      }
    },
    
    // Integration Testing Environment
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/integration/**/*.(ts|js)',
        '<rootDir>/__tests__/*integration*.(ts|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/integration/setupIntegration.ts'],
      globalSetup: '<rootDir>/__tests__/integration/globalSetup.ts',
      globalTeardown: '<rootDir>/__tests__/integration/globalTeardown.ts',
      testTimeout: 30000,
      maxWorkers: 1, // Run integration tests sequentially
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@backend/(.*)$': '<rootDir>/backend/$1'
      }
    },

    // E2E Testing Environment
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/e2e/**/*.(ts|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/e2e/setupE2E.ts'],
      globalSetup: '<rootDir>/__tests__/e2e/globalSetup.ts',
      globalTeardown: '<rootDir>/__tests__/e2e/globalTeardown.ts',
      testTimeout: 60000,
      maxWorkers: 1
    },

    // Performance Testing Environment
    {
      displayName: 'performance',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/performance/**/*.(ts|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/performance/setupPerformance.ts'],
      testTimeout: 120000,
      maxWorkers: 1
    }
  ],

  // Global configuration
  collectCoverage: false, // Enable only when needed
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  verbose: true,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.ts',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!([@]?react|[@]?testing-library|framer-motion|recharts)/)'
  ],
  
  // Setup files
  setupFiles: ['<rootDir>/__tests__/globalMocks.ts'],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};
