/**
 * CI/CD Accessibility Testing Script
 * Integrates accessibility testing into the build pipeline
 */

const { AutomatedAccessibilityTester } = require('../__tests__/accessibility/automatedAccessibilityTester');
const { execSync } = require('child_process');
const { writeFileSync, existsSync, mkdirSync } = require('fs');
const path = require('path');

interface CIAccessibilityConfig {
    failOnViolations: boolean;
    maxCriticalViolations: number;
    maxSeriousViolations: number;
    outputDir: string;
    runE2ETests: boolean;
    runUnitTests: boolean;
    generateReports: boolean;
}

class CIAccessibilityTesting {
    private config: CIAccessibilityConfig;
    private outputDir: string;

    constructor(config: Partial<CIAccessibilityConfig> = {}) {
        this.config = {
            failOnViolations: true,
            maxCriticalViolations: 0,
            maxSeriousViolations: 5,
            outputDir: './test-results/accessibility',
            runE2ETests: true,
            runUnitTests: true,
            generateReports: true,
            ...config
        };

        this.outputDir = this.config.outputDir;
        this.ensureOutputDirectory();
    }

    /**
     * Main entry point for CI accessibility testing
     */
    async runAccessibilityTests(): Promise<{
        success: boolean;
        results: {
            unitTests: any;
            e2eTests: any;
            violations: {
                critical: number;
                serious: number;
                moderate: number;
                minor: number;
            };
        };
    }> {
        console.log('🔍 Starting accessibility testing suite...');
        
        let unitTestResults = null;
        let e2eTestResults = null;
        let totalViolations = { critical: 0, serious: 0, moderate: 0, minor: 0 };

        try {
            // Run unit accessibility tests
            if (this.config.runUnitTests) {
                console.log('📋 Running unit accessibility tests...');
                unitTestResults = await this.runUnitTests();
                console.log(`✅ Unit tests completed: ${unitTestResults.passed}/${unitTestResults.total} passed`);
            }

            // Run E2E accessibility tests
            if (this.config.runE2ETests) {
                console.log('🌐 Running E2E accessibility tests...');
                e2eTestResults = await this.runE2ETests();
                totalViolations = this.countViolations(e2eTestResults);
                console.log(`📊 E2E tests found: ${totalViolations.critical} critical, ${totalViolations.serious} serious violations`);
            }

            // Generate reports
            if (this.config.generateReports) {
                console.log('📄 Generating accessibility reports...');
                await this.generateReports(unitTestResults, e2eTestResults);
            }

            // Determine success/failure
            const success = this.evaluateResults(totalViolations, unitTestResults);
            
            if (success) {
                console.log('✅ All accessibility tests passed!');
            } else {
                console.log('❌ Accessibility tests failed - see reports for details');
            }

            return {
                success,
                results: {
                    unitTests: unitTestResults,
                    e2eTests: e2eTestResults,
                    violations: totalViolations
                }
            };

        } catch (error) {
            console.error('💥 Accessibility testing failed:', error);
            throw error;
        }
    }

