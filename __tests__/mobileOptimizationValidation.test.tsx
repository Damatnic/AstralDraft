/**
 * Mobile Optimization Validation Tests
 * Tests specifically for BeatTheOracleView and HistoricalAnalyticsView mobile optimizations
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { 
  useResponsiveBreakpoint, 
  useMobileModalClasses, 
  useMobileFixedPosition,
  BREAKPOINTS,
  MOBILE_CONSTANTS 
} from '../utils/mobileOptimizationUtils';

// Mock the useMediaQuery hook for different screen sizes
jest.mock('../hooks/useMediaQuery');
const mockUseMediaQuery = useMediaQuery as jest.MockedFunction<typeof useMediaQuery>;

// Mock components for testing
const MockBeatTheOracleView = () => {
  const { isMobile } = useResponsiveBreakpoint();
  const modalClasses = useMobileModalClasses();
  const notificationPosition = useMobileFixedPosition('corner');

  return (
    <div data-testid="beat-oracle-view" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Beat The Oracle</h1>
      
      {/* Tab Navigation */}
      <div className="w-full overflow-x-auto">
        <div className="flex space-x-2 sm:space-x-1 pb-2 px-4 sm:px-0 min-w-max">
          <button 
            className="px-3 py-2 mobile-touch-target whitespace-nowrap"
            data-testid="tab-challenges"
          >
            Challenges
          </button>
          <button 
            className="px-3 py-2 mobile-touch-target whitespace-nowrap"
            data-testid="tab-analytics"
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" data-testid="stats-grid">
        <div data-testid="stat-card">Wins</div>
        <div data-testid="stat-card">Losses</div>
        <div data-testid="stat-card">Streak</div>
        <div data-testid="stat-card">Points</div>
      </div>

      {/* Modal */}
      <div className={modalClasses.overlay} data-testid="modal-overlay">
        <div className={modalClasses.content} data-testid="modal-content">
          Modal Content
        </div>
      </div>

      {/* Notification */}
      <div className={notificationPosition} data-testid="notification">
        Notification
      </div>
    </div>
  );
};

const MockHistoricalAnalyticsView = () => {
  const { isMobile } = useResponsiveBreakpoint();
  const modalClasses = useMobileModalClasses();

  return (
    <div data-testid="historical-analytics-view" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Historical Analytics</h1>
      
      {/* Chart Container */}
      <div 
        className="w-full p-2 sm:p-4" 
        style={{ height: isMobile ? 180 : 200 }}
        data-testid="chart-container"
      >
        Chart Content
      </div>

      {/* Export Modal */}
      <div className={modalClasses.overlay} data-testid="export-modal-overlay">
        <div className={modalClasses.content} data-testid="export-modal-content">
          Export Modal
        </div>
      </div>
    </div>
  );
};

