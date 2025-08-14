# 🔄 Accessibility Development Workflow Integration

## Overview

This guide integrates accessibility checks seamlessly into the Astral Draft development workflow, ensuring accessibility is part of every development step.

## 🚀 Pre-commit Setup

### Git Hooks Configuration

Create a pre-commit hook to automatically run accessibility tests:

```bash
# Create .husky directory if it doesn't exist
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run accessibility:pre-commit"
```

### Pre-commit Script

Add this script to your `package.json`:

```json
{
  "scripts": {
    "accessibility:pre-commit": "npm run test:accessibility && npm run accessibility:lint-staged"
  }
}
```

### Lint-staged Configuration

Add to `package.json` or create `.lintstagedrc.json`:

```json
{
  "lint-staged": {
    "**/*.{tsx,ts,jsx,js}": [
      "npm run accessibility:component-check",
      "git add"
    ],
    "**/*.css": [
      "npm run accessibility:css-check",
      "git add"
    ]
  }
}
```

## 🔧 VS Code Integration

### Required Extensions

Install these VS Code extensions for enhanced accessibility development:

```json
{
  "recommendations": [
    "deque-systems.vscode-axe-linter",
    "streetsidesoftware.code-spell-checker",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "accessibility.signals.lineHasError": {
    "sound": "on"
  },
  "accessibility.signals.lineHasWarning": {
    "sound": "on"  
  },
  "editor.accessibilitySupport": "on",
  "editor.guides.bracketPairs": true,
  "editor.guides.highlightActiveIndentation": true,
  "workbench.reduceMotion": "on",
  "workbench.preferredHighContrastColorTheme": "Default High Contrast",
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "jest.autoRun": {
    "watch": false,
    "onSave": "test-src-file"
  },
  "jest.testExplorer": {
    "showClassicStatus": true,
    "showInlineError": true
  }
}
```

### Custom Tasks

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Accessibility: Run Tests",
      "type": "shell",
      "command": "npm",
      "args": ["run", "test:accessibility"],
      "group": {
        "kind": "test",
        "isDefault": true
      },
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": "$jest-accessibility"
    },
    {
      "label": "Accessibility: Generate Dashboard",
      "type": "shell", 
      "command": "npm",
      "args": ["run", "accessibility:dashboard"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "silent",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Accessibility: Monitor",
      "type": "shell",
      "command": "npm", 
      "args": ["run", "accessibility:monitor"],
      "group": "build",
      "isBackground": true,
      "presentation": {
        "echo": true,
        "reveal": "silent",
        "focus": false,
        "panel": "dedicated"
      }
    }
  ]
}
```

## 📋 Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## 🔍 Accessibility Checklist

- [ ] All accessibility tests pass (`npm run test:accessibility`)
- [ ] Dashboard shows no critical violations
- [ ] Components tested with keyboard navigation
- [ ] Components tested with screen reader
- [ ] Color contrast meets WCAG AA standards
- [ ] Touch targets are at least 44x44 pixels
- [ ] Form elements have proper labels
- [ ] Interactive elements have focus indicators

## 📊 Accessibility Impact

<!-- Describe how this PR affects accessibility -->

### New Components
- [ ] Added accessibility tests for new components
- [ ] Followed [Component Accessibility Checklist](../docs/component-accessibility-checklist.md)
- [ ] Verified WCAG 2.1 AA compliance

### Existing Components  
- [ ] No accessibility regressions introduced
- [ ] Improved accessibility where possible
- [ ] Updated tests if accessibility behavior changed

### Dashboard Metrics
<!-- Paste dashboard metrics or link to updated dashboard -->

## 🧪 Testing

### Automated Testing
- [ ] `npm run test:accessibility` passes
- [ ] No new accessibility violations introduced
- [ ] Dashboard metrics within acceptable ranges

### Manual Testing
- [ ] Keyboard navigation works correctly
- [ ] Screen reader announces content properly
- [ ] Focus management is logical and visible
- [ ] Color/contrast requirements met

### Browser Testing
- [ ] Chrome + screen reader extension
- [ ] Firefox + accessibility inspector
- [ ] Safari + VoiceOver (if macOS available)
- [ ] Mobile browser + TalkBack/VoiceOver

## 📱 Mobile Accessibility
- [ ] Touch targets meet minimum size requirements
- [ ] Content is accessible on mobile screen readers
- [ ] Responsive design maintains accessibility
- [ ] Mobile-specific accessibility features tested

---

**Accessibility Review**: @accessibility-team
**Dashboard**: [View Latest Metrics](https://astral-projects.github.io/astral-draft/dashboard.html)
```

