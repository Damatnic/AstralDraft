# 📊 Accessibility Monitoring Dashboard

## Overview

The Accessibility Monitoring Dashboard provides real-time insights into the accessibility health of the Astral Draft application. It tracks WCAG compliance, violation trends, component-specific metrics, and performance indicators to help maintain high accessibility standards.

## Features

### 🎯 Real-Time Metrics
- **Overall Accessibility Score**: Comprehensive score based on violations and WCAG compliance
- **WCAG Compliance Levels**: Track Level A, AA, and AAA compliance percentages
- **Violation Tracking**: Monitor critical, serious, moderate, and minor violations
- **Test Coverage**: Track accessibility testing coverage across components

### 📈 Trend Analysis
- **Historical Data**: View accessibility trends over time (7, 30, 90 days)
- **Component Trends**: Track individual component accessibility improvements
- **Violation Patterns**: Identify recurring accessibility issues
- **Performance Monitoring**: Track test execution times and efficiency

### 🔍 Component Insights
- **Component Status**: Visual status indicators (passing, warning, failing)
- **WCAG Scores**: Individual component accessibility scores
- **Violation Breakdown**: Detailed violation counts by severity
- **Last Tested**: Track when components were last validated

### 📱 Responsive Design
- **Mobile-Friendly**: Optimized for viewing on all device sizes
- **Accessible Interface**: The dashboard itself follows WCAG 2.1 AA guidelines
- **Print Support**: Generate printable accessibility reports
- **High Contrast**: Support for high contrast and reduced motion preferences

## Getting Started

### Prerequisites

```bash
npm install
```

### Running the Dashboard

#### 1. Generate Dashboard Data
```bash
# Run accessibility tests and generate dashboard data
npm run accessibility:dashboard

# Run tests and start development server with dashboard
npm run accessibility:dashboard:dev

# Monitor mode (continuous updates)
npm run accessibility:monitor
```

#### 2. View Dashboard
The dashboard can be accessed in several ways:

**Local Development:**
```bash
# Start the main application with dashboard integrated
npm run dev
# Navigate to /accessibility-dashboard
```

**Standalone HTML:**
```bash
# Generate standalone dashboard HTML
npm run accessibility:dashboard
# Open accessibility-reports/dashboard.html
```

**GitHub Pages:**
The dashboard is automatically deployed to GitHub Pages after each accessibility test run:
- **Dashboard**: https://astral-projects.github.io/astral-draft/dashboard.html
- **Raw Data**: https://astral-projects.github.io/astral-draft/dashboard-data.json

### Integration with React App

```tsx
import { AccessibilityDashboard } from './components/dashboard/AccessibilityDashboardSimple';
import './styles/accessibility-dashboard.css';

function App() {
  return (
    <div className="app">
      {/* Your app content */}
      <AccessibilityDashboard />
    </div>
  );
}
```

## Architecture

### Data Flow

```
Accessibility Tests → Monitoring Service → Dashboard Data → UI Components
     ↓                      ↓                    ↓             ↓
Jest/axe-core      Process Results      JSON Storage    React Dashboard
```

### Components

#### 1. **AccessibilityMonitoringService** (`services/accessibilityMonitoringService.ts`)
- Processes test results from Jest and axe-core
- Calculates WCAG compliance scores
- Generates component-specific metrics
- Manages historical data storage

#### 2. **Dashboard Integration Script** (`scripts/accessibilityDashboardIntegration.js`)
- Runs accessibility tests
- Processes results through monitoring service
- Updates dashboard data files
- Generates summary reports

#### 3. **Dashboard Components**
- **AccessibilityDashboard**: Main dashboard interface
- **AccessibilityDashboardSimple**: Lightweight version without external dependencies
- **MetricCard**: Individual metric display components
- **SimpleTrendChart**: Custom SVG-based trend visualization
- **ComponentStatusTable**: Component accessibility status grid

