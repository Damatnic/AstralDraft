# Mobile Component Implementation Guide

## Overview
This guide documents the specific mobile-first patterns implemented across Astral Draft components, providing developers with concrete examples and reusable patterns for maintaining consistency.

## Implementation Summary

### Completed Mobile Enhancements
- ✅ **Dashboard Components**: Enhanced responsive layouts for analytics widgets and metric displays
- ✅ **Draft Room Components**: Optimized touch interactions and flexible layouts for all draft interfaces
- ✅ **Analytics Views**: Implemented mobile-first chart layouts and navigation patterns
- ✅ **Historical Analytics**: Enhanced data visualization with responsive chart containers
- ✅ **Advanced Analytics Dashboard**: Optimized complex data displays for mobile consumption

## Core Component Patterns

### 1. DashboardView.tsx
**Mobile Enhancements Applied:**
```tsx
// Widget grid - responsive columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
  {widgets.map(widget => (
    <WidgetCard key={widget.id} {...widget} />
  ))}
</div>

// Stat cards - 2x2 mobile, 4x1 desktop
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
  <StatCard title="Active Leagues" value="12" />
  <StatCard title="Players Drafted" value="1,247" />
</div>
```

**Key Patterns:**
- Progressive grid enhancement: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Responsive spacing: `gap-4 sm:gap-6`
- Condensed mobile layouts with touch-friendly spacing

### 2. DraftRoomView.tsx
**Mobile Enhancements Applied:**
```tsx
// Main layout - stacked on mobile, side-by-side on desktop
<div className="flex flex-col lg:flex-row gap-4">
  <div className="flex-1">
    <DraftBoard />
  </div>
  <div className="w-full lg:w-80">
    <PlayerPool />
  </div>
</div>

// Touch-friendly navigation tabs
<div className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
  {tabs.map(tab => (
    <button className="flex-shrink-0 py-2 px-1 mobile-touch-target">
      {tab.label}
    </button>
  ))}
</div>
```

**Key Patterns:**
- Flexible container layouts: `flex-col lg:flex-row`
- Horizontal scrolling navigation with touch targets
- Responsive panel sizing: `w-full lg:w-80`

### 3. PlayerCard.tsx
**Mobile Enhancements Applied:**
```tsx
// Compact mobile layout
<div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
  <div className="flex items-center justify-between">
    <div className="flex-1 min-w-0">
      <h3 className="text-sm sm:text-base font-semibold truncate">
        {player.name}
      </h3>
      <p className="text-xs text-gray-600">
        {player.position} - {player.team}
      </p>
    </div>
    <button className="mobile-touch-target bg-blue-600 text-white rounded px-3 py-2">
      Draft
    </button>
  </div>
</div>
```

**Key Patterns:**
- Responsive text sizing: `text-sm sm:text-base`
- Touch-friendly buttons with minimum 44px height
- Flexible content with overflow handling

### 4. HistoricalAnalyticsView.tsx
**Mobile Enhancements Applied:**
```tsx
// Tab navigation with horizontal scroll
<div className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide pb-2">
  {tabs.map(tab => (
    <button className="flex-shrink-0 px-3 py-2 mobile-touch-target rounded-lg">
      {tab.label}
    </button>
  ))}
</div>

// Chart container with responsive sizing
<div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
  <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 200 : 300}>
    <LineChart data={data}>
      <XAxis fontSize={10} angle={-45} textAnchor="end" />
      <YAxis fontSize={12} />
    </LineChart>
  </ResponsiveContainer>
</div>
```

**Key Patterns:**
- Horizontal scrolling tabs for mobile navigation
- Responsive chart heights based on screen size
- Mobile-optimized chart typography

### 5. AdvancedAnalyticsDashboard.tsx
**Mobile Enhancements Applied:**
```tsx
// Header with responsive layout
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
  <h1 className="text-2xl sm:text-3xl font-bold">Advanced Analytics</h1>
  <div className="flex flex-wrap gap-2">
    <FilterButton />
    <ExportButton />
  </div>
</div>

// Metric grid with responsive columns
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
  {metrics.map(metric => (
    <MetricCard key={metric.id} {...metric} />
  ))}
</div>
```

**Key Patterns:**
- Flexible header layouts: `flex-col sm:flex-row`
- Responsive button groups with wrapping
- Metric cards optimized for mobile screens

## Touch Target Implementation

### Mobile Touch Target Class
```css
.mobile-touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Button Implementations
```tsx
// Primary buttons
<button className="mobile-touch-target bg-blue-600 text-white rounded-lg px-4 py-3">
  Primary Action
</button>

// Icon buttons
<button className="mobile-touch-target p-3 rounded-lg hover:bg-gray-100">
  <Icon className="h-4 w-4" />
</button>

// Tab buttons
<button className="mobile-touch-target px-3 py-2 text-sm rounded">
  Tab Label
