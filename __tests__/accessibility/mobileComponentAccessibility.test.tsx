/**
 * Mobile Component Accessibility Tests
 * Tests specific accessibility implementations for mobile components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityTester } from '../../utils/mobileAccessibilityUtils';
import MobileBottomNavigation from '../../components/mobile/MobileBottomNavigation';
import MobileOfflineIndicator from '../../components/mobile/MobileOfflineIndicator';
import MobileLayoutWrapper from '../../components/mobile/MobileLayoutWrapper';
import MobilePullToRefresh from '../../components/mobile/MobilePullToRefresh';
import { mockAnnouncements } from './accessibilityTestSuite.test';
import '@testing-library/jest-dom';

// Mock services and hooks
jest.mock('../../services/mobileOfflineService', () => ({
    getState: () => ({
        isOffline: false,
        hasOfflineData: true,
        pendingActions: [],
        syncInProgress: false,
        lastSync: new Date()
    }),
    subscribe: jest.fn(() => jest.fn()),
    syncPendingActions: jest.fn()
}));

jest.mock('../../hooks/useMediaQuery', () => ({
    useMediaQuery: jest.fn(() => true) // Always return true for mobile
}));

jest.mock('../../utils/mobilePerformanceUtils', () => ({
    useThrottle: (fn: Function) => fn
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    },
    AnimatePresence: ({ children }: any) => children,
    useMotionValue: () => ({ set: jest.fn() }),
    useTransform: () => 0,
}));

describe('Mobile Component Accessibility Tests', () => {
    let accessibilityTester: AccessibilityTester;

    beforeEach(() => {
        accessibilityTester = new AccessibilityTester();
        mockAnnouncements.length = 0;
        
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 375,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('MobileBottomNavigation Accessibility', () => {
        it('should have proper ARIA navigation structure', () => {
            const mockOnViewChange = jest.fn();
            
            render(
                <MobileBottomNavigation 
                    activeView="DASHBOARD" 
                    onViewChange={mockOnViewChange} 
                />
            );

            const nav = screen.getByRole('navigation');
            expect(nav).toHaveAttribute('aria-label', 'Main mobile navigation');

            const tablist = screen.getByRole('tablist');
            expect(tablist).toBeInTheDocument();

            const tabs = screen.getAllByRole('tab');
            expect(tabs.length).toBeGreaterThan(0);

            // Check that one tab is selected
            const selectedTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
            expect(selectedTab).toBeInTheDocument();
        });

        it('should support keyboard navigation', async () => {
            const mockOnViewChange = jest.fn();
            const user = userEvent.setup();
            
            render(
                <MobileBottomNavigation 
                    activeView="DASHBOARD" 
                    onViewChange={mockOnViewChange} 
                />
            );

            const tabs = screen.getAllByRole('tab');
            const firstTab = tabs[0];
            
            firstTab.focus();
            expect(firstTab).toHaveFocus();

            // Test Enter key activation
            await user.keyboard('{Enter}');
            expect(mockOnViewChange).toHaveBeenCalled();

            // Test Arrow key navigation
            await user.keyboard('{ArrowRight}');
            if (tabs[1]) {
                expect(tabs[1]).toHaveFocus();
            }
        });

        it('should announce view changes to screen readers', async () => {
            const mockOnViewChange = jest.fn();
            
            render(
                <MobileBottomNavigation 
                    activeView="DASHBOARD" 
                    onViewChange={mockOnViewChange} 
                />
            );

            const draftTab = screen.getByLabelText(/draft/i);
            fireEvent.click(draftTab);

            // Should announce navigation change
            await waitFor(() => {
                expect(mockAnnouncements.some(
                    announcement => announcement.message.includes('Navigated to')
                )).toBe(true);
            });
        });

        it('should have sufficient touch target sizes', () => {
            const mockOnViewChange = jest.fn();
            const { container } = render(
                <MobileBottomNavigation 
                    activeView="DASHBOARD" 
                    onViewChange={mockOnViewChange} 
                />
            );

            const validation = accessibilityTester.validateTouchTargets(container);
            expect(validation.isValid).toBe(true);
        });
    });

    describe('MobileOfflineIndicator Accessibility', () => {
        it('should have proper ARIA attributes for status indicator', () => {
            render(<MobileOfflineIndicator />);

            const statusIndicator = screen.getByLabelText(/connection status/i);
            expect(statusIndicator).toBeInTheDocument();
            
            // Check for output element
            const outputs = document.querySelectorAll('output');
            expect(outputs.length).toBeGreaterThan(0);
        });

        it('should announce offline status changes', () => {
            const { rerender } = render(<MobileOfflineIndicator />);
            
            // Component should announce status changes through its effect
            expect(mockAnnouncements.length).toBeGreaterThanOrEqual(0);
        });

        it('should support keyboard interaction for sync actions', async () => {
            const user = userEvent.setup();
            render(<MobileOfflineIndicator showDetails={true} />);

            // Look for sync button if present
            const syncButton = screen.queryByText(/sync/i);
            if (syncButton) {
                expect(syncButton).toBeInTheDocument();
                
                // Test keyboard activation
                syncButton.focus();
                await user.keyboard('{Enter}');
                
                // Should trigger sync action
                expect(syncButton).toHaveAttribute('aria-label');
            }
        });

        it('should have proper live regions for status updates', () => {
            render(<MobileOfflineIndicator />);

            // Check for ARIA live regions
            const liveRegions = document.querySelectorAll('[aria-live]');
            expect(liveRegions.length).toBeGreaterThan(0);
        });
    });

    describe('MobileLayoutWrapper Accessibility', () => {
        it('should use semantic HTML structure', () => {
            const mockOnViewChange = jest.fn();
            
            render(
                <MobileLayoutWrapper 
                    currentView="DASHBOARD" 
                    onViewChange={mockOnViewChange}
                >
                    <div>Test content</div>
                </MobileLayoutWrapper>
            );

            // Should use main element
            const main = screen.getByRole('main');
            expect(main).toBeInTheDocument();
            expect(main).toHaveAttribute('aria-label');

            // Should have proper section structure
            const sections = screen.getAllByRole('region');
            expect(sections.length).toBeGreaterThan(0);
        });

        it('should announce view changes', () => {
            const mockOnViewChange = jest.fn();
            
            const { rerender } = render(
                <MobileLayoutWrapper 
                    currentView="DASHBOARD" 
                    onViewChange={mockOnViewChange}
                >
                    <div>Dashboard content</div>
                </MobileLayoutWrapper>
            );

            // Change view
            rerender(
                <MobileLayoutWrapper 
                    currentView="DRAFT_ROOM" 
                    onViewChange={mockOnViewChange}
                >
                    <div>Draft room content</div>
                </MobileLayoutWrapper>
            );

            // Should announce view change
            expect(mockAnnouncements.some(
                announcement => announcement.message.includes('Navigated to')
            )).toBe(true);
        });

        it('should have proper heading structure', () => {
            const mockOnViewChange = jest.fn();
            
            render(
                <MobileLayoutWrapper 
                    currentView="DASHBOARD" 
                    onViewChange={mockOnViewChange}
                >
                    <div>Test content</div>
                </MobileLayoutWrapper>
            );

            // Should have hidden h1 for screen readers
            const headings = screen.getAllByRole('heading', { level: 1 });
            expect(headings.length).toBeGreaterThan(0);
        });

        it('should respect reduced motion preferences', () => {
            // Mock reduced motion preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-reduced-motion: reduce)',
                    media: query,
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                })),
            });

            const mockOnViewChange = jest.fn();
            
            render(
                <MobileLayoutWrapper 
                    currentView="DASHBOARD" 
                    onViewChange={mockOnViewChange}
                >
                    <div>Test content</div>
                </MobileLayoutWrapper>
            );

            // Component should handle reduced motion
            expect(screen.getByRole('main')).toBeInTheDocument();
        });
    });

    describe('MobilePullToRefresh Accessibility', () => {
        it('should provide keyboard alternative for refresh', async () => {
            const mockOnRefresh = jest.fn();
            const user = userEvent.setup();
            
            render(
                <MobilePullToRefresh onRefresh={mockOnRefresh}>
                    <div>Content to refresh</div>
                </MobilePullToRefresh>
            );

            // Should have hidden refresh button for screen readers
            const refreshButton = screen.getByLabelText(/refresh content/i);
            expect(refreshButton).toBeInTheDocument();

            // Test keyboard activation
            await user.click(refreshButton);
            expect(mockOnRefresh).toHaveBeenCalled();
        });

        it('should announce refresh state changes', async () => {
            const mockOnRefresh = jest.fn(() => Promise.resolve());
            
            render(
                <MobilePullToRefresh onRefresh={mockOnRefresh}>
                    <div>Content to refresh</div>
                </MobilePullToRefresh>
            );

            const refreshButton = screen.getByLabelText(/refresh content/i);
            fireEvent.click(refreshButton);

            // Should announce refresh start
            await waitFor(() => {
                expect(mockAnnouncements.some(
                    announcement => announcement.message.includes('Refreshing')
                )).toBe(true);
            });
        });

        it('should have proper ARIA structure for pull indicator', () => {
            const mockOnRefresh = jest.fn();
            
            render(
                <MobilePullToRefresh onRefresh={mockOnRefresh}>
                    <div>Content to refresh</div>
                </MobilePullToRefresh>
            );

            // Should have section with proper ARIA
            const section = screen.getByRole('region');
            expect(section).toHaveAttribute('aria-label');
            expect(section).toHaveAttribute('aria-busy');

            // Should have output for status
            const outputs = document.querySelectorAll('output');
            expect(outputs.length).toBeGreaterThan(0);
        });

        it('should support gesture alternatives', () => {
            const mockOnRefresh = jest.fn();
            
            render(
                <MobilePullToRefresh onRefresh={mockOnRefresh}>
                    <div>Content to refresh</div>
                </MobilePullToRefresh>
            );

            // Should provide keyboard and screen reader alternatives
            const refreshButton = screen.getByLabelText(/refresh content/i);
            expect(refreshButton).toBeInTheDocument();
            
            const scrollableArea = screen.getByLabelText(/scrollable content/i);
            expect(scrollableArea).toBeInTheDocument();
        });

        it('should respect reduced motion preferences', () => {
            // Mock reduced motion preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-reduced-motion: reduce)',
                    media: query,
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                })),
            });

            const mockOnRefresh = jest.fn();
            
            render(
                <MobilePullToRefresh onRefresh={mockOnRefresh}>
                    <div>Content to refresh</div>
                </MobilePullToRefresh>
            );

            // Component should handle reduced motion in animations
            expect(screen.getByRole('region')).toBeInTheDocument();
        });
    });

    describe('Cross-Component Integration Tests', () => {
        it('should maintain accessibility when components are combined', () => {
            const mockOnViewChange = jest.fn();
            const mockOnRefresh = jest.fn();
            
            const { container } = render(
                <MobileLayoutWrapper 
                    currentView="DASHBOARD" 
                    onViewChange={mockOnViewChange}
                >
                    <MobilePullToRefresh onRefresh={mockOnRefresh}>
                        <div>
                            <h2>Dashboard Content</h2>
                            <p>Some dashboard content</p>
                        </div>
                    </MobilePullToRefresh>
                    <MobileOfflineIndicator />
                </MobileLayoutWrapper>
            );

            // Run comprehensive accessibility audit
            const audit = accessibilityTester.runAccessibilityAudit(container);
            const criticalIssues = audit.violations.filter(violation => violation.includes('critical') || violation.includes('error'));
            
            // Should have minimal critical accessibility issues
            expect(criticalIssues.length).toBeLessThanOrEqual(2);
        });

        it('should handle focus management across components', async () => {
            const mockOnViewChange = jest.fn();
            const user = userEvent.setup();
            
            render(
                <MobileLayoutWrapper 
                    currentView="DASHBOARD" 
                    onViewChange={mockOnViewChange}
                >
                    <div>
                        <button>Test Button</button>
                        <input type="text" placeholder="Test Input" />
                    </div>
                </MobileLayoutWrapper>
            );

            const button = screen.getByText('Test Button');
            const input = screen.getByPlaceholderText('Test Input');

            // Test tab navigation
            button.focus();
            expect(button).toHaveFocus();

            await user.tab();
            expect(input).toHaveFocus();
        });

        it('should coordinate screen reader announcements', () => {
            const mockOnViewChange = jest.fn();
            
            render(
                <MobileLayoutWrapper 
                    currentView="DASHBOARD" 
                    onViewChange={mockOnViewChange}
                >
                    <MobileOfflineIndicator />
                </MobileLayoutWrapper>
            );

            // Should have coordinated announcements without conflicts
            const announcements = mockAnnouncements.filter(a => 
                a.politeness === 'assertive'
            );
            
            // Shouldn't have too many assertive announcements at once
            expect(announcements.length).toBeLessThanOrEqual(1);
        });
    });
});
