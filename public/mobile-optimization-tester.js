/**
 * Mobile Optimization Manual Testing Script
 * Run this in browser console to validate mobile optimizations
 */

(function() {
  'use strict';

  // Test configurations for different devices
  const TEST_DEVICES = [
    { name: 'iPhone SE', width: 320, height: 568, userAgent: 'iPhone' },
    { name: 'iPhone 12', width: 375, height: 812, userAgent: 'iPhone' },
    { name: 'iPhone 12 Pro Max', width: 414, height: 896, userAgent: 'iPhone' },
    { name: 'iPad', width: 768, height: 1024, userAgent: 'iPad' },
    { name: 'iPad Pro', width: 1024, height: 1366, userAgent: 'iPad' },
    { name: 'Desktop', width: 1440, height: 900, userAgent: 'Desktop' }
  ];

  // Touch target minimum size (44px)
  const MIN_TOUCH_TARGET = 44;

  // Test results storage
  let testResults = {
    touchTargets: [],
    viewportResponsiveness: [],
    modalPositioning: [],
    navigationScroll: [],
    gridLayouts: [],
    typography: [],
    chartSizes: [],
    performance: []
  };

  // Utility functions
  function log(message, type = 'info') {
    const styles = {
      info: 'color: #3B82F6; font-weight: bold;',
      success: 'color: #10B981; font-weight: bold;',
      warning: 'color: #F59E0B; font-weight: bold;',
      error: 'color: #EF4444; font-weight: bold;'
    };
    console.log(`%c${message}`, styles[type]);
  }

  function getElementSize(element) {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    return {
      width: rect.width,
      height: rect.height,
      minWidth: parseInt(styles.minWidth) || 0,
      minHeight: parseInt(styles.minHeight) || 0,
      padding: {
        top: parseInt(styles.paddingTop) || 0,
        right: parseInt(styles.paddingRight) || 0,
        bottom: parseInt(styles.paddingBottom) || 0,
        left: parseInt(styles.paddingLeft) || 0
      }
    };
  }

  function testTouchTargets() {
    log('🔍 Testing Touch Target Compliance...', 'info');
    
    const touchElements = document.querySelectorAll('button, a, input, select, [role="button"], .mobile-touch-target');
    let passed = 0;
    let failed = 0;

    touchElements.forEach((element, index) => {
      const size = getElementSize(element);
      const totalWidth = size.width + size.padding.left + size.padding.right;
      const totalHeight = size.height + size.padding.top + size.padding.bottom;
      
      const meetsWidthRequirement = totalWidth >= MIN_TOUCH_TARGET;
      const meetsHeightRequirement = totalHeight >= MIN_TOUCH_TARGET;
      const meetsRequirement = meetsWidthRequirement && meetsHeightRequirement;

      const result = {
        element: element.tagName + (element.className ? `.${element.className.split(' ')[0]}` : ''),
        width: totalWidth,
        height: totalHeight,
        passed: meetsRequirement,
        issues: []
      };

      if (!meetsWidthRequirement) {
        result.issues.push(`Width ${totalWidth}px < ${MIN_TOUCH_TARGET}px`);
      }
      if (!meetsHeightRequirement) {
        result.issues.push(`Height ${totalHeight}px < ${MIN_TOUCH_TARGET}px`);
      }

      testResults.touchTargets.push(result);

      if (meetsRequirement) {
        passed++;
      } else {
        failed++;
        log(`❌ ${result.element}: ${result.issues.join(', ')}`, 'error');
      }
    });

    log(`✅ Touch Targets: ${passed} passed, ${failed} failed`, passed === touchElements.length ? 'success' : 'warning');
    return { passed, failed, total: touchElements.length };
  }

  function testViewportResponsiveness() {
    log('📱 Testing Viewport Responsiveness...', 'info');
    
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    let allPassed = true;

    TEST_DEVICES.forEach(device => {
      try {
        // Simulate device viewport
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: device.width
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: device.height
        });

        // Trigger resize event
        window.dispatchEvent(new Event('resize'));

        // Small delay to allow React hooks to update
        setTimeout(() => {
          const issues = [];
          
          // Check for horizontal scrollbars
          if (document.body.scrollWidth > device.width) {
            issues.push('Horizontal scrollbar detected');
          }

          // Check for elements extending beyond viewport
          const elements = document.querySelectorAll('*');
          let overflowElements = 0;
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > device.width + 10) { // 10px tolerance
              overflowElements++;
            }
          });

          if (overflowElements > 0) {
            issues.push(`${overflowElements} elements overflow viewport`);
          }

          const result = {
            device: device.name,
            width: device.width,
            height: device.height,
            passed: issues.length === 0,
            issues
          };

          testResults.viewportResponsiveness.push(result);

          if (result.passed) {
            log(`✅ ${device.name} (${device.width}x${device.height}): Responsive`, 'success');
          } else {
            log(`❌ ${device.name} (${device.width}x${device.height}): ${issues.join(', ')}`, 'error');
            allPassed = false;
          }
        }, 100);

      } catch (error) {
        log(`❌ Error testing ${device.name}: ${error.message}`, 'error');
        allPassed = false;
      }
    });

    // Restore original viewport
    setTimeout(() => {
      Object.defineProperty(window, 'innerWidth', { value: originalWidth });
      Object.defineProperty(window, 'innerHeight', { value: originalHeight });
      window.dispatchEvent(new Event('resize'));
    }, 1000);

    return allPassed;
  }

  function testModalPositioning() {
    log('🎭 Testing Modal Positioning...', 'info');
    
    const modals = document.querySelectorAll('[data-testid*="modal"], .fixed[class*="inset"]');
    let passed = 0;
    let failed = 0;

    modals.forEach(modal => {
      const styles = window.getComputedStyle(modal);
      const rect = modal.getBoundingClientRect();
      
      const isMobileWidth = window.innerWidth < 640;
      const hasProperMobilePositioning = isMobileWidth && (
        styles.alignItems === 'flex-end' || 
        styles.bottom === '0px' ||
        modal.className.includes('items-end')
      );
      
      const hasProperDesktopPositioning = !isMobileWidth && (
        styles.alignItems === 'center' ||
        modal.className.includes('items-center')
      );

      const isCorrectlyPositioned = isMobileWidth ? hasProperMobilePositioning : hasProperDesktopPositioning;

      const result = {
        element: modal.className || 'modal',
        isMobile: isMobileWidth,
        positioning: styles.alignItems,
        passed: isCorrectlyPositioned
      };

      testResults.modalPositioning.push(result);

      if (isCorrectlyPositioned) {
        passed++;
        log(`✅ Modal positioned correctly for ${isMobileWidth ? 'mobile' : 'desktop'}`, 'success');
      } else {
        failed++;
        log(`❌ Modal positioning incorrect: ${styles.alignItems}`, 'error');
      }
    });

    return { passed, failed };
  }

  function testNavigationScroll() {
    log('🧭 Testing Navigation Scroll Behavior...', 'info');
    
    const navContainers = document.querySelectorAll('[class*="overflow-x-auto"], .flex.space-x-');
    let passed = 0;
    let failed = 0;

    navContainers.forEach(nav => {
      const styles = window.getComputedStyle(nav);
      const hasHorizontalScroll = styles.overflowX === 'auto' || styles.overflowX === 'scroll';
      const hasFlexLayout = styles.display === 'flex';
      
      // Check if navigation items have proper spacing
      const navItems = nav.querySelectorAll('button, a, [role="tab"]');
      let hasProperSpacing = true;
      
      navItems.forEach(item => {
        const itemStyles = window.getComputedStyle(item);
        if (!itemStyles.whiteSpace || itemStyles.whiteSpace === 'normal') {
          hasProperSpacing = false;
        }
      });

      const isOptimized = hasHorizontalScroll && hasFlexLayout && hasProperSpacing;

      const result = {
        element: nav.className || 'navigation',
        hasHorizontalScroll,
        hasFlexLayout,
        hasProperSpacing,
        passed: isOptimized
      };

      testResults.navigationScroll.push(result);

      if (isOptimized) {
        passed++;
      } else {
        failed++;
      }
    });

    log(`Navigation Scroll: ${passed} optimized, ${failed} need improvement`, passed > failed ? 'success' : 'warning');
    return { passed, failed };
  }

  function testGridLayouts() {
    log('📊 Testing Grid Layout Responsiveness...', 'info');
    
    const grids = document.querySelectorAll('[class*="grid-cols"]');
    let passed = 0;
    let failed = 0;

    grids.forEach(grid => {
      const styles = window.getComputedStyle(grid);
      const classes = grid.className;
      
      // Check for responsive grid classes
      const hasResponsiveColumns = /grid-cols-\d+.*sm:grid-cols-\d+|grid-cols-\d+.*md:grid-cols-\d+/.test(classes);
      const hasResponsiveGaps = /gap-\d+.*sm:gap-\d+/.test(classes);
      
      const result = {
        element: classes.split(' ').find(c => c.includes('grid-cols')) || 'grid',
        hasResponsiveColumns,
        hasResponsiveGaps,
        passed: hasResponsiveColumns
      };

      testResults.gridLayouts.push(result);

      if (hasResponsiveColumns) {
        passed++;
      } else {
        failed++;
        log(`❌ Grid lacks responsive columns: ${result.element}`, 'warning');
      }
    });

    log(`Grid Layouts: ${passed} responsive, ${failed} static`, passed > failed ? 'success' : 'warning');
    return { passed, failed };
  }

  function testTypography() {
    log('🔤 Testing Responsive Typography...', 'info');
    
    const headings = document.querySelectorAll('h1, h2, h3, .text-xl, .text-2xl, .text-3xl, .text-4xl');
    let passed = 0;
    let failed = 0;

    headings.forEach(heading => {
      const classes = heading.className;
      const hasResponsiveSize = /text-\w+.*sm:text-\w+|text-\w+.*md:text-\w+/.test(classes);
      
      const result = {
        element: heading.tagName.toLowerCase(),
        classes: classes,
        hasResponsiveSize,
        passed: hasResponsiveSize
      };

      testResults.typography.push(result);

      if (hasResponsiveSize) {
        passed++;
      } else {
        failed++;
      }
    });

    log(`Typography: ${passed} responsive, ${failed} static`, passed > failed ? 'success' : 'warning');
    return { passed, failed };
  }

  function testChartSizes() {
    log('📈 Testing Chart Container Sizes...', 'info');
    
    const charts = document.querySelectorAll('[data-testid*="chart"], .recharts-wrapper, [class*="ResponsiveContainer"]');
    let passed = 0;
    let failed = 0;

    charts.forEach(chart => {
      const rect = chart.getBoundingClientRect();
      const styles = window.getComputedStyle(chart);
      
      const isMobile = window.innerWidth < 640;
      const expectedHeight = isMobile ? 180 : 200;
      const actualHeight = rect.height;
      
      // Allow 10px tolerance
      const heightMatches = Math.abs(actualHeight - expectedHeight) <= 10;

      const result = {
        element: chart.className || 'chart',
        expectedHeight,
        actualHeight,
        isMobile,
        passed: heightMatches
      };

      testResults.chartSizes.push(result);

      if (heightMatches) {
        passed++;
      } else {
        failed++;
        log(`❌ Chart height mismatch: expected ${expectedHeight}px, got ${actualHeight}px`, 'warning');
      }
    });

    log(`Chart Sizes: ${passed} correct, ${failed} incorrect`, passed >= failed ? 'success' : 'warning');
    return { passed, failed };
  }

  function measurePerformance() {
    log('⚡ Measuring Mobile Performance...', 'info');
    
    const performanceData = {
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      timing: performance.timing ? {
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        pageLoad: performance.timing.loadEventEnd - performance.timing.navigationStart
      } : null,
      resourceCounts: {
        images: document.images.length,
        scripts: document.scripts.length,
        stylesheets: document.styleSheets.length
      }
    };

    testResults.performance.push(performanceData);

    if (performanceData.memoryUsage) {
      log(`Memory Usage: ${performanceData.memoryUsage.used}MB / ${performanceData.memoryUsage.total}MB`, 
          performanceData.memoryUsage.used < 50 ? 'success' : 'warning');
    }

    if (performanceData.timing) {
      log(`Page Load: ${performanceData.timing.pageLoad}ms`, 
          performanceData.timing.pageLoad < 3000 ? 'success' : 'warning');
    }

    return performanceData;
  }

  function generateReport() {
    log('📋 Generating Test Report...', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      testResults,
      summary: {
        touchTargets: testResults.touchTargets.filter(t => t.passed).length + '/' + testResults.touchTargets.length,
        viewportResponsiveness: testResults.viewportResponsiveness.filter(t => t.passed).length + '/' + testResults.viewportResponsiveness.length,
        modalPositioning: testResults.modalPositioning.filter(t => t.passed).length + '/' + testResults.modalPositioning.length,
        navigationScroll: testResults.navigationScroll.filter(t => t.passed).length + '/' + testResults.navigationScroll.length,
        gridLayouts: testResults.gridLayouts.filter(t => t.passed).length + '/' + testResults.gridLayouts.length,
        typography: testResults.typography.filter(t => t.passed).length + '/' + testResults.typography.length,
        chartSizes: testResults.chartSizes.filter(t => t.passed).length + '/' + testResults.chartSizes.length
      }
    };

    console.log('📊 MOBILE OPTIMIZATION TEST REPORT', report);
    
    // Create downloadable report
    const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const reportUrl = URL.createObjectURL(reportBlob);
    
    const link = document.createElement('a');
    link.href = reportUrl;
    link.download = `mobile-optimization-report-${Date.now()}.json`;
    link.click();
    
    log('📥 Report downloaded as JSON file', 'success');
    
    return report;
  }

  // Main test runner
  function runAllTests() {
    log('🚀 Starting Mobile Optimization Validation Tests...', 'info');
    
    // Clear previous results
    testResults = {
      touchTargets: [],
      viewportResponsiveness: [],
      modalPositioning: [],
      navigationScroll: [],
      gridLayouts: [],
      typography: [],
      chartSizes: [],
      performance: []
    };

    // Run all tests
    testTouchTargets();
    testModalPositioning();
    testNavigationScroll();
    testGridLayouts();
    testTypography();
    testChartSizes();
    measurePerformance();
    
    // Viewport responsiveness test runs async
    setTimeout(() => {
      testViewportResponsiveness();
      
      // Generate final report after all tests complete
      setTimeout(() => {
        generateReport();
        log('✅ All mobile optimization tests completed!', 'success');
      }, 2000);
    }, 100);
  }

  // Expose global functions for manual testing
  window.mobileOptimizationTests = {
    runAllTests,
    testTouchTargets,
    testViewportResponsiveness,
    testModalPositioning,
    testNavigationScroll,
    testGridLayouts,
    testTypography,
    testChartSizes,
    measurePerformance,
    generateReport,
    getResults: () => testResults
  };

  log('🔧 Mobile Optimization Testing Suite Loaded!', 'success');
  log('Run window.mobileOptimizationTests.runAllTests() to start testing', 'info');
  
  // Auto-run if specifically requested
  if (window.location.search.includes('autotest=mobile')) {
    setTimeout(runAllTests, 1000);
  }
})();
