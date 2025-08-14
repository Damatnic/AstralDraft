import React, { useState, useEffect } from 'react';
import { useAdvancedTouchGestures } from '../../hooks/useAdvancedTouchGestures';
import { useMobileOfflineManager } from '../../hooks/useMobileOfflineManager';
import { 
  usePWAInstall, 
  useMobileImageOptimization, 
  useNetworkAwareLoading,
  detectMobileCapabilities 
} from '../../utils/mobilePerformanceUtils';
import MobileGestureNavigation from '../mobile/MobileGestureNavigation';

interface MobileFeaturesTestPageProps {
  className?: string;
}

interface TabButtonProps {
  tab: string;
  label: string;
  isActive: boolean;
  onClick: (tab: string) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, label, isActive, onClick }) => (
  <button
    onClick={() => onClick(tab)}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-500 text-white'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
    }`}
  >
    {label}
  </button>
);

export const MobileFeaturesTestPage: React.FC<MobileFeaturesTestPageProps> = ({ 
  className = '' 
}) => {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'gestures' | 'offline' | 'pwa' | 'performance'>('gestures');

  // Initialize mobile capabilities
  useEffect(() => {
    const capabilities = detectMobileCapabilities();
    setDeviceInfo(capabilities);
  }, []);

  // Gesture testing
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    onDoubleTap,
    onPinch,
    isGestureActive,
    gestureState
  } = useAdvancedTouchGestures({
    swipe: {
      threshold: 30,
      velocityThreshold: 0.3,
      direction: 'all',
      preventScroll: false
    },
    longPress: {
      threshold: 10,
      duration: 600
    },
    doubleTap: {
      threshold: 30,
      delay: 400
    },
    pinch: {
      threshold: 1.1,
      preventZoom: false
    }
  });

  // Offline functionality testing
  const {
    connectionStatus,
    pendingData,
    syncStatus,
    storeOfflineData,
    isOfflineCapable
  } = useMobileOfflineManager();

  // PWA testing
  const {
    isInstallable,
    showInstallPrompt
  } = usePWAInstall();

  // Image optimization testing
  const {
    optimizeImageForMobile,
    isLowEndDevice
  } = useMobileImageOptimization();

  // Network-aware loading
  const {
    connectionInfo,
    isSlowConnection
  } = useNetworkAwareLoading();

  // Set up gesture callbacks
  useEffect(() => {
    onSwipeLeft(() => {
      setTestResults(prev => ({ ...prev, swipeLeft: true }));
      updateTestStatus('Swipe Left detected ✅');
    });

    onSwipeRight(() => {
      setTestResults(prev => ({ ...prev, swipeRight: true }));
      updateTestStatus('Swipe Right detected ✅');
    });

    onSwipeUp(() => {
      setTestResults(prev => ({ ...prev, swipeUp: true }));
      updateTestStatus('Swipe Up detected ✅');
    });

    onSwipeDown(() => {
      setTestResults(prev => ({ ...prev, swipeDown: true }));
      updateTestStatus('Swipe Down detected ✅');
    });

    onLongPress(() => {
      setTestResults(prev => ({ ...prev, longPress: true }));
      updateTestStatus('Long Press detected ✅');
    });

    onDoubleTap(() => {
      setTestResults(prev => ({ ...prev, doubleTap: true }));
      updateTestStatus('Double Tap detected ✅');
    });

    onPinch(() => {
      setTestResults(prev => ({ ...prev, pinch: true }));
      updateTestStatus('Pinch gesture detected ✅');
    });
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onLongPress, onDoubleTap, onPinch]);

  const [statusMessages, setStatusMessages] = useState<string[]>([]);

  const updateTestStatus = (message: string) => {
    setStatusMessages(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testOfflineFeature = async () => {
    try {
      const dataId = await storeOfflineData('analytics', {
        event: 'test_mobile_feature',
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      setTestResults(prev => ({ ...prev, offlineStorage: true }));
      updateTestStatus(`Offline data stored: ${dataId} ✅`);
    } catch (error) {
      updateTestStatus(`Offline storage failed: ${error} ❌`);
    }
  };

  const testImageOptimization = async () => {
    try {
      // Test with a small sample image
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#3B82F6';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px sans-serif';
        ctx.fillText('TEST', 25, 55);
        
        const originalUrl = canvas.toDataURL();
        await optimizeImageForMobile(originalUrl, {
          width: 50,
          height: 50,
          quality: 0.7
        });
        
        setTestResults(prev => ({ ...prev, imageOptimization: true }));
        updateTestStatus('Image optimization successful ✅');
      }
    } catch (error) {
      updateTestStatus(`Image optimization failed: ${error} ❌`);
    }
  };

  const runAllTests = async () => {
    setTestResults({});
    setStatusMessages([]);
    updateTestStatus('Starting comprehensive mobile test suite...');
    
    // Test offline capabilities
    if (isOfflineCapable) {
      await testOfflineFeature();
    } else {
      updateTestStatus('Offline features not supported ❌');
    }
    
    // Test image optimization
    await testImageOptimization();
    
    // Test PWA features
    if (isInstallable) {
      setTestResults(prev => ({ ...prev, pwaInstallable: true }));
      updateTestStatus('PWA installable ✅');
    } else {
      updateTestStatus('PWA not installable ❌');
    }
    
    // Test network detection
    if (connectionInfo) {
      setTestResults(prev => ({ ...prev, networkDetection: true }));
      updateTestStatus(`Network detection: ${connectionInfo.effectiveType} ✅`);
    }
    
    updateTestStatus('Test suite completed. Try gestures in the test area below.');
  };

  const getPassedTestsCount = () => Object.values(testResults).filter(Boolean).length;
  const getTotalTestsCount = () => Object.keys(testResults).length;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'gestures' | 'offline' | 'pwa' | 'performance');
  };

  return (
    <div className={`mobile-features-test-page ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Mobile Features Test Suite
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive testing of advanced mobile features including gestures, offline capabilities, and PWA functionality.
        </p>
      </div>

      {/* Device Information */}
      <div className="device-info mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Device Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Device Type:</span> {isLowEndDevice ? 'Low-end' : 'High-end'}
          </div>
          <div>
            <span className="font-medium">Pixel Ratio:</span> {deviceInfo?.devicePixelRatio || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Hardware Cores:</span> {deviceInfo?.hardwareConcurrency || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Connection:</span> {connectionInfo?.effectiveType || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Online Status:</span> {connectionStatus.isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
          <div>
            <span className="font-medium">PWA Support:</span> {isOfflineCapable ? '✅ Yes' : '❌ No'}
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="test-controls mb-6 flex flex-wrap gap-3">
        <button
          onClick={runAllTests}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg 
                     transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Run All Tests
        </button>
        
        {isInstallable && (
          <button
            onClick={showInstallPrompt}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg 
                       transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Install PWA
          </button>
        )}
        
        <button
          onClick={() => {
            setTestResults({});
            setStatusMessages([]);
          }}
          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg 
                     transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Reset Tests
        </button>
      </div>

      {/* Test Results Summary */}
      {getTotalTestsCount() > 0 && (
        <div className="test-summary mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Test Results</h3>
          <div className="text-lg">
            <span className="font-bold text-green-600 dark:text-green-400">
              {getPassedTestsCount()}
            </span>
            <span className="text-gray-600 dark:text-gray-400"> / </span>
            <span className="font-bold">{getTotalTestsCount()}</span>
            <span className="text-gray-600 dark:text-gray-400"> tests passed</span>
          </div>
          
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {Object.entries(testResults).map(([test, passed]) => (
              <div key={test} className={`px-2 py-1 rounded ${
                passed ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                       : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
              }`}>
                {passed ? '✅' : '❌'} {test}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation mb-6">
        <div className="flex space-x-2 mb-4">
          <TabButton tab="gestures" label="Touch Gestures" isActive={activeTab === 'gestures'} onClick={handleTabChange} />
          <TabButton tab="offline" label="Offline Features" isActive={activeTab === 'offline'} onClick={handleTabChange} />
          <TabButton tab="pwa" label="PWA Features" isActive={activeTab === 'pwa'} onClick={handleTabChange} />
          <TabButton tab="performance" label="Performance" isActive={activeTab === 'performance'} onClick={handleTabChange} />
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'gestures' && (
            <div className="gestures-tab">
              <h3 className="text-lg font-semibold mb-4">Touch Gesture Testing</h3>
              
              <MobileGestureNavigation
                onNavigate={(direction) => {
                  updateTestStatus(`Navigation gesture: ${direction}`);
                }}
                onMenuToggle={() => {
                  updateTestStatus('Menu toggle gesture detected');
                }}
                onQuickAction={() => {
                  updateTestStatus('Quick action gesture detected');
                }}
                className="min-h-[300px] mb-4"
              />
              
              {/* Gesture Status */}
              <div className="gesture-status p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    Gesture Status: {isGestureActive ? '🤏 Active' : '⚪ Idle'}
                  </span>
                  {gestureState.distance > 0 && (
                    <span className="text-sm">Distance: {Math.round(gestureState.distance)}px</span>
                  )}
                </div>
                
                {gestureState.direction && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Direction: {gestureState.direction} | 
                    Velocity: {gestureState.velocity.toFixed(2)}px/ms
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'offline' && (
            <div className="offline-tab">
              <h3 className="text-lg font-semibold mb-4">Offline Capabilities</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="offline-status p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-medium mb-2">Connection Status</h4>
                  <div className="space-y-1 text-sm">
                    <div>Status: {connectionStatus.isOnline ? '🟢 Online' : '🔴 Offline'}</div>
                    <div>Type: {connectionStatus.connectionType || 'Unknown'}</div>
                    <div>Speed: {connectionStatus.effectiveType || 'Unknown'}</div>
                  </div>
                </div>
                
                <div className="sync-status p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-medium mb-2">Sync Status</h4>
                  <div className="space-y-1 text-sm">
                    <div>Status: {syncStatus}</div>
                    <div>Pending Items: {pendingData.length}</div>
                    <div>Offline Capable: {isOfflineCapable ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={testOfflineFeature}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg"
              >
                Test Offline Storage
              </button>
            </div>
          )}

          {activeTab === 'pwa' && (
            <div className="pwa-tab">
              <h3 className="text-lg font-semibold mb-4">Progressive Web App Features</h3>
              
              <div className="space-y-4">
                <div className="pwa-install p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-medium mb-2">PWA Installation</h4>
                  <div className="text-sm mb-3">
                    Status: {isInstallable ? '✅ Ready to install' : '❌ Not installable'}
                  </div>
                  
                  {isInstallable && (
                    <button
                      onClick={showInstallPrompt}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                    >
                      Install App
                    </button>
                  )}
                </div>
                
                <div className="service-worker p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-medium mb-2">Service Worker</h4>
                  <div className="text-sm">
                    Status: {'serviceWorker' in navigator ? '✅ Supported' : '❌ Not supported'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="performance-tab">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="device-performance p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-medium mb-2">Device Performance</h4>
                  <div className="space-y-1 text-sm">
                    <div>Device Class: {isLowEndDevice ? 'Low-end' : 'High-end'}</div>
                    <div>Memory Limit: {deviceInfo?.memoryInfo?.jsHeapSizeLimit 
                      ? `${Math.round(deviceInfo.memoryInfo.jsHeapSizeLimit / 1024 / 1024)}MB` 
                      : 'Unknown'}</div>
                    <div>CPU Cores: {deviceInfo?.hardwareConcurrency || 'Unknown'}</div>
                  </div>
                </div>
                
                <div className="network-performance p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-medium mb-2">Network Performance</h4>
                  <div className="space-y-1 text-sm">
                    <div>Connection: {connectionInfo?.effectiveType || 'Unknown'}</div>
                    <div>Data Saver: {connectionInfo?.saveData ? 'On' : 'Off'}</div>
                    <div>Slow Connection: {isSlowConnection ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={testImageOptimization}
                className="mt-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg"
              >
                Test Image Optimization
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Log */}
      <div className="status-log">
        <h3 className="text-lg font-semibold mb-3">Test Activity Log</h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[120px] max-h-[200px] overflow-y-auto">
          {statusMessages.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              Run tests to see activity...
            </p>
          ) : (
            <div className="space-y-1">
              {statusMessages.map((message, index) => (
                <div key={`${message}-${index}`} className="text-xs font-mono text-gray-600 dark:text-gray-400">
                  {message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileFeaturesTestPage;