## 🤖 GitHub Actions Integration

### Enhanced Workflow

Update `.github/workflows/accessibility.yml`:

```yaml
name: Accessibility Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  accessibility-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run accessibility tests
      run: npm run test:accessibility:ci
    
    - name: Generate accessibility report
      run: npm run accessibility:dashboard
      
    - name: Upload accessibility artifacts
      uses: actions/upload-artifact@v4
      with:
        name: accessibility-reports
        path: accessibility-reports/
        retention-days: 30
    
    - name: Comment PR with accessibility status
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const path = './accessibility-reports/validation-report.md';
          
          if (fs.existsSync(path)) {
            const report = fs.readFileSync(path, 'utf8');
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🔍 Accessibility Test Results\n\n${report}\n\n**Dashboard**: [View Detailed Metrics](https://astral-projects.github.io/astral-draft/dashboard.html)`
            });
          }
    
    - name: Fail on critical violations
      run: |
        if [ -f "accessibility-reports/critical-violations.json" ]; then
          CRITICAL_COUNT=$(jq '.criticalCount' accessibility-reports/critical-violations.json)
          if [ "$CRITICAL_COUNT" -gt 0 ]; then
            echo "❌ Critical accessibility violations found: $CRITICAL_COUNT"
            exit 1
          fi
        fi
```

## 📊 Team Dashboard Integration

### Slack Notifications

Create a Slack app integration:

```javascript
// scripts/slackNotifications.js
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function sendAccessibilityUpdate(metrics) {
  const message = {
    channel: '#accessibility',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔍 Accessibility Dashboard Update'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Overall Score:* ${metrics.overallScore}%`
          },
          {
            type: 'mrkdwn', 
            text: `*WCAG AA Compliance:* ${metrics.wcagCompliance.levelAA}%`
          },
          {
            type: 'mrkdwn',
            text: `*Total Violations:* ${metrics.totalViolations}`
          },
          {
            type: 'mrkdwn',
            text: `*Tests Passing:* ${metrics.testsPassing}/${metrics.totalTests}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard'
            },
            url: 'https://astral-projects.github.io/astral-draft/dashboard.html'
          }
        ]
      }
    ]
  };

  if (metrics.criticalViolations > 0) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚠️ *Critical Issues Found:* ${metrics.criticalViolations} critical violations need immediate attention`
      }
    });
  }

  await slack.chat.postMessage(message);
}
```

### Email Notifications

Add to `package.json` scripts:

```json
{
  "scripts": {
    "accessibility:notify": "node scripts/accessibilityNotifications.js",
    "accessibility:daily-report": "node scripts/dailyAccessibilityReport.js",
    "accessibility:weekly-summary": "node scripts/weeklyAccessibilitySummary.js"
  }
}
```

## 🎯 Team Training Integration

### Accessibility Knowledge Quiz

Create `docs/accessibility-quiz.md`:

```markdown
# 🧠 Accessibility Knowledge Quiz

Test your accessibility knowledge with this quick quiz!

## Questions

### 1. WCAG Compliance
What does WCAG AA compliance require for color contrast?
- [ ] A) 3:1 ratio for all text
- [ ] B) 4.5:1 for normal text, 3:1 for large text
- [ ] C) 7:1 ratio for all text
- [ ] D) No specific requirements

### 2. Keyboard Navigation
Which keys should work for navigating a dropdown menu?
- [ ] A) Tab only
- [ ] B) Tab, Enter, Escape
- [ ] C) Tab, Enter, Escape, Arrow keys
- [ ] D) All keys

### 3. Screen Reader Support
What's the best way to hide decorative images from screen readers?
- [ ] A) `aria-hidden="true"`
- [ ] B) `alt=""`
- [ ] C) `role="presentation"`
- [ ] D) Both A and B

### 4. Form Accessibility
What's required for accessible form inputs?
- [ ] A) Labels only
- [ ] B) Labels and validation messages
- [ ] C) Labels, validation messages, and error indication
- [ ] D) Just placeholder text

### 5. Our Testing Framework
Which command runs our accessibility tests?
- [ ] A) `npm test`
- [ ] B) `npm run test:accessibility`
- [ ] C) `npm run a11y`
- [ ] D) `npm run accessibility`

## Answers
1. B) 4.5:1 for normal text, 3:1 for large text
2. C) Tab, Enter, Escape, Arrow keys
3. D) Both A and B
4. C) Labels, validation messages, and error indication
5. B) `npm run test:accessibility`

