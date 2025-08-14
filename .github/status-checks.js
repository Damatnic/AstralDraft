/**
 * GitHub Actions Status Check Configuration
 * Defines required status checks for accessibility testing
 */

export const statusChecks = {
  // Required status checks for pull requests
  required: [
    'ci/accessibility-testing',
    'accessibility-compliance',
    'wcag-validation'
  ],

  // Status check contexts and descriptions
  contexts: {
    'ci/accessibility-testing': {
      description: 'Automated accessibility testing with WCAG 2.1 compliance',
      target_url_template: 'https://github.com/{owner}/{repo}/actions/runs/{run_id}',
      required: true
    },
    'accessibility-compliance': {
      description: 'Accessibility violation thresholds validation',
      required: true
    },
    'wcag-validation': {
      description: 'WCAG 2.1 AA compliance verification',
      required: true
    }
  },

  // Branch protection rules
  branchProtection: {
    required_status_checks: {
      strict: true,
      contexts: [
        'ci/accessibility-testing',
        'accessibility-compliance'
      ]
    },
    enforce_admins: false,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true
    },
    restrictions: null
  }
};

export default statusChecks;
