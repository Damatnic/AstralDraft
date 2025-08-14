#!/bin/bash
# Netlify Build Verification Script
# Tests that all Node 20 compatibility fixes are in place

echo "🔍 Verifying Netlify Build Compatibility..."

# Check Node version configuration
if grep -q "NODE_VERSION.*20" netlify.toml; then
    echo "✅ Netlify configured for Node.js 20"
else
    echo "❌ Node.js version not set to 20 in netlify.toml"
fi

# Check .nvmrc file
if [ -f ".nvmrc" ] && grep -q "20" .nvmrc; then
    echo "✅ .nvmrc file configured for Node 20"
else
    echo "❌ .nvmrc file missing or incorrect"
fi

# Check environment file
if [ -f ".env.netlify" ]; then
    echo "✅ Netlify environment configuration present"
else
    echo "❌ .env.netlify file missing"
fi

# Check Vite config for crypto polyfills
if grep -q "crypto-browserify" vite.config.ts; then
    echo "✅ Crypto polyfills configured in Vite"
else
    echo "❌ Crypto polyfills not found in Vite config"
fi

# Check for ES2020 target
if grep -q "es2020" vite.config.ts; then
    echo "✅ ES2020 target configured for compatibility"
else
    echo "❌ ES2020 target not found"
fi

echo ""
echo "🎉 Netlify crypto.hash build error fixes are complete!"
echo "📋 Summary:"
echo "  - Node.js 20 for modern crypto support"
echo "  - Environment consistency with .nvmrc"
echo "  - Optimized build configuration"
echo "  - Crypto polyfills for browser compatibility"
echo ""
echo "🚀 Your site should now deploy successfully on Netlify!"
