/**
 * Mobile Responsiveness and PWA Test Suite
 * Comprehensive testing for mobile functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';

// Mock hooks and components
import { useMobileDetection, useResponsiveBreakpoint, useVirtualKeyboard, useNetworkStatus } from '../hooks/useMobileDetection';
import MobileNavigation from '../components/mobile/MobileNavigation';
import PWAInstallPrompt from '../components/mobile/PWAInstallPrompt';
import MobileLayout from '../components/mobile/MobileLayout';
import EnhancedMobileOracleInterface from '../components/mobile/EnhancedMobileOracleInterface';

// Mock window methods and properties
const mockWindowResize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

const mockTouchDevice = (hasTouch: boolean) => {
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: hasTouch ? 1 : 0,
  });
  
  if (hasTouch) {
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: () => {},
    });
  }
};

const mockPWAMode = (isPWA: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: isPWA && query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('Mobile Detection Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should detect mobile device correctly', async () => {
    let detectionResult: any;
    
    const TestComponent = () => {
      detectionResult = useMobileDetection();
      return <div>Test</div>;
    };

    // Test mobile viewport
    mockWindowResize(375, 667);
    mockTouchDevice(true);
    
    render(<TestComponent />);
    
    expect(detectionResult.isMobile).toBe(true);
    expect(detectionResult.isTablet).toBe(false);
    expect(detectionResult.isDesktop).toBe(false);
    expect(detectionResult.isTouchDevice).toBe(true);
    expect(detectionResult.screenSize).toBe('small');
  });

  test('should detect tablet device correctly', async () => {
    let detectionResult: any;
    
    const TestComponent = () => {
      detectionResult = useMobileDetection();
      return <div>Test</div>;
    };

    // Test tablet viewport
    mockWindowResize(768, 1024);
    mockTouchDevice(true);
    
    render(<TestComponent />);
    
    expect(detectionResult.isMobile).toBe(false);
    expect(detectionResult.isTablet).toBe(true);
    expect(detectionResult.isDesktop).toBe(false);
    expect(detectionResult.isTouchDevice).toBe(true);
    expect(detectionResult.screenSize).toBe('large');
  });

  test('should detect desktop device correctly', async () => {
    let detectionResult: any;
    
    const TestComponent = () => {
      detectionResult = useMobileDetection();
      return <div>Test</div>;
    };

    // Test desktop viewport
    mockWindowResize(1920, 1080);
    mockTouchDevice(false);
    
    render(<TestComponent />);
    
    expect(detectionResult.isMobile).toBe(false);
    expect(detectionResult.isTablet).toBe(false);
    expect(detectionResult.isDesktop).toBe(true);
    expect(detectionResult.isTouchDevice).toBe(false);
    expect(detectionResult.screenSize).toBe('xlarge');
  });

  test('should detect PWA mode correctly', async () => {
    let detectionResult: any;
    
    const TestComponent = () => {
      detectionResult = useMobileDetection();
      return <div>Test</div>;
    };

    mockPWAMode(true);
    
    render(<TestComponent />);
    
    expect(detectionResult.isPWA).toBe(true);
  });

  test('should detect orientation changes', async () => {
    let detectionResult: any;
    
    const TestComponent = () => {
      detectionResult = useMobileDetection();
      return <div>Test</div>;
    };

    // Portrait mode
    mockWindowResize(375, 667);
    render(<TestComponent />);
    expect(detectionResult.isPortrait).toBe(true);
    expect(detectionResult.isLandscape).toBe(false);

    // Landscape mode
    act(() => {
      mockWindowResize(667, 375);
    });
    expect(detectionResult.isPortrait).toBe(false);
    expect(detectionResult.isLandscape).toBe(true);
  });
});

describe('Responsive Breakpoint Hook', () => {
  test('should return correct breakpoints', () => {
    let breakpointResult: any;
    
    const TestComponent = () => {
      breakpointResult = useResponsiveBreakpoint();
      return <div>Test</div>;
    };

    // Extra small
    mockWindowResize(320, 568);
    render(<TestComponent />);
    expect(breakpointResult).toBe('xs');

    // Small
    act(() => mockWindowResize(640, 360));
    expect(breakpointResult).toBe('sm');

    // Medium
    act(() => mockWindowResize(768, 1024));
    expect(breakpointResult).toBe('md');

    // Large
    act(() => mockWindowResize(1024, 768));
    expect(breakpointResult).toBe('lg');

    // Extra large
    act(() => mockWindowResize(1920, 1080));
    expect(breakpointResult).toBe('xl');
  });
});

describe('Mobile Navigation Component', () => {
  const mockProps = {
    activeView: 'home' as const,
    onViewChange: jest.fn(),
  };

  beforeEach(() => {
    mockWindowResize(375, 667);
    mockTouchDevice(true);
  });

  test('should render mobile navigation correctly', () => {
    render(<MobileNavigation {...mockProps} />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Oracle')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  test('should handle tab changes', () => {
    render(<MobileNavigation {...mockProps} />);
    
    const oracleTab = screen.getByText('Oracle');
    fireEvent.click(oracleTab);
    
    expect(mockProps.onViewChange).toHaveBeenCalledWith('oracle');
  });

  test('should toggle secondary navigation', () => {
    render(<MobileNavigation {...mockProps} />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);
    
    // Secondary nav should be visible
    expect(screen.getByText('Contests')).toBeInTheDocument();
  });

  test('should display secondary navigation when open', () => {
    render(<MobileNavigation {...mockProps} />);
    
    // Open secondary nav first
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);
    
    expect(screen.getByText('Contests')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('should adapt to tablet layout', () => {
    mockWindowResize(768, 1024);
    
    render(<MobileNavigation {...mockProps} />);
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveClass('tablet-horizontal');
  });
});

describe('PWA Install Prompt Component', () => {
  const mockBeforeInstallPromptEvent = {
    preventDefault: jest.fn(),
    prompt: jest.fn().mockResolvedValue({ outcome: 'accepted' }),
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  };

  beforeEach(() => {
    mockTouchDevice(true);
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  test('should render install prompt for supported devices', () => {
    render(<PWAInstallPrompt />);
    
    // Simulate beforeinstallprompt event
    act(() => {
      window.dispatchEvent(new CustomEvent('beforeinstallprompt', {
        detail: mockBeforeInstallPromptEvent
      }));
    });

    expect(screen.getByText(/Install Astral Draft/i)).toBeInTheDocument();
  });

  test('should show iOS install instructions', async () => {
    // Mock iOS user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      writable: true,
    });

    render(<PWAInstallPrompt />);
    
    const installButton = screen.getByText(/Install App/i);
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument();
    });
  });

  test('should handle Android install flow', async () => {
    render(<PWAInstallPrompt />);
    
    // Simulate beforeinstallprompt event
    act(() => {
      const event = new CustomEvent('beforeinstallprompt');
      Object.assign(event, mockBeforeInstallPromptEvent);
      window.dispatchEvent(event);
    });

    const installButton = screen.getByText(/Install App/i);
    fireEvent.click(installButton);

    expect(mockBeforeInstallPromptEvent.prompt).toHaveBeenCalled();
  });

  test('should remember dismissal', () => {
    render(<PWAInstallPrompt />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('beforeinstallprompt', {
        detail: mockBeforeInstallPromptEvent
      }));
    });

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'pwa-install-dismissed',
      expect.any(String)
    );
  });
});

describe('Mobile Layout Component', () => {
  const mockChildren = <div data-testid="child-content">Test Content</div>;
  const mockLayoutProps = {
    activeView: 'home' as const,
    onViewChange: jest.fn(),
  };

  beforeEach(() => {
    mockWindowResize(375, 667);
    mockTouchDevice(true);
  });

  test('should render mobile layout correctly', () => {
    render(<MobileLayout {...mockLayoutProps}>{mockChildren}</MobileLayout>);
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass('mobile-layout');
  });

  test('should apply safe area padding', () => {
    render(<MobileLayout {...mockLayoutProps}>{mockChildren}</MobileLayout>);
    
    const layout = screen.getByRole('main');
    expect(layout).toHaveStyle({
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    });
  });

  test('should handle virtual keyboard', () => {
    // Mock visual viewport API
    Object.defineProperty(window, 'visualViewport', {
      value: {
        height: 667,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      writable: true,
    });

    render(<MobileLayout {...mockLayoutProps}>{mockChildren}</MobileLayout>);
    
    // Simulate keyboard opening
    act(() => {
      Object.defineProperty(window.visualViewport, 'height', { value: 400 });
      window.visualViewport.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByRole('main')).toHaveClass('keyboard-open');
  });
});

describe('Enhanced Mobile Oracle Interface', () => {
  const mockOracleProps = {
    activeView: 'oracle' as const,
    onViewChange: jest.fn(),
  };

  beforeEach(() => {
    mockWindowResize(375, 667);
    mockTouchDevice(true);
  });

  test('should render Oracle interface correctly', () => {
    render(<EnhancedMobileOracleInterface {...mockOracleProps} />);
    
    expect(screen.getByText('Oracle Predictions')).toBeInTheDocument();
    expect(screen.getByText('Submit Your Prediction')).toBeInTheDocument();
  });

  test('should display prediction cards', () => {
    render(<EnhancedMobileOracleInterface {...mockOracleProps} />);
    
    // Mock predictions would be loaded through context/props
    // This test verifies the UI structure exists
    expect(screen.getByText('Recent Predictions')).toBeInTheDocument();
  });

  test('should open submission modal', () => {
    render(<EnhancedMobileOracleInterface {...mockOracleProps} />);
    
    const submitButton = screen.getByText('Submit Your Prediction');
    fireEvent.click(submitButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('New Prediction')).toBeInTheDocument();
  });

  test('should handle touch interactions', () => {
    render(<EnhancedMobileOracleInterface {...mockOracleProps} />);
    
    const submitButton = screen.getByText('Submit Your Prediction');
    
    // Test touch events
    fireEvent.touchStart(submitButton);
    fireEvent.touchEnd(submitButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('should adapt to different screen sizes', () => {
    // Test small screen
    mockWindowResize(320, 568);
    render(<EnhancedMobileOracleInterface {...mockOracleProps} />);
    
    expect(screen.getByText('Oracle Predictions')).toBeInTheDocument();
    
    // Test tablet screen
    act(() => mockWindowResize(768, 1024));
    
    expect(screen.getByText('Oracle Predictions')).toBeInTheDocument();
  });
});

describe('Virtual Keyboard Hook', () => {
  test('should detect virtual keyboard opening', () => {
    let keyboardResult: any;
    
    const TestComponent = () => {
      keyboardResult = useVirtualKeyboard();
      return <div>Test</div>;
    };

    // Mock visual viewport
    Object.defineProperty(window, 'visualViewport', {
      value: {
        height: 667,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      writable: true,
    });

    render(<TestComponent />);
    
    expect(keyboardResult.isKeyboardOpen).toBe(false);
    expect(keyboardResult.keyboardHeight).toBe(0);

    // Simulate keyboard opening
    act(() => {
      Object.defineProperty(window.visualViewport, 'height', { value: 400 });
      window.visualViewport.dispatchEvent(new Event('resize'));
    });

    expect(keyboardResult.isKeyboardOpen).toBe(true);
    expect(keyboardResult.keyboardHeight).toBeGreaterThan(0);
  });
});

describe('Network Status Hook', () => {
  test('should detect online/offline status', () => {
    let networkResult: any;
    
    const TestComponent = () => {
      networkResult = useNetworkStatus();
      return <div>Test</div>;
    };

    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    render(<TestComponent />);
    expect(networkResult.isOnline).toBe(true);

    // Simulate going offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });

    expect(networkResult.isOnline).toBe(false);

    // Simulate coming back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(networkResult.isOnline).toBe(true);
  });
});

// Performance tests for mobile components
describe('Mobile Performance Tests', () => {
  const mockProps = {
    activeView: 'home' as const,
    onViewChange: jest.fn(),
  };

  test('should render mobile components within performance budget', async () => {
    const startTime = performance.now();
    
    render(
      <MobileLayout {...mockProps}>
        <MobileNavigation {...mockProps} />
        <EnhancedMobileOracleInterface {...mockProps} />
        <PWAInstallPrompt />
      </MobileLayout>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 16ms (60fps budget)
    expect(renderTime).toBeLessThan(16);
  });

  test('should handle rapid orientation changes', () => {
    const { rerender } = render(<MobileLayout {...mockProps}><div>Test</div></MobileLayout>);
    
    // Simulate rapid orientation changes
    for (let i = 0; i < 10; i++) {
      act(() => {
        mockWindowResize(i % 2 === 0 ? 375 : 667, i % 2 === 0 ? 667 : 375);
      });
      rerender(<MobileLayout {...mockProps}><div>Test</div></MobileLayout>);
    }
    
    // Should not crash or throw errors
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});

// Accessibility tests for mobile components
describe('Mobile Accessibility Tests', () => {
  const mockProps = {
    activeView: 'home' as const,
    onViewChange: jest.fn(),
  };

  test('should have proper ARIA labels for mobile navigation', () => {
    render(<MobileNavigation {...mockProps} />);
    
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
    expect(screen.getByText('Home')).toHaveAttribute('role', 'tab');
    expect(screen.getByText('Oracle')).toHaveAttribute('role', 'tab');
  });

  test('should support keyboard navigation', () => {
    render(<MobileNavigation {...mockProps} />);
    
    const homeTab = screen.getByText('Home');
    const oracleTab = screen.getByText('Oracle');
    
    // Should be focusable
    expect(homeTab).toHaveAttribute('tabIndex', '0');
    expect(oracleTab).toHaveAttribute('tabIndex', '-1');
    
    // Test keyboard navigation
    fireEvent.keyDown(homeTab, { key: 'ArrowRight' });
    expect(oracleTab).toHaveFocus();
  });

  test('should meet minimum touch target size', () => {
    render(<MobileNavigation {...mockProps} />);
    
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      const styles = getComputedStyle(tab);
      const minSize = parseInt(styles.minHeight) || parseInt(styles.height);
      expect(minSize).toBeGreaterThanOrEqual(44); // 44px minimum touch target
    });
  });
});
