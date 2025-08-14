#!/usr/bin/env node

/**
 * Accessibility Team Notification System
 * 
 * Handles notifications for accessibility status updates, violations, and reports
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AccessibilityNotificationService {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'accessibility-reports');
    this.configPath = path.join(process.cwd(), 'config', 'accessibility-notifications.json');
    this.config = null;
  }

  async initialize() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configContent);
    } catch (error) {
      // Use default configuration if config file doesn't exist
      this.config = this.getDefaultConfig();
      await this.saveDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      notifications: {
        enabled: true,
        channels: {
          slack: {
            enabled: false,
            webhook: process.env.SLACK_WEBHOOK_URL || '',
            channel: '#accessibility'
          },
          email: {
            enabled: false,
            recipients: ['accessibility-team@company.com'],
            smtp: {
              host: process.env.SMTP_HOST || '',
              port: 587,
              secure: false,
              auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
              }
            }
          },
          github: {
            enabled: true,
            token: process.env.GITHUB_TOKEN || '',
            owner: 'Damatnic',
            repo: 'AstralDraft'
          }
        },
        triggers: {
          criticalViolations: true,
          complianceDrops: true,
          dailySummary: true,
          weeklyReport: true,
          testFailures: true
        },
        thresholds: {
          criticalViolations: 0,
          seriousViolations: 5,
          complianceDropThreshold: 5 // percentage
        }
      }
    };
  }

  async saveDefaultConfig() {
    const configDir = path.dirname(this.configPath);
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
  }

  async sendNotifications(metrics, type = 'update') {
    if (!this.config.notifications.enabled) {
      console.log('📢 Notifications disabled - skipping');
      return;
    }

    console.log(`📢 Sending ${type} notifications...`);

    const notifications = [];

    // Determine notification type and content
    const notificationData = this.prepareNotificationData(metrics, type);

    // Send to enabled channels
    if (this.config.notifications.channels.slack.enabled) {
      notifications.push(this.sendSlackNotification(notificationData));
    }

    if (this.config.notifications.channels.email.enabled) {
      notifications.push(this.sendEmailNotification(notificationData));
    }

    if (this.config.notifications.channels.github.enabled) {
      notifications.push(this.sendGitHubNotification(notificationData));
    }

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notifications);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📢 Notifications sent: ${successful} successful, ${failed} failed`);

    return {
      successful,
      failed,
      results
    };
  }

  prepareNotificationData(metrics, type) {
    const data = {
      type,
      timestamp: new Date().toISOString(),
      metrics,
      status: this.determineStatus(metrics),
      dashboardUrl: 'https://astral-projects.github.io/astral-draft/dashboard.html',
      localDashboard: 'accessibility-reports/dashboard.html'
    };

    // Add contextual information based on type
    switch (type) {
      case 'critical':
        data.title = '🚨 Critical Accessibility Violations Detected';
        data.priority = 'high';
        data.action = 'Immediate attention required';
        break;
      
      case 'compliance-drop':
        data.title = '📉 Accessibility Compliance Decrease';
        data.priority = 'medium';
        data.action = 'Review recent changes';
        break;
      
      case 'daily-summary':
        data.title = '📊 Daily Accessibility Summary';
        data.priority = 'low';
        data.action = 'Review for trends';
        break;
      
      case 'weekly-report':
        data.title = '📈 Weekly Accessibility Report';
        data.priority = 'low';
        data.action = 'Plan next week improvements';
        break;
      
      case 'test-failure':
        data.title = '❌ Accessibility Tests Failed';
        data.priority = 'high';
        data.action = 'Fix failing tests';
        break;
      
      default:
        data.title = '🔍 Accessibility Status Update';
        data.priority = 'low';
        data.action = 'Monitor dashboard';
    }

    return data;
  }

  determineStatus(metrics) {
    if (metrics.violationsByLevel.critical > 0) {
      return 'critical';
    } else if (metrics.violationsByLevel.serious > this.config.notifications.thresholds.seriousViolations) {
      return 'warning';
    } else if (metrics.wcagCompliance.levelAA < 95) {
      return 'attention';
    } else {
      return 'good';
    }
  }

  async sendSlackNotification(data) {
    console.log('📱 Sending Slack notification...');
    
    const webhook = this.config.notifications.channels.slack.webhook;
    if (!webhook) {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.formatSlackMessage(data);
    
    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Slack notification sent successfully');
      return { channel: 'slack', status: 'success' };
    } catch (error) {
      console.error('❌ Slack notification failed:', error.message);
      throw error;
    }
  }

  formatSlackMessage(data) {
    const statusEmoji = {
      critical: '🚨',
      warning: '⚠️',
      attention: '⚡',
      good: '✅'
    };

    const emoji = statusEmoji[data.status] || '🔍';

    return {
      text: `${emoji} ${data.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${data.title}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Overall Score:* ${this.calculateOverallScore(data.metrics)}%`
            },
            {
              type: 'mrkdwn',
              text: `*WCAG AA Compliance:* ${data.metrics.wcagCompliance.levelAA}%`
            },
            {
              type: 'mrkdwn',
              text: `*Total Violations:* ${data.metrics.totalViolations}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:* ${data.status.toUpperCase()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: this.formatViolationBreakdown(data.metrics.violationsByLevel)
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📊 View Dashboard'
              },
              url: data.dashboardUrl,
              style: data.status === 'critical' ? 'danger' : 'primary'
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Updated: ${new Date(data.timestamp).toLocaleString()} | Action: ${data.action}`
            }
          ]
        }
      ]
    };
  }

  formatViolationBreakdown(violations) {
    return `*Violation Breakdown:*\n` +
           `• Critical: ${violations.critical}\n` +
           `• Serious: ${violations.serious}\n` +
           `• Moderate: ${violations.moderate}\n` +
           `• Minor: ${violations.minor}`;
  }

  calculateOverallScore(metrics) {
    // Calculate overall accessibility score based on violations and compliance
    const violationPenalty = (
      metrics.violationsByLevel.critical * 10 +
      metrics.violationsByLevel.serious * 5 +
      metrics.violationsByLevel.moderate * 2 +
      metrics.violationsByLevel.minor * 1
    );

    const baseScore = (
      metrics.wcagCompliance.levelA * 0.3 +
      metrics.wcagCompliance.levelAA * 0.5 +
      metrics.wcagCompliance.levelAAA * 0.2
    );

    const finalScore = Math.max(0, baseScore - violationPenalty);
    return Math.round(finalScore);
  }

  async sendEmailNotification(data) {
    console.log('📧 Email notifications not implemented yet');
    // TODO: Implement email notifications using nodemailer or similar
    return { channel: 'email', status: 'not_implemented' };
  }

  async sendGitHubNotification(data) {
    console.log('📝 GitHub notification logged');
    
    // Create GitHub issue for critical violations
    if (data.status === 'critical' && data.metrics.violationsByLevel.critical > 0) {
      await this.createGitHubIssue(data);
    }

    // Log notification in accessibility reports
    await this.logNotification(data);

    return { channel: 'github', status: 'success' };
  }

  async createGitHubIssue(data) {
    const issueTitle = `🚨 Critical Accessibility Violations Detected - ${new Date().toDateString()}`;
    const issueBody = this.formatGitHubIssue(data);

    // Save issue data for potential GitHub API integration
    const issueData = {
      title: issueTitle,
      body: issueBody,
      labels: ['accessibility', 'critical', 'bug'],
      assignees: [],
      timestamp: data.timestamp
    };

    const issueFile = path.join(this.outputDir, 'github-issues.json');
    
    try {
      let issues = [];
      try {
        const existingIssues = await fs.readFile(issueFile, 'utf8');
        issues = JSON.parse(existingIssues);
      } catch {
        // File doesn't exist, start with empty array
      }

      issues.push(issueData);
      await fs.writeFile(issueFile, JSON.stringify(issues, null, 2));
      
      console.log('📝 GitHub issue data saved for manual creation');
    } catch (error) {
      console.error('❌ Failed to save GitHub issue data:', error);
    }
  }

  formatGitHubIssue(data) {
    return `## 🚨 Critical Accessibility Violations Detected

**Detection Time**: ${new Date(data.timestamp).toLocaleString()}  
**Overall Score**: ${this.calculateOverallScore(data.metrics)}%  
**WCAG AA Compliance**: ${data.metrics.wcagCompliance.levelAA}%

### 📊 Violation Summary

| Severity | Count |
|----------|-------|
| Critical | ${data.metrics.violationsByLevel.critical} |
| Serious  | ${data.metrics.violationsByLevel.serious} |
| Moderate | ${data.metrics.violationsByLevel.moderate} |
| Minor    | ${data.metrics.violationsByLevel.minor} |

### 🎯 Required Actions

1. **Immediate**: Fix all critical violations (blocking for release)
2. **Short-term**: Address serious violations within 2 business days
3. **Medium-term**: Plan resolution for moderate violations
4. **Monitor**: Track minor violations for trends

### 📋 Next Steps

- [ ] Run \`npm run test:accessibility\` to see detailed violations
- [ ] Review [Component Accessibility Checklist](../docs/component-accessibility-checklist.md)
- [ ] Check the [Live Dashboard](${data.dashboardUrl}) for real-time status
- [ ] Follow [Accessibility Best Practices](../docs/accessibility-best-practices.md) for fixes

### 🔗 Resources

- **Dashboard**: [View Live Metrics](${data.dashboardUrl})
- **Testing Guide**: [Accessibility Testing Guide](../docs/accessibility-testing-guide.md)
- **Workflow**: [Development Workflow Integration](../docs/accessibility-workflow-integration.md)

---

**Auto-generated by Accessibility Monitoring System**  
**Contact**: #accessibility team channel for assistance`;
  }

  async logNotification(data) {
    const logEntry = {
      timestamp: data.timestamp,
      type: data.type,
      status: data.status,
      metrics: {
        overallScore: this.calculateOverallScore(data.metrics),
        wcagAA: data.metrics.wcagCompliance.levelAA,
        totalViolations: data.metrics.totalViolations,
        criticalViolations: data.metrics.violationsByLevel.critical
      },
      action: data.action
    };

    const logFile = path.join(this.outputDir, 'notification-log.json');
    
    try {
      let logs = [];
      try {
        const existingLogs = await fs.readFile(logFile, 'utf8');
        logs = JSON.parse(existingLogs);
      } catch {
        // File doesn't exist, start with empty array
      }

      logs.push(logEntry);
      
      // Keep only last 100 log entries
      if (logs.length > 100) {
        logs = logs.slice(-100);
      }

      await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('❌ Failed to save notification log:', error);
    }
  }

  async generateDailySummary() {
    console.log('📊 Generating daily accessibility summary...');
    
    try {
      // Load latest dashboard data
      const dashboardDataFile = path.join(this.outputDir, 'dashboard-data.json');
      const dashboardData = JSON.parse(await fs.readFile(dashboardDataFile, 'utf8'));
      
      await this.sendNotifications(dashboardData.latestMetrics, 'daily-summary');
      
      console.log('📊 Daily summary sent successfully');
    } catch (error) {
      console.error('❌ Failed to generate daily summary:', error);
    }
  }

  async generateWeeklyReport() {
    console.log('📈 Generating weekly accessibility report...');
    
    try {
      // Load dashboard data and generate weekly trends
      const dashboardDataFile = path.join(this.outputDir, 'dashboard-data.json');
      const dashboardData = JSON.parse(await fs.readFile(dashboardDataFile, 'utf8'));
      
      // Calculate weekly trends
      const weeklyMetrics = this.calculateWeeklyTrends(dashboardData.history);
      
      await this.sendNotifications(weeklyMetrics, 'weekly-report');
      
      console.log('📈 Weekly report sent successfully');
    } catch (error) {
      console.error('❌ Failed to generate weekly report:', error);
    }
  }

  calculateWeeklyTrends(history) {
    // Calculate trends from historical data
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weekData = history.filter(entry => 
      new Date(entry.timestamp) >= oneWeekAgo
    );

    if (weekData.length === 0) {
      return history[history.length - 1] || this.getDefaultMetrics();
    }

    // Calculate averages and trends
    const avgViolations = {
      critical: Math.round(weekData.reduce((sum, entry) => sum + entry.violationsByLevel.critical, 0) / weekData.length),
      serious: Math.round(weekData.reduce((sum, entry) => sum + entry.violationsByLevel.serious, 0) / weekData.length),
      moderate: Math.round(weekData.reduce((sum, entry) => sum + entry.violationsByLevel.moderate, 0) / weekData.length),
      minor: Math.round(weekData.reduce((sum, entry) => sum + entry.violationsByLevel.minor, 0) / weekData.length)
    };

    const avgCompliance = {
      levelA: Math.round(weekData.reduce((sum, entry) => sum + entry.wcagCompliance.levelA, 0) / weekData.length),
      levelAA: Math.round(weekData.reduce((sum, entry) => sum + entry.wcagCompliance.levelAA, 0) / weekData.length),
      levelAAA: Math.round(weekData.reduce((sum, entry) => sum + entry.wcagCompliance.levelAAA, 0) / weekData.length)
    };

    return {
      timestamp: new Date().toISOString(),
      totalViolations: avgViolations.critical + avgViolations.serious + avgViolations.moderate + avgViolations.minor,
      violationsByLevel: avgViolations,
      wcagCompliance: avgCompliance,
      weeklyTrend: this.calculateTrend(weekData),
      dataPoints: weekData.length
    };
  }

  calculateTrend(data) {
    if (data.length < 2) return 'stable';
    
    const first = data[0];
    const last = data[data.length - 1];
    
    const firstScore = this.calculateOverallScore(first);
    const lastScore = this.calculateOverallScore(last);
    
    const difference = lastScore - firstScore;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  getDefaultMetrics() {
    return {
      timestamp: new Date().toISOString(),
      totalViolations: 0,
      violationsByLevel: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      wcagCompliance: { levelA: 100, levelAA: 100, levelAAA: 95 }
    };
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new AccessibilityNotificationService();
  
  const command = process.argv[2] || 'update';
  
  service.initialize().then(async () => {
    switch (command) {
      case 'daily':
        await service.generateDailySummary();
        break;
      
      case 'weekly':
        await service.generateWeeklyReport();
        break;
      
      case 'test':
        const testMetrics = service.getDefaultMetrics();
        testMetrics.violationsByLevel.critical = 2; // Simulate critical violations
        await service.sendNotifications(testMetrics, 'critical');
        break;
      
      default:
        // Load latest metrics and send update
        try {
          const dashboardDataFile = path.join(service.outputDir, 'dashboard-data.json');
          const dashboardData = JSON.parse(await fs.readFile(dashboardDataFile, 'utf8'));
          await service.sendNotifications(dashboardData.latestMetrics, 'update');
        } catch (error) {
          console.error('❌ Failed to load dashboard data for notifications');
          process.exit(1);
        }
    }
  }).catch(error => {
    console.error('❌ Notification service failed:', error);
    process.exit(1);
  });
}

export default AccessibilityNotificationService;
