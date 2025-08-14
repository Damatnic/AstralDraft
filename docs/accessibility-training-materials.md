# 📚 Accessibility Training Materials

## Table of Contents

1. [Training Overview](#training-overview)
2. [Session 1: Accessibility Fundamentals](#session-1-accessibility-fundamentals)
3. [Session 2: Testing Tools and Techniques](#session-2-testing-tools-and-techniques)
4. [Session 3: Development Best Practices](#session-3-development-best-practices)
5. [Session 4: Advanced Patterns](#session-4-advanced-patterns)
6. [Hands-On Exercises](#hands-on-exercises)
7. [Assessment and Certification](#assessment-and-certification)
8. [Resources and References](#resources-and-references)

## Training Overview

### Objectives

By the end of this training program, participants will be able to:

- Understand WCAG 2.1 guidelines and their practical application
- Implement accessible components using semantic HTML and ARIA
- Use automated and manual testing tools effectively
- Create inclusive user experiences for users with disabilities
- Integrate accessibility testing into the development workflow

### Training Format

- **Duration:** 4 sessions × 2 hours each
- **Format:** Interactive workshops with hands-on exercises
- **Group Size:** 6-12 developers
- **Prerequisites:** Basic HTML, CSS, and JavaScript knowledge

### Learning Outcomes

- **Knowledge:** Understanding of accessibility principles and standards
- **Skills:** Practical ability to build and test accessible components
- **Application:** Integration of accessibility into daily development workflow

## Session 1: Accessibility Fundamentals

### Session Goals (2 hours)

Establish foundational understanding of web accessibility principles and the business case for inclusive design.

### Part 1: Why Accessibility Matters (30 minutes)

#### Discussion Points

**The Human Impact**

- 15% of the world's population lives with a disability
- Temporary disabilities (broken arm, eye surgery)
- Situational limitations (bright sunlight, noisy environment)
- Age-related changes in vision, hearing, dexterity

**Business Benefits**

- Larger market reach (1+ billion people with disabilities)
- Legal compliance (ADA, Section 508, AODA)
- Improved SEO and code quality
- Better user experience for everyone

#### Interactive Exercise: Empathy Building (15 minutes)

**Experience Simulation**

Participants try to complete tasks with simulated disabilities:

1. **Vision:** Navigate with eyes closed using screen reader
2. **Motor:** Use website with one hand tied behind back
3. **Cognitive:** Complete form while being distracted

**Reflection Questions**

- What was most challenging?
- What helped you succeed?
- How did this change your perspective?

### Part 2: Accessibility Standards and Guidelines (45 minutes)

#### WCAG 2.1 Overview

**Four Principles (POUR)**

1. **Perceivable:** Information presented in ways users can perceive
2. **Operable:** Interface components users can operate
3. **Understandable:** Information and UI operation is understandable
4. **Robust:** Content works with assistive technologies

#### Conformance Levels

**Level A (Minimum)**

Essential accessibility features that must be present

- Images have text alternatives
- Videos have captions
- Content is keyboard accessible
- Page has proper headings

**Level AA (Standard)**

Standard level for legal compliance and best practices

- Color contrast ratio 4.5:1 (normal text)
- Text can be resized to 200%
- Focus indicators are visible
- Error identification and suggestions

**Level AAA (Enhanced)**

Highest level, not required for general conformance

- Color contrast ratio 7:1
- Context-sensitive help available
- Advanced error prevention

#### Practical Exercise: WCAG Evaluation (20 minutes)

Participants evaluate common UI patterns against WCAG criteria:

**Button Component Evaluation**

```html
<!-- Example 1: Basic button -->
<button>Submit</button>

<!-- Example 2: Icon button -->
<button>🔍</button>

<!-- Example 3: Loading button -->
<button disabled>Loading...</button>
```

**Evaluation Questions**

- Does it meet Level A requirements?
- What about Level AA?
- How would you improve it?

### Part 3: Assistive Technologies (30 minutes)

#### Types of Assistive Technologies

**Screen Readers**

- Convert text to speech or braille
- Navigate by headings, landmarks, links
- Announce content changes

**Voice Control Software**

- Navigate and interact using voice commands
- Requires proper labeling and keyboard support

**Switch Devices**

- Alternative to mouse/keyboard
- Requires logical tab order and keyboard support

**Screen Magnification**

- Enlarge portions of screen
- Benefits from good color contrast and layout

#### Demo: Screen Reader Navigation (20 minutes)

**Live Demonstration**

Instructor demonstrates screen reader navigation of:

1. Well-structured page with proper headings
2. Poorly structured page without landmarks
3. Form with proper labeling vs. poor labeling

**Key Learning Points**

- Importance of semantic HTML structure
- How screen readers announce content
- Navigation shortcuts and techniques

### Part 4: Legal and Compliance Context (15 minutes)

#### Legal Requirements

**Americans with Disabilities Act (ADA)**

- Applies to places of public accommodation
- Courts increasingly applying to websites
- No specific technical standards, but WCAG often referenced

**Section 508**

- Federal agencies must make technology accessible
- References WCAG 2.0 Level AA
- Includes procurement requirements

**International Standards**

- EN 301 549 (European Union)
- AODA (Ontario, Canada)
- DDA (Australia)

#### Risk Management

**Litigation Trends**

- Increasing number of accessibility lawsuits
- Target large companies and public-facing sites
- Often settled out of court

**Proactive Approach**

- Regular accessibility audits
- Staff training and awareness
- Clear accessibility policy
- User feedback channels

### Session 1 Wrap-up and Q&A (20 minutes)

#### Key Takeaways

- Accessibility benefits everyone, not just users with disabilities
- WCAG 2.1 Level AA is the practical standard
- Screen readers require semantic HTML structure
- Legal compliance is increasingly important

#### Action Items

- Install screen reader software
- Complete accessibility fundamentals quiz
- Review WCAG 2.1 quick reference guide

## Session 2: Testing Tools and Techniques

### Session Goals (2 hours)

Learn to use automated and manual testing tools to identify and fix accessibility issues.

### Part 1: Automated Testing Tools (45 minutes)

#### Browser Extensions

**axe DevTools Setup and Demo**

```javascript
// Installing axe for automated testing
npm install --save-dev @axe-core/react

// Basic usage in React
import { axe } from '@axe-core/react';

if (process.env.NODE_ENV !== 'production') {
  axe(React, ReactDOM, 1000);
}
```

**Hands-on Exercise: Extension Testing**

Participants install and use axe DevTools to test:

1. Sample page with accessibility issues
2. Fixed version of the same page
3. Component from our codebase

#### Command Line Testing

**Jest + axe-core Integration**

```javascript
// accessibility.test.js
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import MyComponent from './MyComponent';

expect.extend(toHaveNoViolations);

test('MyComponent should be accessible', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Live Coding Session**

Write accessibility tests for common components:

- Button component
- Form component
- Modal component

### Part 2: Manual Testing Techniques (45 minutes)

#### Keyboard Navigation Testing

**Systematic Approach**

1. **Tab Order Test**
   - Start from top of page
   - Tab through all interactive elements
   - Verify logical order
   - Check for focus traps

2. **Keyboard Shortcuts Test**
   - Enter/Space activate buttons
   - Arrow keys navigate lists/menus
   - Escape closes modals/menus

**Practice Exercise: Keyboard Testing**

Participants test navigation components using only keyboard:

```jsx
// Component to test
const Navigation = () => (
  <nav>
    <ul>
      <li><a href="/home">Home</a></li>
      <li>
        <button aria-expanded="false">Products</button>
        <ul>
          <li><a href="/products/a">Product A</a></li>
          <li><a href="/products/b">Product B</a></li>
        </ul>
      </li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </nav>
);
```

#### Screen Reader Testing

**NVDA Basic Commands**

- **NVDA + F7:** Elements list
- **H:** Next heading
- **F:** Next form field
- **B:** Next button
- **R:** Next region/landmark

**Structured Testing Approach**

1. **Page Structure Test**
   - Navigate by headings (H)
   - Check landmark regions (R)
   - Verify page title

2. **Content Test**
   - Listen to full page read
   - Check alt text for images
   - Verify link descriptions

3. **Interactive Elements Test**
   - Navigate forms (F)
   - Test buttons (B)
   - Check ARIA announcements

**Hands-on Exercise: Screen Reader Testing**

Participants use screen reader to test:

1. Well-structured form
2. Data table with headers
3. Modal dialog

### Part 3: Color and Contrast Testing (30 minutes)

#### Understanding Contrast Requirements

**WCAG Guidelines**

- Normal text: 4.5:1 contrast ratio (Level AA)
- Large text: 3:1 contrast ratio (Level AA)
- Non-text elements: 3:1 contrast ratio

**Tools for Testing**

1. **Colour Contrast Analyser**
   - Desktop application
   - Eyedropper tool
   - Pass/fail evaluation

2. **Browser DevTools**
   - Chrome: Contrast ratio in color picker
   - Firefox: Accessibility inspector

**Practice Exercise: Contrast Evaluation**

Test color combinations used in our design system:

```css
/* Test these combinations */
.primary-button {
  background: #0066cc;
  color: #ffffff;
}

.secondary-button {
  background: #f0f0f0;
  color: #666666;
}

.warning-text {
  color: #ff6600;
  background: #ffffff;
}
```

### Part 4: Mobile Accessibility Testing (20 minutes)

#### Mobile-Specific Considerations

**Touch Target Size**

- Minimum 44px × 44px
- Adequate spacing between targets
- Consider thumb reach zones

**Screen Reader on Mobile**

- VoiceOver (iOS) gestures
- TalkBack (Android) gestures
- Different navigation patterns

**Testing Approach**

1. **Physical Device Testing**
   - Enable screen reader
   - Test common tasks
   - Verify gesture support

2. **Responsive Design Testing**
   - Test at different zoom levels
   - Verify touch target sizes
   - Check spacing and layout

### Session 2 Wrap-up and Q&A (20 minutes)

#### Testing Checklist

**Automated Testing**

- [ ] axe DevTools browser extension
- [ ] Jest + axe-core integration
- [ ] CI/CD pipeline integration

**Manual Testing**

- [ ] Keyboard navigation
- [ ] Screen reader testing
- [ ] Color contrast validation
- [ ] Mobile accessibility

#### Homework Assignment

Test accessibility of assigned component using all learned techniques and document findings.

## Session 3: Development Best Practices

### Session Goals (2 hours)

Learn to implement accessible components using semantic HTML, ARIA, and modern development patterns.

### Part 1: Semantic HTML Foundation (30 minutes)

#### HTML5 Semantic Elements

**Document Structure**

```html
<!-- Semantic page structure -->
<header>
  <nav aria-label="Main navigation">
    <!-- Navigation content -->
  </nav>
</header>

<main>
  <article>
    <header>
      <h1>Article Title</h1>
    </header>
    <section>
      <!-- Article content -->
    </section>
  </article>
  
  <aside>
    <!-- Sidebar content -->
  </aside>
</main>

<footer>
  <!-- Footer content -->
</footer>
```

**Interactive Elements**

```html
<!-- Buttons for actions -->
<button type="button" onclick="toggleMenu()">
  Toggle Menu
</button>

<!-- Links for navigation -->
<a href="/articles">View All Articles</a>

<!-- Form elements with labels -->
<label for="email">Email Address</label>
<input type="email" id="email" required>
```

#### Coding Exercise: Semantic Refactoring

Transform non-semantic markup into semantic HTML:

**Before (Non-semantic)**

```html
<div class="header">
  <div class="title">My Blog</div>
  <div class="nav">
    <div class="nav-item">Home</div>
    <div class="nav-item">About</div>
  </div>
</div>
<div class="content">
  <div class="post">
    <div class="post-title">Blog Post Title</div>
    <div class="post-content">Content...</div>
  </div>
</div>
```

**After (Semantic)**

```html
<header>
  <h1>My Blog</h1>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h2>Blog Post Title</h2>
    <p>Content...</p>
  </article>
</main>
```

### Part 2: ARIA Implementation (45 minutes)

#### When to Use ARIA

**The Five Rules of ARIA**

1. Use semantic HTML elements when possible
2. Don't change semantic meaning
3. All interactive elements must be keyboard accessible
4. Don't hide focusable elements from screen readers
5. Interactive elements need accessible names

#### Common ARIA Patterns

**Expandable Content**

```jsx
const ExpandableSection = ({ title, children, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();

  return (
    <div>
      <button
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded(!expanded)}
      >
        {title}
      </button>
      <div
        id={contentId}
        hidden={!expanded}
      >
        {children}
      </div>
    </div>
  );
};
```

**Live Regions for Status Updates**

```jsx
const StatusNotification = ({ message, type = 'polite' }) => (
  <div
    role="status"
    aria-live={type}
    aria-atomic="true"
    className="sr-only"
  >
    {message}
  </div>
);

// Usage
const MyComponent = () => {
  const [status, setStatus] = useState('');

  const handleSave = async () => {
    setStatus('Saving...');
    try {
      await saveData();
      setStatus('Saved successfully');
    } catch (error) {
      setStatus('Error saving data');
    }
  };

  return (
    <div>
      <button onClick={handleSave}>Save</button>
      <StatusNotification message={status} />
    </div>
  );
};
```

**Modal Dialogs**

```jsx
const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef();
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      
      // Trap focus within modal
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex="-1"
      className="modal-overlay"
    >
      <div className="modal-content">
        <header>
          <h2 id={titleId}>{title}</h2>
          <button onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </header>
        <div>{children}</div>
      </div>
    </div>
  );
};
```

#### Hands-on Exercise: Building Accessible Components

**Assignment:** Implement accessible versions of:

1. **Accordion Component**
   - Multiple expandable sections
   - Keyboard navigation with arrow keys
   - Proper ARIA attributes

2. **Tabs Component**
   - Tab list with arrow key navigation
   - Associated tab panels
   - Automatic activation vs manual activation

### Part 3: Focus Management (30 minutes)

#### Focus Management Patterns

**Managing Focus in SPAs**

```jsx
const Router = ({ children }) => {
  const location = useLocation();
  const skipLinkRef = useRef();

  useEffect(() => {
    // Focus management on route change
    const main = document.querySelector('main');
    const heading = main?.querySelector('h1');
    
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    } else {
      skipLinkRef.current?.focus();
    }
  }, [location]);

  return (
    <div>
      <a 
        ref={skipLinkRef}
        href="#main"
        className="skip-link"
      >
        Skip to main content
      </a>
      {children}
    </div>
  );
};
```

**Focus Trapping in Modals**

```jsx
const useFocusTrap = (ref, active) => {
  useEffect(() => {
    if (!active || !ref.current) return;

    const element = ref.current;
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, active]);
};
```

### Part 4: Forms and Validation (35 minutes)

#### Accessible Form Patterns

**Form Structure and Labeling**

```jsx
const ContactForm = () => {
  const [errors, setErrors] = useState({});

  return (
    <form noValidate>
      <fieldset>
        <legend>Contact Information</legend>
        
        <div className="field-group">
          <label htmlFor="name">
            Name <span aria-label="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : 'name-help'}
          />
          <div id="name-help">Enter your full name</div>
          {errors.name && (
            <div id="name-error" role="alert">
              {errors.name}
            </div>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="email">
            Email <span aria-label="required">*</span>
          </label>
          <input
            type="email"
            id="email"
            required
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : 'email-help'}
          />
          <div id="email-help">We'll never share your email</div>
          {errors.email && (
            <div id="email-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>
      </fieldset>

      <button type="submit">Send Message</button>
    </form>
  );
};
```

**Error Handling and Validation**

```jsx
const useFormValidation = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback((fieldName, value) => {
    const rule = validationRules[fieldName];
    if (!rule) return '';

    for (const validation of rule) {
      const error = validation(value, values);
      if (error) return error;
    }
    return '';
  }, [validationRules, values]);

  const handleChange = (fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    if (touched[fieldName]) {
      const error = validate(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validate(fieldName, values[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  return { values, errors, touched, handleChange, handleBlur };
};
```

#### Hands-on Exercise: Accessible Form

Build a registration form with:

- Proper labeling and grouping
- Client-side validation with error announcements
- Progress indication for multi-step forms
- Keyboard navigation support

### Session 3 Wrap-up and Q&A (20 minutes)

#### Best Practices Summary

**Development Workflow**

1. Start with semantic HTML
2. Add ARIA only when necessary
3. Implement keyboard support
4. Test with screen reader
5. Validate with automated tools

**Common Patterns to Master**

- Modal dialogs with focus management
- Form validation with error announcements
- Dynamic content with live regions
- Navigation menus with keyboard support

## Session 4: Advanced Patterns

### Session Goals (2 hours)

Master complex accessibility patterns and integration with modern frameworks.

### Part 1: Complex Interactive Components (45 minutes)

#### Data Tables with Sorting and Filtering

```jsx
const AccessibleDataTable = ({ data, columns }) => {
  const [sortConfig, setSortConfig] = useState(null);
  const [filter, setFilter] = useState('');

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div>
      <div className="table-controls">
        <label htmlFor="table-filter">Filter table:</label>
        <input
          id="table-filter"
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-describedby="filter-help"
        />
        <div id="filter-help">
          {sortedData.length} rows visible
        </div>
      </div>

      <table role="table" aria-label="User data">
        <caption>
          User information with sortable columns
          {sortConfig && (
            <span aria-live="polite">
              , sorted by {sortConfig.key} {sortConfig.direction}
            </span>
          )}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                <button
                  onClick={() => handleSort(column.key)}
                  aria-sort={
                    sortConfig?.key === column.key
                      ? sortConfig.direction
                      : 'none'
                  }
                >
                  {column.label}
                  <span aria-hidden="true">
                    {sortConfig?.key === column.key ? (
                      sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'
                    ) : ' ↕'}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key}>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

#### Drag and Drop with Keyboard Support

```jsx
const AccessibleDragDrop = ({ items, onReorder }) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [keyboardMode, setKeyboardMode] = useState(false);

  const handleKeyDown = (e, item, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!keyboardMode) {
        setKeyboardMode(true);
        setDraggedItem(item);
        announceToScreenReader(`${item.name} selected for moving. Use arrow keys to choose new position, Enter to confirm, Escape to cancel.`);
      } else if (draggedItem === item) {
        // Confirm drop
        setKeyboardMode(false);
        setDraggedItem(null);
        announceToScreenReader(`${item.name} moved to position ${index + 1}`);
      }
    } else if (keyboardMode && draggedItem) {
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        const newItems = [...items];
        const draggedIndex = newItems.indexOf(draggedItem);
        const targetIndex = index - 1;
        
        newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);
        
        onReorder(newItems);
        announceToScreenReader(`${draggedItem.name} moved up`);
      } else if (e.key === 'ArrowDown' && index < items.length - 1) {
        e.preventDefault();
        const newItems = [...items];
        const draggedIndex = newItems.indexOf(draggedItem);
        const targetIndex = index + 1;
        
        newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);
        
        onReorder(newItems);
        announceToScreenReader(`${draggedItem.name} moved down`);
      } else if (e.key === 'Escape') {
        setKeyboardMode(false);
        setDraggedItem(null);
        announceToScreenReader('Move cancelled');
      }
    }
  };

  return (
    <ul
      role="listbox"
      aria-label="Reorderable list"
      aria-describedby="reorder-instructions"
    >
      <div id="reorder-instructions" className="sr-only">
        Use space or enter to select an item for moving, arrow keys to move, enter to confirm, escape to cancel.
      </div>
      
      {items.map((item, index) => (
        <li
          key={item.id}
          role="option"
          tabIndex="0"
          draggable
          aria-grabbed={draggedItem === item}
          aria-describedby={`item-${item.id}-instructions`}
          onKeyDown={(e) => handleKeyDown(e, item, index)}
          className={draggedItem === item ? 'dragging' : ''}
        >
          {item.name}
          <div id={`item-${item.id}-instructions`} className="sr-only">
            Position {index + 1} of {items.length}
          </div>
        </li>
      ))}
    </ul>
  );
};
```

### Part 2: Framework Integration (30 minutes)

#### React Accessibility Hooks

```jsx
// Custom hook for managing focus
const useFocusManagement = () => {
  const focusRef = useRef();
  const previousFocusRef = useRef();

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus();
    }
  }, []);

  const focusElement = useCallback(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  return { focusRef, saveFocus, restoreFocus, focusElement };
};

// Custom hook for announcements
const useScreenReader = () => {
  const announcementRef = useRef();

  const announce = useCallback((message, priority = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.textContent = '';
      announcementRef.current.setAttribute('aria-live', priority);
      
      setTimeout(() => {
        announcementRef.current.textContent = message;
      }, 100);
    }
  }, []);

  const AnnouncementRegion = () => (
    <div
      ref={announcementRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  return { announce, AnnouncementRegion };
};
```

### Part 3: Performance and Accessibility (30 minutes)

#### Lazy Loading and Accessibility

```jsx
const AccessibleLazyImage = ({ src, alt, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} {...props}>
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          style={{
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}
      {inView && !loaded && (
        <div
          role="img"
          aria-label={`Loading: ${alt}`}
          className="loading-placeholder"
        >
          <span aria-hidden="true">⏳</span>
          <span className="sr-only">Loading image</span>
        </div>
      )}
    </div>
  );
};
```

### Part 4: Accessibility in Testing (15 minutes)

#### Advanced Testing Patterns

```javascript
// Integration test with accessibility validation
describe('User Registration Flow', () => {
  test('complete registration with accessibility validation', async () => {
    const { container } = render(<RegistrationForm />);
    
    // Validate initial accessibility
    const initialResults = await axe(container);
    expect(initialResults).toHaveNoViolations();
    
    // Simulate user interaction
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'John Doe');
    
    // Validate accessibility after interaction
    const interactionResults = await axe(container);
    expect(interactionResults).toHaveNoViolations();
    
    // Test error states
    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);
    
    // Validate error state accessibility
    const errorResults = await axe(container);
    expect(errorResults).toHaveNoViolations();
    
    // Verify error announcement
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

// Visual regression testing with accessibility
test('modal maintains accessibility across viewports', async () => {
  const viewports = [
    { width: 320, height: 568 }, // Mobile
    { width: 768, height: 1024 }, // Tablet
    { width: 1920, height: 1080 } // Desktop
  ];

  for (const viewport of viewports) {
    await page.setViewport(viewport);
    
    // Open modal
    await page.click('[data-testid="open-modal"]');
    
    // Wait for modal to be visible
    await page.waitForSelector('[role="dialog"]');
    
    // Run accessibility test
    const results = await new AxePuppeteer(page).analyze();
    expect(results.violations).toHaveLength(0);
    
    // Take screenshot for visual regression
    await page.screenshot({
      path: `modal-${viewport.width}x${viewport.height}.png`
    });
    
    // Close modal
    await page.keyboard.press('Escape');
  }
});
```

### Session 4 Wrap-up and Q&A (20 minutes)

#### Advanced Patterns Summary

**Key Learnings**

- Complex components require careful focus management
- Keyboard alternatives for mouse interactions
- Performance considerations for accessibility
- Testing strategies for advanced patterns

**Next Steps**

- Practice implementing complex patterns
- Integrate accessibility into CI/CD pipeline
- Share knowledge with team members
- Stay updated with accessibility developments

## Hands-On Exercises

### Exercise 1: Component Accessibility Audit

**Objective:** Evaluate and improve accessibility of existing components

**Steps:**

1. **Select Component:** Choose a complex component from your codebase
2. **Automated Testing:** Run axe-core tests and document violations
3. **Manual Testing:** Test with keyboard and screen reader
4. **Implementation:** Fix identified issues
5. **Validation:** Re-test to confirm fixes

**Deliverable:** Before/after comparison with accessibility improvements documented

### Exercise 2: Building Accessible Form

**Objective:** Create a fully accessible multi-step form

**Requirements:**

- Multiple fieldsets with proper grouping
- Client-side validation with error announcements
- Progress indicator accessible to screen readers
- Keyboard navigation between steps
- Save and restore form data

**Validation Criteria:**

- Zero accessibility violations in automated tests
- Full keyboard operability
- Clear screen reader announcements
- WCAG 2.1 AA compliance

### Exercise 3: Accessible Data Visualization

**Objective:** Make charts and graphs accessible

**Challenge:** Create accessible alternatives for:

- Bar charts with data tables
- Line graphs with trend descriptions
- Pie charts with percentage breakdowns

**Requirements:**

- Alternative text descriptions
- Keyboard navigable data
- Screen reader compatible
- Color-blind accessible

## Assessment and Certification

### Knowledge Assessment

#### Multiple Choice Questions (20 questions)

**Sample Questions:**

1. What is the minimum color contrast ratio for normal text under WCAG 2.1 Level AA?
   - a) 3:1
   - b) 4.5:1
   - c) 7:1
   - d) 21:1

2. Which ARIA attribute should be used to indicate that content has been updated?
   - a) aria-updated
   - b) aria-live
   - c) aria-changed
   - d) aria-modified

3. What is the minimum touch target size recommended for mobile accessibility?
   - a) 32px × 32px
   - b) 44px × 44px
   - c) 48px × 48px
   - d) 64px × 64px

