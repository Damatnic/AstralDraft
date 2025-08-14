# 🚀 Accessibility Onboarding Guide

## Welcome to Accessible Development!

This guide will help you get started with accessibility testing and development practices for the Astral Draft project. Follow these steps to become proficient in creating accessible components.

## 📚 Learning Path

### Week 1: Foundations

#### Day 1-2: Understanding Accessibility
**Goals:** Learn why accessibility matters and basic concepts

**Resources:**
- Read [Introduction to Web Accessibility](https://www.w3.org/WAI/fundamentals/accessibility-intro/)
- Watch [Accessibility Fundamentals](https://www.youtube.com/watch?v=z8xUCzToff8)
- Review [WCAG 2.1 Overview](https://www.w3.org/WAI/WCAG21/Understanding/intro)

**Practice:**
1. Install axe DevTools browser extension
2. Run accessibility audit on 3 different websites
3. Identify 5 common accessibility issues

#### Day 3-4: Screen Reader Basics
**Goals:** Understand how screen readers work

**Setup:**
- **Windows:** Download and install [NVDA](https://www.nvaccess.org/download/)
- **Mac:** Enable VoiceOver (System Preferences > Accessibility)
- **Mobile:** Enable TalkBack (Android) or VoiceOver (iOS)

**Practice:**
1. Navigate a familiar website using only screen reader
2. Try to complete a simple task (search, form submission)
3. Note challenges and confusing areas

#### Day 5: Keyboard Navigation
**Goals:** Master keyboard-only navigation

**Practice:**
1. Disconnect your mouse/trackpad
2. Navigate through our application using only keyboard
3. Document areas where you get stuck
4. Test common keyboard shortcuts (Tab, Shift+Tab, Enter, Space, Escape)

### Week 2: Testing and Tools

#### Day 1-2: Automated Testing Setup
**Goals:** Set up and run accessibility tests

**Tasks:**
```bash
# Clone the project
git clone [repository-url]
cd astral-draft

# Install dependencies
npm install

# Run accessibility tests
npm run test:accessibility

# Run with watch mode
npm run test:accessibility:watch
```

**Practice:**
1. Run the accessibility test suite
2. Understand the test results
3. Fix one simple accessibility issue
4. Write your first accessibility test

#### Day 3-4: Manual Testing Techniques
**Goals:** Learn systematic manual testing

**Checklist to Practice:**
- [ ] Keyboard navigation test
- [ ] Screen reader test
- [ ] Color contrast check
- [ ] Mobile accessibility test
- [ ] Zoom test (200%)

**Tools to Install:**
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)
- [axe DevTools](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
- [WAVE](https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh)

#### Day 5: Component Testing
**Goals:** Apply testing to real components

**Practice:**
1. Choose a component from our codebase
2. Run automated accessibility tests
3. Perform manual testing
4. Document findings and fixes

### Week 3: Development Practices

#### Day 1-2: Semantic HTML
**Goals:** Master semantic HTML structure

**Practice Examples:**
```html
<!-- ✅ Good: Semantic structure -->
<article>
  <header>
    <h1>Article Title</h1>
    <time datetime="2023-01-01">January 1, 2023</time>
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

<!-- ❌ Bad: Non-semantic structure -->
<div>
  <div>
    <div>Article Title</div>
    <div>January 1, 2023</div>
  </div>
  <div>
    <div>Article content...</div>
  </div>
</div>
```

**Exercise:** Refactor 3 non-semantic components to use proper HTML elements.

#### Day 3-4: ARIA Implementation
**Goals:** Learn when and how to use ARIA

**Key Concepts:**
- **Rule 1:** Use semantic HTML first
- **Rule 2:** Don't change semantic meaning
- **Rule 3:** All interactive elements must be keyboard accessible
- **Rule 4:** Don't hide focusable elements
- **Rule 5:** All interactive elements must have accessible names

**Common ARIA Patterns:**
```jsx
// Button with additional description
<button 
  aria-label="Delete item"
  aria-describedby="delete-help"
>
  🗑️
</button>
<div id="delete-help">This action cannot be undone</div>

// Status announcements
<div aria-live="polite" role="status">
  {statusMessage}
</div>

// Required form field
<input 
  aria-required="true"
  aria-describedby="email-help"
  aria-invalid={hasError}
/>
```

**Exercise:** Add proper ARIA attributes to 5 existing components.

#### Day 5: Focus Management
**Goals:** Implement proper focus management

**Key Patterns:**
```jsx
// Modal focus management
const Modal = ({ isOpen, onClose }) => {
  const modalRef = useRef();
  const triggerRef = useRef();

  useEffect(() => {
    if (isOpen) {
      // Save current focus
      triggerRef.current = document.activeElement;
      // Focus modal
      modalRef.current?.focus();
    } else {
      // Restore focus
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  return isOpen ? (
    <div 
      ref={modalRef}
      role="dialog"
      tabIndex="-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      Modal content...
    </div>
  ) : null;
};
```

**Exercise:** Implement focus management for navigation components.

### Week 4: Advanced Topics

#### Day 1-2: Mobile Accessibility
**Goals:** Master mobile-specific accessibility

**Key Requirements:**
- Touch targets minimum 44px × 44px
- Adequate spacing between targets
- Gesture alternatives
- Screen reader support on mobile

**Practice:**
```jsx
// Mobile-accessible button
const MobileButton = ({ children, onClick, ...props }) => (
  <button
    onClick={onClick}
    style={{
      minHeight: '44px',
      minWidth: '44px',
      margin: '4px',
      padding: '12px 16px'
    }}
    {...props}
  >
    {children}
  </button>
);
```

#### Day 3-4: Dynamic Content
**Goals:** Handle dynamic content accessibility

**Live Regions:**
```jsx
// Status updates
const StatusUpdate = ({ message, type = 'polite' }) => (
  <div 
    aria-live={type}
    aria-atomic="true"
    className="sr-only"
  >
    {message}
  </div>
);

// Loading states
const LoadingComponent = ({ loading, children }) => (
  <div aria-busy={loading}>
    {loading ? (
      <div role="status" aria-label="Loading">
        <span aria-hidden="true">⏳</span>
        Loading...
      </div>
    ) : (
      children
    )}
  </div>
);
```

#### Day 5: Complex Components
**Goals:** Build accessible complex components

**Practice:** Choose one complex component to make fully accessible:
- Data tables with sorting
- Carousel/slider components
- Drag-and-drop interfaces
- Charts and data visualizations

## 🛠️ Development Workflow

### Daily Practices

#### Before Writing Code
1. **Plan for Accessibility:** Consider accessibility from the design phase
2. **Choose Semantic Elements:** Start with proper HTML structure
3. **Review Patterns:** Check existing accessible patterns in codebase

#### During Development
1. **Test Early:** Run accessibility tests as you develop
2. **Use DevTools:** Keep axe DevTools open while developing
3. **Test with Keyboard:** Regularly test keyboard navigation

#### Before Committing
1. **Run Tests:** Ensure all accessibility tests pass
2. **Manual Check:** Quick keyboard and screen reader test
3. **Review Checklist:** Use component accessibility checklist

### Code Review Process

#### For Reviewers
```markdown
## Accessibility Review Questions

### Semantic HTML
- [ ] Are semantic HTML elements used appropriately?
- [ ] Is the heading hierarchy logical?
- [ ] Are lists properly structured?

### ARIA Implementation
- [ ] Are ARIA attributes used correctly?
- [ ] Is aria-label used only when necessary?
- [ ] Are live regions implemented for dynamic content?

### Keyboard Navigation
- [ ] Can all functionality be accessed via keyboard?
- [ ] Is the tab order logical?
- [ ] Are focus indicators visible?

### Testing
- [ ] Do automated accessibility tests pass?
- [ ] Has manual testing been performed?
- [ ] Are any accessibility considerations documented?
```

#### For Authors
```markdown
## Accessibility Self-Review

Before requesting review:
- [ ] Automated tests pass
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (basic check)
- [ ] Color contrast verified
- [ ] Mobile accessibility considered

If accessibility concerns:
- [ ] Documented in PR description
- [ ] Consulted accessibility guidelines
- [ ] Asked for accessibility review
```

## 📖 Reference Materials

### Quick References
- [Component Accessibility Checklist](./component-accessibility-checklist.md)
- [Accessibility Testing Guide](./accessibility-testing-guide.md)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)

### Code Examples Repository
All examples from this guide are available in:
- `examples/accessibility/` - Code examples
- `__tests__/accessibility/` - Test examples
- `docs/patterns/` - Common patterns

### Tools and Extensions

#### Browser Extensions
- [axe DevTools](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd) - Essential accessibility testing
- [WAVE](https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh) - Visual accessibility evaluation
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools

#### Screen Readers
- **Windows:** [NVDA](https://www.nvaccess.org/download/) (free)
- **Windows:** [JAWS](https://www.freedomscientific.com/products/software/jaws/) (commercial)
- **Mac:** VoiceOver (built-in)
- **iOS:** VoiceOver (built-in)
- **Android:** TalkBack (built-in)

#### Color and Contrast Tools
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Colors](https://accessible-colors.com/)

## 🎯 Milestones and Goals

### Week 1 Goals
- [ ] Understand accessibility fundamentals
- [ ] Complete basic screen reader and keyboard testing
- [ ] Install and configure all necessary tools

### Week 2 Goals
- [ ] Successfully run accessibility test suite
- [ ] Perform comprehensive manual testing
- [ ] Write first accessibility test

### Week 3 Goals
- [ ] Refactor components to use semantic HTML
- [ ] Implement proper ARIA attributes
- [ ] Create accessible focus management

### Week 4 Goals
- [ ] Master mobile accessibility patterns
- [ ] Handle dynamic content accessibility
- [ ] Build one complex accessible component

### Month 1 Goals
- [ ] Independently develop accessible components
- [ ] Confidently review code for accessibility
- [ ] Contribute to accessibility documentation

## 🤝 Getting Help

### Team Resources
- **Accessibility Champion:** [Team Member Name]
- **Team Slack Channel:** #accessibility
- **Weekly Office Hours:** Fridays 2-3 PM

### External Resources
- [WebAIM Forums](https://webaim.org/discussion/)
- [A11y Slack Community](https://web-a11y.slack.com/)
- [Accessibility Developer Guide](https://www.accessibility-developer-guide.com/)

### Emergency Accessibility Issues
For accessibility bugs in production:
1. Create immediate issue with "accessibility" label
2. Notify team in #accessibility channel
3. Document workaround if possible
4. Prioritize for next sprint

## 📝 Progress Tracking

### Self-Assessment Checklist

#### Week 1: Foundations
- [ ] I understand why accessibility matters
- [ ] I can navigate with a screen reader
- [ ] I can test keyboard navigation
- [ ] I know common accessibility barriers

#### Week 2: Testing
- [ ] I can run automated accessibility tests
- [ ] I can interpret test results
- [ ] I can perform manual testing
- [ ] I can identify accessibility issues

#### Week 3: Development
- [ ] I write semantic HTML by default
- [ ] I use ARIA attributes correctly
- [ ] I implement proper focus management
- [ ] I consider accessibility in component design

#### Week 4: Advanced
- [ ] I can build mobile-accessible components
- [ ] I handle dynamic content appropriately
- [ ] I can make complex components accessible
- [ ] I help others with accessibility questions

## 🎉 Next Steps

After completing this onboarding:

1. **Become an Accessibility Advocate:** Help others learn accessibility
2. **Contribute to Guidelines:** Improve our accessibility documentation
3. **Advanced Training:** Attend accessibility conferences and workshops
4. **Certification:** Consider accessibility certification programs

---

**Welcome to the team! Let's build an accessible web together! 🌐♿**

*Last Updated: August 11, 2025*
*Next Review: November 11, 2025*
