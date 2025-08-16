/**
 * Setup for Accessibility Tests
 * Configures the testing environment for accessibility validation
 */

import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

// Mock IntersectionObserver for components that use it
(global as any).IntersectionObserver = class IntersectionObserver {
    root: Element | null = null;
    rootMargin: string = '0px';
    thresholds: ReadonlyArray<number> = [0];

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.root = (options?.root instanceof Element) ? options.root : null;
        this.rootMargin = options?.rootMargin || '0px';
        this.thresholds = options?.threshold ? 
            (Array.isArray(options.threshold) ? options.threshold : [options.threshold]) : [0];
    }
    
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
};

// Mock ResizeObserver for responsive components
global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
};

// Mock matchMedia for media query tests
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock window.visualViewport for mobile testing
Object.defineProperty(window, 'visualViewport', {
    writable: true,
    value: {
        width: 375,
        height: 667,
        offsetLeft: 0,
        offsetTop: 0,
        pageLeft: 0,
        pageTop: 0,
        scale: 1,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }
});

// Mock CSS.supports for progressive enhancement tests
Object.defineProperty(CSS, 'supports', {
    writable: true,
    value: jest.fn().mockImplementation(() => true),
});

// Mock clipboard API for copy/paste accessibility tests
Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    value: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue(''),
    },
});

// Mock speech synthesis for screen reader tests
Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
        speak: jest.fn(),
        cancel: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        getVoices: jest.fn().mockReturnValue([]),
        speaking: false,
        pending: false,
        paused: false,
    },
});

