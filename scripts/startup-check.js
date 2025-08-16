#!/usr/bin/env node

/**
 * Startup Check Script
 * Validates environment configuration and service availability
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Console colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}`)
};

class StartupChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async run() {
    console.log(`${colors.cyan}
╔═══════════════════════════════════════╗
║   Astral Draft Startup Check v1.0    ║
╚═══════════════════════════════════════╝${colors.reset}`);

    await this.checkNodeVersion();
    await this.checkEnvironmentFile();
    await this.checkRequiredEnvVars();
    await this.checkDependencies();
    await this.checkDatabaseConnection();
    await this.checkAPIKeys();
    await this.checkServerHealth();
    await this.checkBuildStatus();
    
    this.printSummary();
  }

  async checkNodeVersion() {
    log.section('Node.js Version');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion >= 18) {
      log.success(`Node.js ${nodeVersion} (Recommended: 18+)`);
    } else {
      this.errors.push(`Node.js version ${nodeVersion} is too old. Required: 18+`);
      log.error(`Node.js ${nodeVersion} - Please upgrade to Node.js 18 or higher`);
    }
  }

  async checkEnvironmentFile() {
    log.section('Environment Configuration');
    
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (fs.existsSync(envPath)) {
      log.success('.env file found');
    } else if (fs.existsSync(envExamplePath)) {
      this.warnings.push('.env file not found. Copy .env.example to .env and configure');
      log.warning('No .env file found. Creating from .env.example...');
      
      try {
        fs.copyFileSync(envExamplePath, envPath);
        log.success('.env file created. Please configure your API keys');
      } catch (err) {
        this.errors.push('Failed to create .env file');
        log.error(`Failed to create .env: ${err.message}`);
      }
    } else {
      this.errors.push('No .env or .env.example file found');
      log.error('No environment configuration found');
    }
  }

  async checkRequiredEnvVars() {
    log.section('Required Environment Variables');
    
    const required = {
      // Backend essentials
      'JWT_SECRET': 'Authentication',
      'NODE_ENV': 'Environment mode',
      'PORT': 'Server port',
      
      // Frontend essentials
      'VITE_API_BASE_URL': 'API endpoint',
    };
    
    const optional = {
      // API Keys
      'GEMINI_API_KEY': 'AI Oracle features',
      'SPORTSIO_API_KEY': 'Live sports data',
      'DATABASE_URL': 'PostgreSQL database',
      'STRIPE_SECRET_KEY': 'Payment processing',
    };
    
    // Check required variables
    for (const [key, description] of Object.entries(required)) {
      if (process.env[key]) {
        log.success(`${key} - ${description}`);
      } else {
        this.errors.push(`Missing required: ${key} (${description})`);
        log.error(`${key} is missing (${description})`);
      }
    }
    
    // Check optional variables
    log.info('\nOptional API Keys:');
    for (const [key, description] of Object.entries(optional)) {
      if (process.env[key]) {
        log.success(`${key} - ${description} configured`);
      } else {
        this.warnings.push(`Optional: ${key} not configured (${description})`);
        log.warning(`${key} not set - ${description} will be disabled`);
      }
    }
  }

  async checkDependencies() {
    log.section('Dependencies');
    
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );
    
    const nodeModulesExists = fs.existsSync(path.join(process.cwd(), 'node_modules'));
    
    if (nodeModulesExists) {
      log.success('node_modules directory found');
      
      // Check for key dependencies
      const keyDeps = ['react', 'express', 'vite', '@google/generative-ai'];
      const missingDeps = [];
      
      for (const dep of keyDeps) {
        const depPath = path.join(process.cwd(), 'node_modules', dep);
        if (!fs.existsSync(depPath)) {
          missingDeps.push(dep);
        }
      }
      
      if (missingDeps.length > 0) {
        this.warnings.push(`Missing dependencies: ${missingDeps.join(', ')}`);
        log.warning(`Missing key dependencies: ${missingDeps.join(', ')}`);
        log.info('Run: npm install');
      } else {
        log.success('All key dependencies installed');
      }
    } else {
      this.errors.push('Dependencies not installed');
      log.error('node_modules not found. Run: npm install');
    }
    
    // Check for outdated dependencies
    log.info(`Total dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
    log.info(`Dev dependencies: ${Object.keys(packageJson.devDependencies || {}).length}`);
  }

  async checkDatabaseConnection() {
    log.section('Database Connection');
    
    if (process.env.DATABASE_URL) {
      log.info('PostgreSQL connection configured');
      // Could add actual connection test here
    } else {
      const dbPath = process.env.DB_PATH || './data/astral-draft.db';
      const fullPath = path.join(process.cwd(), dbPath);
      const dbDir = path.dirname(fullPath);
      
      if (!fs.existsSync(dbDir)) {
        log.info(`Creating database directory: ${dbDir}`);
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      if (fs.existsSync(fullPath)) {
        log.success(`SQLite database found: ${dbPath}`);
      } else {
        log.warning(`SQLite database will be created on first run: ${dbPath}`);
      }
    }
  }

  async checkAPIKeys() {
    log.section('API Services Configuration');
    
    // Check Gemini AI
    if (process.env.GEMINI_API_KEY) {
      log.success('Gemini AI API key configured');
      // Could validate key format here
      if (!process.env.GEMINI_API_KEY.startsWith('AI')) {
        log.warning('Gemini API key format may be incorrect');
      }
    } else {
      log.warning('Gemini AI not configured - Oracle features disabled');
    }
    
    // Check Sports APIs
    const sportsApis = ['SPORTSIO_API_KEY', 'ESPN_API_KEY', 'NFL_API_KEY'];
    const configuredApis = sportsApis.filter(api => process.env[api]);
    
    if (configuredApis.length > 0) {
      log.success(`Sports APIs configured: ${configuredApis.length}/${sportsApis.length}`);
    } else {
      log.warning('No sports APIs configured - using mock data');
    }
    
    // Check Payment
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY) {
      log.success('Stripe payment integration configured');
    } else {
      log.info('Stripe not configured - payments disabled');
    }
  }

  async checkServerHealth() {
    log.section('Server Health Check');
    
    const port = process.env.PORT || 3001;
    const baseUrl = `http://localhost:${port}`;
    
    try {
      const response = await axios.get(`${baseUrl}/health`, { timeout: 2000 });
      
      if (response.data.status === 'healthy') {
        log.success(`Backend server is running on port ${port}`);
        log.info(`Environment: ${response.data.environment}`);
        log.info(`Version: ${response.data.version}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.warnings.push('Backend server is not running');
        log.warning(`Backend server not running on port ${port}`);
        log.info('Start with: npm run server:dev');
      } else {
        log.error(`Server health check failed: ${error.message}`);
      }
    }
  }

  async checkBuildStatus() {
    log.section('Build Status');
    
    const distPath = path.join(process.cwd(), 'dist');
    
    if (fs.existsSync(distPath)) {
      const stats = fs.statSync(distPath);
      const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      
      log.success('Production build found');
      log.info(`Build age: ${ageInHours.toFixed(1)} hours`);
      
      if (ageInHours > 24) {
        log.warning('Build is over 24 hours old. Consider rebuilding.');
      }
      
      // Check build size
      const getDirectorySize = (dir) => {
        let size = 0;
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            size += getDirectorySize(filePath);
          } else {
            size += stat.size;
          }
        }
        
        return size;
      };
      
      const buildSize = getDirectorySize(distPath);
      const sizeMB = (buildSize / (1024 * 1024)).toFixed(2);
      
      log.info(`Build size: ${sizeMB} MB`);
      
      if (buildSize > 10 * 1024 * 1024) {
        log.warning('Build size is large. Consider optimizing bundle.');
      }
    } else {
      log.info('No production build found');
      log.info('Build with: npm run build:prod');
    }
  }

  printSummary() {
    log.section('Summary');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(`
${colors.green}════════════════════════════════════════
  ✅ All checks passed successfully!
  Your app is ready to run.
  
  Start development:
    npm run server:dev  (backend)
    npm run dev        (frontend)
════════════════════════════════════════${colors.reset}
      `);
    } else {
      if (this.errors.length > 0) {
        console.log(`\n${colors.red}Errors (${this.errors.length}):${colors.reset}`);
        this.errors.forEach((err, i) => {
          console.log(`  ${i + 1}. ${err}`);
        });
      }
      
      if (this.warnings.length > 0) {
        console.log(`\n${colors.yellow}Warnings (${this.warnings.length}):${colors.reset}`);
        this.warnings.forEach((warn, i) => {
          console.log(`  ${i + 1}. ${warn}`);
        });
      }
      
      if (this.errors.length > 0) {
        console.log(`
${colors.red}════════════════════════════════════════
  ❌ Setup incomplete. Please fix errors.
════════════════════════════════════════${colors.reset}
        `);
        process.exit(1);
      } else {
        console.log(`
${colors.yellow}════════════════════════════════════════
  ⚠️ Setup complete with warnings.
  App will run with limited features.
════════════════════════════════════════${colors.reset}
        `);
      }
    }
  }
}

// Run the checker
const checker = new StartupChecker();
checker.run().catch(error => {
  console.error('Startup check failed:', error);
  process.exit(1);
});