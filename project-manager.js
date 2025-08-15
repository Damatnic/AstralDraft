#!/usr/bin/env node

/**
 * Astral Draft Project Manager
 * Automated project management, testing, and deployment system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AstralDraftProjectManager {
  constructor() {
    this.projectRoot = process.cwd();
    this.errors = [];
    this.warnings = [];
    this.tasks = [];
  }

  // Color output for console
  colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
  };

  log(message, color = 'reset') {
    console.log(`${this.colors[color]}${message}${this.colors.reset}`);
  }

  header(title) {
    console.log('\n' + '='.repeat(60));
    this.log(`  ${title}`, 'cyan');
    console.log('='.repeat(60) + '\n');
  }

  // Execute command with error handling
  exec(command, description, critical = false) {
    try {
      this.log(`Running: ${description}`, 'blue');
      const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      this.log(`✓ ${description} completed`, 'green');
      return { success: true, output };
    } catch (error) {
      const message = `✗ ${description} failed`;
      this.log(message, 'red');
      if (critical) {
        this.errors.push({ command, description, error: error.message });
        throw error;
      } else {
        this.warnings.push({ command, description, error: error.message });
      }
      return { success: false, error: error.message };
    }
  }

  // Check environment variables
  checkEnvironment() {
    this.header('Environment Check');
    
    const requiredEnvVars = {
      backend: [
        'JWT_SECRET',
        'GEMINI_API_KEY',
        'SPORTSIO_API_KEY'
      ],
      frontend: [
        'VITE_API_BASE_URL',
        'VITE_WEBSOCKET_URL'
      ]
    };

    let envValid = true;

    // Check backend .env
    const backendEnvPath = path.join(this.projectRoot, 'backend', '.env');
    if (fs.existsSync(backendEnvPath)) {
      const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
      requiredEnvVars.backend.forEach(varName => {
        if (!backendEnv.includes(varName)) {
          this.log(`⚠ Missing backend env var: ${varName}`, 'yellow');
          envValid = false;
        }
      });
    } else {
      this.log('⚠ Backend .env file not found', 'yellow');
      envValid = false;
    }

    // Check frontend .env
    const frontendEnvPath = path.join(this.projectRoot, '.env');
    if (fs.existsSync(frontendEnvPath)) {
      const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');
      requiredEnvVars.frontend.forEach(varName => {
        if (!frontendEnv.includes(varName)) {
          this.log(`⚠ Missing frontend env var: ${varName}`, 'yellow');
          envValid = false;
        }
      });
    } else {
      this.log('⚠ Frontend .env file not found', 'yellow');
      envValid = false;
    }

    return envValid;
  }

  // Run build verification
  async runBuildVerification() {
    this.header('Build Verification');
    
    // Build frontend
    this.exec('npm run build', 'Frontend build', true);
    
    // Verify build output
    const distPath = path.join(this.projectRoot, 'dist');
    if (!fs.existsSync(distPath)) {
      this.errors.push({ description: 'Build output directory not found' });
      return false;
    }

    // Check for critical files
    const criticalFiles = ['index.html', 'assets'];
    for (const file of criticalFiles) {
      const filePath = path.join(distPath, file);
      if (!fs.existsSync(filePath)) {
        this.errors.push({ description: `Critical file missing: ${file}` });
        return false;
      }
    }

    // Run build verification script if it exists
    if (fs.existsSync(path.join(this.projectRoot, 'scripts', 'verify-production-build.cjs'))) {
      this.exec('npm run build:verify', 'Production build verification');
    }

    return true;
  }

  // Run code quality checks
  runQualityChecks() {
    this.header('Code Quality Checks');
    
    // Linting
    this.exec('npm run lint', 'ESLint check');
    
    // Type checking
    this.exec('npx tsc --noEmit', 'TypeScript check');
    
    // Check for console.logs in production code
    const result = this.exec('grep -r "console.log" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist', 'Console.log check');
    if (result.success && result.output) {
      this.warnings.push({ description: 'Found console.log statements in code' });
    }
  }

  // Run security checks
  runSecurityChecks() {
    this.header('Security Checks');
    
    // Check for exposed API keys in frontend
    const frontendFiles = ['src', 'components', 'services', 'contexts'].map(dir => 
      path.join(this.projectRoot, dir)
    ).filter(fs.existsSync);

    for (const dir of frontendFiles) {
      const result = this.exec(
        `grep -r "API_KEY\\|SECRET\\|PASSWORD" "${dir}" --include="*.ts" --include="*.tsx" || true`,
        `Security scan: ${path.basename(dir)}`
      );
      if (result.output && result.output.trim()) {
        this.warnings.push({ 
          description: `Potential sensitive data in ${dir}`,
          details: result.output.slice(0, 200)
        });
      }
    }

    // Check dependencies for vulnerabilities
    this.exec('npm audit --audit-level=high', 'NPM security audit');
  }

  // Run tests
  runTests() {
    this.header('Running Tests');
    
    // Unit tests
    this.exec('npm test -- --watchAll=false', 'Unit tests');
    
    // Integration tests if available
    if (fs.existsSync(path.join(this.projectRoot, '__tests__', 'integration'))) {
      this.exec('npm run test:integration', 'Integration tests');
    }
  }

  // Generate status report
  generateReport() {
    this.header('Project Status Report');
    
    const report = {
      timestamp: new Date().toISOString(),
      status: this.errors.length === 0 ? 'READY' : 'ISSUES_FOUND',
      errors: this.errors,
      warnings: this.warnings,
      checks: {
        environment: this.checkEnvironment(),
        build: this.errors.filter(e => e.description?.includes('build')).length === 0,
        quality: this.warnings.filter(w => w.description?.includes('lint')).length === 0,
        security: this.warnings.filter(w => w.description?.includes('security')).length === 0,
        tests: this.errors.filter(e => e.description?.includes('test')).length === 0
      }
    };

    // Write report to file
    fs.writeFileSync(
      path.join(this.projectRoot, 'project-status.json'),
      JSON.stringify(report, null, 2)
    );

    // Display summary
    this.log('\n📊 Summary:', 'cyan');
    this.log(`   Status: ${report.status}`, report.status === 'READY' ? 'green' : 'yellow');
    this.log(`   Errors: ${this.errors.length}`, this.errors.length > 0 ? 'red' : 'green');
    this.log(`   Warnings: ${this.warnings.length}`, this.warnings.length > 0 ? 'yellow' : 'green');
    
    if (this.errors.length > 0) {
      this.log('\n❌ Errors:', 'red');
      this.errors.forEach(e => {
        this.log(`   - ${e.description}`, 'red');
      });
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'yellow');
      this.warnings.slice(0, 5).forEach(w => {
        this.log(`   - ${w.description}`, 'yellow');
      });
      if (this.warnings.length > 5) {
        this.log(`   ... and ${this.warnings.length - 5} more`, 'yellow');
      }
    }

    return report;
  }

  // Main execution
  async run(options = {}) {
    this.header('Astral Draft Project Manager');
    this.log('Fantasy Football Platform Management System\n', 'magenta');

    const tasks = {
      environment: () => this.checkEnvironment(),
      quality: () => this.runQualityChecks(),
      security: () => this.runSecurityChecks(),
      build: () => this.runBuildVerification(),
      test: () => this.runTests(),
      report: () => this.generateReport()
    };

    // Run specified tasks or all by default
    const tasksToRun = options.tasks || Object.keys(tasks);
    
    for (const taskName of tasksToRun) {
      if (tasks[taskName]) {
        try {
          await tasks[taskName]();
        } catch (error) {
          this.log(`\n❌ Task '${taskName}' failed critically`, 'red');
          if (options.stopOnError) {
            break;
          }
        }
      }
    }

    // Always generate report at the end
    const report = this.generateReport();
    
    // Return status code
    process.exit(report.status === 'READY' ? 0 : 1);
  }
}

// CLI Interface
if (require.main === module) {
  const manager = new AstralDraftProjectManager();
  const args = process.argv.slice(2);
  
  const options = {
    tasks: args.length > 0 ? args : undefined,
    stopOnError: args.includes('--stop-on-error')
  };

  manager.run(options);
}

module.exports = AstralDraftProjectManager;