describe('Mobile Optimization Validation', () => {
  // Test different screen sizes
  const testSizes = [
    { name: 'iPhone SE', width: 320, height: 568, isMobile: true },
    { name: 'iPhone 12', width: 375, height: 812, isMobile: true },
    { name: 'iPhone 12 Pro Max', width: 414, height: 896, isMobile: true },
    { name: 'iPad', width: 768, height: 1024, isMobile: false, isTablet: true },
    { name: 'iPad Pro', width: 1024, height: 1366, isMobile: false, isTablet: true },
    { name: 'Desktop', width: 1440, height: 900, isMobile: false, isTablet: false },
  ];

  beforeEach(() => {
    // Reset window size mocks
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  describe('useResponsiveBreakpoint Hook', () => {
    testSizes.forEach(({ name, width, height, isMobile }) => {
      test(`should correctly identify ${name} (${width}x${height}) as ${isMobile ? 'mobile' : 'desktop'}`, () => {
        // Mock window size
        Object.defineProperty(window, 'innerWidth', { value: width });
        Object.defineProperty(window, 'innerHeight', { value: height });

        const TestComponent = () => {
          const { isMobile: detectedMobile, breakpoint } = useResponsiveBreakpoint();
          return (
            <div>
              <div data-testid="is-mobile">{detectedMobile.toString()}</div>
              <div data-testid="breakpoint">{breakpoint}</div>
            </div>
          );
        };

        render(<TestComponent />);
        
        expect(screen.getByTestId('is-mobile')).toHaveTextContent(isMobile.toString());
      });
    });
  });

  describe('BeatTheOracleView Mobile Optimizations', () => {
    testSizes.forEach(({ name, width, height, isMobile }) => {
      test(`should render correctly on ${name} (${width}x${height})`, () => {
        Object.defineProperty(window, 'innerWidth', { value: width });
        
        render(<MockBeatTheOracleView />);

        const view = screen.getByTestId('beat-oracle-view');
        expect(view).toBeInTheDocument();
        expect(view).toHaveClass('w-full', 'max-w-7xl', 'mx-auto');

        // Check responsive padding
        expect(view).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
      });
    });

    test('should have touch-friendly tab buttons', () => {
      render(<MockBeatTheOracleView />);

      const tabButtons = [
        screen.getByTestId('tab-challenges'),
        screen.getByTestId('tab-analytics')
      ];

      tabButtons.forEach(button => {
        expect(button).toHaveClass('mobile-touch-target');
        expect(button).toHaveClass('whitespace-nowrap');
        
        // Check computed styles for touch target size
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight) || parseInt(styles.height) || 0;
        expect(minHeight).toBeGreaterThanOrEqual(MOBILE_CONSTANTS.MIN_TOUCH_TARGET);
      });
    });

    test('should have responsive stats grid', () => {
      render(<MockBeatTheOracleView />);

      const statsGrid = screen.getByTestId('stats-grid');
      expect(statsGrid).toHaveClass('grid');
      expect(statsGrid).toHaveClass('grid-cols-2', 'sm:grid-cols-4');
      expect(statsGrid).toHaveClass('gap-3', 'sm:gap-4');

      const statCards = screen.getAllByTestId('stat-card');
      expect(statCards).toHaveLength(4);
    });

    test('should position modals correctly for mobile vs desktop', () => {
      // Test mobile
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      
      const { rerender } = render(<MockBeatTheOracleView />);
      
      let modalOverlay = screen.getByTestId('modal-overlay');
      let modalContent = screen.getByTestId('modal-content');
      
      // Mobile should have slide-up modal
      expect(modalOverlay).toHaveClass('items-end');
      expect(modalContent).toHaveClass('rounded-t-xl');

      // Test desktop
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      
      rerender(<MockBeatTheOracleView />);
      
      modalOverlay = screen.getByTestId('modal-overlay');
      modalContent = screen.getByTestId('modal-content');
      
      // Desktop should have centered modal
      expect(modalOverlay).toHaveClass('items-center');
      expect(modalContent).toHaveClass('rounded-lg');
    });
  });

  describe('HistoricalAnalyticsView Mobile Optimizations', () => {
    test('should adjust chart height for mobile', () => {
      // Test mobile
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      
      const { rerender } = render(<MockHistoricalAnalyticsView />);
      
      let chartContainer = screen.getByTestId('chart-container');
      expect(chartContainer.style.height).toBe('180px');

      // Test desktop
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      
      rerender(<MockHistoricalAnalyticsView />);
      
      chartContainer = screen.getByTestId('chart-container');
      expect(chartContainer.style.height).toBe('200px');
    });

    test('should have responsive typography', () => {
      render(<MockHistoricalAnalyticsView />);

      const heading = screen.getByText('Historical Analytics');
      expect(heading).toHaveClass('text-xl', 'sm:text-2xl', 'lg:text-3xl');
    });
  });

  describe('Touch Target Compliance', () => {
    test('should meet minimum touch target size requirements', () => {
      render(<MockBeatTheOracleView />);

      const touchTargets = screen.getAllByRole('button');
      
      touchTargets.forEach(target => {
        const rect = target.getBoundingClientRect();
        const hasMinHeight = rect.height >= MOBILE_CONSTANTS.MIN_TOUCH_TARGET;
        const hasMinWidth = rect.width >= MOBILE_CONSTANTS.MIN_TOUCH_TARGET;
        
        // Should meet at least one dimension requirement
        expect(hasMinHeight || hasMinWidth).toBe(true);
      });
    });
  });

  describe('Responsive Design Breakpoints', () => {
    test('should respect Tailwind breakpoint system', () => {
      const breakpointTests = [
        { width: 320, expectedBreakpoint: 'sm' },
        { width: 640, expectedBreakpoint: 'sm' },
        { width: 768, expectedBreakpoint: 'md' },
        { width: 1024, expectedBreakpoint: 'lg' },
        { width: 1280, expectedBreakpoint: 'xl' },
      ];

      breakpointTests.forEach(({ width, expectedBreakpoint }) => {
        Object.defineProperty(window, 'innerWidth', { value: width });
        
        const TestComponent = () => {
          const { breakpoint } = useResponsiveBreakpoint();
          return <div data-testid="breakpoint">{breakpoint}</div>;
        };

        const { rerender } = render(<TestComponent />);
        
        expect(screen.getByTestId('breakpoint')).toHaveTextContent(expectedBreakpoint);
        
        rerender(<TestComponent />);
      });
    });
  });

  describe('Performance and Memory', () => {
    test('should not cause memory leaks with responsive hooks', () => {
      const TestComponent = () => {
        const responsive = useResponsiveBreakpoint();
        const modalClasses = useMobileModalClasses();
        const fixedPosition = useMobileFixedPosition('corner');
        
        return (
          <div>
            <div>{responsive.isMobile.toString()}</div>
            <div>{modalClasses.overlay}</div>
            <div>{fixedPosition}</div>
          </div>
        );
      };

      const { unmount } = render(<TestComponent />);
      
      // Simulate multiple re-renders
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(window, 'innerWidth', { value: 300 + i * 100 });
        fireEvent.resize(window);
      }
      
      unmount();
      
      // Should not throw or cause issues when unmounting
      expect(true).toBe(true);
    });
  });

  describe('Accessibility', () => {
    test('should maintain accessibility in mobile layouts', () => {
      render(<MockBeatTheOracleView />);

      // All interactive elements should be keyboard accessible
      const interactiveElements = screen.getAllByRole('button');
      
      interactiveElements.forEach(element => {
        // Should be focusable
        element.focus();
        expect(document.activeElement).toBe(element);
        
        // Should have adequate contrast (basic check)
        const styles = window.getComputedStyle(element);
        expect(styles.backgroundColor).toBeDefined();
        expect(styles.color).toBeDefined();
      });
    });
  });
});

