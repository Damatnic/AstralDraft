/**
 * Jest Configuration for Accessibility Testing
 * Specialized configuration for running accessibility tests
 */

import baseConfig from './jest.config.js';

export default {
    // Extend base Jest config
    ...baseConfig,
    
    // Test files specifically for accessibility
    testMatch: [
        '<rootDir>/__tests__/accessibility/basicAccessibility.test.tsx',
        '<rootDir>/__tests__/accessibility/simpleAccessibility.test.tsx'
    ],
    
    // Display name for this test suite
    displayName: 'Accessibility Tests',
    
    // Setup files for accessibility testing
    setupFilesAfterEnv: [
        '<rootDir>/__tests__/accessibility/setupAccessibilityTests.ts'
    ],
    
    // Test environment
    testEnvironment: 'jsdom',
    
    // Module name mapping for accessibility utilities
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@accessibility/(.*)$': '<rootDir>/utils/mobileAccessibilityUtils',
    },
    
    // Coverage settings specific to accessibility
    collectCoverageFrom: [
        '__tests__/accessibility/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/*.stories.{ts,tsx}',
    ],
    
    // Skip coverage thresholds for accessibility tests (focus on functionality)
    // coverageThreshold: {
    //     global: {
    //         branches: 90,
    //         functions: 90,
    //         lines: 90,
    //         statements: 90
    //     }
    // },
    
    // Global timeout for accessibility tests (some may be slower)
    testTimeout: 15000,
    
    // Transform settings
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx'
            }
        }]
    },
    
    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    
    // Verbose output for accessibility tests
    verbose: true,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true
};
