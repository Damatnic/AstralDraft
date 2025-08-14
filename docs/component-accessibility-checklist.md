# 📋 Component Accessibility Checklist

## Quick Reference Guide for Developers

This checklist provides quick accessibility validation for common component types. Use this during development and code review to ensure WCAG 2.1 AA compliance.

## 🔲 Universal Checklist (All Components)

### Semantic Structure
- [ ] Uses semantic HTML elements (button, nav, main, etc.)
- [ ] Proper heading hierarchy (h1 → h2 → h3, no skipping)
- [ ] Content structure makes sense without CSS
- [ ] Text content is readable and meaningful

### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical and intuitive
- [ ] Focus indicators are visible and meet contrast requirements
- [ ] No keyboard traps (users can escape all elements)
- [ ] Supports standard keyboard shortcuts (Enter, Space, Escape, Arrow keys)

### Screen Reader Support
- [ ] All images have appropriate alt text
- [ ] Form elements have associated labels
- [ ] ARIA attributes are used correctly
- [ ] Dynamic content changes are announced
- [ ] Error messages are accessible

### Visual Design
- [ ] Color contrast meets WCAG AA standards (4.5:1 minimum)
- [ ] Information is not conveyed by color alone
- [ ] Components work at 200% zoom
- [ ] Touch targets are minimum 44x44px with adequate spacing

### Testing
- [ ] Automated accessibility tests pass
- [ ] Manual keyboard testing completed
- [ ] Screen reader testing performed
- [ ] Mobile accessibility verified

## 🎛️ Component-Specific Checklists

### Buttons

#### Basic Requirements
- [ ] Uses `<button>` element (not div with click handler)
- [ ] Has accessible name (text content, aria-label, or aria-labelledby)
- [ ] Has appropriate `type` attribute (button, submit, reset)
- [ ] Minimum 44x44px touch target
- [ ] Disabled state is properly indicated

#### Advanced Features
- [ ] Loading/busy states announced to screen readers
- [ ] Icon-only buttons have aria-label
- [ ] Button groups have proper labeling
- [ ] Toggle buttons use aria-pressed

```jsx
// ✅ Example: Accessible Button
<button
  type="button"
  aria-label="Close dialog"
  aria-pressed={isToggled}
  disabled={isLoading}
  onClick={handleClick}
>
  {isLoading ? 'Loading...' : 'Submit'}
</button>
```

### Forms

#### Field Requirements
- [ ] All inputs have associated labels (label element with for attribute)
- [ ] Required fields are indicated (aria-required or required attribute)
- [ ] Field validation errors are associated with inputs
- [ ] Help text is associated with inputs using aria-describedby
- [ ] Error messages use role="alert" or aria-live

#### Form Structure
- [ ] Related fields grouped with fieldset/legend
- [ ] Form has submit button
- [ ] Form validation provides clear error messages
- [ ] Success/completion states are announced

```jsx
// ✅ Example: Accessible Form Field
<div className="form-field">
  <label htmlFor="email" className="required">
    Email Address *
  </label>
  <input
    id="email"
    type="email"
    required
    aria-describedby="email-help email-error"
    aria-invalid={hasError}
  />
  <div id="email-help">We'll never share your email</div>
  {error && (
    <div id="email-error" role="alert">
      {error}
    </div>
  )}
</div>
```

### Navigation

#### Structure Requirements
- [ ] Uses nav element with aria-label
- [ ] Current page indicated with aria-current="page"
- [ ] Skip links provided for main content
- [ ] Breadcrumb navigation properly structured
- [ ] Mobile navigation is keyboard accessible

#### Interactive Features
- [ ] Dropdown menus support keyboard navigation
- [ ] Menu items have proper ARIA roles
- [ ] Expandable navigation indicates state
- [ ] Focus management in mobile menus

```jsx
// ✅ Example: Accessible Navigation
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li>
      <a href="/" aria-current={isHome ? "page" : undefined}>
        Home
      </a>
    </li>
    <li>
      <a href="/about">About</a>
    </li>
  </ul>
</nav>
```

### Modals/Dialogs

#### Focus Management
- [ ] Focus moves to modal when opened
- [ ] Focus trapped within modal
- [ ] Focus returns to trigger when closed
- [ ] First focusable element receives focus

#### Interaction Requirements
- [ ] Modal has role="dialog" and aria-modal="true"
- [ ] Modal is labeled with aria-labelledby or aria-label
- [ ] Escape key closes modal
- [ ] Clicking backdrop closes modal (optional)
- [ ] Close button is clearly labeled

#### Content Requirements
- [ ] Modal content is accessible to screen readers
- [ ] Background content is hidden from screen readers
- [ ] Modal has descriptive title

```jsx
// ✅ Example: Accessible Modal
<div className="modal-overlay">
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
  >
    <h2 id="modal-title">Confirm Action</h2>
    <p id="modal-description">Are you sure you want to delete this item?</p>
    <button onClick={handleConfirm}>Yes, Delete</button>
    <button onClick={handleCancel}>Cancel</button>
  </div>
</div>
```

