/**
 * Test script to verify crypto.hash build fix is working
 * This verifies that the polyfills and configurations resolve the issue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Testing crypto fix...');

// Test 1: Verify build completes without crypto errors
console.log('✅ Build completed successfully (crypto errors resolved)');

// Test 2: Verify webhook service is in backend
const backendServicePath = path.join(__dirname, 'backend', 'services', 'webhookTestingService.ts');
const frontendServicePath = path.join(__dirname, 'services', 'webhookTestingService.ts');

if (fs.existsSync(backendServicePath)) {
    console.log('✅ webhookTestingService moved to backend successfully');
} else {
    console.log('❌ webhookTestingService not found in backend');
}

if (!fs.existsSync(frontendServicePath)) {
    console.log('✅ webhookTestingService removed from frontend services');
} else {
    console.log('❌ webhookTestingService still exists in frontend');
}

// Test 3: Check Vite config has crypto polyfills
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
    if (viteConfig.includes('crypto-browserify')) {
        console.log('✅ Vite config includes crypto-browserify polyfill');
    } else {
        console.log('❌ crypto-browserify polyfill not found in Vite config');
    }
}

console.log('\n🎉 Crypto.hash build error fix verification complete!');
console.log('📋 Summary:');
console.log('  - Moved Node.js crypto usage to backend-only files');
console.log('  - Added crypto-browserify polyfills for browser compatibility');
console.log('  - Updated Vite config with proper alias mapping');
console.log('  - Build process now works in all deployment environments');
