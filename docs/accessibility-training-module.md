# 🎓 Accessibility Training Module

## Module Overview

This interactive training module helps team members develop comprehensive accessibility knowledge and practical skills for building inclusive applications.

## 🎯 Learning Objectives

By completing this module, you will:
- Understand WCAG 2.1 guidelines and compliance requirements
- Master our accessibility testing framework and tools
- Implement accessible component patterns confidently
- Interpret dashboard metrics and take corrective actions
- Integrate accessibility into your daily development workflow

## 📚 Module Structure

### 📖 Section 1: Accessibility Fundamentals (45 minutes)

#### 1.1 What is Web Accessibility? (15 minutes)
**Key Concepts:**
- Definition and importance of web accessibility
- Types of disabilities and assistive technologies
- Legal requirements and standards (ADA, Section 508, WCAG)
- Business benefits of accessibility

**Activity:** Experience the web using a screen reader for 10 minutes

**Resources:**
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Disability Impact Statistics](https://www.cdc.gov/ncbddd/disabilityandhealth/infographic-disability-impacts-all.html)

#### 1.2 WCAG 2.1 Guidelines (20 minutes)
**Key Concepts:**
- Four principles: Perceivable, Operable, Understandable, Robust (POUR)
- Three conformance levels: A, AA, AAA
- Success criteria and techniques
- Common violations and how to fix them

**Interactive Exercise:** WCAG Success Criteria Matching Game
- Match violations to correct WCAG criteria
- Identify appropriate fixes for common issues

**Resources:**
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [How to Meet WCAG](https://www.w3.org/WAI/WCAG21/Understanding/)

#### 1.3 Assistive Technologies (10 minutes)
**Key Concepts:**
- Screen readers (NVDA, JAWS, VoiceOver, TalkBack)
- Voice control software
- Switch navigation devices
- Magnification software
- Keyboard-only navigation

**Demo:** Live demonstration of screen reader usage

---

### 🔧 Section 2: Our Testing Framework (60 minutes)

#### 2.1 Testing Framework Overview (15 minutes)
**Key Concepts:**
- Jest + axe-core integration
- Automated vs. manual testing
- Test coverage and reporting
- CI/CD integration

**Hands-on:** Run your first accessibility test
```bash
npm run test:accessibility
```

#### 2.2 Writing Accessibility Tests (25 minutes)
**Key Concepts:**
- Component accessibility testing patterns
- Testing user interactions
- Testing dynamic content
- Mock data considerations

**Practical Exercise:** Write tests for a form component
```javascript
// Example: Form accessibility test
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { ContactForm } from '../ContactForm';

expect.extend(toHaveNoViolations);

describe('ContactForm Accessibility', () => {
  test('form is accessible', async () => {
    const { container } = render(<ContactForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('form labels are properly associated', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  test('form validation is announced to screen readers', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);
    
    expect(screen.getByRole('alert')).toHaveTextContent(/name is required/i);
  });
});
```

#### 2.3 Dashboard Usage and Interpretation (20 minutes)
**Key Concepts:**
- Dashboard metrics explanation
- Trend analysis
- Setting up monitoring
- Team collaboration features

**Interactive Session:** Explore the live dashboard
- Navigate to [Accessibility Dashboard](https://astral-projects.github.io/astral-draft/dashboard.html)
- Interpret current metrics
- Identify actionable insights

---

### 🏗️ Section 3: Accessible Component Development (90 minutes)

#### 3.1 Semantic HTML Foundation (20 minutes)
**Key Concepts:**
- Proper use of semantic elements
- Heading hierarchy
- Landmark roles
- Lists and tables

**Exercise:** Refactor a div-based layout to use semantic HTML
```html
<!-- Before: Poor semantic structure -->
<div class="header">
  <div class="title">Page Title</div>
  <div class="nav">
    <div class="nav-item">Home</div>
    <div class="nav-item">About</div>
  </div>
</div>

<!-- After: Proper semantic structure -->
<header>
  <h1>Page Title</h1>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>
```

#### 3.2 ARIA Attributes and Roles (25 minutes)
**Key Concepts:**
- When to use ARIA vs. semantic HTML
- Common ARIA patterns
- Live regions for dynamic content
- State and property attributes

**Practical Exercise:** Build an accessible dropdown menu
```tsx
const AccessibleDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');

  return (
    <div className="dropdown">
      <button
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption || 'Select an option'}
      </button>
      
      {isOpen && (
        <ul role="listbox" aria-label="Options">
          {options.map(option => (
            <li
              key={option.value}
              role="option"
              aria-selected={selectedOption === option.value}
              onClick={() => {
                setSelectedOption(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

#### 3.3 Keyboard Navigation (20 minutes)
**Key Concepts:**
- Tab order and focus management
- Custom keyboard handlers
- Skip links and focus traps
- Escape key patterns

**Exercise:** Implement keyboard navigation for a modal
```tsx
const AccessibleModal: React.FC = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};
```

#### 3.4 Form Accessibility (25 minutes)
**Key Concepts:**
- Label association techniques
- Error message patterns
- Required field indication
- Fieldset and legend usage

**Comprehensive Exercise:** Build a fully accessible contact form
```tsx
const AccessibleContactForm: React.FC = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  return (
    <form noValidate>
      <fieldset>
        <legend>Contact Information</legend>
        
        <div className="field">
          <label htmlFor="name">
            Name <span aria-label="required">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            aria-describedby={errors.name ? 'name-error' : undefined}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <div id="name-error" role="alert" className="error">
              {errors.name}
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="email">
            Email <span aria-label="required">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            aria-describedby="email-help"
            aria-invalid={!!errors.email}
          />
          <div id="email-help" className="help-text">
            We'll never share your email address
          </div>
          {errors.email && (
            <div role="alert" className="error">
              {errors.email}
            </div>
          )}
        </div>
      </fieldset>

      <button type="submit">Send Message</button>
      
      {submitted && (
        <div role="alert" className="success">
          Thank you! Your message has been sent.
        </div>
      )}
    </form>
  );
};
```

---

### 📊 Section 4: Monitoring and Maintenance (45 minutes)

#### 4.1 Dashboard Deep Dive (20 minutes)
**Key Concepts:**
- Metric interpretation
- Trend analysis
- Setting alerts and thresholds
- Team collaboration features

**Hands-on Activity:** Dashboard exploration
1. Generate fresh dashboard data: `npm run accessibility:dashboard`
2. Analyze current compliance levels
3. Identify improvement opportunities
4. Set up monitoring alerts

#### 4.2 Continuous Integration (15 minutes)
**Key Concepts:**
- GitHub Actions workflow
- Automated testing in CI/CD
- Pull request integration
- Deployment gates

**Exercise:** Configure accessibility checks in CI
```yaml
# .github/workflows/accessibility-ci.yml
name: Accessibility CI

on: [push, pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:accessibility:ci
      - run: npm run accessibility:dashboard
```

#### 4.3 Team Collaboration (10 minutes)
**Key Concepts:**
- Code review best practices
- Knowledge sharing
- Documentation maintenance
- Accessibility champions

---

### 🎯 Section 5: Practical Application (60 minutes)

#### 5.1 Component Accessibility Audit (30 minutes)
**Exercise:** Audit an existing component for accessibility issues

**Step-by-step process:**
1. Run automated tests
2. Manual keyboard testing
3. Screen reader testing
4. Color contrast checking
5. Documentation review

**Deliverable:** Complete accessibility report with recommendations

#### 5.2 Build an Accessible Component (30 minutes)
**Final Project:** Build a component from scratch following accessibility best practices

**Requirements:**
- Use semantic HTML
- Implement proper ARIA patterns
- Support keyboard navigation
- Include comprehensive tests
- Document accessibility features

**Component Options:**
- Data table with sorting and filtering
- Image carousel with navigation
- Multi-step form wizard
- Autocomplete search component

---

## 🧪 Knowledge Assessment

### 📝 Quiz: Accessibility Fundamentals

**Question 1:** What does WCAG Level AA compliance require for color contrast?
- A) 3:1 ratio for all text
- B) 4.5:1 for normal text, 3:1 for large text ✅
- C) 7:1 ratio for all text
- D) No specific requirements

**Question 2:** Which ARIA attribute should be used to hide decorative images?
- A) `aria-hidden="true"` ✅
- B) `aria-label=""`
- C) `role="presentation"`
- D) `alt=""`

**Question 3:** How do you properly associate an error message with a form input?
- A) Place the error message after the input
- B) Use `aria-describedby` to reference the error message ✅
- C) Use a red border on the input
- D) Use placeholder text for errors

**Question 4:** What's the correct way to indicate a required form field?
- A) Add `*` to the label
- B) Use `aria-required="true"` ✅
- C) Use placeholder text
- D) Use red color only

**Question 5:** Which command runs our accessibility tests?
- A) `npm test`
- B) `npm run test:accessibility` ✅
- C) `npm run a11y`
- D) `npm run lint`

### 🛠️ Practical Assessment

**Task 1: Fix Accessibility Issues**
```jsx
// Fix the accessibility issues in this component
const BadButton = () => {
  return (
    <div 
      style={{ cursor: 'pointer', color: '#ccc' }}
      onClick={() => alert('Clicked!')}
    >
      Click me
    </div>
  );
};

// Your solution here:
const GoodButton = () => {
  return (
    <button 
      style={{ color: '#000' }} // Better contrast
      onClick={() => alert('Clicked!')}
    >
      Click me
    </button>
  );
};
```

**Task 2: Write Accessibility Tests**
```javascript
// Write comprehensive accessibility tests for this component
const SearchForm = ({ onSubmit }) => {
  const [query, setQuery] = useState('');
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(query); }}>
      <label htmlFor="search">Search</label>
      <input 
        id="search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter search terms"
      />
      <button type="submit">Search</button>
    </form>
  );
};

