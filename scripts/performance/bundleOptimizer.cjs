#!/usr/bin/env node

/**
 * Bundle Optimizer Script
 * Analyzes bundle composition and suggests optimizations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleOptimizer {
  constructor() {
    this.distPath = path.resolve(__dirname, '../../dist');
    this.reportPath = path.resolve(__dirname, '../../reports');
    this.optimizations = [];
  }

  async analyzeBundles() {
    console.log('🔍 Analyzing bundle composition...\n');

    // Ensure dist directory exists
    if (!fs.existsSync(this.distPath)) {
      console.error('❌ Build directory not found. Run npm run build first.');
      process.exit(1);
    }

    // Create reports directory
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true });
    }

    const stats = this.getBundleStats();
    this.analyzeChunkSizes(stats);
    this.analyzeDuplicates(stats);
    this.analyzeUnusedCode(stats);
    this.generateOptimizationReport();
  }

  getBundleStats() {
    const assetsPath = path.join(this.distPath, 'assets');
    const files = fs.readdirSync(assetsPath);
    
    const stats = {
      total: 0,
      js: [],
      css: [],
      other: []
    };

    files.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const stat = fs.statSync(filePath);
      const size = stat.size;
      stats.total += size;

      const fileInfo = {
        name: file,
        size,
        sizeKB: Math.round(size / 1024),
        path: filePath
      };

      if (file.endsWith('.js')) {
        stats.js.push(fileInfo);
      } else if (file.endsWith('.css')) {
        stats.css.push(fileInfo);
      } else {
        stats.other.push(fileInfo);
      }
    });

    // Sort by size (largest first)
    stats.js.sort((a, b) => b.size - a.size);
    stats.css.sort((a, b) => b.size - a.size);
    stats.other.sort((a, b) => b.size - a.size);

    return stats;
  }

  analyzeChunkSizes(stats) {
    console.log('📊 Bundle Size Analysis:');
    console.log(`Total bundle size: ${Math.round(stats.total / 1024)} KB\n`);

    console.log('JavaScript files:');
    stats.js.forEach(file => {
      console.log(`  ${file.name}: ${file.sizeKB} KB`);
      
      // Flag large chunks for optimization
      if (file.sizeKB > 500) {
        this.optimizations.push({
          type: 'large-chunk',
          file: file.name,
          size: file.sizeKB,
          recommendation: 'Consider code splitting this large chunk',
          impact: 'high',
          estimatedSavings: `${Math.round(file.sizeKB * 0.3)} KB`
        });
      }
      
      // Check for vendor chunks that could be split further
      if (file.name.includes('vendor-') && file.sizeKB > 200) {
        this.optimizations.push({
          type: 'vendor-split',
          file: file.name,
          size: file.sizeKB,
          recommendation: 'Split this vendor chunk into smaller chunks',
          impact: 'medium',
          estimatedSavings: `${Math.round(file.sizeKB * 0.2)} KB`
        });
      }
    });

    console.log('\nCSS files:');
    stats.css.forEach(file => {
      console.log(`  ${file.name}: ${file.sizeKB} KB`);
      
      if (file.sizeKB > 100) {
        this.optimizations.push({
          type: 'large-css',
          file: file.name,
          size: file.sizeKB,
          recommendation: 'Consider CSS splitting or purging unused styles',
          impact: 'medium',
          estimatedSavings: `${Math.round(file.sizeKB * 0.4)} KB`
        });
      }
    });

    console.log('\nOther assets:');
    stats.other.forEach(file => {
      console.log(`  ${file.name}: ${file.sizeKB} KB`);
    });

    console.log('\n');
  }

  analyzeDuplicates(stats) {
    console.log('🔍 Analyzing potential duplicates...\n');

    // Simple heuristic: files with similar names might contain duplicated code
    const jsFiles = stats.js.map(f => f.name);
    const potentialDuplicates = [];

    // Check for vendor libraries that might be bundled multiple times
    const vendorPatterns = ['react', 'lodash', 'moment', 'axios', 'chart'];
    
    vendorPatterns.forEach(pattern => {
      const matches = jsFiles.filter(name => name.toLowerCase().includes(pattern));
      if (matches.length > 1) {
        potentialDuplicates.push({
          pattern,
          files: matches,
          recommendation: `Multiple chunks contain ${pattern}. Consider consolidating.`
        });
      }
    });

    if (potentialDuplicates.length > 0) {
      console.log('⚠️  Potential duplicate dependencies found:');
      potentialDuplicates.forEach(dup => {
        console.log(`  ${dup.pattern}: ${dup.files.join(', ')}`);
        this.optimizations.push({
          type: 'duplicate-dependency',
          pattern: dup.pattern,
          files: dup.files,
          recommendation: dup.recommendation,
          impact: 'medium'
        });
      });
    } else {
      console.log('✅ No obvious duplicate dependencies found.');
    }
    console.log('\n');
  }

  analyzeUnusedCode(stats) {
    console.log('🧹 Analyzing for unused code...\n');

    // Check if tree shaking is working effectively
    const totalJSSize = stats.js.reduce((sum, file) => sum + file.size, 0);
    const avgChunkSize = totalJSSize / stats.js.length;

    if (avgChunkSize > 300 * 1024) { // 300KB average
      this.optimizations.push({
        type: 'tree-shaking',
        recommendation: 'Large average chunk size suggests tree shaking could be improved',
        impact: 'high',
        estimatedSavings: `${Math.round(totalJSSize * 0.15 / 1024)} KB`
      });
    }

    // Check for potential unused dependencies
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    
    console.log(`📦 Project has ${dependencies.length} dependencies`);
    console.log('Consider auditing these for unused imports:\n');
    
    // Dependencies that commonly have unused parts
    const commonlyUnused = ['lodash', 'moment', 'rxjs', 'antd', 'material-ui'];
    const presentUnused = dependencies.filter(dep => 
      commonlyUnused.some(unused => dep.includes(unused))
    );

    if (presentUnused.length > 0) {
      presentUnused.forEach(dep => {
        console.log(`  ⚠️  ${dep} - commonly has unused code`);
        this.optimizations.push({
          type: 'unused-imports',
          dependency: dep,
          recommendation: `Audit ${dep} for unused imports and use tree-shakable alternatives`,
          impact: 'medium'
        });
      });
    }
    console.log('\n');
  }

  generateOptimizationReport() {
    console.log('📋 Optimization Recommendations:\n');

    if (this.optimizations.length === 0) {
      console.log('✅ No major optimization opportunities found!');
      return;
    }

    // Group by impact
    const high = this.optimizations.filter(o => o.impact === 'high');
    const medium = this.optimizations.filter(o => o.impact === 'medium');
    const low = this.optimizations.filter(o => o.impact === 'low');

    if (high.length > 0) {
      console.log('🔴 HIGH IMPACT OPTIMIZATIONS:');
      high.forEach((opt, i) => {
        console.log(`  ${i + 1}. ${opt.recommendation}`);
        if (opt.file) console.log(`     File: ${opt.file}`);
        if (opt.estimatedSavings) console.log(`     Estimated savings: ${opt.estimatedSavings}`);
        console.log('');
      });
    }

    if (medium.length > 0) {
      console.log('🟡 MEDIUM IMPACT OPTIMIZATIONS:');
      medium.forEach((opt, i) => {
        console.log(`  ${i + 1}. ${opt.recommendation}`);
        if (opt.file) console.log(`     File: ${opt.file}`);
        if (opt.estimatedSavings) console.log(`     Estimated savings: ${opt.estimatedSavings}`);
        console.log('');
      });
    }

    if (low.length > 0) {
      console.log('🟢 LOW IMPACT OPTIMIZATIONS:');
      low.forEach((opt, i) => {
        console.log(`  ${i + 1}. ${opt.recommendation}`);
        if (opt.file) console.log(`     File: ${opt.file}`);
        console.log('');
      });
    }

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      totalOptimizations: this.optimizations.length,
      optimizations: this.optimizations,
      summary: {
        high: high.length,
        medium: medium.length,
        low: low.length
      }
    };

    const reportFile = path.join(this.reportPath, 'bundle-optimization-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
    console.log('\nNext steps:');
    console.log('1. Run `npm run bundle:visualize` to see visual bundle analysis');
    console.log('2. Implement code splitting for large chunks');
    console.log('3. Review and remove unused dependencies');
    console.log('4. Enable compression and caching in production');
  }
}

// Run the optimizer
if (require.main === module) {
  const optimizer = new BundleOptimizer();
  optimizer.analyzeBundles().catch(console.error);
}

module.exports = BundleOptimizer;
