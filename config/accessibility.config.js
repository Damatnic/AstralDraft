/**
 * Accessibility CI/CD Configuration
 * Centralized configuration for accessibility testing in CI/CD pipelines
 */

export const accessibilityConfig = {
  // Violation thresholds for automated testing
  violationThresholds: {
    critical: 0,      // No critical violations allowed
    serious: 5,       // Maximum 5 serious violations
    moderate: 10,     // Maximum 10 moderate violations
    minor: 20,        // Maximum 20 minor violations
    incomplete: 50    // Maximum 50 incomplete checks
  },

  // WCAG compliance requirements
  wcagCompliance: {
    level: 'AA',           // WCAG 2.1 AA compliance
    rules: {
      colorContrast: 4.5,  // Minimum contrast ratio
      touchTargetSize: 44, // Minimum touch target size in pixels
      textScaling: 200,    // Support up to 200% text scaling
      motionReduction: true // Respect reduced motion preferences
    }
  },

  // Test environments and browsers
  testEnvironments: {
    browsers: ['chrome', 'firefox', 'safari', 'edge'],
    viewports: [
      { width: 320, height: 568, name: 'mobile-small' },    // iPhone SE
      { width: 375, height: 667, name: 'mobile-medium' },   // iPhone 8
      { width: 414, height: 896, name: 'mobile-large' },    // iPhone 11
      { width: 768, height: 1024, name: 'tablet' },         // iPad
      { width: 1024, height: 768, name: 'tablet-landscape' }, // iPad landscape
      { width: 1440, height: 900, name: 'desktop' }         // Desktop
    ],
    screenReaders: ['nvda', 'jaws', 'voiceover', 'orca']
  },

  // CI/CD pipeline settings
  pipeline: {
    // When to run accessibility tests
    triggers: {
      pullRequest: true,
      push: true,
      schedule: '0 2 * * *', // Daily at 2 AM UTC
      manual: true
    },

    // Test execution settings
    execution: {
      timeout: 900000,        // 15 minutes timeout
      retries: 2,             // Retry failed tests twice
      parallel: true,         // Run tests in parallel
      failFast: false,        // Continue testing even if some tests fail
      verbose: true           // Detailed output
    },

    // Report generation
    reports: {
      formats: ['html', 'json', 'junit', 'markdown'],
      artifacts: {
        retention: 30,        // Keep artifacts for 30 days
        coverage: 7,          // Keep coverage reports for 7 days
        trends: 90            // Keep trend analysis for 90 days
      }
    },

    // Notification settings
    notifications: {
      onFailure: {
        prComment: true,      // Comment on PR when tests fail
        slack: false,         // Slack notification (configure webhook)
        email: false          // Email notification (configure SMTP)
      },
      onSuccess: {
        prComment: true,      // Comment on PR when tests pass
        slack: false,
        email: false
      },
      monthlyReview: true     // Create monthly accessibility review issues
    }
  },

  // Component-specific test configuration
  components: {
    // Critical components that must have zero violations
    critical: [
      'navigation',
      'forms',
      'modals',
      'error-messages',
      'authentication'
    ],

    // Components with relaxed thresholds for moderate/minor issues
    relaxed: [
      'charts',
      'animations',
      'decorative-elements'
    ],

    // Components to skip in certain environments
    skipInCI: [
      'video-player',       // Requires media files
      'geolocation',        // Requires location permissions
      'camera-upload'       // Requires camera access
    ]
  },

  // Accessibility testing rules configuration
  rules: {
    // axe-core rule configuration
    axeCore: {
      enabled: [
        'wcag2a',
        'wcag2aa',
        'wcag21aa',
        'best-practice'
      ],
      disabled: [
        // Disable rules that conflict with design system
        'color-contrast-enhanced', // We use AA, not AAA
        'region'                   // Some pages don't need landmarks
      ],
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    },

    // Custom accessibility rules
    custom: {
      touchTargets: {
        enabled: true,
        minSize: 44,
        exceptions: ['breadcrumb-links', 'pagination']
      },
      colorContrast: {
        enabled: true,
        ratio: 4.5,
        largeText: 3.0
      },
      keyboardNavigation: {
        enabled: true,
        skipLinks: true,
        focusIndicators: true
      }
    }
  },

  // Performance thresholds for accessibility testing
  performance: {
    maxTestDuration: 300000,  // 5 minutes max per test suite
    maxMemoryUsage: '512MB',  // Memory limit for test execution
    concurrency: 4            // Maximum parallel test processes
  },

  // Integration settings
  integrations: {
    // GitHub integration
    github: {
      statusChecks: true,     // Create commit status checks
      prComments: true,       // Post PR comments
      issues: true,           // Create issues for violations
      labels: ['accessibility', 'a11y', 'wcag']
    },

    // Monitoring and analytics
    monitoring: {
      enabled: true,
      metrics: [
        'violation-count',
        'test-duration',
        'compliance-score',
        'coverage-percentage'
      ],
      trending: true          // Track metrics over time
    }
  }
};

// Export specific configurations for different environments
export const ciConfig = {
  ...accessibilityConfig,
  // CI-specific overrides
  pipeline: {
    ...accessibilityConfig.pipeline,
    execution: {
      ...accessibilityConfig.pipeline.execution,
      verbose: false,         // Less verbose in CI
      failFast: true         // Fail fast in CI for quicker feedback
    }
  }
};

export const localConfig = {
  ...accessibilityConfig,
  // Local development overrides
  violationThresholds: {
    ...accessibilityConfig.violationThresholds,
    // More lenient for local development
    serious: 10,
    moderate: 20,
    minor: 50
  },
  pipeline: {
    ...accessibilityConfig.pipeline,
    execution: {
      ...accessibilityConfig.pipeline.execution,
      verbose: true,          // More verbose locally
      failFast: false,        // Don't fail fast locally
      parallel: false         // Sequential execution for debugging
    }
  }
};

export default accessibilityConfig;