</button>
```

## Responsive Navigation Patterns

### Horizontal Scrolling Tabs
```tsx
const ResponsiveTabNavigation = ({ tabs, activeTab, onTabChange }) => (
  <div className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`
          flex-shrink-0 py-2 px-1 text-xs sm:text-sm mobile-touch-target
          border-b-2 transition-colors
          ${activeTab === tab.id 
            ? 'border-blue-600 text-blue-600' 
            : 'border-transparent text-gray-600'
          }
        `}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
```

### Responsive Modal Implementation
```tsx
const ResponsiveModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Modal Title</h2>
          <button 
            onClick={onClose}
            className="mobile-touch-target p-2 hover:bg-gray-100 rounded"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
```

## Form Patterns

### Responsive Form Layout
```tsx
const ResponsiveForm = () => (
  <form className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          First Name
        </label>
        <input 
          type="text"
          className="w-full px-3 py-3 border border-gray-300 rounded-lg mobile-touch-target"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Last Name
        </label>
        <input 
          type="text"
          className="w-full px-3 py-3 border border-gray-300 rounded-lg mobile-touch-target"
        />
      </div>
    </div>
    
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      <button 
        type="submit"
        className="flex-1 mobile-touch-target bg-blue-600 text-white rounded-lg py-3"
      >
        Submit
      </button>
      <button 
        type="button"
        className="flex-1 mobile-touch-target bg-gray-200 text-gray-900 rounded-lg py-3"
      >
        Cancel
      </button>
    </div>
  </form>
);
```

## Chart and Data Visualization

### Responsive Chart Container
```tsx
const ResponsiveChart = ({ data, type = 'line' }) => {
  const isMobile = window.innerWidth < 640;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <ResponsiveContainer 
        width="100%" 
        height={isMobile ? 200 : 300}
      >
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            fontSize={isMobile ? 10 : 12}
            angle={isMobile ? -45 : 0}
            textAnchor={isMobile ? "end" : "middle"}
            height={isMobile ? 60 : 30}
          />
          <YAxis fontSize={isMobile ? 10 : 12} />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#2563eb" 
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

## Data Table Patterns

### Mobile-Optimized Table
```tsx
const ResponsiveTable = ({ data, columns }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(column => (
              <th 
                key={column.key}
                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map(column => (
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
```

## Utility Classes and Helpers

### Custom CSS Classes
```css
/* Hide scrollbars while maintaining functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Ensure touch targets meet accessibility requirements */
.mobile-touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}

/* Responsive text truncation */
.text-responsive-truncate {
  @apply truncate;
}

@media (min-width: 640px) {
  .text-responsive-truncate {
    white-space: normal;
  }
}
```

### JavaScript Helpers
```tsx
// Hook for responsive breakpoints
const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('mobile');
  
  useEffect(() => {
    const checkBreakpoint = () => {
      if (window.innerWidth >= 1024) setBreakpoint('desktop');
      else if (window.innerWidth >= 768) setBreakpoint('tablet');
      else setBreakpoint('mobile');
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);
  
  return breakpoint;
};

// Responsive container hook
const useResponsiveContainer = () => {
  const breakpoint = useBreakpoint();
  
  return {
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    getColumns: (mobile: number, tablet: number, desktop: number) => {
      switch (breakpoint) {
        case 'mobile': return mobile;
        case 'tablet': return tablet;
        case 'desktop': return desktop;
        default: return mobile;
      }
    }
  };
};
```

## Testing Implementation

### Component Testing Pattern
```tsx
// Mobile responsiveness test for components
describe('Component Mobile Responsiveness', () => {
  const resizeWindow = (width: number, height: number) => {
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

  it('should render mobile layout correctly', () => {
    resizeWindow(375, 667); // iPhone SE
    render(<Component />);
    
    // Test mobile-specific layout
    expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
  });

  it('should have touch-friendly targets', () => {
    render(<Component />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });
});
```

## Performance Considerations

### Code Splitting for Mobile
```tsx
// Lazy load heavy components
const AdvancedChart = lazy(() => import('./AdvancedChart'));
const DesktopOnlyFeature = lazy(() => import('./DesktopOnlyFeature'));

const ResponsiveComponent = () => {
  const isMobile = window.innerWidth < 768;
  
  return (
    <div>
      {isMobile ? (
        <SimpleChart />
      ) : (
        <Suspense fallback={<ChartSkeleton />}>
          <AdvancedChart />
        </Suspense>
      )}
    </div>
  );
};
```

### Image Optimization
```tsx
const ResponsiveImage = ({ src, alt, ...props }) => (
  <picture>
    <source 
      media="(max-width: 640px)" 
      srcSet={`${src}-mobile.webp`} 
    />
    <source 
      media="(min-width: 641px)" 
      srcSet={`${src}-desktop.webp`} 
    />
    <img 
      src={`${src}-fallback.jpg`} 
      alt={alt} 
      loading="lazy"
      {...props}
    />
  </picture>
);
```

---

*This guide reflects the mobile-first patterns implemented across Astral Draft components as of August 5, 2025.*