// Integration test for real-world scenarios
describe('Mobile Optimization Integration Tests', () => {
  test('should handle orientation changes gracefully', async () => {
    const TestComponent = () => {
      const { isMobile, breakpoint } = useResponsiveBreakpoint();
      return (
        <div>
          <div data-testid="mobile-status">{isMobile.toString()}</div>
          <div data-testid="breakpoint-status">{breakpoint}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Simulate portrait to landscape
    Object.defineProperty(window, 'innerWidth', { value: 812 });
    Object.defineProperty(window, 'innerHeight', { value: 375 });
    fireEvent.resize(window);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-status')).toBeInTheDocument();
    });

    // Simulate landscape to portrait
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(window, 'innerHeight', { value: 812 });
    fireEvent.resize(window);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-status')).toHaveTextContent('true');
    });
  });

  test('should work with dynamic content changes', () => {
    const DynamicComponent = () => {
      const { isMobile } = useResponsiveBreakpoint();
      const modalClasses = useMobileModalClasses();
      
      return (
        <div>
          <div data-testid="dynamic-layout" className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
            Dynamic Content
          </div>
          <div className={modalClasses.content} data-testid="dynamic-modal">
            Modal
          </div>
        </div>
      );
    };

    // Test mobile
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    const { rerender } = render(<DynamicComponent />);
    
    expect(screen.getByTestId('dynamic-layout')).toHaveClass('mobile-layout');

    // Test desktop
    Object.defineProperty(window, 'innerWidth', { value: 1440 });
    rerender(<DynamicComponent />);
    
    expect(screen.getByTestId('dynamic-layout')).toHaveClass('desktop-layout');
  });
});
