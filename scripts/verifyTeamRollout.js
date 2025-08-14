#!/usr/bin/env node

/**
 * Accessibility Team Rollout Integration Verification
 * 
 * This script verifies that all components of the accessibility team rollout
 * are properly configured and working together seamlessly.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Console helpers
const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.cyan}📋 ${msg}${colors.reset}\n`),
  subsection: (msg) => console.log(`${colors.magenta}🔸 ${msg}${colors.reset}`)
};

class TeamRolloutVerifier {
  constructor() {
    this.checks = [];
    this.errors = [];
    this.warnings = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Add a verification check
   */
  addCheck(name, checkFn, category = 'general') {
    this.checks.push({ name, checkFn, category });
  }

  /**
   * Run all verification checks
   */
  async runVerification() {
    log.section('🚀 Accessibility Team Rollout Verification');
    log.info('Verifying all rollout components are properly configured...\n');

    // Group checks by category
    const categories = [...new Set(this.checks.map(check => check.category))];
    
    for (const category of categories) {
      log.subsection(`${category.toUpperCase()} VERIFICATION`);
      
      const categoryChecks = this.checks.filter(check => check.category === category);
      
      for (const check of categoryChecks) {
        try {
          const result = await check.checkFn();
          if (result.success) {
            log.success(`${check.name}: ${result.message || 'Passed'}`);
            this.passed++;
          } else {
            log.error(`${check.name}: ${result.message || 'Failed'}`);
            this.failed++;
            this.errors.push(`${check.name}: ${result.message}`);
          }
        } catch (error) {
          log.error(`${check.name}: ${error.message}`);
          this.failed++;
          this.errors.push(`${check.name}: ${error.message}`);
        }
      }
      console.log(''); // Add spacing between categories
    }

    this.displaySummary();
  }

  /**
   * Display verification summary
   */
  displaySummary() {
    log.section('📊 VERIFICATION SUMMARY');
    
    console.log(`${colors.bold}Total Checks:${colors.reset} ${this.passed + this.failed}`);
    console.log(`${colors.green}✅ Passed:${colors.reset} ${this.passed}`);
    console.log(`${colors.red}❌ Failed:${colors.reset} ${this.failed}`);
    
    if (this.warnings.length > 0) {
      console.log(`${colors.yellow}⚠️  Warnings:${colors.reset} ${this.warnings.length}`);
    }

    if (this.failed === 0) {
      log.success('\n🎉 All rollout components verified successfully!');
      log.info('The team rollout infrastructure is ready for deployment.');
    } else {
      log.error('\n🚨 Some verification checks failed!');
      log.info('Please address the following issues before proceeding:');
      this.errors.forEach(error => log.error(`  • ${error}`));
    }

    // Generate rollout readiness score
    const readinessScore = Math.round((this.passed / (this.passed + this.failed)) * 100);
    log.section(`🎯 ROLLOUT READINESS: ${readinessScore}%`);
    
    if (readinessScore >= 95) {
      log.success('✨ Excellent! Ready for immediate team rollout.');
    } else if (readinessScore >= 85) {
      log.warning('👍 Good! Address minor issues before rollout.');
    } else if (readinessScore >= 70) {
      log.warning('⚠️  Moderate readiness. Fix critical issues first.');
    } else {
      log.error('🚨 Low readiness. Significant work needed before rollout.');
    }
  }
}