#### 4. **GitHub Actions Integration**
- **accessibility-dashboard.yml**: Automated dashboard updates
- Runs on test completion, schedule, and manual trigger
- Deploys to GitHub Pages
- Sends notifications on critical issues

## Configuration

### Dashboard Settings
Configure dashboard behavior in `config/accessibility.config.js`:

```javascript
module.exports = {
  dashboard: {
    // Historical data retention (number of entries)
    maxHistoryEntries: 100,
    
    // Update frequency for monitoring mode
    updateIntervalMinutes: 30,
    
    // Violation thresholds for status determination
    thresholds: {
      critical: 0,    // Max critical violations
      serious: 5,     // Max serious violations
      moderate: 10,   // Max moderate violations
      minor: 20       // Max minor violations
    },
    
    // WCAG compliance targets
    wcagTargets: {
      levelA: 95,   // Target percentage for Level A
      levelAA: 95,  // Target percentage for Level AA
      levelAAA: 80  // Target percentage for Level AAA
    }
  }
};
```

### Notification Settings
Configure team notifications for accessibility issues:

```javascript
module.exports = {
  notifications: {
    // Enable/disable notifications
    enabled: true,
    
    // Notification channels
    channels: {
      slack: {
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#accessibility'
      },
      email: {
        recipients: ['accessibility-team@company.com'],
        smtp: process.env.SMTP_CONFIG
      }
    },
    
    // Notification triggers
    triggers: {
      criticalViolations: true,
      complianceDrops: true,
      dailySummary: true,
      weeklyReport: true
    }
  }
};
```

## Data Schema

### AccessibilityMetrics Interface

```typescript
interface AccessibilityMetrics {
  timestamp: string;
  totalViolations: number;
  violationsByLevel: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  wcagCompliance: {
    levelA: number;    // Percentage (0-100)
    levelAA: number;   // Percentage (0-100)
    levelAAA: number;  // Percentage (0-100)
  };
  componentMetrics: ComponentAccessibilityMetric[];
  testCoverage: {
    totalComponents: number;
    testedComponents: number;
    coveragePercentage: number;
  };
  performanceMetrics: {
    testExecutionTime: number;
    averageViolationsPerComponent: number;
  };
}
```

### Dashboard Data Structure

```javascript
{
  "lastUpdated": "2025-08-11T10:30:00.000Z",
  "latestMetrics": { /* AccessibilityMetrics */ },
  "history": [ /* Array of AccessibilityMetrics */ ],
  "summary": {
    "totalRuns": 25,
    "averageScore": 94,
    "trendDirection": "improving",
    "lastRunStatus": "success"
  }
}
```

## API Reference

### AccessibilityMonitoringService

#### Methods

**`processAxeResults(results: AxeResults, componentName?: string): AccessibilityMetrics`**
- Processes axe-core test results into dashboard metrics
- Optional component name for component-specific analysis

**`generateReport(metrics: AccessibilityMetrics): AccessibilityReport`**
- Creates comprehensive accessibility report with recommendations

**`storeMetrics(metrics: AccessibilityMetrics): void`**
- Stores metrics in local storage for historical tracking

**`getMetricsHistory(): AccessibilityMetrics[]`**
- Retrieves historical metrics data

**`getTrendData(days: number): ViolationTrend[]`**
- Gets trend data for specified number of days

### Dashboard Integration Script

#### Command Line Options

```bash
# Basic usage
node scripts/accessibilityDashboardIntegration.js

# Monitor mode (continuous updates)
node scripts/accessibilityDashboardIntegration.js --monitor

# Specify output directory
node scripts/accessibilityDashboardIntegration.js --output ./custom-reports

# Verbose logging
node scripts/accessibilityDashboardIntegration.js --verbose
```

## Deployment

### GitHub Pages (Automatic)
The dashboard is automatically deployed to GitHub Pages through the accessibility-dashboard.yml workflow:

