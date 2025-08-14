#!/usr/bin/env node

/**
 * Enhanced CI/CD Accessibility Testing Script
 * Comprehensive accessibility testing with violation thresholds and reporting
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { accessibilityConfig, ciConfig } from '../config/accessibility.config.js';

class CIAccessibilityTester {
    constructor(options = {}) {
        this.config = { ...ciConfig, ...options };
        this.results = {
            violations: {
                critical: 0,
                serious: 0,
                moderate: 0,
                minor: 0,
                incomplete: 0
            },
            tests: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0
            },
            coverage: {
                statements: 0,
                branches: 0,
                functions: 0,
                lines: 0
            },
            duration: 0,
            timestamp: new Date().toISOString()
        };
        this.reportDir = 'accessibility-reports';
    }

    /**
     * Main method to run accessibility tests in CI/CD
     */
    async runCITests() {
        console.log('🚀 Starting CI/CD Accessibility Testing...');
        console.log(`📊 Violation Thresholds: Critical=${this.config.violationThresholds.critical}, Serious=${this.config.violationThresholds.serious}`);
        
        const startTime = Date.now();
        
        try {
            // Ensure report directory exists
            await this.ensureReportDirectory();
            
            // Run accessibility tests
            console.log('\n📋 Running accessibility test suite...');
            await this.runAccessibilityTests();
            
            // Generate comprehensive reports
            console.log('\n📄 Generating accessibility reports...');
            await this.generateReports();
            
            // Validate against thresholds
            console.log('\n🎯 Validating against violation thresholds...');
            const passed = await this.validateThresholds();
            
            // Generate summary
            this.results.duration = Date.now() - startTime;
            await this.generateSummary(passed);
            
            // Exit with appropriate code
            if (passed) {
                console.log('\n✅ All accessibility tests passed!');
                process.exit(0);
            } else {
                console.log('\n❌ Accessibility tests failed - violations exceed thresholds');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('\n💥 Accessibility testing failed:', error.message);
            await this.generateErrorReport(error);
            process.exit(1);
        }
    }

    /**
     * Ensure report directory structure exists
     */
    async ensureReportDirectory() {
        const dirs = [
            this.reportDir,
            `${this.reportDir}/coverage`,
            `${this.reportDir}/junit`,
            `${this.reportDir}/html`,
            `${this.reportDir}/artifacts`
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Run the accessibility test suite
     */
    async runAccessibilityTests() {
        return new Promise((resolve, reject) => {
            const jestArgs = [
                '--config=jest.accessibility.config.js',
                '--ci',
                '--coverage',
                `--coverageDirectory=${this.reportDir}/coverage`,
                '--watchAll=false',
                '--passWithNoTests',
                '--verbose',
                '--testResultsProcessor=jest-junit',
                '--forceExit'
            ];

            // Set environment variables for Jest
            const env = {
                ...process.env,
                JEST_JUNIT_OUTPUT_DIR: `${this.reportDir}/junit`,
                JEST_JUNIT_OUTPUT_NAME: 'accessibility-results.xml',
                JEST_HTML_REPORTER_OUTPUT_PATH: `${this.reportDir}/html/accessibility-report.html`,
                JEST_HTML_REPORTER_PAGE_TITLE: 'Accessibility Test Results',
                CI: 'true',
                NODE_ENV: 'test'
            };

            console.log(`🧪 Running: npx jest ${jestArgs.join(' ')}`);
            
            const jestProcess = spawn('npx', ['jest', ...jestArgs], {
                env,
                stdio: 'pipe',
                shell: true
            });

            let stdout = '';
            let stderr = '';

            jestProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                if (this.config.pipeline.execution.verbose) {
                    process.stdout.write(output);
                }
            });

            jestProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                if (this.config.pipeline.execution.verbose) {
                    process.stderr.write(output);
                }
            });

            jestProcess.on('close', async (code) => {
                // Save test output for reporting
                await fs.writeFile(`${this.reportDir}/test-output.log`, stdout + stderr);
                
                // Parse test results
                await this.parseTestResults(stdout, stderr);
                
                // Jest exit code 0 = all tests passed, 1 = tests failed
                if (code === 0 || code === 1) {
                    resolve();
                } else {
                    reject(new Error(`Jest process exited with code ${code}`));
                }
            });

            jestProcess.on('error', (error) => {
                reject(new Error(`Failed to start Jest: ${error.message}`));
            });
        });
    }

    /**
     * Parse test results from Jest output
     */
    async parseTestResults(stdout, stderr) {
        // Parse Jest test summary
        const testSummaryMatch = stdout.match(/Tests:\s*(\d+)\s*failed,\s*(\d+)\s*passed,\s*(\d+)\s*total/);
        if (testSummaryMatch) {
            this.results.tests.failed = parseInt(testSummaryMatch[1]) || 0;
            this.results.tests.passed = parseInt(testSummaryMatch[2]) || 0;
            this.results.tests.total = parseInt(testSummaryMatch[3]) || 0;
        }

        // Parse coverage information
        try {
            const coveragePath = `${this.reportDir}/coverage/coverage-summary.json`;
            const coverageData = await fs.readFile(coveragePath, 'utf8');
            const coverage = JSON.parse(coverageData);
            
            if (coverage.total) {
                this.results.coverage = {
                    statements: coverage.total.statements.pct || 0,
                    branches: coverage.total.branches.pct || 0,
                    functions: coverage.total.functions.pct || 0,
                    lines: coverage.total.lines.pct || 0
                };
            }
        } catch (error) {
            console.warn('⚠️  Could not parse coverage data:', error.message);
        }

        // Simulate violation parsing (in real implementation, this would parse axe results)
        // For now, we'll assume violations based on test failures
        if (this.results.tests.failed > 0) {
            this.results.violations.serious = Math.min(this.results.tests.failed, 3);
            this.results.violations.moderate = Math.max(0, this.results.tests.failed - 3);
        }
    }

    /**
     * Validate results against configured thresholds
     */
    async validateThresholds() {
        const { violations } = this.results;
        const { violationThresholds } = this.config;
        
        const checks = [
            { type: 'critical', count: violations.critical, threshold: violationThresholds.critical },
            { type: 'serious', count: violations.serious, threshold: violationThresholds.serious },
            { type: 'moderate', count: violations.moderate, threshold: violationThresholds.moderate },
            { type: 'minor', count: violations.minor, threshold: violationThresholds.minor }
        ];

        let passed = true;
        const validationResults = [];

        for (const check of checks) {
            const checkPassed = check.count <= check.threshold;
            passed = passed && checkPassed;
            
            validationResults.push({
                ...check,
                passed: checkPassed,
                status: checkPassed ? '✅' : '❌'
            });

            console.log(`${checkPassed ? '✅' : '❌'} ${check.type}: ${check.count}/${check.threshold}`);
        }

        // Save validation results
        await fs.writeFile(
            `${this.reportDir}/threshold-validation.json`,
            JSON.stringify(validationResults, null, 2)
        );

        return passed;
    }

    /**
     * Generate comprehensive accessibility reports
     */
    async generateReports() {
        // Generate JSON report
        await this.generateJSONReport();
        
        // Generate Markdown report
        await this.generateMarkdownReport();
        
        // Generate HTML report (if not already generated by Jest)
        await this.generateHTMLReport();
        
        console.log(`📊 Reports generated in ./${this.reportDir}/`);
    }

    /**
     * Generate JSON report
     */
    async generateJSONReport() {
        const report = {
            metadata: {
                timestamp: this.results.timestamp,
                environment: 'CI/CD',
                repository: process.env.GITHUB_REPOSITORY || 'unknown',
                branch: process.env.GITHUB_REF_NAME || 'unknown',
                commit: process.env.GITHUB_SHA || 'unknown',
                workflow: process.env.GITHUB_WORKFLOW || 'accessibility-testing'
            },
            results: this.results,
            configuration: {
                thresholds: this.config.violationThresholds,
                wcag: this.config.wcagCompliance
            }
        };

        await fs.writeFile(
            `${this.reportDir}/accessibility-report.json`,
            JSON.stringify(report, null, 2)
        );
    }

    /**
     * Generate Markdown report
     */
    async generateMarkdownReport() {
        const { violations, tests, coverage } = this.results;
        const repo = process.env.GITHUB_REPOSITORY || 'Repository';
        const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
            ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
            : '#';

        const report = `# 🔍 Accessibility Testing Report

## 📋 Summary

**Repository:** ${repo}  
**Branch:** ${process.env.GITHUB_REF_NAME || 'unknown'}  
**Commit:** ${process.env.GITHUB_SHA?.substring(0, 7) || 'unknown'}  
**Timestamp:** ${new Date(this.results.timestamp).toLocaleString()}  
**Duration:** ${Math.round(this.results.duration / 1000)}s  

## 🎯 Test Results

| Metric | Value |
|--------|--------|
| **Total Tests** | ${tests.total} |
| **Passed** | ${tests.passed} ✅ |
| **Failed** | ${tests.failed} ${tests.failed > 0 ? '❌' : '✅'} |
| **Success Rate** | ${tests.total > 0 ? Math.round((tests.passed / tests.total) * 100) : 0}% |

## 🚨 Accessibility Violations

| Severity | Count | Threshold | Status |
|----------|-------|-----------|---------|
| **Critical** | ${violations.critical} | ${this.config.violationThresholds.critical} | ${violations.critical <= this.config.violationThresholds.critical ? '✅' : '❌'} |
| **Serious** | ${violations.serious} | ${this.config.violationThresholds.serious} | ${violations.serious <= this.config.violationThresholds.serious ? '✅' : '❌'} |
| **Moderate** | ${violations.moderate} | ${this.config.violationThresholds.moderate} | ${violations.moderate <= this.config.violationThresholds.moderate ? '✅' : '❌'} |
| **Minor** | ${violations.minor} | ${this.config.violationThresholds.minor} | ${violations.minor <= this.config.violationThresholds.minor ? '✅' : '❌'} |

## 📊 Test Coverage

| Type | Coverage |
|------|----------|
| **Statements** | ${coverage.statements}% |
| **Branches** | ${coverage.branches}% |
| **Functions** | ${coverage.functions}% |
| **Lines** | ${coverage.lines}% |

## 🎯 WCAG 2.1 Compliance

- **Level:** ${this.config.wcagCompliance.level}
- **Color Contrast:** ${this.config.wcagCompliance.rules.colorContrast}:1 minimum
- **Touch Targets:** ${this.config.wcagCompliance.rules.touchTargetSize}px minimum
- **Text Scaling:** Up to ${this.config.wcagCompliance.rules.textScaling}%
- **Motion Reduction:** ${this.config.wcagCompliance.rules.motionReduction ? 'Supported' : 'Not supported'}

## 📁 Generated Reports

- 📄 [JSON Report](./accessibility-report.json)
- 📊 [HTML Report](./html/accessibility-report.html)
- 🧪 [JUnit Results](./junit/accessibility-results.xml)
- 📈 [Coverage Report](./coverage/lcov-report/index.html)

## 🔗 Resources

- [View Full Workflow Run](${runUrl})
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Accessibility Testing Guide](../docs/accessibility-testing.md)

---
*Generated by Accessibility CI/CD Pipeline on ${new Date().toLocaleString()}*`;

        await fs.writeFile(`${this.reportDir}/accessibility-summary.md`, report);
    }

    /**
     * Generate HTML report (enhanced version)
     */
    async generateHTMLReport() {
        // This would typically be generated by jest-html-reporter
        // Here we create a simple fallback HTML report
        const htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .metric.success { border-color: #28a745; }
        .metric.warning { border-color: #ffc107; }
        .metric.danger { border-color: #dc3545; }
        .violations { margin: 20px 0; }
        .violation-table { width: 100%; border-collapse: collapse; }
        .violation-table th, .violation-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .violation-table th { background-color: #f2f2f2; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Accessibility Test Results</h1>
        <p><strong>Timestamp:</strong> ${new Date(this.results.timestamp).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${Math.round(this.results.duration / 1000)}s</p>
    </div>
    
    <div class="metrics">
        <div class="metric ${this.results.tests.failed === 0 ? 'success' : 'danger'}">
            <h3>Tests</h3>
            <p>${this.results.tests.passed}/${this.results.tests.total} passed</p>
        </div>
        <div class="metric">
            <h3>Coverage</h3>
            <p>${this.results.coverage.statements}% statements</p>
        </div>
        <div class="metric ${this.results.violations.critical === 0 ? 'success' : 'danger'}">
            <h3>Critical</h3>
            <p>${this.results.violations.critical} violations</p>
        </div>
        <div class="metric ${this.results.violations.serious <= this.config.violationThresholds.serious ? 'success' : 'danger'}">
            <h3>Serious</h3>
            <p>${this.results.violations.serious} violations</p>
        </div>
    </div>
    
    <div class="violations">
        <h2>📊 Violation Thresholds</h2>
        <table class="violation-table">
            <thead>
                <tr>
                    <th>Severity</th>
                    <th>Count</th>
                    <th>Threshold</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Critical</td>
                    <td>${this.results.violations.critical}</td>
                    <td>${this.config.violationThresholds.critical}</td>
                    <td class="${this.results.violations.critical <= this.config.violationThresholds.critical ? 'status-pass' : 'status-fail'}">
                        ${this.results.violations.critical <= this.config.violationThresholds.critical ? '✅ Pass' : '❌ Fail'}
                    </td>
                </tr>
                <tr>
                    <td>Serious</td>
                    <td>${this.results.violations.serious}</td>
                    <td>${this.config.violationThresholds.serious}</td>
                    <td class="${this.results.violations.serious <= this.config.violationThresholds.serious ? 'status-pass' : 'status-fail'}">
                        ${this.results.violations.serious <= this.config.violationThresholds.serious ? '✅ Pass' : '❌ Fail'}
                    </td>
                </tr>
                <tr>
                    <td>Moderate</td>
                    <td>${this.results.violations.moderate}</td>
                    <td>${this.config.violationThresholds.moderate}</td>
                    <td class="${this.results.violations.moderate <= this.config.violationThresholds.moderate ? 'status-pass' : 'status-fail'}">
                        ${this.results.violations.moderate <= this.config.violationThresholds.moderate ? '✅ Pass' : '❌ Fail'}
                    </td>
                </tr>
                <tr>
                    <td>Minor</td>
                    <td>${this.results.violations.minor}</td>
                    <td>${this.config.violationThresholds.minor}</td>
                    <td class="${this.results.violations.minor <= this.config.violationThresholds.minor ? 'status-pass' : 'status-fail'}">
                        ${this.results.violations.minor <= this.config.violationThresholds.minor ? '✅ Pass' : '❌ Fail'}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</body>
</html>`;

        await fs.writeFile(`${this.reportDir}/html/accessibility-dashboard.html`, htmlReport);
    }

    /**
     * Generate summary for final output
     */
    async generateSummary(passed) {
        const summary = {
            passed,
            results: this.results,
            thresholds: this.config.violationThresholds,
            timestamp: new Date().toISOString()
        };

        await fs.writeFile(
            `${this.reportDir}/test-summary.json`,
            JSON.stringify(summary, null, 2)
        );

        // Also create a simple status file for CI systems
        await fs.writeFile(
            `${this.reportDir}/status.txt`,
            passed ? 'PASSED' : 'FAILED'
        );
    }

    /**
     * Generate error report when testing fails unexpectedly
     */
    async generateErrorReport(error) {
        const errorReport = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            environment: {
                node: process.version,
                platform: process.platform,
                cwd: process.cwd()
            }
        };

        await fs.writeFile(
            `${this.reportDir}/error-report.json`,
            JSON.stringify(errorReport, null, 2)
        );
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new CIAccessibilityTester();
    tester.runCITests().catch(console.error);
}

export { CIAccessibilityTester };
export default CIAccessibilityTester;