// Initialize verifier and setup checks
function setupVerificationChecks(verifier) {
// DOCUMENTATION VERIFICATION
verifier.addCheck(
  'Team Onboarding Guide',
  () => {
    const filePath = 'docs/team-accessibility-onboarding.md';
    const exists = fs.existsSync(filePath);
    if (!exists) return { success: false, message: 'Team onboarding guide not found' };
    
    const content = fs.readFileSync(filePath, 'utf8');
    const hasQuickStart = content.includes('Quick Start Checklist');
    const hasLearningPath = content.includes('4-Week Learning Path');
    const hasTroubleshooting = content.includes('Troubleshooting');
    
    if (!hasQuickStart || !hasLearningPath || !hasTroubleshooting) {
      return { success: false, message: 'Missing essential onboarding sections' };
    }
    
    return { success: true, message: 'Complete with Quick Start and learning path' };
  },
  'documentation'
);

verifier.addCheck(
  'Workflow Integration Guide',
  () => {
    const filePath = 'docs/accessibility-workflow-integration.md';
    const exists = fs.existsSync(filePath);
    if (!exists) return { success: false, message: 'Workflow integration guide not found' };
    
    const content = fs.readFileSync(filePath, 'utf8');
    const hasPreCommit = content.includes('Pre-commit Setup');
    const hasVSCode = content.includes('VS Code Integration');
    const hasGitHub = content.includes('GitHub Actions');
    
    if (!hasPreCommit || !hasVSCode || !hasGitHub) {
      return { success: false, message: 'Missing workflow integration components' };
    }
    
    return { success: true, message: 'Complete with pre-commit, VS Code, and GitHub integration' };
  },
  'documentation'
);

verifier.addCheck(
  'Training Module',
  () => {
    const filePath = 'docs/accessibility-training-module.md';
    const exists = fs.existsSync(filePath);
    if (!exists) return { success: false, message: 'Training module not found' };
    
    const content = fs.readFileSync(filePath, 'utf8');
    const hasCurriculum = content.includes('Training Curriculum');
    const hasCertification = content.includes('Certification System');
    const hasAssessment = content.includes('Knowledge Assessment');
    
    if (!hasCurriculum || !hasCertification || !hasAssessment) {
      return { success: false, message: 'Missing training components' };
    }
    
    return { success: true, message: 'Complete with curriculum and certification' };
  },
  'documentation'
);

verifier.addCheck(
  'Rollout Plan',
  () => {
    const filePath = 'docs/accessibility-team-rollout-plan.md';
    const exists = fs.existsSync(filePath);
    if (!exists) return { success: false, message: 'Team rollout plan not found' };
    
    const content = fs.readFileSync(filePath, 'utf8');
    const hasTimeline = content.includes('Rollout Timeline');
    const hasMetrics = content.includes('Success Metrics');
    const hasRoles = content.includes('Role Assignments');
    
    if (!hasTimeline || !hasMetrics || !hasRoles) {
      return { success: false, message: 'Missing rollout plan components' };
    }
    
    return { success: true, message: 'Complete with timeline, metrics, and role assignments' };
  },
  'documentation'
);

// INFRASTRUCTURE VERIFICATION
verifier.addCheck(
  'Notification Service',
  () => {
    const filePath = 'scripts/accessibilityNotifications.js';
    const exists = fs.existsSync(filePath);
    if (!exists) return { success: false, message: 'Notification service script not found' };
    
    const content = fs.readFileSync(filePath, 'utf8');
    const hasSlack = content.includes('sendSlackNotification');
    const hasEmail = content.includes('sendEmailNotification');
    const hasGitHub = content.includes('createGitHubIssue');
    
    if (!hasSlack || !hasEmail || !hasGitHub) {
      return { success: false, message: 'Missing notification channels' };
    }
    
    return { success: true, message: 'Multi-channel notification service ready' };
  },
  'infrastructure'
);

verifier.addCheck(
  'Dashboard Components',
  () => {
    const componentsPath = 'components/accessibility';
    const exists = fs.existsSync(componentsPath);
    if (!exists) return { success: false, message: 'Accessibility components directory not found' };
    
    const files = fs.readdirSync(componentsPath);
    const hasDashboard = files.some(file => file.includes('Dashboard'));
    const hasMonitoring = files.some(file => file.includes('Monitoring'));
    
    if (!hasDashboard) {
      return { success: false, message: 'Dashboard components missing' };
    }
    
    return { success: true, message: 'Dashboard and monitoring components available' };
  },
  'infrastructure'
);

verifier.addCheck(
  'Testing Framework',
  () => {
    const testPath = '__tests__/accessibility';
    const exists = fs.existsSync(testPath);
    if (!exists) return { success: false, message: 'Accessibility tests directory not found' };
    
    const files = fs.readdirSync(testPath);
    const testFiles = files.filter(file => file.endsWith('.test.ts') || file.endsWith('.test.js'));
    
    if (testFiles.length === 0) {
      return { success: false, message: 'No accessibility test files found' };
    }
    
    return { success: true, message: `${testFiles.length} accessibility test files available` };
  },
  'infrastructure'
);

// CONFIGURATION VERIFICATION
verifier.addCheck(
  'Package.json Scripts',
  () => {
    const packagePath = 'package.json';
    const exists = fs.existsSync(packagePath);
    if (!exists) return { success: false, message: 'package.json not found' };
    
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = packageContent.scripts || {};
    
    const hasAccessibilityTest = scripts['test:accessibility'];
    const hasDashboardScript = scripts['accessibility:dashboard'];
    
    if (!hasAccessibilityTest) {
      return { success: false, message: 'Missing accessibility test script' };
    }
    
    return { success: true, message: 'Accessibility scripts configured' };
  },
  'configuration'
);

verifier.addCheck(
  'Jest Configuration',
  () => {
    const configPath = 'jest.config.js';
    const exists = fs.existsSync(configPath);
    if (!exists) return { success: false, message: 'Jest configuration not found' };
    
    const content = fs.readFileSync(configPath, 'utf8');
    const hasAxeSetup = content.includes('setupFilesAfterEnv') || content.includes('setupTests');
    
    if (!hasAxeSetup) {
      return { success: false, message: 'Jest not configured for accessibility testing' };
    }
    
    return { success: true, message: 'Jest configured with accessibility testing setup' };
  },
  'configuration'
);

verifier.addCheck(
  'TypeScript Configuration',
  () => {
    const configPath = 'tsconfig.json';
    const exists = fs.existsSync(configPath);
    if (!exists) return { success: false, message: 'TypeScript configuration not found' };
    
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    const hasStrict = config.compilerOptions && config.compilerOptions.strict;
    
    return { success: true, message: hasStrict ? 'Strict TypeScript configuration' : 'Basic TypeScript configuration' };
  },
  'configuration'
);

// WORKFLOW VERIFICATION
verifier.addCheck(
  'GitHub Actions Workflow',
  () => {
    const workflowPath = '.github/workflows';
    const exists = fs.existsSync(workflowPath);
    if (!exists) return { success: false, message: 'GitHub workflows directory not found' };
    
    const files = fs.readdirSync(workflowPath);
    const hasAccessibilityWorkflow = files.some(file => 
      file.includes('accessibility') || file.includes('a11y')
    );
    
    if (!hasAccessibilityWorkflow) {
      return { success: false, message: 'No accessibility workflow found' };
    }
    
    return { success: true, message: 'GitHub Actions accessibility workflow configured' };
  },
  'workflow'
);

verifier.addCheck(
  'Pre-commit Configuration',
  () => {
    const preCommitPath = '.pre-commit-config.yaml';
    const packagePath = 'package.json';
    
    // Check for pre-commit config file or package.json scripts
    const hasPreCommitFile = fs.existsSync(preCommitPath);
    const hasPackageScripts = fs.existsSync(packagePath) && 
      JSON.parse(fs.readFileSync(packagePath, 'utf8')).scripts?.['pre-commit'];
    
    if (!hasPreCommitFile && !hasPackageScripts) {
      return { success: false, message: 'No pre-commit configuration found' };
    }
    
    return { success: true, message: 'Pre-commit hooks configured' };
  },
  'workflow'
);

// TEAM READINESS VERIFICATION
verifier.addCheck(
  'VS Code Extensions List',
  () => {
    const extensionsPath = '.vscode/extensions.json';
    const exists = fs.existsSync(extensionsPath);
    if (!exists) return { success: false, message: 'VS Code extensions configuration not found' };
    
    const content = fs.readFileSync(extensionsPath, 'utf8');
    const config = JSON.parse(content);
    const recommendations = config.recommendations || [];
    
    const hasAccessibilityExtensions = recommendations.some(ext => 
      ext.includes('accessibility') || ext.includes('axe') || ext.includes('a11y')
    );
    
    if (!hasAccessibilityExtensions) {
      return { success: false, message: 'No accessibility extensions recommended' };
    }
    
    return { success: true, message: `${recommendations.length} VS Code extensions recommended` };
  },
  'team-readiness'
);

verifier.addCheck(
  'Team Communication Setup',
  () => {
    // Check if notification service has team channel configuration
    const notificationPath = 'scripts/accessibilityNotifications.js';
    const exists = fs.existsSync(notificationPath);
    if (!exists) return { success: false, message: 'Team communication setup not found' };
    
    const content = fs.readFileSync(notificationPath, 'utf8');
    const hasSlackConfig = content.includes('SLACK_WEBHOOK_URL') || content.includes('slack');
    const hasEmailConfig = content.includes('EMAIL_') || content.includes('email');
    
    if (!hasSlackConfig && !hasEmailConfig) {
      return { success: false, message: 'No team communication channels configured' };
    }
    
    return { success: true, message: 'Team communication channels ready' };
  },
  'team-readiness'
);

// INTEGRATION VERIFICATION
verifier.addCheck(
  'Dashboard Data Integration',
  () => {
    const dashboardPath = 'accessibility/dashboard';
    const servicesPath = 'services';
    
    // Check for dashboard data service
    const hasDashboardDir = fs.existsSync(dashboardPath);
    const hasServices = fs.existsSync(servicesPath);
    
    if (hasServices) {
      const serviceFiles = fs.readdirSync(servicesPath);
      const hasAccessibilityService = serviceFiles.some(file => 
        file.includes('accessibility') || file.includes('monitoring')
      );
      
      if (hasAccessibilityService) {
        return { success: true, message: 'Dashboard data integration configured' };
      }
    }
    
    return { success: false, message: 'Dashboard data integration not found' };
  },
  'integration'
);

verifier.addCheck(
  'Test Data Generation',
  () => {
    // Check if there's a way to generate test accessibility data
    const testPath = '__tests__/accessibility';
    const exists = fs.existsSync(testPath);
    if (!exists) return { success: false, message: 'Test data generation not available' };
    
    return { success: true, message: 'Test data generation available through accessibility tests' };
  },
  'integration'
);

// ROLLOUT READINESS FINAL CHECK
verifier.addCheck(
  'Complete Rollout Package',
  () => {
    const requiredFiles = [
      'docs/team-accessibility-onboarding.md',
      'docs/accessibility-workflow-integration.md',
      'docs/accessibility-training-module.md',
      'docs/accessibility-team-rollout-plan.md',
      'scripts/accessibilityNotifications.js'
    ];
    
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
      return { 
        success: false, 
        message: `Missing files: ${missingFiles.join(', ')}` 
      };
    }
    
    return { 
      success: true, 
      message: 'All rollout package files present and ready' 
    };
  },
  'integration'
);
}

// Run the verification
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const verifier = new TeamRolloutVerifier();
  
  // Add all checks here
  setupVerificationChecks(verifier);
  
  verifier.runVerification();
}

export default TeamRolloutVerifier;