// Setup ARIA live region for announcements
const setupLiveRegion = () => {
    const liveRegion = document.createElement('div');
    liveRegion.id = 'accessibility-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
        position: absolute !important;
        left: -10000px !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
    `;
    document.body.appendChild(liveRegion);
    return liveRegion;
};

// Global test utilities
global.testUtils = {
    // Create a mock announcement for testing
    createMockAnnouncement: (message: string, politeness: 'polite' | 'assertive' = 'polite') => ({
        message,
        politeness,
        timestamp: Date.now()
    }),
    
    // Simulate mobile viewport
    setMobileViewport: (width = 375, height = 667) => {
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
        
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
    },
    
    // Simulate high contrast mode
    enableHighContrastMode: () => {
        window.matchMedia = jest.fn().mockImplementation(query => ({
            matches: query === '(prefers-contrast: high)',
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }));
    },
    
    // Simulate reduced motion preference
    enableReducedMotion: () => {
        window.matchMedia = jest.fn().mockImplementation(query => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }));
    },
    
    // Get all ARIA attributes from an element
    getAriaAttributes: (element: Element) => {
        const attributes: Record<string, string> = {};
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            if (attr.name.startsWith('aria-') || attr.name === 'role') {
                attributes[attr.name] = attr.value;
            }
        }
        return attributes;
    },
    
    // Check if element is focusable
    isFocusable: (element: Element) => {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ];
        
        return focusableSelectors.some(selector => element.matches(selector));
    },
    
    // Validate touch target size
    validateTouchTarget: (element: Element) => {
        const rect = element.getBoundingClientRect();
        const minSize = 44; // WCAG recommended minimum
        
        return {
            width: rect.width,
            height: rect.height,
            isValid: rect.width >= minSize && rect.height >= minSize,
            recommendation: rect.width < minSize || rect.height < minSize 
                ? `Touch target should be at least ${minSize}px x ${minSize}px`
                : 'Touch target size is accessible'
        };
    }
};

// Setup before each test
beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    
    // Setup live region for screen reader announcements
    setupLiveRegion();
    
    // Reset viewport to mobile default
    global.testUtils.setMobileViewport();
    
    // Clear all mocks
    jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
    // Remove any dynamic elements
    const liveRegion = document.getElementById('accessibility-live-region');
    if (liveRegion) {
        liveRegion.remove();
    }
    
    // Reset CSS and DOM modifications
    document.body.className = '';
    document.documentElement.className = '';
});

// Global error handler for accessibility issues
const originalError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        // Filter out known React testing warnings that don't affect accessibility
        const message = args[0];
        if (typeof message === 'string' && (
            message.includes('Warning: ReactDOM.render is no longer supported') ||
            message.includes('Warning: Function components cannot be given refs')
        )) {
            return;
        }
        originalError(...args);
    };
});

afterAll(() => {
    console.error = originalError;
});

// Custom matchers for accessibility testing
expect.extend({
    toBeAccessible(received) {
        const element = received instanceof Element ? received : document.body;
        
        // Basic accessibility checks
        const checks = [
            this.hasProperAriaLabels(element),
            this.hasValidTouchTargets(element),
            this.hasProperHeadingStructure(element),
            this.hasValidColorContrast(element)
        ];
        
        const failedChecks = checks.filter(check => !check.pass);
        
        if (failedChecks.length === 0) {
            return {
                message: () => `Expected element to not be accessible`,
                pass: true,
            };
        } else {
            return {
                message: () => `Expected element to be accessible but found issues:\n${
                    failedChecks.map(check => `- ${check.message}`).join('\n')
                }`,
                pass: false,
            };
        }
    },
    
    hasProperAriaLabels(element) {
        // Check for proper ARIA labeling
        const interactiveElements = element.querySelectorAll('button, input, select, textarea, a[href]');
        const missingLabels = [];
        
        interactiveElements.forEach((el, index) => {
            const hasLabel = el.hasAttribute('aria-label') || 
                           el.hasAttribute('aria-labelledby') || 
                           el.labels?.length > 0 ||
                           el.textContent?.trim();
            
            if (!hasLabel) {
                missingLabels.push(`Element ${index + 1}: ${el.tagName}`);
            }
        });
        
        return {
            pass: missingLabels.length === 0,
            message: () => missingLabels.length > 0 
                ? `Missing labels on: ${missingLabels.join(', ')}`
                : 'All interactive elements have proper labels'
        };
    },
    
    hasValidTouchTargets(element) {
        const interactiveElements = element.querySelectorAll('button, input, select, textarea, a[href]');
        const invalidTargets = [];
        
        interactiveElements.forEach((el, index) => {
            const rect = el.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                invalidTargets.push(`Element ${index + 1}: ${rect.width}x${rect.height}px`);
            }
        });
        
        return {
            pass: invalidTargets.length === 0,
            message: () => invalidTargets.length > 0
                ? `Invalid touch targets: ${invalidTargets.join(', ')}`
                : 'All touch targets meet minimum size requirements'
        };
    },
    
    hasProperHeadingStructure(element) {
        const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
        const levels = headings.map(h => parseInt(h.tagName.charAt(1)));
        
        for (let i = 1; i < levels.length; i++) {
            if (levels[i] > levels[i - 1] + 1) {
                return {
                    pass: false,
                    message: () => `Heading level skipped: h${levels[i - 1]} followed by h${levels[i]}`
                };
            }
        }
        
        return {
            pass: true,
            message: () => 'Heading structure is valid'
        };
    },
    
    hasValidColorContrast(element) {
        // Simplified color contrast check
        // In a real implementation, this would calculate actual contrast ratios
        const elementsWithText = element.querySelectorAll('*');
        let hasIssues = false;
        
        elementsWithText.forEach(el => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const backgroundColor = style.backgroundColor;
            
            // Basic check for very light text on light backgrounds
            if (color === 'rgb(255, 255, 255)' && backgroundColor === 'rgb(255, 255, 255)') {
                hasIssues = true;
            }
        });
        
        return {
            pass: !hasIssues,
            message: () => hasIssues ? 'Potential color contrast issues found' : 'No obvious color contrast issues'
        };
    }
});

// Type declarations for custom matchers
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toBeAccessible(): R;
            hasProperAriaLabels(element: Element): { pass: boolean; message: string };
            hasValidTouchTargets(element: Element): { pass: boolean; message: string };
            hasProperHeadingStructure(element: Element): { pass: boolean; message: string };
            hasValidColorContrast(element: Element): { pass: boolean; message: string };
        }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace NodeJS {
        interface Global {
            testUtils: {
                createMockAnnouncement: (message: string, politeness?: 'polite' | 'assertive') => any;
                setMobileViewport: (width?: number, height?: number) => void;
                enableHighContrastMode: () => void;
                enableReducedMotion: () => void;
                getAriaAttributes: (element: Element) => Record<string, string>;
                isFocusable: (element: Element) => boolean;
                validateTouchTarget: (element: Element) => {
                    width: number;
                    height: number;
                    isValid: boolean;
                    recommendation: string;
                };
            };
        }
    }
}

export {};