// Your test solution here:
describe('SearchForm Accessibility', () => {
  test('form is accessible', async () => {
    const { container } = render(<SearchForm onSubmit={jest.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('label is properly associated', () => {
    render(<SearchForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
  });

  test('form can be submitted with keyboard', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(<SearchForm onSubmit={mockSubmit} />);
    
    const input = screen.getByLabelText(/search/i);
    await user.type(input, 'test query');
    await user.keyboard('{Enter}');
    
    expect(mockSubmit).toHaveBeenCalledWith('test query');
  });
});
```

## 🏆 Certification

### 📜 Completion Requirements

To receive accessibility certification, you must:

1. **Complete all training sections** (300 minutes total)
2. **Pass the knowledge quiz** (80% or higher)
3. **Complete practical assessments** (all tasks)
4. **Build and test an accessible component** (final project)
5. **Demonstrate dashboard usage** (hands-on session)

### 🎖️ Certification Levels

**🥉 Bronze Certification: Accessibility Aware**
- Completed training modules
- Passed basic quiz (80%+)
- Can run accessibility tests
- Understands WCAG basics

**🥈 Silver Certification: Accessibility Practitioner**
- All Bronze requirements plus:
- Completed practical assessments
- Built accessible component
- Can interpret dashboard metrics
- Demonstrates testing skills

**🥇 Gold Certification: Accessibility Champion**
- All Silver requirements plus:
- Led team accessibility session
- Contributed to documentation
- Mentored another team member
- Identified and fixed complex accessibility issue

### 📊 Progress Tracking

**Individual Progress Dashboard:**
```
Your Accessibility Learning Progress
===================================
Training Modules:     [████████░░] 80%
Knowledge Quiz:       [██████████] 100% ✅
Practical Assessment: [████░░░░░░] 40%
Final Project:        [░░░░░░░░░░] 0%
Overall Progress:     [██████░░░░] 60%

Next Steps:
- Complete Section 5: Practical Application
- Submit final project for review
- Schedule certification review session
```

## 📚 Additional Resources

### 🔗 External Learning Resources
- [WebAIM](https://webaim.org/) - Comprehensive accessibility training
- [A11Y Project](https://www.a11yproject.com/) - Community resources
- [Inclusive Components](https://inclusive-components.design/) - Component patterns
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) - Official ARIA guide

### 🛠️ Tools and Extensions
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Google's accessibility audit
- [Color Oracle](https://colororacle.org/) - Color blindness simulator

### 📖 Team Resources
- [Component Accessibility Checklist](./component-accessibility-checklist.md)
- [Testing Guide](./accessibility-testing-guide.md)
- [Best Practices](./accessibility-best-practices.md)
- [Dashboard Guide](./accessibility-dashboard-guide.md)
- [Workflow Integration](./accessibility-workflow-integration.md)

---

## 🆘 Getting Help

### 💬 Support Channels
- **Slack**: #accessibility for questions and discussion
- **Office Hours**: Weekly accessibility help sessions
- **Mentorship**: Pair with accessibility champion
- **Documentation**: Comprehensive guides in docs/ folder

### 🚨 Escalation Path
1. **Self-help**: Review training materials and documentation
2. **Peer Support**: Ask in #accessibility channel
3. **Mentor**: Schedule session with accessibility champion
4. **Expert**: Escalate to accessibility lead for complex issues

---

**Ready to start your accessibility journey?** Begin with Section 1 and work through the modules at your own pace. Remember: building accessible software is a skill that improves with practice and benefits everyone who uses our products!

**Training Version**: 1.0.0  
**Last Updated**: August 11, 2025  
**Estimated Completion Time**: 5-8 hours (can be completed over multiple sessions)
