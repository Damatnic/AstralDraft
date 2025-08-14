import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    const getVendorChunk = (id: string) => {
      if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
      if (id.includes('framer-motion')) return 'vendor-framer';
      if (id.includes('lucide-react')) return 'vendor-icons';
      if (id.includes('@dnd-kit')) return 'vendor-dnd';
      if (id.includes('recharts')) return 'vendor-recharts';
      if (id.includes('chart.js') || id.includes('react-chartjs')) return 'vendor-chartjs';
      if (id.includes('d3')) return 'vendor-d3';
      if (id.includes('lodash')) return 'vendor-lodash';
      if (id.includes('date-fns')) return 'vendor-date';
      if (id.includes('axios')) return 'vendor-http';
      if (id.includes('@google/genai') || id.includes('genai')) return 'vendor-ai';
      return 'vendor-misc';
    };

    const getFeatureChunk = (id: string) => {
      if (id.includes('/components/oracle/') || id.includes('/services/oracle')) return 'feature-oracle';
      if (id.includes('/components/draft/') || id.includes('/hooks/useDraft') || id.includes('/hooks/useSnake') || id.includes('/hooks/useAuction')) return 'feature-draft';
      if (id.includes('/components/analytics/') || id.includes('/components/reports/') || id.includes('/hooks/useHistorical')) return 'feature-analytics';
      if (id.includes('/components/manager/') || id.includes('/components/team/') || id.includes('/components/commissioner/')) return 'feature-management';
      if (id.includes('/components/player/') || id.includes('/components/rankings/')) return 'feature-player';
      if (id.includes('/components/matchup/') || id.includes('/components/comparison/')) return 'feature-matchup';
      if (id.includes('/services/') && !id.includes('/services/oracle')) return 'app-services';
      return null;
    };

    const getRouteChunk = (id: string) => {
      if (!id.includes('/views/') && !id.includes('View.tsx')) return null;
      if (id.includes('Oracle')) return 'route-oracle';
      if (id.includes('Draft')) return 'route-draft';
      if (id.includes('Analytics') || id.includes('Reports')) return 'route-analytics';
      if (id.includes('Commissioner') || id.includes('Manager')) return 'route-management';
      return 'route-misc';
    };

    const getManualChunks = (id: string) => {
      if (id.includes('node_modules')) return getVendorChunk(id);
      return getFeatureChunk(id) || getRouteChunk(id);
    };
    
    return {
      plugins: [
        react()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        global: 'globalThis',
        // Environment-specific optimizations
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        '__DEV__': JSON.stringify(!isProduction),
        '__PROD__': JSON.stringify(isProduction)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // Crypto polyfills for browser compatibility
          crypto: 'crypto-browserify',
          stream: 'stream-browserify',
          util: 'util',
          // Performance aliases for common paths
          '@components': path.resolve(__dirname, 'components'),
          '@services': path.resolve(__dirname, 'services'),
          '@hooks': path.resolve(__dirname, 'hooks'),
          '@utils': path.resolve(__dirname, 'utils'),
          '@types': path.resolve(__dirname, 'types.ts')
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
            // Advanced chunk splitting strategy
            manualChunks: getManualChunks,
            // File naming strategy for caching
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]'
          },
          // External dependencies optimization  
          external: isProduction ? [] : ['@types/node'],
          onwarn(warning, warn) {
            // Suppress specific warnings during build
            if (warning.code === 'UNRESOLVED_IMPORT') return;
            if (warning.code === 'THIS_IS_UNDEFINED') return;
            warn(warning);
          }
        },
        // Asset optimization
        assetsInlineLimit: 2048, // Reduced for better caching
        // CSS code splitting
        cssCodeSplit: true,
        // Report compressed file sizes
        reportCompressedSize: true,
        // Cleanup output directory
        emptyOutDir: true
      },
      // Dependency optimization
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'framer-motion',
          'lucide-react',
          'recharts',
          '@dnd-kit/core',
          '@dnd-kit/sortable'
        ],
        // Exclude problematic dependencies
        exclude: ['@types/node']
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
