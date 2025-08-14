# 🔍 Accessibility CI/CD Pipeline Guide

## Overview

This guide describes the automated accessibility testing pipeline integrated into the CI/CD workflow. The pipeline ensures WCAG 2.1 AA compliance and maintains accessibility standards across the entire application.

## 🚀 Pipeline Components

### 1. Automated Testing Workflow

**File:** `.github/workflows/accessibility.yml`

**Triggers:**
- ✅ Pull requests to `main`/`master`
- ✅ Pushes to `main`/`master`
- ✅ Daily scheduled runs (2 AM UTC)
- ✅ Manual workflow dispatch

**Features:**
- Violation threshold enforcement
- Multi-format report generation (HTML, JSON, JUnit, Markdown)
- PR status checks and comments
- Artifact retention and archiving
- Monthly accessibility review automation

### 2. Testing Configuration

**File:** `config/accessibility.config.js`

**Violation Thresholds:**
- **Critical:** 0 (zero tolerance)
- **Serious:** 5 maximum
- **Moderate:** 10 maximum  
- **Minor:** 20 maximum

**WCAG Compliance:**
- **Level:** AA (WCAG 2.1)
- **Color Contrast:** 4.5:1 minimum
- **Touch Targets:** 44px minimum
- **Text Scaling:** Up to 200%

### 3. CI Testing Script

**File:** `scripts/ciAccessibilityTester.js`

**Capabilities:**
- Comprehensive test execution
- Threshold validation
- Multi-format report generation
- Error handling and recovery
- Performance monitoring

## 📋 Running Tests

### Local Development

```bash
# Run accessibility tests locally
npm run test:accessibility

# Run in watch mode for development
npm run test:accessibility:watch

# Run with CI configuration locally
npm run accessibility:ci
```

### CI/CD Environment

```bash
# Full CI accessibility testing
npm run accessibility:ci

# Validation only (no test execution)
npm run accessibility:ci:validate

# Standard CI testing
npm run test:accessibility:ci
```

## 📊 Reports and Artifacts

### Generated Reports

| Format | File Location | Purpose |
|--------|---------------|---------|
| **HTML** | `accessibility-reports/html/` | Visual dashboard and detailed results |
| **JSON** | `accessibility-reports/accessibility-report.json` | Machine-readable data |
| **Markdown** | `accessibility-reports/accessibility-summary.md` | PR comments and documentation |
| **JUnit** | `accessibility-reports/junit/` | CI/CD integration |
| **Coverage** | `accessibility-reports/coverage/` | Test coverage metrics |

### Artifact Retention

- **Test Results:** 30 days
- **Coverage Reports:** 7 days  
- **Trend Analysis:** 90 days
- **Error Reports:** 30 days

## 🎯 Violation Thresholds

### Severity Levels

| Severity | Description | Threshold | Action |
|----------|-------------|-----------|---------|
| **Critical** | Blocks user access completely | 0 | ❌ Fail immediately |
| **Serious** | Major accessibility barrier | 5 | ⚠️ Review required |
| **Moderate** | Accessibility issue affecting usability | 10 | ⚠️ Monitor closely |
| **Minor** | Minor accessibility enhancement | 20 | 📝 Document for improvement |

### Enforcement

- **Pull Requests:** Blocked if critical or serious thresholds exceeded
- **Main Branch:** Monitored continuously with alerts
- **Releases:** Must pass all threshold checks

## 🔧 Configuration

### Environment Variables

```bash
# Violation thresholds (optional - defaults from config)
MAX_CRITICAL_VIOLATIONS=0
MAX_SERIOUS_VIOLATIONS=5
MAX_MODERATE_VIOLATIONS=10
MAX_MINOR_VIOLATIONS=20

# Test execution settings
ACCESSIBILITY_TIMEOUT=900000
ACCESSIBILITY_PARALLEL=true
ACCESSIBILITY_VERBOSE=true

# GitHub integration
GITHUB_TOKEN=<token>  # For PR comments and status checks
```

### Jest Configuration

**File:** `jest.accessibility.config.js`

- Specialized test matching for accessibility tests
- Coverage thresholds optimized for accessibility
- Custom reporters for CI/CD integration
- Extended timeout for complex accessibility audits

## 📈 Monitoring and Trends

### Daily Monitoring

- **Scheduled Runs:** 2 AM UTC daily
- **Violation Tracking:** Historical trend analysis
- **Performance Metrics:** Test execution duration and memory usage
- **Compliance Scoring:** WCAG 2.1 compliance percentage

### Monthly Reviews

- **Automated Issues:** Created on first of each month
- **Trend Analysis:** 3-month violation history
- **Recommendations:** Automated improvement suggestions
- **Documentation Updates:** Quarterly accessibility guideline reviews

## 🚨 Troubleshooting

### Common Issues

#### Tests Failing Locally but Passing in CI

```bash
# Ensure consistent environment
npm ci  # Use exact lockfile versions
npm run accessibility:ci  # Use CI configuration
```

#### Threshold Violations

```bash
# Check specific violations
npm run test:accessibility -- --verbose

# Review generated reports
open accessibility-reports/html/accessibility-dashboard.html
```

#### Performance Issues

```bash
# Reduce test scope for debugging
npm run test:accessibility -- --testNamePattern="basic"

# Check memory usage
npm run accessibility:ci:validate
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=accessibility:* npm run test:accessibility

# Generate detailed error reports
npm run accessibility:ci -- --debug
```

## 🔗 Integration

### GitHub Status Checks

- **Required Checks:** `ci/accessibility-testing`, `accessibility-compliance`
- **Branch Protection:** Enforced on main/master branches
- **PR Requirements:** All accessibility checks must pass

### Third-Party Tools

- **axe-core:** Primary accessibility testing engine
- **jest-axe:** Jest integration for accessibility testing
- **lighthouse:** Additional performance and accessibility audits
- **pa11y:** Command-line accessibility testing

## 📚 Resources

### WCAG Guidelines

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)
- [How to Meet WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

### Testing Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)

### Development Resources

- [Accessibility Testing Guide](./accessibility-testing.md)
- [Mobile Accessibility Patterns](../docs/mobile-accessibility-patterns.md)
- [Component Accessibility Checklist](../docs/component-accessibility-checklist.md)

## 🎯 Best Practices

### For Developers

1. **Run Tests Early:** Test accessibility during development
2. **Fix Violations Promptly:** Address issues before they accumulate
3. **Review Generated Reports:** Understand violation context
4. **Test with Real Users:** Automated tests supplement, don't replace user testing

### For Teams

1. **Regular Training:** Keep team updated on accessibility standards
2. **Code Review Focus:** Include accessibility in code review checklists
3. **Design Integration:** Include accessibility in design handoffs
4. **User Feedback:** Establish channels for accessibility feedback

### For Releases

1. **Pre-Release Validation:** Full accessibility audit before releases
2. **Documentation Updates:** Keep accessibility docs current
3. **Performance Monitoring:** Track accessibility metrics over time
4. **Incident Response:** Have process for handling accessibility issues

---

**Last Updated:** $(date)  
**Version:** 1.0.0  
**Maintainer:** Development Team
