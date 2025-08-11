# Mobile Design Guidelines - Astral Draft

## Overview
This document outlines the mobile-first responsive design patterns and guidelines implemented throughout the Astral Draft application. These patterns ensure consistent, touch-friendly experiences across all devices from mobile phones to desktop computers.

## Design Principles

### 1. Mobile-First Approach
- Start with mobile layouts and progressively enhance for larger screens
- Use `sm:`, `md:`, `lg:`, `xl:` breakpoints systematically
- Ensure core functionality works on 360px minimum width

### 2. Touch-Friendly Interface
- Minimum 44px touch targets for all interactive elements
- Adequate spacing between touchable elements
- Clear visual feedback for interactions

### 3. Progressive Enhancement
- Essential content and functionality available on all screen sizes
- Enhanced features and layouts for larger screens
- Graceful degradation of complex interactions

## Breakpoint System

```css
/* Tailwind CSS Breakpoints */
sm: 640px   /* Small devices (phones) */
md: 768px   /* Medium devices (tablets) */
lg: 1024px  /* Large devices (laptops) */
xl: 1280px  /* Extra large devices (desktops) */
```

## Responsive Layout Patterns

### Grid Systems
```tsx
// Statistics/Metrics Grid
className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6"

// Card Layout
className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"

// Navigation Tabs
className="grid grid-cols-3 sm:grid-cols-6 gap-1"
```

### Flexible Containers
```tsx
// Stacked on mobile, side-by-side on larger screens
className="flex flex-col sm:flex-row sm:items-center sm:space-x-3"

// Responsive spacing
className="space-y-4 sm:space-y-6"
className="p-3 sm:p-6"
```

## Typography Scale

### Text Sizing
```tsx
// Headings
className="text-2xl sm:text-3xl font-bold"     // Main titles
className="text-base sm:text-lg font-semibold" // Section titles

// Body Text
className="text-xs sm:text-sm"                 // Small text
className="text-sm sm:text-base"               // Regular text

// Labels and captions
className="text-xs text-gray-600"              // Captions
```

### Line Height and Readability
- Minimum 16px font size for body text on mobile
- Line height of 1.5 for optimal readability
- Adequate contrast ratios (WCAG AA compliance)

## Touch Target Guidelines

### Minimum Sizes
```tsx
// Standard touch targets
className="mobile-touch-target" // 44px minimum height/width

// Button sizing
className="px-4 py-3" // Primary buttons
className="px-3 py-2" // Secondary buttons
```

### Touch Target Classes
```css
.mobile-touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}
```

## Component-Specific Patterns

### Navigation
```tsx
// Horizontal scrolling tabs
className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide"

// Responsive tab content
className="flex-shrink-0 py-2 px-1 text-xs sm:text-sm mobile-touch-target"
```

### Forms
```tsx
// Full-width inputs on mobile
className="w-full sm:w-auto px-3 py-2 mobile-touch-target"

// Stacked buttons on mobile
className="flex flex-col sm:flex-row gap-2"
```

### Cards and Panels
```tsx
// Responsive padding
className="p-3 sm:p-4 rounded-lg"

// Flexible headers
className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
```

### Modals and Overlays
```tsx
// Mobile-optimized modals
className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md"
```

## Chart and Data Visualization

### Responsive Charts
```tsx
// Reduced height for mobile
<ResponsiveContainer width="100%" height={200}>

// Mobile-optimized font sizes
<XAxis fontSize={10} angle={-45} textAnchor="end" height={60} />
<YAxis fontSize={12} />
```

### Data Tables
```tsx
// Horizontal scroll for tables
className="overflow-x-auto"

// Condensed columns on mobile
className="grid grid-cols-2 sm:grid-cols-4 gap-3"
```

## Spacing and Layout

### Consistent Spacing Scale
```tsx
// Container spacing
className="space-y-4 sm:space-y-6"     // Vertical spacing
className="gap-3 sm:gap-6"             // Grid gaps

// Element padding
className="p-3 sm:p-6"                 // Card padding
className="px-3 sm:px-4 py-2"          // Button padding
```

### Margin and Padding
- Use responsive spacing classes consistently
- Reduce spacing on mobile to maximize content area
- Maintain adequate touch spacing around interactive elements

## Accessibility Considerations

### Screen Reader Support
```tsx
// Icon-only buttons
<button aria-label="Close modal" className="mobile-touch-target">
  <X className="h-4 w-4" />
</button>

// Form labels
<label htmlFor="email" className="block text-sm font-medium">
  Email Address
</label>
<input id="email" type="email" className="mobile-touch-target" />
```

### Focus Management
- Implement focus traps for modals
- Ensure logical tab order
- Visible focus indicators for keyboard navigation

### Color and Contrast
- Maintain WCAG AA contrast ratios
- Don't rely solely on color for information
- Test with high contrast mode

## Performance Guidelines

### Image Optimization
```tsx
// Responsive images
<img 
  src="image.webp" 
  srcSet="image-320.webp 320w, image-640.webp 640w"
  sizes="(max-width: 640px) 320px, 640px"
  alt="Description"
/>
```

### Code Splitting
- Lazy load non-critical components
- Split large feature modules
- Use React.lazy() for route-based splitting

## Testing Checklist

### Manual Testing
- [ ] Test on actual devices (iPhone, Android, tablet)
- [ ] Verify touch targets are easy to tap
- [ ] Check horizontal scrolling works smoothly
- [ ] Test form interactions with virtual keyboard
- [ ] Verify modal and overlay behaviors

### Automated Testing
- [ ] Run mobile testing suite (`mobileTestingSuite.ts`)
- [ ] Touch target size validation
- [ ] Viewport responsiveness tests
- [ ] Accessibility compliance checks

## Common Patterns by Section

### Dashboard
```tsx
// Widget grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"

// Stat cards
className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6"
```

### Draft Room
```tsx
// Panel layout
className="flex flex-col lg:flex-row gap-4"

// Player cards
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
```

### Analytics
```tsx
// Chart containers
className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6"

// Metrics display
className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
```

## Implementation Examples

### Enhanced Button Component
```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant, size, children }) => {
  const baseClasses = "mobile-touch-target rounded-lg transition-colors";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300"
  };
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg"
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {children}
    </button>
  );
};
```

### Responsive Card Component
```tsx
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-6 space-y-3 sm:space-y-4">
    {children}
  </div>
);
```

## Future Enhancements

### Progressive Web App Features
- Service worker for offline functionality
- App manifest for installability
- Push notifications for draft alerts

### Advanced Touch Interactions
- Swipe gestures for navigation
- Pull-to-refresh functionality
- Long press context menus

### Adaptive Design
- Dark mode support with system preference detection
- Reduced motion preferences
- Font size scaling options

## Resources

### Tools and Testing
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Responsive Design Checker](https://responsivedesignchecker.com/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Documentation
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

*Last updated: August 5, 2025*
*Version: 1.0*
