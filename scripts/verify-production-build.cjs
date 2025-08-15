#!/usr/bin/env node

/**
 * Script to verify the production build is correctly configured
 * Checks for common React production build issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying production build configuration...\n');

const distPath = path.join(__dirname, '..', 'dist');
const assetsPath = path.join(distPath, 'assets');

// Check if dist folder exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: dist folder not found. Run "npm run build" first.');
  process.exit(1);
}

// Check for React vendor bundle
const files = fs.readdirSync(assetsPath);
const reactVendorFile = files.find(f => f.startsWith('react-vendor-'));

if (!reactVendorFile) {
  console.error('❌ Error: React vendor bundle not found.');
  process.exit(1);
}

console.log('✅ React vendor bundle found:', reactVendorFile);

// Read and verify React vendor bundle content
const reactVendorPath = path.join(assetsPath, reactVendorFile);
const reactVendorContent = fs.readFileSync(reactVendorPath, 'utf8');

// Check for critical React exports (accounting for minification)
const checks = [
  { pattern: /Children/gi, name: 'React.Children', minCount: 1 },
  { pattern: /createElement/gi, name: 'createElement', minCount: 10 },
  { pattern: /createRoot/gi, name: 'createRoot', minCount: 1 },
  { pattern: /Component/gi, name: 'Component', minCount: 5 },
  { pattern: /useState/gi, name: 'useState', minCount: 1 },
  { pattern: /useEffect/gi, name: 'useEffect', minCount: 1 }
];

let allChecksPass = true;

checks.forEach(({ pattern, name, minCount }) => {
  const matches = reactVendorContent.match(pattern);
  if (matches && matches.length >= minCount) {
    console.log(`✅ ${name} found (${matches.length} occurrences)`);
  } else if (matches && matches.length > 0) {
    console.log(`⚠️  ${name} found but only ${matches.length} occurrences (expected at least ${minCount})`);
  } else {
    console.error(`❌ ${name} NOT found - this will cause runtime errors!`);
    allChecksPass = false;
  }
});

// Check index.html for proper module preloading
const indexHtmlPath = path.join(distPath, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

if (indexHtml.includes(`modulepreload" crossorigin href="/assets/${reactVendorFile}`)) {
  console.log('✅ React vendor bundle is properly preloaded in index.html');
} else {
  console.error('❌ React vendor bundle is NOT preloaded in index.html');
  allChecksPass = false;
}

// Check main index bundle
const indexJsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
if (indexJsFile) {
  console.log('✅ Main index bundle found:', indexJsFile);
  
  const indexJsPath = path.join(assetsPath, indexJsFile);
  const indexJsContent = fs.readFileSync(indexJsPath, 'utf8').slice(0, 5000); // Check first 5KB
  
  // Verify React is imported correctly
  if (indexJsContent.includes('react-vendor')) {
    console.log('✅ Main bundle properly imports React vendor chunk');
  } else if (indexJsContent.includes('from"react"') || indexJsContent.includes('from "react"')) {
    console.log('⚠️  Warning: Main bundle may have direct React imports');
  }
} else {
  console.error('❌ Main index bundle not found');
  allChecksPass = false;
}

// Check chunk sizes
const reactVendorStats = fs.statSync(reactVendorPath);
const reactVendorSizeKB = Math.round(reactVendorStats.size / 1024);

console.log(`\n📊 Bundle sizes:`);
console.log(`   React vendor: ${reactVendorSizeKB} KB`);

if (reactVendorSizeKB < 100) {
  console.error('⚠️  Warning: React vendor bundle seems too small. React might not be fully included.');
} else if (reactVendorSizeKB > 500) {
  console.log('⚠️  Warning: React vendor bundle is large. Consider optimization.');
} else {
  console.log('✅ React vendor bundle size is reasonable');
}

// Final verdict
console.log('\n' + '='.repeat(50));
if (allChecksPass) {
  console.log('✅ Production build verification PASSED!');
  console.log('   Your React production build should work correctly.');
} else {
  console.error('❌ Production build verification FAILED!');
  console.error('   Fix the issues above before deploying to production.');
  process.exit(1);
}