## Scoring
- 5/5: Accessibility Expert! 🌟
- 4/5: Great knowledge! 👍
- 3/5: Good foundation, review resources 📚
- 2/5: More learning needed 📖
- 1/5: Start with basics 🎓
```

### Weekly Accessibility Review

Schedule weekly team reviews:

```markdown
# 📅 Weekly Accessibility Review Agenda

## 📊 Dashboard Review (10 minutes)
- Review current accessibility metrics
- Discuss any trends or changes
- Celebrate improvements

## 🔍 Code Review (15 minutes)
- Review accessibility aspects of recent PRs
- Discuss challenging accessibility problems solved
- Share learnings and best practices

## 🎓 Learning Session (20 minutes)
- Feature spotlight: Advanced accessibility technique
- Tool demonstration: New accessibility testing tools
- Case study: Real-world accessibility challenge

## 🎯 Action Items (10 minutes)
- Assign accessibility improvements for next week
- Plan accessibility testing for upcoming features
- Schedule accessibility training if needed

## 📚 Resources Shared
- New accessibility articles or tools discovered
- Updates to WCAG guidelines or browser support
- Community accessibility discussions
```

## 🔄 Continuous Integration

### Automated Accessibility Checks

Add to CI pipeline:

```yaml
# .github/workflows/continuous-accessibility.yml
name: Continuous Accessibility Monitoring

on:
  schedule:
    # Run every 4 hours
    - cron: '0 */4 * * *'
  workflow_dispatch:

jobs:
  accessibility-monitoring:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run accessibility monitoring
      run: npm run accessibility:monitor:ci
    
    - name: Update dashboard
      run: npm run accessibility:dashboard
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./accessibility-reports
        destination_dir: accessibility
    
    - name: Send notifications
      run: npm run accessibility:notify
      env:
        SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
        EMAIL_SERVICE_KEY: ${{ secrets.EMAIL_SERVICE_KEY }}
```

## 📱 Mobile Development Integration

### Mobile Accessibility Testing

Add mobile-specific tests:

```javascript
// __tests__/accessibility/mobileAccessibility.test.tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';

expect.extend(toHaveNoViolations);

describe('Mobile Accessibility', () => {
  beforeEach(() => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  test('touch targets meet minimum size requirements', async () => {
    const { container } = render(<YourComponent />);
    
    // Check that all interactive elements are at least 44x44 pixels
    const buttons = container.querySelectorAll('button, [role="button"]');
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const width = parseInt(styles.width);
      const height = parseInt(styles.height);
      
      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
    });
  });

  test('mobile navigation is accessible', async () => {
    const { container } = render(<MobileNavigation />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## 📈 Performance Integration

### Accessibility Performance Monitoring

```javascript
// scripts/performanceAccessibilityMonitor.js
export function measureAccessibilityPerformance() {
  const startTime = performance.now();
  
  // Run accessibility tests
  return new Promise((resolve) => {
    // Accessibility test execution
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    resolve({
      testDuration: duration,
      timestamp: new Date().toISOString(),
      performanceGrade: duration < 2000 ? 'A' : duration < 5000 ? 'B' : 'C'
    });
  });
}
```

## 🎉 Team Adoption Success Metrics

### Key Performance Indicators

Track these metrics for successful team adoption:

- **Test Coverage**: Percentage of components with accessibility tests
- **Violation Trends**: Weekly reduction in accessibility violations
- **Team Engagement**: Number of team members actively using tools
- **Knowledge Growth**: Quiz scores and training completion rates
- **Workflow Integration**: Percentage of PRs with accessibility review

### Monthly Accessibility Report

Generate comprehensive team reports:

```markdown
# 📊 Monthly Accessibility Report - [Month Year]

## 🎯 Executive Summary
- Overall accessibility score: XX%
- WCAG AA compliance: XX%
- Total violations resolved: XX
- Team engagement level: High/Medium/Low

## 📈 Metrics Trends
- Accessibility score trend: ↗️/↘️/➡️
- Test coverage: XX% (+/-XX% from last month)
- Team knowledge: XX average quiz score

## 🏆 Achievements
- Components with perfect accessibility: XX
- Fastest accessibility test resolution: XX hours
- Team member accessibility champion: [Name]

## 🎯 Next Month Goals
- Target accessibility score: XX%
- New components to test: XX
- Team training objectives: [List]

## 📚 Resources Used
- Documentation page views: XX
- Dashboard views: XX
- Team questions resolved: XX
```

---

This workflow integration ensures accessibility becomes a natural part of the development process, with automated checks, team collaboration, and continuous improvement built into every step.

**Next Steps**: Implement the components that best fit your team's current workflow and gradually add more sophisticated integrations as the team becomes more comfortable with accessibility practices.
