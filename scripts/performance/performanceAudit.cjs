#!/usr/bin/env node

/**
 * Performance Audit Script
 * Analyzes Core Web Vitals and provides performance recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceAuditor {
  constructor() {
    this.distPath = path.resolve(__dirname, '../../dist');
    this.reportPath = path.resolve(__dirname, '../../reports');
    this.metrics = {};
    this.recommendations = [];
  }

  async runAudit() {
    console.log('🚀 Running Performance Audit...\n');

    // Ensure build exists
    if (!fs.existsSync(this.distPath)) {
      console.error('❌ Build directory not found. Run npm run build first.');
      process.exit(1);
    }

    this.analyzeStaticAssets();
    this.analyzeBundleMetrics();
    this.analyzeLoadingStrategy();
    this.generateCoreWebVitalsEstimates();
    this.generateRecommendations();
    this.saveAuditReport();
  }

  analyzeStaticAssets() {
    console.log('📂 Analyzing static assets...\n');

    const assetsPath = path.join(this.distPath, 'assets');
    const files = fs.readdirSync(assetsPath);
    
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;

    const assetBreakdown = {
      js: [],
      css: [],
      images: [],
      fonts: [],
      other: []
    };

    files.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const stat = fs.statSync(filePath);
      const size = stat.size;
      totalSize += size;

      const fileInfo = {
        name: file,
        size,
        sizeKB: Math.round(size / 1024),
        compressionRatio: this.estimateGzipRatio(file)
      };

      if (file.endsWith('.js')) {
        jsSize += size;
        assetBreakdown.js.push(fileInfo);
      } else if (file.endsWith('.css')) {
        cssSize += size;
        assetBreakdown.css.push(fileInfo);
      } else if (file.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
        imageSize += size;
        assetBreakdown.images.push(fileInfo);
      } else if (file.match(/\.(woff|woff2|ttf|eot)$/)) {
        assetBreakdown.fonts.push(fileInfo);
      } else {
        assetBreakdown.other.push(fileInfo);
      }
    });

    this.metrics.staticAssets = {
      totalSize: Math.round(totalSize / 1024),
      jsSize: Math.round(jsSize / 1024),
      cssSize: Math.round(cssSize / 1024),
      imageSize: Math.round(imageSize / 1024),
      breakdown: assetBreakdown
    };

    console.log(`Total asset size: ${this.metrics.staticAssets.totalSize} KB`);
    console.log(`JavaScript: ${this.metrics.staticAssets.jsSize} KB`);
    console.log(`CSS: ${this.metrics.staticAssets.cssSize} KB`);
    console.log(`Images: ${this.metrics.staticAssets.imageSize} KB\n`);

    // Flag large assets
    if (this.metrics.staticAssets.totalSize > 3000) {
      this.recommendations.push({
        type: 'asset-size',
        severity: 'high',
        message: `Total asset size (${this.metrics.staticAssets.totalSize}KB) is quite large`,
        suggestion: 'Consider code splitting, lazy loading, or asset optimization'
      });
    }

    if (this.metrics.staticAssets.jsSize > 1500) {
      this.recommendations.push({
        type: 'js-size',
        severity: 'medium',
        message: `JavaScript bundle size (${this.metrics.staticAssets.jsSize}KB) could be optimized`,
        suggestion: 'Implement code splitting and tree shaking'
      });
    }
  }

  estimateGzipRatio(filename) {
    // Estimate gzip compression ratios based on file type
    if (filename.endsWith('.js')) return 0.3; // ~70% compression
    if (filename.endsWith('.css')) return 0.25; // ~75% compression
    if (filename.endsWith('.html')) return 0.3;
    if (filename.endsWith('.svg')) return 0.4;
    return 0.8; // Binary files don't compress as well
  }

  analyzeBundleMetrics() {
    console.log('📦 Analyzing bundle composition...\n');

    const jsFiles = this.metrics.staticAssets.breakdown.js;
    
    // Analyze chunk strategy
    const vendorChunks = jsFiles.filter(f => f.name.includes('vendor-'));
    const featureChunks = jsFiles.filter(f => f.name.includes('feature-'));
    const mainChunk = jsFiles.find(f => f.name.includes('index-'));

    this.metrics.bundleMetrics = {
      totalChunks: jsFiles.length,
      vendorChunks: vendorChunks.length,
      featureChunks: featureChunks.length,
      largestChunk: Math.max(...jsFiles.map(f => f.sizeKB)),
      smallestChunk: Math.min(...jsFiles.map(f => f.sizeKB)),
      averageChunkSize: Math.round(jsFiles.reduce((sum, f) => sum + f.sizeKB, 0) / jsFiles.length)
    };

    console.log(`Total chunks: ${this.metrics.bundleMetrics.totalChunks}`);
    console.log(`Vendor chunks: ${this.metrics.bundleMetrics.vendorChunks}`);
    console.log(`Feature chunks: ${this.metrics.bundleMetrics.featureChunks}`);
    console.log(`Largest chunk: ${this.metrics.bundleMetrics.largestChunk} KB`);
    console.log(`Average chunk size: ${this.metrics.bundleMetrics.averageChunkSize} KB\n`);

    // Analyze chunking strategy
    if (mainChunk && mainChunk.sizeKB > 1000) {
      this.recommendations.push({
        type: 'main-chunk-size',
        severity: 'high',
        message: `Main chunk is very large (${mainChunk.sizeKB}KB)`,
        suggestion: 'Split main chunk into smaller, route-based chunks'
      });
    }

    if (this.metrics.bundleMetrics.averageChunkSize > 500) {
      this.recommendations.push({
        type: 'chunk-size',
        severity: 'medium',
        message: 'Average chunk size is quite large',
        suggestion: 'Implement more granular code splitting'
      });
    }

    if (vendorChunks.length < 3 && this.metrics.staticAssets.jsSize > 1000) {
      this.recommendations.push({
        type: 'vendor-splitting',
        severity: 'medium',
        message: 'Vendor code could be split into more chunks',
        suggestion: 'Split large vendor libraries into separate chunks for better caching'
      });
    }
  }

  analyzeLoadingStrategy() {
    console.log('⚡ Analyzing loading strategy...\n');

    const indexHtml = path.join(this.distPath, 'index.html');
    const htmlContent = fs.readFileSync(indexHtml, 'utf8');

    const criticalResources = {
      preloadLinks: (htmlContent.match(/<link[^>]*rel="preload"/g) || []).length,
      moduleScripts: (htmlContent.match(/<script[^>]*type="module"/g) || []).length,
      inlineCSS: htmlContent.includes('<style>'),
      externalCSS: (htmlContent.match(/<link[^>]*rel="stylesheet"/g) || []).length,
      inlineJS: (htmlContent.match(/<script(?![^>]*src)/g) || []).length
    };

    this.metrics.loadingStrategy = criticalResources;

    console.log(`Preload links: ${criticalResources.preloadLinks}`);
    console.log(`Module scripts: ${criticalResources.moduleScripts}`);
    console.log(`External CSS files: ${criticalResources.externalCSS}`);
    console.log(`Inline CSS: ${criticalResources.inlineCSS ? 'Yes' : 'No'}`);
    console.log(`Inline JS: ${criticalResources.inlineJS}\n`);

    // Check for critical resource hints
    if (criticalResources.preloadLinks === 0) {
      this.recommendations.push({
        type: 'preload-missing',
        severity: 'medium',
        message: 'No preload hints found',
        suggestion: 'Add preload hints for critical resources (fonts, initial JS chunks)'
      });
    }

    if (criticalResources.externalCSS > 1) {
      this.recommendations.push({
        type: 'css-splitting',
        severity: 'low',
        message: 'Multiple CSS files detected',
        suggestion: 'Consider inlining critical CSS and lazy loading non-critical styles'
      });
    }
  }

  generateCoreWebVitalsEstimates() {
    console.log('📊 Estimating Core Web Vitals...\n');

    // Simplified estimates based on bundle size and structure
    const { totalSize, jsSize } = this.metrics.staticAssets;
    const { largestChunk } = this.metrics.bundleMetrics;

    // First Contentful Paint (FCP) estimate
    // Based on critical resource size and network conditions
    const criticalSize = largestChunk || 500; // KB
    const estimatedFCP = Math.min(800 + (criticalSize * 2), 3000); // Cap at 3s

    // Largest Contentful Paint (LCP) estimate
    // Typically 500-1000ms after FCP for SPAs
    const estimatedLCP = estimatedFCP + 500;

    // Cumulative Layout Shift (CLS) - hard to estimate without runtime
    const estimatedCLS = 0.05; // Assume decent layout stability

    // First Input Delay (FID) estimate
    // Based on main thread blocking potential
    const estimatedFID = Math.min(50 + (jsSize * 0.1), 300); // Cap at 300ms

    this.metrics.coreWebVitals = {
      fcp: {
        estimated: Math.round(estimatedFCP),
        threshold: { good: 1800, needsImprovement: 3000 },
        status: estimatedFCP <= 1800 ? 'good' : estimatedFCP <= 3000 ? 'needs-improvement' : 'poor'
      },
      lcp: {
        estimated: Math.round(estimatedLCP),
        threshold: { good: 2500, needsImprovement: 4000 },
        status: estimatedLCP <= 2500 ? 'good' : estimatedLCP <= 4000 ? 'needs-improvement' : 'poor'
      },
      cls: {
        estimated: estimatedCLS,
        threshold: { good: 0.1, needsImprovement: 0.25 },
        status: estimatedCLS <= 0.1 ? 'good' : estimatedCLS <= 0.25 ? 'needs-improvement' : 'poor'
      },
      fid: {
        estimated: Math.round(estimatedFID),
        threshold: { good: 100, needsImprovement: 300 },
        status: estimatedFID <= 100 ? 'good' : estimatedFID <= 300 ? 'needs-improvement' : 'poor'
      }
    };

    console.log('Core Web Vitals Estimates:');
    Object.entries(this.metrics.coreWebVitals).forEach(([metric, data]) => {
      const status = data.status === 'good' ? '✅' : data.status === 'needs-improvement' ? '⚠️' : '❌';
      console.log(`  ${metric.toUpperCase()}: ${data.estimated}${metric === 'cls' ? '' : 'ms'} ${status}`);
    });
    console.log('\n');

    // Add recommendations for poor metrics
    Object.entries(this.metrics.coreWebVitals).forEach(([metric, data]) => {
      if (data.status !== 'good') {
        this.recommendations.push({
          type: `cwv-${metric}`,
          severity: data.status === 'poor' ? 'high' : 'medium',
          message: `${metric.toUpperCase()} estimate (${data.estimated}${metric === 'cls' ? '' : 'ms'}) needs improvement`,
          suggestion: this.getCoreWebVitalSuggestion(metric)
        });
      }
    });
  }

  getCoreWebVitalSuggestion(metric) {
    const suggestions = {
      fcp: 'Optimize critical rendering path, preload key resources, minimize render-blocking resources',
      lcp: 'Optimize largest content element, improve server response times, preload LCP resource',
      cls: 'Set size attributes on images, avoid dynamically injected content, use font-display: swap',
      fid: 'Minimize JavaScript execution time, break up long tasks, use web workers for heavy computation'
    };
    return suggestions[metric] || 'Optimize critical rendering path';
  }

  generateRecommendations() {
    console.log('💡 Performance Recommendations:\n');

    if (this.recommendations.length === 0) {
      console.log('✅ No major performance issues detected!\n');
      return;
    }

    // Group by severity
    const high = this.recommendations.filter(r => r.severity === 'high');
    const medium = this.recommendations.filter(r => r.severity === 'medium');
    const low = this.recommendations.filter(r => r.severity === 'low');

    if (high.length > 0) {
      console.log('🔴 HIGH PRIORITY:');
      high.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.message}`);
        console.log(`     ${rec.suggestion}\n`);
      });
    }

    if (medium.length > 0) {
      console.log('🟡 MEDIUM PRIORITY:');
      medium.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.message}`);
        console.log(`     ${rec.suggestion}\n`);
      });
    }

    if (low.length > 0) {
      console.log('🟢 LOW PRIORITY:');
      low.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.message}`);
        console.log(`     ${rec.suggestion}\n`);
      });
    }
  }

  saveAuditReport() {
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      recommendations: this.recommendations,
      summary: {
        totalRecommendations: this.recommendations.length,
        highPriority: this.recommendations.filter(r => r.severity === 'high').length,
        mediumPriority: this.recommendations.filter(r => r.severity === 'medium').length,
        lowPriority: this.recommendations.filter(r => r.severity === 'low').length
      }
    };

    const reportFile = path.join(this.reportPath, 'performance-audit-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`📄 Full audit report saved to: ${reportFile}`);
    console.log('\nNext steps:');
    console.log('1. Address high priority recommendations first');
    console.log('2. Run real performance tests with Lighthouse');
    console.log('3. Monitor Core Web Vitals in production');
    console.log('4. Set up performance budgets in CI/CD');
  }
}

// Run the auditor
if (require.main === module) {
  const auditor = new PerformanceAuditor();
  auditor.runAudit().catch(console.error);
}

module.exports = PerformanceAuditor;
