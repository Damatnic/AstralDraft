import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        global: 'globalThis',
        // Ensure crypto polyfills work in production
        'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // Add crypto polyfill for browser compatibility
          crypto: 'crypto-browserify',
          stream: 'stream-browserify',
          util: 'util'
        }
      },
      build: {
        // Optimize bundle for mobile devices and Netlify deployment
        target: 'es2020', // Updated for better compatibility
        minify: 'esbuild',
        cssMinify: true,
        // Increase chunk size limit for Netlify
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          output: {
            // Split chunks for better caching
            manualChunks: {
              // Core vendor chunks
              'vendor-react': ['react', 'react-dom'],
              'vendor-ui': ['framer-motion', 'lucide-react'],
              'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable'],
              'vendor-charts': ['recharts']
            }
          }
        },
        // Asset inlining threshold (inline small assets)
        assetsInlineLimit: 4096
      },
      // Performance optimizations
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'framer-motion',
          'lucide-react'
        ]
      },
      // Mobile-specific server config
      server: {
        host: true,
        port: 8765, // Unique port for Astral Draft Oracle interface
        strictPort: true, // Don't try other ports if 8765 is busy
        open: false // Don't auto-open browser
      }
    };
});