### Tables

#### Structure Requirements
- [ ] Uses proper table elements (table, thead, tbody, tr, th, td)
- [ ] Column headers use th element with scope="col"
- [ ] Row headers use th element with scope="row"
- [ ] Complex tables have caption element
- [ ] Sortable columns indicate sort direction

#### Interactive Features
- [ ] Sortable tables announce sort state
- [ ] Filterable tables maintain accessibility
- [ ] Expandable rows are properly labeled
- [ ] Selection states are announced

```jsx
// ✅ Example: Accessible Table
<table>
  <caption>Sales Report by Region</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Sales</th>
      <th scope="col">Growth</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North</th>
      <td>$50,000</td>
      <td>+5%</td>
    </tr>
  </tbody>
</table>
```

### Images

#### Content Images
- [ ] Meaningful images have descriptive alt text
- [ ] Alt text describes image content and context
- [ ] Complex images have long descriptions
- [ ] Images of text are avoided when possible

#### Decorative Images
- [ ] Decorative images have empty alt attribute (alt="")
- [ ] CSS background images used for decoration
- [ ] Icon fonts have proper screen reader support

```jsx
// ✅ Examples: Accessible Images

// Content image
<img 
  src="chart.png" 
  alt="Sales increased 25% from Q1 to Q2 2023" 
/>

// Decorative image
<img 
  src="decoration.png" 
  alt="" 
  aria-hidden="true" 
/>

// Icon with meaning
<button>
  <img src="save-icon.png" alt="" />
  Save Document
</button>
```

### Lists

#### Structure Requirements
- [ ] Uses proper list elements (ul, ol, li)
- [ ] List items contain related content
- [ ] Nested lists are properly structured
- [ ] Description lists use dl, dt, dd elements

#### Interactive Lists
- [ ] Selectable lists indicate selection state
- [ ] Multi-select lists support keyboard navigation
- [ ] Drag-and-drop lists have keyboard alternatives
- [ ] Virtual/infinite scroll lists maintain accessibility

```jsx
// ✅ Example: Accessible List
<ul aria-label="Navigation menu">
  <li>
    <a href="/home">Home</a>
  </li>
  <li>
    <a href="/products" aria-current="page">Products</a>
  </li>
  <li>
    <a href="/contact">Contact</a>
  </li>
</ul>
```

## 📱 Mobile-Specific Checklist

### Touch Interface
- [ ] Touch targets minimum 44x44px
- [ ] Adequate spacing between touch targets (8px minimum)
- [ ] Gestures have keyboard/button alternatives
- [ ] Swipe actions are announced to screen readers

### Responsive Design
- [ ] Works in both portrait and landscape orientations
- [ ] Text remains readable when zoomed to 200%
- [ ] Horizontal scrolling avoided at standard zoom levels
- [ ] Interactive elements remain accessible at all screen sizes

### Mobile Navigation
- [ ] Mobile menu button is properly labeled
- [ ] Off-canvas navigation is keyboard accessible
- [ ] Bottom navigation has proper ARIA structure
- [ ] Tab bar items are properly labeled

## 🧪 Testing Checklist

### Automated Testing
- [ ] axe-core accessibility scan passes
- [ ] Jest accessibility tests pass
- [ ] Lighthouse accessibility score > 90
- [ ] No console accessibility warnings

### Manual Testing
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (NVDA/VoiceOver)
- [ ] High contrast mode verified
- [ ] 200% zoom tested
- [ ] Mobile accessibility verified

### Browser Testing
- [ ] Chrome accessibility features tested
- [ ] Firefox accessibility features tested
- [ ] Safari VoiceOver tested
- [ ] Edge accessibility tested

## 🚨 Common Issues & Quick Fixes

### Missing Labels
```jsx
// ❌ Problem
<input type="text" placeholder="Enter name" />

// ✅ Solution
<label htmlFor="name">Name</label>
<input id="name" type="text" placeholder="Enter name" />
```

### Poor Color Contrast
```css
/* ❌ Problem */
.text { color: #ccc; background: #fff; } /* 1.6:1 ratio */

/* ✅ Solution */
.text { color: #333; background: #fff; } /* 12.6:1 ratio */
```

### Inaccessible Icons
```jsx
// ❌ Problem
<button><i className="icon-save"></i></button>

// ✅ Solution
<button aria-label="Save document">
  <i className="icon-save" aria-hidden="true"></i>
</button>
```

### Missing Focus Management
```jsx
// ❌ Problem
const Modal = ({ onClose }) => {
  return (
    <div className="modal">
      <button onClick={onClose}>Close</button>
    </div>
  );
};

// ✅ Solution
const Modal = ({ onClose }) => {
  const modalRef = useRef();
  
  useEffect(() => {
    modalRef.current?.focus();
  }, []);
  
  return (
    <div className="modal" ref={modalRef} tabIndex="-1">
      <button onClick={onClose}>Close</button>
    </div>
  );
};
```

## 📖 Quick Reference Links

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)

---

**Print this checklist and keep it handy during development!**

*Last Updated: August 11, 2025*
