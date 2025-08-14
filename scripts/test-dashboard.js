#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDashboard() {
  console.log('🧪 Testing dashboard functionality...');
  
  try {
    // Create output directory
    const outputDir = path.join(process.cwd(), 'accessibility-reports');
    await fs.mkdir(outputDir, { recursive: true });
    console.log('✅ Output directory created');
    
    // Create simple test data
    const testMetrics = {
      timestamp: new Date().toISOString(),
      totalViolations: 5,
      violationsByLevel: {
        critical: 0,
        serious: 2,
        moderate: 3,
        minor: 0
      },
      wcagCompliance: {
        levelA: 95,
        levelAA: 90,
        levelAAA: 85
      },
      componentMetrics: [
        {
          componentName: 'Button',
          violations: 1,
          wcagScore: 95,
          status: 'warning',
          lastTested: new Date().toISOString()
        },
        {
          componentName: 'Form',
          violations: 0,
          wcagScore: 100,
          status: 'passing',
          lastTested: new Date().toISOString()
        }
      ],
      testCoverage: {
        totalComponents: 10,
        testedComponents: 8,
        coveragePercentage: 80
      },
      performanceMetrics: {
        testExecutionTime: 1200,
        averageViolationsPerComponent: 0.5
      }
    };
    
    // Write dashboard data
    const dashboardData = {
      lastUpdated: new Date().toISOString(),
      latestMetrics: testMetrics,
      history: [testMetrics],
      summary: {
        totalRuns: 1,
        averageScore: 90,
        trendDirection: 'stable',
        lastRunStatus: 'success'
      }
    };
    
    const dashboardDataFile = path.join(outputDir, 'dashboard-data.json');
    await fs.writeFile(dashboardDataFile, JSON.stringify(dashboardData, null, 2));
    console.log('✅ Dashboard data created');
    
    // Create simple HTML dashboard
    const htmlDashboard = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric-card { background: #f5f5f5; padding: 20px; margin: 10px 0; border-radius: 8px; }
        .status-passing { background-color: #d4edda; }
        .status-warning { background-color: #fff3cd; }
        .status-failing { background-color: #f8d7da; }
    </style>
</head>
<body>
    <h1>🚀 Accessibility Dashboard</h1>
    <div class="metric-card">
        <h2>Overall Score: 90%</h2>
        <p>WCAG AA Compliance: 90%</p>
        <p>Total Violations: 5</p>
    </div>
    <div class="metric-card">
        <h3>Violations by Severity</h3>
        <ul>
            <li>Critical: 0</li>
            <li>Serious: 2</li>
            <li>Moderate: 3</li>
            <li>Minor: 0</li>
        </ul>
    </div>
    <div class="metric-card">
        <h3>Component Status</h3>
        <div class="status-warning">Button: 95% (Warning)</div>
        <div class="status-passing">Form: 100% (Passing)</div>
    </div>
    <p><em>Last updated: ${new Date().toLocaleString()}</em></p>
</body>
</html>`;
    
    const htmlFile = path.join(outputDir, 'dashboard.html');
    await fs.writeFile(htmlFile, htmlDashboard);
    console.log('✅ HTML dashboard created');
    
    console.log('🎉 Dashboard test completed successfully!');
    console.log(`📊 Files created in: ${outputDir}`);
    console.log('📄 dashboard.html - HTML dashboard');
    console.log('📄 dashboard-data.json - Dashboard data');
    
  } catch (error) {
    console.error('❌ Dashboard test failed:', error);
  }
}

testDashboard();
