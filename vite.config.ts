import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    // Removed duplicate chunk logic to prevent conflicts - using inline logic in build.rollupOptions.output.manualChunks
    
    return {
      plugins: [
        react(),
        // Copy service worker to dist folder - only during build
        {
          name: 'copy-sw',
          apply: 'build', // Only run during build, not dev
          generateBundle() {
            // Use dynamic import to avoid bundling Node.js modules
            return new Promise(async (resolve) => {
              try {
                const { copyFileSync, existsSync } = await import('fs');
                const { resolve: pathResolve } = await import('path');
                
                const swPath = pathResolve(process.cwd(), 'sw.js');
                const distPath = pathResolve(process.cwd(), 'dist/sw.js');
                
                if (existsSync(swPath)) {
                  copyFileSync(swPath, distPath);
                  console.log('✓ Service worker copied to dist/sw.js');
                } else {
                  console.log('ℹ Service worker not found, skipping copy');
                }
              } catch (error) {
                console.warn('⚠ Failed to copy service worker:', error.message);
              }
              resolve();
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'global': 'globalThis',
        'globalThis': 'globalThis',
        // Environment-specific optimizations
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        '__DEV__': JSON.stringify(!isProduction),
        '__PROD__': JSON.stringify(isProduction)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // Node.js polyfills for browser compatibility
          crypto: 'crypto-browserify',
          stream: 'stream-browserify',
          util: 'util',
          events: 'events',
          // Performance aliases for common paths
          '@components': path.resolve(__dirname, 'components'),
          '@services': path.resolve(__dirname, 'services'),
          '@hooks': path.resolve(__dirname, 'hooks'),
          '@utils': path.resolve(__dirname, 'utils'),
          '@types': path.resolve(__dirname, 'types.ts'),
          // Additional polyfills
          buffer: 'buffer'
        }
      },
      build: {
        // Production build optimizations
        target: isProduction ? 'es2020' : 'esnext',
        minify: isProduction ? 'esbuild' : false,
        cssMinify: isProduction,
        // Source maps for production debugging
        sourcemap: isProduction ? 'hidden' : true,
        // Bundle size management
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            // Critical fix for React Children undefined error
            manualChunks: (id: string) => {
              // CRITICAL: Keep React core together to prevent initialization issues
              if (id.includes('node_modules')) {
                // React ecosystem must stay together - this fixes the Children undefined error
                if (id.includes('react-dom') || id.includes('react/') || id.includes('react\\') || 
                    id.includes('/react.') || id.includes('\\react.') || id.includes('react@') ||
                    id.includes('scheduler') || id.includes('react-is')) {
                  return 'vendor-react';
                }
                
                // Keep React-related libraries together to avoid conflicts
                if (id.includes('framer-motion') || id.includes('lucide-react') || 
                    id.includes('react-chartjs') || id.includes('recharts')) {
                  return 'vendor-react-ui';
                }
                
                // Group other vendors
                if (id.includes('@dnd-kit')) return 'vendor-dnd';
                if (id.includes('chart.js') || id.includes('d3')) return 'vendor-charts';
                if (id.includes('lodash') || id.includes('date-fns')) return 'vendor-utils';
                if (id.includes('axios')) return 'vendor-http';
                if (id.includes('@google/genai') || id.includes('genai')) return 'vendor-ai';
                return 'vendor-misc';
              }
              
              // Less aggressive app code chunking to avoid dependency issues
              if (id.includes('/components/oracle/') || id.includes('/services/oracle')) return 'feature-oracle';
              if (id.includes('/components/draft/')) return 'feature-draft';
              if (id.includes('/components/analytics/')) return 'feature-analytics';
              if (id.includes('/services/') && !id.includes('/services/oracle')) return 'app-services';
              
              // Keep core app components together
              return null;
            },
            // File naming strategy for caching
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
            // Ensure proper globals for React
            globals: {
              'react': 'React',
              'react-dom': 'ReactDOM'
            }
          },
          // Never externalize React in production - it must be bundled
          external: isProduction ? [] : ['@types/node'],
          onwarn(warning, warn) {
            // Suppress specific warnings during build
            if (warning.code === 'UNRESOLVED_IMPORT') return;
            if (warning.code === 'THIS_IS_UNDEFINED') return;
            if (warning.code === 'CIRCULAR_DEPENDENCY') return;
            warn(warning);
          }
        },
        // Asset optimization
        assetsInlineLimit: 2048, // Reduced for better caching
        // CSS code splitting
        cssCodeSplit: true,
        // Browser compatibility
        modulePreload: { polyfill: true },
        // Report compressed file sizes
        reportCompressedSize: true,
        // Cleanup output directory
        emptyOutDir: true
      },
      // Critical dependency optimization for React
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-dom/client',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          'scheduler',
          'framer-motion',
          'lucide-react',
          'recharts',
          '@dnd-kit/core',
          '@dnd-kit/sortable'
        ],
        // Exclude problematic dependencies that cause React conflicts
        exclude: ['@types/node', 'react-is'],
        // Force React dependencies to be optimized together - critical for preventing Children undefined
        force: true,
        // Ensure proper ESBuild handling of React
        esbuildOptions: {
          target: 'es2020',
          // Preserve React's internal structure
          keepNames: true
        }
      },
      // Enhanced caching strategy
      cacheDir: 'node_modules/.vite',
      // Server configuration
      server: {
        host: true,
        port: 8765,
        strictPort: true,
        open: false,
        // Performance middleware
        cors: true,
        // Development optimizations
        hmr: {
          overlay: !isProduction
        }
      },
      // Preview server configuration
      preview: {
        port: 8766,
        host: true,
        strictPort: true,
        open: false
      },
      // Performance monitoring
      esbuild: {
        // Tree shaking optimizations
        treeShaking: true,
        // Remove console logs in production
        drop: isProduction ? ['console', 'debugger'] : [],
        // Minify identifiers
        minifyIdentifiers: isProduction,
        // Minify syntax
        minifySyntax: isProduction,
        // Minify whitespace
        minifyWhitespace: isProduction
      },
      // CSS optimization
      css: {
        // CSS modules configuration
        modules: {
          localsConvention: 'camelCase'
        }
      }
    };
});