1. **Triggers**: Runs after accessibility tests, on schedule, or manually
2. **Process**: Downloads test artifacts, generates dashboard data, creates HTML
3. **Deploy**: Uploads to GitHub Pages for public access
4. **Notify**: Sends notifications on failures or scheduled summaries

### Manual Deployment
For custom deployments:

```bash
# Generate dashboard data
npm run accessibility:dashboard

# Deploy files from accessibility-reports/ directory
# - dashboard.html (standalone dashboard)
# - dashboard-data.json (data file)
# - latest-summary.md (human-readable summary)
# - metrics-history.json (historical data)
```

### Docker Deployment
For containerized deployments:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run accessibility:dashboard

EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

#### 1. **No Dashboard Data**
```bash
# Check if tests are running
npm run test:accessibility

# Verify dashboard integration
npm run accessibility:dashboard

# Check output directory
ls -la accessibility-reports/
```

#### 2. **Dashboard Not Updating**
```bash
# Clear local storage
localStorage.removeItem('accessibility-metrics-history');

# Force refresh dashboard data
npm run accessibility:dashboard

# Restart development server
npm run dev
```

#### 3. **GitHub Pages Not Deploying**
- Check workflow permissions in repository settings
- Verify GitHub Pages is enabled
- Check workflow logs for errors
- Ensure artifact uploads are successful

#### 4. **Chart Components Not Loading**
The dashboard uses simple SVG-based charts to avoid external dependencies. If charts aren't appearing:

- Check browser console for JavaScript errors
- Verify CSS is loading correctly
- Ensure data format matches expected schema

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
DEBUG=accessibility:* npm run accessibility:dashboard

# Check detailed logs
cat accessibility-reports/debug.log
```

### Performance Issues

If dashboard loading is slow:

1. **Reduce History Size**: Limit `maxHistoryEntries` in config
2. **Component Filtering**: Use component selector to focus on specific areas
3. **Time Range**: Use shorter time ranges for trend analysis
4. **Data Cleanup**: Remove old artifacts and reports

## Contributing

### Adding New Metrics

1. **Extend Interfaces**: Update TypeScript interfaces in monitoring service
2. **Update Processing**: Add metric calculation in `processAxeResults`
3. **UI Components**: Add visualization components for new metrics
4. **Documentation**: Update this README with new features

### Adding Chart Types

1. **Create Component**: Add new chart component in `components/dashboard/`
2. **SVG Implementation**: Use SVG for dependency-free charts
3. **Responsive Design**: Ensure mobile compatibility
4. **Accessibility**: Make charts screen reader accessible

### Testing Dashboard Components

```bash
# Test dashboard components
npm run test -- --testPathPattern=dashboard

# Test monitoring service
npm run test -- --testPathPattern=monitoring

# Test integration script
node scripts/accessibilityDashboardIntegration.js --test
```

## Best Practices

### 1. **Regular Monitoring**
- Set up scheduled dashboard updates
- Review metrics weekly
- Address critical violations immediately

### 2. **Team Integration**
- Share dashboard URL with team
- Include in standup meetings
- Set up notification channels

### 3. **Continuous Improvement**
- Track trends over time
- Set WCAG compliance targets
- Celebrate accessibility wins

### 4. **Documentation**
- Keep accessibility documentation updated
- Document violation fixes
- Share lessons learned

## Links and Resources

- **Dashboard**: https://astral-projects.github.io/astral-draft/dashboard.html
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/Understanding/
- **axe-core Documentation**: https://github.com/dequelabs/axe-core
- **Accessibility Testing Guide**: [docs/accessibility-testing-guide.md](./accessibility-testing-guide.md)
- **Component Checklist**: [docs/component-accessibility-checklist.md](./component-accessibility-checklist.md)

---

**Last Updated**: August 11, 2025  
**Version**: 1.0.0  
**Maintainer**: Accessibility Team
