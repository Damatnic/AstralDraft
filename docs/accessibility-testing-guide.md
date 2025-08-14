# 🔍 Accessibility Testing Guidelines for Developers

## Table of Contents

1. [Overview](#overview)
2. [WCAG 2.1 Compliance Requirements](#wcag-21-compliance-requirements)
3. [Testing Procedures](#testing-procedures)
4. [Component Guidelines](#component-guidelines)
5. [Common Patterns & Examples](#common-patterns--examples)
6. [Testing Tools & Setup](#testing-tools--setup)
7. [Code Review Checklist](#code-review-checklist)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Overview

This guide provides comprehensive accessibility testing procedures and guidelines for developers working on the Astral Draft project. Our goal is to maintain **WCAG 2.1 AA compliance** and ensure our application is usable by everyone, including users with disabilities.

### 🎯 Accessibility Goals

- **WCAG 2.1 AA Compliance**: Meet all Level A and AA success criteria
- **Mobile-First Accessibility**: Optimized for mobile devices and touch interfaces
- **Screen Reader Compatibility**: Full support for assistive technologies
- **Keyboard Navigation**: Complete functionality without mouse/touch
- **High Contrast Support**: Readable in high contrast mode
- **Reduced Motion Support**: Respect user motion preferences

## WCAG 2.1 Compliance Requirements

### 📋 Success Criteria Checklist

#### Level A Requirements

| Criterion | Description | Implementation |
|-----------|-------------|----------------|
| **1.1.1** | Non-text Content | All images have alt text, decorative images marked with `alt=""` |
| **1.3.1** | Info and Relationships | Semantic HTML, proper heading hierarchy |
| **1.3.2** | Meaningful Sequence | Logical reading order maintained |
| **1.4.1** | Use of Color | Information not conveyed by color alone |
| **2.1.1** | Keyboard | All functionality available via keyboard |
| **2.1.2** | No Keyboard Trap | Users can navigate away from any element |
| **2.2.1** | Timing Adjustable | Users can extend time limits |
| **2.4.1** | Bypass Blocks | Skip links for main content |
| **2.4.2** | Page Titled | Unique, descriptive page titles |
| **3.1.1** | Language of Page | HTML lang attribute set |
| **4.1.1** | Parsing | Valid HTML structure |
| **4.1.2** | Name, Role, Value | Proper ARIA implementation |

#### Level AA Requirements

| Criterion | Description | Implementation |
|-----------|-------------|----------------|
| **1.4.3** | Contrast (Minimum) | 4.5:1 contrast ratio for normal text, 3:1 for large text |
| **1.4.4** | Resize Text | Text can be resized up to 200% without loss of functionality |
| **1.4.5** | Images of Text | Use actual text instead of images of text |
| **2.4.5** | Multiple Ways | Multiple ways to locate content |
| **2.4.6** | Headings and Labels | Descriptive headings and labels |
| **2.4.7** | Focus Visible | Keyboard focus indicators visible |
| **3.1.2** | Language of Parts | Language changes identified |
| **3.2.3** | Consistent Navigation | Navigation order consistent across pages |
| **3.2.4** | Consistent Identification | Components with same functionality identified consistently |

### 🎨 Color and Contrast

```javascript
// ✅ Good: Sufficient contrast
const theme = {
  primary: '#0066cc',     // Contrast ratio: 7.04:1 on white
  text: '#333333',        // Contrast ratio: 12.63:1 on white
  error: '#d32f2f',       // Contrast ratio: 5.04:1 on white
};

// ❌ Bad: Insufficient contrast
const badTheme = {
  primary: '#cccccc',     // Contrast ratio: 1.61:1 on white (too low)
  text: '#999999',        // Contrast ratio: 2.85:1 on white (too low)
};
```

### 📱 Touch Target Requirements

```css
/* ✅ Good: Minimum 44px touch targets */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* ✅ Good: Adequate spacing between touch targets */
.button-group .button {
  margin: 4px;
}

/* ❌ Bad: Too small for touch */
.small-button {
  height: 24px;
  width: 24px;
}
```

## Testing Procedures

### 🧪 Automated Testing

#### Running Accessibility Tests

```bash
# Run all accessibility tests
npm run test:accessibility

# Run in watch mode during development
npm run test:accessibility:watch

# Run CI tests with reports
npm run accessibility:ci
```

#### Writing Accessibility Tests

```javascript
// Example accessibility test
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('ComponentName Accessibility', () => {
  test('should not have accessibility violations', async () => {
    const { container } = render(<ComponentName />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should have proper ARIA attributes', () => {
    const { getByRole } = render(<ComponentName />);
    const button = getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Expected label');
  });

  test('should support keyboard navigation', () => {
    const { getByRole } = render(<ComponentName />);
    const button = getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
  });
});
```

### 🔍 Manual Testing

#### Keyboard Testing Checklist

- [ ] **Tab Navigation**: All interactive elements reachable via Tab
- [ ] **Shift+Tab**: Reverse navigation works correctly
- [ ] **Enter/Space**: Activates buttons and links
- [ ] **Arrow Keys**: Navigate within components (menus, lists)
- [ ] **Escape**: Closes modals, menus, and dropdowns
- [ ] **Focus Indicators**: Visible focus outlines on all elements

#### Screen Reader Testing

```javascript
// Test with screen reader announcements
const { getByRole } = render(<Component />);
const button = getByRole('button');

// Check for proper accessible name
expect(button).toHaveAccessibleName('Submit form');

// Check for description
expect(button).toHaveAccessibleDescription('This will submit the form data');

// Test ARIA live regions
const status = getByRole('status');
expect(status).toHaveAttribute('aria-live', 'polite');
```

#### Mobile Testing Checklist

- [ ] **Touch Targets**: Minimum 44px size
- [ ] **Spacing**: Adequate space between touch targets
- [ ] **Orientation**: Works in both portrait and landscape
- [ ] **Zoom**: Functions properly at 200% zoom
- [ ] **Voice Control**: Works with voice navigation

## Component Guidelines

### 🧩 Common Component Patterns

#### Button Components

```jsx
// ✅ Accessible Button
const AccessibleButton = ({ 
  children, 
  onClick, 
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  ...props 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    className="btn"
    {...props}
  >
    {children}
  </button>
);

// Usage
<AccessibleButton 
  onClick={handleSubmit}
  ariaLabel="Submit form"
  ariaDescribedBy="form-help-text"
>
  Submit
</AccessibleButton>
```

#### Form Components

```jsx
// ✅ Accessible Form Field
const FormField = ({ 
  label, 
  id, 
  required = false, 
  error, 
  helpText,
  children 
}) => (
  <div className="form-field">
    <label htmlFor={id} className="form-label">
      {label}
      {required && <span aria-label="required">*</span>}
    </label>
    
    {children}
    
    {helpText && (
      <div id={`${id}-help`} className="form-help">
        {helpText}
      </div>
    )}
    
    {error && (
      <div id={`${id}-error`} className="form-error" role="alert">
        {error}
      </div>
    )}
  </div>
);

// Usage
<FormField 
  label="Email Address" 
  id="email" 
  required 
  error={emailError}
  helpText="We'll never share your email"
>
  <input
    id="email"
    type="email"
    aria-describedby="email-help email-error"
    aria-invalid={!!emailError}
    required
  />
</FormField>
```

#### Modal Components

```jsx
// ✅ Accessible Modal
const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef();

  useEffect(() => {
    if (isOpen) {
      // Focus management
      modalRef.current?.focus();
      
      // Trap focus within modal
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      const handleTabKey = (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
        
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex="-1"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="modal-close"
          >
            ×
          </button>
        </header>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};
```

#### Navigation Components

```jsx
// ✅ Accessible Navigation
const Navigation = ({ items, currentPath }) => (
  <nav role="navigation" aria-label="Main navigation">
    <ul className="nav-list">
      {items.map((item) => (
        <li key={item.path} className="nav-item">
          <a
            href={item.path}
            className={`nav-link ${currentPath === item.path ? 'active' : ''}`}
            aria-current={currentPath === item.path ? 'page' : undefined}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);
```

### 📱 Mobile-Specific Components

#### Mobile Bottom Navigation

```jsx
// ✅ Accessible Mobile Navigation
const MobileBottomNavigation = ({ items, activeIndex, onChange }) => (
  <nav 
    className="mobile-bottom-nav" 
    role="navigation" 
    aria-label="Bottom navigation"
  >
    {items.map((item, index) => (
      <button
        key={item.id}
        className={`nav-button ${index === activeIndex ? 'active' : ''}`}
        onClick={() => onChange(index)}
        aria-pressed={index === activeIndex}
        aria-label={`${item.label}${index === activeIndex ? ' (current)' : ''}`}
        style={{ minHeight: '44px', minWidth: '44px' }}
      >
        <span className="nav-icon" aria-hidden="true">{item.icon}</span>
        <span className="nav-label">{item.label}</span>
      </button>
    ))}
  </nav>
);
```

#### Pull-to-Refresh

```jsx
// ✅ Accessible Pull-to-Refresh
const PullToRefresh = ({ onRefresh, children }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
    
    // Announce completion to screen readers
    announceToScreenReader('Content refreshed', 'polite');
  };

  return (
    <div className="pull-refresh-container">
      {/* Keyboard alternative for refresh */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="refresh-button sr-only"
        aria-label={refreshing ? 'Refreshing content' : 'Refresh content'}
      >
        Refresh
      </button>
      
      {/* Pull-to-refresh indicator */}
      <div 
        className="refresh-indicator"
        role="status"
        aria-live="polite"
        aria-label={refreshing ? 'Refreshing' : ''}
      >
        {refreshing && 'Refreshing...'}
      </div>
      
      {children}
    </div>
  );
};
```

## Common Patterns & Examples

### 🎛️ ARIA Patterns

#### Live Regions

```jsx
// Status updates
<div aria-live="polite" id="status">
  {statusMessage}
</div>

// Important alerts
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>

// Loading states
<div aria-live="polite" aria-busy={loading}>
  {loading ? 'Loading...' : content}
</div>
```

#### Expandable Content

```jsx
const ExpandableSection = ({ title, children }) => {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <div className="expandable-section">
      <button
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded(!expanded)}
        className="expand-button"
      >
        {title}
        <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      
      <div
        id={contentId}
        className="expandable-content"
        aria-hidden={!expanded}
      >
        {expanded && children}
      </div>
    </div>
  );
};
```

#### Skip Links

```jsx
// Skip to main content
const SkipLink = () => (
  <a
    href="#main-content"
    className="skip-link"
    onFocus={(e) => e.target.classList.add('focused')}
    onBlur={(e) => e.target.classList.remove('focused')}
  >
    Skip to main content
  </a>
);

// CSS for skip link
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 1000;
  border-radius: 4px;
}

.skip-link.focused {
  top: 6px;
}
```

### 🎨 CSS Accessibility Patterns

#### Focus Indicators

```css
/* ✅ Good: Visible focus indicators */
.button:focus,
.link:focus,
.input:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .button:focus {
    outline: 3px solid;
  }
}

/* Custom focus styles */
.custom-focus:focus {
  box-shadow: 
    0 0 0 2px #fff,
    0 0 0 4px #0066cc;
  outline: none;
}
```

#### Reduced Motion

```css
/* ✅ Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition: none;
  }
  
  .parallax {
    transform: none !important;
  }
}

/* Safe animations for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
    opacity: 1;
  }
}
```

#### High Contrast Mode

```css
/* ✅ High contrast mode support */
@media (prefers-contrast: high) {
  .card {
    border: 2px solid;
  }
  
  .button {
    border: 2px solid;
    background: ButtonFace;
    color: ButtonText;
  }
  
  .icon {
    filter: none;
  }
}
```

## Testing Tools & Setup

### 🛠️ Development Tools

#### Browser Extensions

- **axe DevTools**: Real-time accessibility testing
- **WAVE**: Web accessibility evaluation
- **Lighthouse**: Accessibility audits
- **Accessibility Insights**: Microsoft's accessibility testing tool

#### Screen Readers

- **NVDA** (Windows): Free screen reader
- **JAWS** (Windows): Professional screen reader
- **VoiceOver** (Mac/iOS): Built-in screen reader
- **TalkBack** (Android): Built-in screen reader

#### Keyboard Testing

```javascript
// Simulate keyboard events in tests
import { fireEvent } from '@testing-library/react';

test('should handle keyboard navigation', () => {
  const { getByRole } = render(<Component />);
  const button = getByRole('button');
  
  // Test Tab key
  fireEvent.keyDown(button, { key: 'Tab', code: 'Tab' });
  
  // Test Enter key
  fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
  
  // Test Escape key
  fireEvent.keyDown(button, { key: 'Escape', code: 'Escape' });
});
```

### 🧪 Test Utilities

#### Custom Test Helpers

```javascript
// utils/accessibility-test-helpers.js

export const expectNoAccessibilityViolations = async (container) => {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

export const expectProperFocus = (element) => {
  expect(element).toHaveFocus();
  expect(element).toBeVisible();
};

export const expectProperARIA = (element, attributes) => {
  Object.entries(attributes).forEach(([attr, value]) => {
    expect(element).toHaveAttribute(attr, value);
  });
};

export const simulateScreenReader = (element) => {
  // Simulate screen reader interaction
  const accessibleName = element.getAttribute('aria-label') || 
                         element.textContent ||
                         element.getAttribute('alt');
  return accessibleName;
};
```

## Code Review Checklist

### ✅ Accessibility Code Review Items

#### Semantic HTML
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Semantic elements used (nav, main, section, article)
- [ ] Lists use ul/ol with li elements
- [ ] Forms use proper fieldset/legend grouping

#### ARIA Implementation
- [ ] ARIA attributes used correctly
- [ ] aria-label/aria-labelledby for unclear elements
- [ ] aria-describedby for additional context
- [ ] role attributes only when necessary
- [ ] aria-live regions for dynamic content

#### Keyboard Navigation
- [ ] All interactive elements focusable
- [ ] Logical tab order maintained
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Escape key closes overlays

#### Visual Design
- [ ] Color contrast meets AA standards (4.5:1)
- [ ] Information not conveyed by color alone
- [ ] Touch targets minimum 44px
- [ ] Text scalable to 200%
- [ ] Focus indicators visible

#### Mobile Accessibility
- [ ] Touch targets properly sized and spaced
- [ ] Orientation changes supported
- [ ] Voice control compatible
- [ ] Gesture alternatives provided

### 🔍 Review Process

```markdown
## Accessibility Review Template

### Component: [Component Name]

#### Manual Testing
- [ ] Keyboard navigation tested
- [ ] Screen reader compatibility verified
- [ ] Color contrast checked
- [ ] Mobile accessibility validated

#### Automated Testing
- [ ] axe violations: 0
- [ ] Accessibility tests passing
- [ ] No console warnings/errors

#### Code Quality
- [ ] Semantic HTML used
- [ ] ARIA attributes correct
- [ ] Focus management implemented
- [ ] Error handling accessible

#### Comments
[Any specific accessibility notes or concerns]
```

## Troubleshooting

### 🐛 Common Issues & Solutions

#### Focus Management

```javascript
// ❌ Problem: Focus lost after modal closes
const badModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && <Modal onClose={() => setIsOpen(false)} />}
    </div>
  );
};

// ✅ Solution: Restore focus to trigger element
const goodModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef();
  
  const handleClose = () => {
    setIsOpen(false);
    // Restore focus to trigger
    setTimeout(() => triggerRef.current?.focus(), 0);
  };
  
  return (
    <div>
      <button ref={triggerRef} onClick={() => setIsOpen(true)}>
        Open
      </button>
      {isOpen && <Modal onClose={handleClose} />}
    </div>
  );
};
```

#### Screen Reader Announcements

```javascript
// ❌ Problem: Changes not announced
const badStatusUpdate = () => {
  const [status, setStatus] = useState('');
  
  return <div>{status}</div>; // Not announced
};

// ✅ Solution: Use live regions
const goodStatusUpdate = () => {
  const [status, setStatus] = useState('');
  
  return (
    <div aria-live="polite" role="status">
      {status}
    </div>
  );
};
```

#### Color Contrast Issues

```javascript
// ❌ Problem: Insufficient contrast
const badButton = () => (
  <button style={{ color: '#ccc', backgroundColor: '#fff' }}>
    Submit {/* Contrast ratio: 1.6:1 - Too low! */}
  </button>
);

// ✅ Solution: Sufficient contrast
const goodButton = () => (
  <button style={{ color: '#333', backgroundColor: '#fff' }}>
    Submit {/* Contrast ratio: 12.6:1 - Perfect! */}
  </button>
);
```

### 🔧 Debugging Tools

#### axe DevTools Console Commands

```javascript
// Run axe on current page
axe.run(document, (err, results) => {
  console.log(results.violations);
});

// Run axe on specific element
axe.run(document.querySelector('.component'), (err, results) => {
  console.log(results.violations);
});

// Custom axe configuration
axe.run({
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true }
  }
});
```

#### Screen Reader Testing Commands

```bash
# Start NVDA (Windows)
nvda

# VoiceOver quick nav (Mac)
# VO + arrows to navigate
# VO + Space to activate
# VO + Shift + Down to interact with element

# Test with voice control
# "Click submit button"
# "Show numbers" (to see clickable elements)
```

## Best Practices

### 🌟 Development Best Practices

#### 1. Start with Semantic HTML

```jsx
// ✅ Good: Semantic foundation
const Article = () => (
  <article>
    <header>
      <h1>Article Title</h1>
      <time dateTime="2023-01-01">January 1, 2023</time>
    </header>
    <main>
      <p>Article content...</p>
    </main>
    <footer>
      <nav aria-label="Article navigation">
        <a href="/prev">Previous</a>
        <a href="/next">Next</a>
      </nav>
    </footer>
  </article>
);
```

#### 2. Progressive Enhancement

```jsx
// ✅ Good: Works without JavaScript
const ProgressiveComponent = () => {
  const [enhanced, setEnhanced] = useState(false);
  
  useEffect(() => {
    setEnhanced(true); // Enable enhanced features
  }, []);
  
  return (
    <div>
      {/* Basic functionality works without JS */}
      <form action="/submit" method="post">
        <input type="text" name="query" required />
        <button type="submit">Search</button>
      </form>
      
      {/* Enhanced features with JS */}
      {enhanced && (
        <div>
          <AutoComplete />
          <LiveResults />
        </div>
      )}
    </div>
  );
};
```

#### 3. Test Early and Often

```javascript
// Add accessibility tests to your development workflow
describe('Component Development', () => {
  test('should be accessible from the start', async () => {
    const { container } = render(<MyComponent />);
    
    // Test accessibility immediately
    await expectNoAccessibilityViolations(container);
    
    // Test keyboard navigation
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
    
    // Test screen reader compatibility
    expect(button).toHaveAccessibleName();
  });
});
```

#### 4. Use Accessibility-First Design

```jsx
// ✅ Good: Accessibility built into design tokens
const theme = {
  colors: {
    // All colors meet WCAG AA standards
    primary: '#0066cc',      // 7.04:1 contrast
    secondary: '#6c757d',    // 4.54:1 contrast
    success: '#28a745',      // 4.04:1 contrast
    danger: '#dc3545',       // 5.04:1 contrast
  },
  spacing: {
    touchTarget: '44px',     // Minimum touch target size
    tapSpacing: '8px',       // Minimum space between targets
  },
  typography: {
    // Scalable font sizes
    baseSize: '16px',
    scale: 1.2,
  }
};
```

### 📚 Learning Resources

#### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

#### Testing Tools
- [axe-core](https://github.com/dequelabs/axe-core)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [Testing Library](https://testing-library.com/docs/guide-which-query)

#### Design Resources
- [Accessible Colors](https://accessible-colors.com/)
- [Color Oracle](https://colororacle.org/) (Color blindness simulator)
- [Who Can Use](https://whocanuse.com/) (Color contrast checker)

---

**Last Updated:** August 11, 2025  
**Version:** 1.0.0  
**Next Review:** November 11, 2025
