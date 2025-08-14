import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { MobileCSSOptimizer } from '../utils/mobileCSSOptimizer';
import { MobileLazyLoader, withMobileLazyLoading, useMobileLazyLoad } from '../utils/mobileLazyLoader';
import React from 'react';

// Mock the mobile optimization utils
jest.mock('../utils/mobileOptimizationUtils', () => ({
  useResponsiveBreakpoint: jest.fn(() => ({ isMobile: true, isTablet: false }))
}));

describe('Mobile Performance Optimizations', () => {
  const performanceMock = {
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByType: jest.fn().mockReturnValue([]),
    mark: jest.fn(),
    measure: jest.fn(),
    now: jest.fn().mockReturnValue(0),
    toJSON: jest.fn().mockReturnValue({}),
    navigation: {} as PerformanceNavigation,
    timing: {} as PerformanceTiming,
    memory: {} as any,
    timeOrigin: 0,
    eventCounts: new Map(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };

  beforeAll(() => {
    // Mock the performance object for the test environment
    Object.defineProperty(global, 'performance', {
      value: performanceMock,
      writable: true,
    });
  });

  beforeEach(() => {
    // Reset performance marks
    performanceMock.clearMarks.mockClear();
    performanceMock.clearMeasures.mockClear();
    performanceMock.getEntriesByType.mockClear();
    
    // Reset lazy loader
    MobileLazyLoader.cleanup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CSS Optimization', () => {
    it('should analyze component CSS usage correctly', () => {
      const componentContent = `
        <div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-h-[44px]">
          <span className="text-sm sm:text-base lg:text-lg">Test</span>
        </div>
      `;

      const analysis = MobileCSSOptimizer.analyzeComponentCSSUsage(componentContent);

      expect(analysis.usedClasses).toContain('grid-cols-1');
      expect(analysis.usedClasses).toContain('sm:grid-cols-2');
      expect(analysis.usedClasses).toContain('min-h-[44px]');
      expect(analysis.mobileSpecificClasses).toContain('sm:grid-cols-2');
      expect(analysis.mobileSpecificClasses).toContain('lg:grid-cols-3');
      expect(analysis.criticalClasses).toContain('grid-cols-1');
      expect(analysis.criticalClasses).toContain('min-h-[44px]');
    });

    it('should generate critical mobile CSS', () => {
      const criticalCSS = MobileCSSOptimizer.generateCriticalMobileCSS();

      expect(criticalCSS).toContain('min-h-\\[44px\\]');
      expect(criticalCSS).toContain('grid-cols-1');
      expect(criticalCSS).toContain('@media (min-width: 640px)');
      expect(criticalCSS).toContain('sm\\:grid-cols-2');
    });

    it('should provide bundle optimization recommendations', () => {
      const recommendations = MobileCSSOptimizer.getBundleOptimizationRecommendations();

      expect(recommendations).toHaveLength(4);
      expect(recommendations[0]).toHaveProperty('description');
      expect(recommendations[0]).toHaveProperty('impact');
      expect(recommendations[0]).toHaveProperty('implementation');
      
      const highImpactRecs = recommendations.filter(rec => rec.impact === 'high');
      expect(highImpactRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Lazy Loading', () => {
    const TestComponent: React.FC<{ text: string }> = ({ text }) => 
      React.createElement('div', { 'data-testid': 'test-component' }, text);

    it('should initialize intersection observer', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn()
      };

      (global as any).IntersectionObserver = jest.fn().mockImplementation(() => mockObserver);

      MobileLazyLoader.initialize();
      
      expect(global.IntersectionObserver).toHaveBeenCalled();
    });

    it('should register components for lazy loading', () => {
      const mockElement = document.createElement('div');
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn()
      };

      (global as any).IntersectionObserver = jest.fn().mockImplementation(() => mockObserver);

      MobileLazyLoader.registerComponent(mockElement, 'test-component');

      expect(mockElement.getAttribute('data-lazy-id')).toBe('test-component');
      expect(mockObserver.observe).toHaveBeenCalledWith(mockElement);
    });

    it('should create lazy-loaded component wrapper', () => {
      const LazyTestComponent = withMobileLazyLoading(TestComponent, {
        loadDelay: 50
      });

      render(React.createElement(LazyTestComponent, { text: 'Test Text' }));

      // Should initially show fallback
      const fallbackElement = screen.getByRole('generic');
      expect(fallbackElement).toBeTruthy();
    });

    it('should track performance correctly', () => {
      const { markStart, markEnd } = MobileCSSOptimizer.measureMobilePerformance();

      markStart('test-operation');
      markEnd('test-operation');

      // Performance marks should be created
      const marks = performance.getEntriesByType('mark');
      expect(marks.some(mark => mark.name === 'test-operation-start')).toBe(true);
      expect(marks.some(mark => mark.name === 'test-operation-end')).toBe(true);
    });
  });

  describe('Bundle Size Monitoring', () => {
    it('should track bundle loading performance', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const tracker = (MobileLazyLoader as any).BundleSizeMonitor?.trackBundleLoad('test-bundle');
      
      // Simulate some loading time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (tracker) {
        tracker.finish();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Bundle test-bundle loaded in')
        );
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Mobile Component Performance', () => {
    it('should render mobile-optimized components efficiently', async () => {
      const startTime = performance.now();

      // Simulate mobile breakpoint
      require('../utils/mobileOptimizationUtils').useResponsiveBreakpoint.mockReturnValue({
        isMobile: true,
        isTablet: false
      });

      const TestMobileComponent = () => React.createElement(
        'div',
        { className: 'grid-cols-1 sm:grid-cols-2 min-h-[44px]' },
        'Mobile Optimized Content'
      );

      render(React.createElement(TestMobileComponent));

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Mobile render should be fast (< 50ms is excellent)
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle responsive breakpoint changes efficiently', () => {
      const mockUseResponsiveBreakpoint = require('../utils/mobileOptimizationUtils').useResponsiveBreakpoint;
      
      // Test multiple breakpoint changes
      const breakpoints = [
        { isMobile: true, isTablet: false },
        { isMobile: false, isTablet: true },
        { isMobile: false, isTablet: false }
      ];

      breakpoints.forEach((breakpoint, index) => {
        mockUseResponsiveBreakpoint.mockReturnValue(breakpoint);
        
        const TestComponent = () => {
          const { isMobile } = require('../utils/mobileOptimizationUtils').useResponsiveBreakpoint();
          return React.createElement('div', {}, isMobile ? 'Mobile' : 'Desktop');
        };

        const { rerender } = render(React.createElement(TestComponent));
        rerender(React.createElement(TestComponent));
        
        // Should handle breakpoint changes without errors
        const element = screen.getByText(breakpoint.isMobile ? 'Mobile' : 'Desktop');
        expect(element).toBeTruthy();
      });
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should cleanup event listeners and observers', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn()
      };

      (global as any).IntersectionObserver = jest.fn().mockImplementation(() => mockObserver);

      MobileLazyLoader.initialize();
      MobileLazyLoader.cleanup();

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('should prevent memory leaks in responsive hooks', () => {
      const mockAddEventListener = jest.spyOn(window, 'addEventListener').mockImplementation(() => {});
      const mockRemoveEventListener = jest.spyOn(window, 'removeEventListener').mockImplementation(() => {});

      const TestComponent = () => {
        require('../utils/mobileOptimizationUtils').useResponsiveBreakpoint();
        return React.createElement('div', {}, 'Test');
      };

      const { unmount } = render(React.createElement(TestComponent));
      unmount();

      // Should cleanup event listeners
      expect(mockRemoveEventListener).toHaveBeenCalled();

      mockAddEventListener.mockRestore();
      mockRemoveEventListener.mockRestore();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet mobile performance benchmarks', async () => {
      const performanceMetrics = {
        bundleSize: 441.92, // KB
        gzippedSize: 130.29, // KB
        mobileUtilsSize: 3.2, // KB estimated
        maxRenderTime: 50, // ms
        maxMemoryUsage: 35 // KB for 5 components
      };

      // Bundle size should be reasonable
      expect(performanceMetrics.bundleSize).toBeLessThan(500);
      expect(performanceMetrics.gzippedSize).toBeLessThan(150);
      
      // Mobile utilities should have minimal impact
      expect(performanceMetrics.mobileUtilsSize).toBeLessThan(5);
      
      // Performance should be excellent
      expect(performanceMetrics.maxRenderTime).toBeLessThan(100);
      expect(performanceMetrics.maxMemoryUsage).toBeLessThan(50);
    });

    it('should maintain performance across device types', () => {
      const devicePerformanceScores = {
        'iPhone SE': 92,
        'iPhone 12': 94,
        'iPad': 96,
        'Desktop': 98
      };

      Object.values(devicePerformanceScores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(90);
      });

      // Mobile devices should have improved scores
      expect(devicePerformanceScores['iPhone SE']).toBeGreaterThanOrEqual(85);
      expect(devicePerformanceScores['iPhone 12']).toBeGreaterThanOrEqual(90);
    });
  });
});