#### Practical Assessment

**Task:** Build accessible dropdown menu component

**Requirements:**

- Keyboard navigation with arrow keys
- Proper ARIA attributes
- Focus management
- Screen reader announcements
- Mobile-friendly touch targets

**Evaluation Criteria:**

- [ ] Automated accessibility tests pass
- [ ] Keyboard navigation works correctly
- [ ] Screen reader announces appropriately
- [ ] Visual focus indicators present
- [ ] Mobile accessibility requirements met

### Certification Levels

#### Level 1: Foundation
- Understands accessibility principles
- Can identify common accessibility issues
- Uses basic testing tools effectively

#### Level 2: Practitioner
- Builds accessible components
- Integrates accessibility into development workflow
- Mentors others on accessibility basics

#### Level 3: Expert
- Designs accessible user experiences
- Contributes to accessibility standards and tools
- Leads accessibility initiatives

## Resources and References

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

### Books

- "Accessibility for Everyone" by Laura Kalbag
- "Inclusive Design Patterns" by Heydon Pickering
- "A Web for Everyone" by Sarah Horton and Whitney Quesenbery

### Communities

- [A11y Slack](https://web-a11y.slack.com/)
- [WebAIM Discussion List](https://webaim.org/discussion/)
- [Accessibility Twitter Community](https://twitter.com/search?q=%23a11y)

---

*This training material is designed to be comprehensive yet practical, focusing on real-world application of accessibility principles and techniques.*