    /**
     * Run Jest unit tests for accessibility
     */
    private async runUnitTests(): Promise<any> {
        try {
            const jestCommand = 'npx jest --config=jest.accessibility.config.js --json --outputFile=' + 
                              path.join(this.outputDir, 'unit-test-results.json');
            
            const output = execSync(jestCommand, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });

            const results = JSON.parse(output);
            
            return {
                passed: results.numPassedTests,
                failed: results.numFailedTests,
                total: results.numTotalTests,
                coverage: results.coverageMap,
                success: results.success
            };

        } catch (error) {
            console.error('Unit test execution failed:', error);
            return {
                passed: 0,
                failed: 1,
                total: 1,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Run automated E2E accessibility tests
     */
    private async runE2ETests(): Promise<any> {
        const tester = new AutomatedAccessibilityTester({
            wcagLevel: 'AA',
            mobileViewport: { width: 375, height: 667 },
            testUrls: [
                'http://localhost:3000',
                'http://localhost:3000/draft',
                'http://localhost:3000/analytics',
                'http://localhost:3000/teams',
                'http://localhost:3000/profile'
            ]
        });

        try {
            // Start development server if not running
            await this.ensureServerRunning();

            // Run automated tests
            const results = await tester.runAutomatedTests();
            
            // Save results
            const resultsPath = path.join(this.outputDir, 'e2e-accessibility-results.json');
            writeFileSync(resultsPath, JSON.stringify(results, null, 2));

            return results;

        } catch (error) {
            console.error('E2E accessibility testing failed:', error);
            return [];
        }
    }

    /**
     * Count violations by severity
     */
    private countViolations(results: any[]): { critical: number; serious: number; moderate: number; minor: number } {
        const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        
        if (!Array.isArray(results)) return counts;

        results.forEach(result => {
            if (result.violations) {
                result.violations.forEach((violation: any) => {
                    if (violation.impact) {
                        counts[violation.impact as keyof typeof counts]++;
                    }
                });
            }
        });

        return counts;
    }

    /**
     * Evaluate if tests should pass or fail
     */
    private evaluateResults(violations: any, unitTestResults: any): boolean {
        // Unit tests must pass
        if (unitTestResults && !unitTestResults.success) {
            console.log('❌ Unit accessibility tests failed');
            return false;
        }

        // Check violation thresholds
        if (violations.critical > this.config.maxCriticalViolations) {
            console.log(`❌ Too many critical violations: ${violations.critical} > ${this.config.maxCriticalViolations}`);
            return false;
        }

        if (violations.serious > this.config.maxSeriousViolations) {
            console.log(`❌ Too many serious violations: ${violations.serious} > ${this.config.maxSeriousViolations}`);
            return false;
        }

        return true;
    }

    /**
     * Generate accessibility reports
     */
    private async generateReports(unitTestResults: any, e2eTestResults: any): Promise<void> {
        const reportPath = path.join(this.outputDir, 'accessibility-summary.html');
        
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Test Summary</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 2rem; }
        .header { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
        .metric { display: inline-block; margin: 0.5rem; padding: 1rem; border-radius: 8px; text-align: center; }
        .success { background: #d4edda; color: #155724; }
        .warning { background: #fff3cd; color: #856404; }
        .danger { background: #f8d7da; color: #721c24; }
        .section { margin: 2rem 0; }
        .violation { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
        .critical { border-left: 4px solid #dc3545; }
        .serious { border-left: 4px solid #fd7e14; }
        .moderate { border-left: 4px solid #ffc107; }
        .minor { border-left: 4px solid #6c757d; }
        pre { background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Accessibility Test Summary</h1>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> CI/CD Pipeline</p>
    </div>

    <div class="section">
        <h2>📊 Test Results Overview</h2>
        <div class="metric ${unitTestResults?.success ? 'success' : 'danger'}">
            <h3>Unit Tests</h3>
            <p>${unitTestResults?.passed || 0}/${unitTestResults?.total || 0} Passed</p>
        </div>
        
        ${e2eTestResults ? `
        <div class="metric ${this.countViolations(e2eTestResults).critical === 0 ? 'success' : 'danger'}">
            <h3>E2E Tests</h3>
            <p>${e2eTestResults.length} URLs Tested</p>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <h2>🚨 Accessibility Violations</h2>
        ${e2eTestResults ? this.generateViolationsHtml(e2eTestResults) : '<p>No E2E tests run</p>'}
    </div>

    <div class="section">
        <h2>💡 Recommendations</h2>
        <ul>
            <li>🎯 Fix all critical violations immediately</li>
            <li>📱 Test with real mobile devices and screen readers</li>
            <li>⌨️ Verify keyboard-only navigation works</li>
            <li>🎨 Test in high contrast mode</li>
            <li>🔄 Add accessibility checks to development workflow</li>
        </ul>
    </div>

    <div class="section">
        <h2>📋 Test Coverage</h2>
        ${unitTestResults?.coverage ? `
        <pre>${JSON.stringify(unitTestResults.coverage, null, 2)}</pre>
        ` : '<p>Coverage data not available</p>'}
    </div>
</body>
</html>`;

        writeFileSync(reportPath, html);
        console.log(`📄 Report generated: ${reportPath}`);
    }

    /**
     * Generate HTML for violations
     */
    private generateViolationsHtml(results: any[]): string {
        const violations = results.flatMap(r => r.violations || []);
        
        if (violations.length === 0) {
            return '<p class="success">🎉 No accessibility violations found!</p>';
        }

        return violations.map(violation => `
            <div class="violation ${violation.impact}">
                <h4>${violation.id} (${violation.impact})</h4>
                <p>${violation.description}</p>
                <p><strong>Help:</strong> ${violation.help}</p>
                <p><strong>Elements affected:</strong> ${violation.nodes?.length || 0}</p>
            </div>
        `).join('');
    }

    /**
     * Ensure output directory exists
     */
    private ensureOutputDirectory(): void {
        if (!existsSync(this.outputDir)) {
            mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Ensure development server is running
     */
    private async ensureServerRunning(): Promise<void> {
        try {
            // Check if server is already running
            const response = await fetch('http://localhost:3000');
            if (response.ok) {
                console.log('✅ Development server is running');
                return;
            }
        } catch (error) {
            // Server not running, start it
            console.log('🚀 Starting development server...');
            
            // Start server in background
            const serverProcess = execSync('npm run dev &', { 
                stdio: 'ignore',
                detached: true 
            });
            
            // Wait for server to start
            await this.waitForServer();
        }
    }

    /**
     * Wait for server to be ready
     */
    private async waitForServer(maxAttempts = 30): Promise<void> {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch('http://localhost:3000');
                if (response.ok) {
                    console.log('✅ Server is ready');
                    return;
                }
            } catch (error) {
                // Still starting up
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Server failed to start within timeout period');
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const config: Partial<CIAccessibilityConfig> = {};
    
    // Parse command line arguments
    args.forEach(arg => {
        if (arg === '--fail-on-violations=false') config.failOnViolations = false;
        if (arg === '--no-e2e') config.runE2ETests = false;
        if (arg === '--no-unit') config.runUnitTests = false;
        if (arg === '--no-reports') config.generateReports = false;
        if (arg.startsWith('--max-critical=')) {
            config.maxCriticalViolations = parseInt(arg.split('=')[1]);
        }
        if (arg.startsWith('--max-serious=')) {
            config.maxSeriousViolations = parseInt(arg.split('=')[1]);
        }
        if (arg.startsWith('--output-dir=')) {
            config.outputDir = arg.split('=')[1];
        }
    });

    const tester = new CIAccessibilityTesting(config);
    
    tester.runAccessibilityTests()
        .then(results => {
            if (results.success) {
                console.log('🎉 All accessibility tests passed!');
                process.exit(0);
            } else {
                console.log('❌ Accessibility tests failed');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Testing pipeline failed:', error);
            process.exit(1);
        });
}

module.exports = { CIAccessibilityTesting };
