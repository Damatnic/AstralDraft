/**
 * Main App Component with Production Authentication
 * Integrates production JWT auth system with Oracle interface and notifications
 * Enhanced with performance optimizations for real-time interactions
 */

import React, { useState, memo } from 'react';
import ProductionAuthProvider, { useProductionAuth } from '../contexts/ProductionAuthContext';
import ProductionLoginInterface from '../components/auth/ProductionLoginInterface';
import MobileOptimizedOracleInterface from '../components/oracle/MobileOptimizedOracleInterface';
import NotificationDemo from '../components/oracle/NotificationDemo';
import UserSettings from '../components/auth/UserSettings';
import NotificationCenter from '../components/oracle/NotificationCenter';
import OraclePerformanceDashboard from '../components/oracle/OraclePerformanceDashboard';
import OracleCacheDashboard from '../components/oracle/OracleCacheDashboard';
import { motion } from 'framer-motion';
import { LogOutIcon, SettingsIcon, TestTubeIcon, ActivityIcon, DatabaseIcon } from 'lucide-react';

// Memoized AppContent for better performance
const AppContent: React.FC = memo(() => {
    const { user, isAuthenticated, logout, isLoading } = useProductionAuth();
    const [showSettings, setShowSettings] = useState(false);
    const [showDemo, setShowDemo] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);
    const [showCache, setShowCache] = useState(false);

    // Show loading state while authenticating
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <ProductionLoginInterface />;
    }

    if (showSettings) {
        return (
            <div className="min-h-screen bg-gray-900">
                <div className="max-w-4xl mx-auto p-4">
                    {/* Settings Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setShowSettings(false)}
                            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <span>← Back to Oracle</span>
                        </button>
                        <div className="flex items-center space-x-3">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                style={{ backgroundColor: user?.customization.backgroundColor }}
                            >
                                {user?.customization.emoji}
                            </div>
                            <span className="text-white font-medium">{user?.displayName}</span>
                        </div>
                    </div>
                    
                    <UserSettings />
                </div>
            </div>
        );
    }

    if (showDemo) {
        return (
            <div className="min-h-screen bg-gray-900">
                <div className="max-w-6xl mx-auto p-4">
                    {/* Demo Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setShowDemo(false)}
                            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <span>← Back to Oracle</span>
                        </button>
                        <div className="flex items-center space-x-3">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                style={{ backgroundColor: user?.customization.backgroundColor }}
                            >
                                {user?.customization.emoji}
                            </div>
                            <span className="text-white font-medium">{user?.displayName}</span>
                        </div>
                    </div>
                    
                    <NotificationDemo />
                </div>
            </div>
        );
    }

    if (showCache) {
        return (
            <div className="min-h-screen bg-gray-900">
                <div className="max-w-7xl mx-auto p-4">
                    {/* Cache Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setShowCache(false)}
                            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <span>← Back to Oracle</span>
                        </button>
                        <div className="flex items-center space-x-3">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                style={{ backgroundColor: user?.customization.backgroundColor }}
                            >
                                {user?.customization.emoji}
                            </div>
                            <span className="text-white font-medium">{user?.displayName}</span>
                        </div>
                    </div>
                    
                    <OracleCacheDashboard />
                </div>
            </div>
        );
    }

    if (showPerformance) {
        return (
            <div className="min-h-screen bg-gray-900">
                <div className="max-w-7xl mx-auto p-4">
                    {/* Performance Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setShowPerformance(false)}
                            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <span>← Back to Oracle</span>
                        </button>
                        <div className="flex items-center space-x-3">
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                style={{ backgroundColor: user?.customization.backgroundColor }}
                            >
                                {user?.customization.emoji}
                            </div>
                            <span className="text-white font-medium">{user?.displayName}</span>
                        </div>
                    </div>
                    
                    <OraclePerformanceDashboard />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-xl font-bold text-white">🔮 Astral Draft Oracle</h1>
                            {user?.isAdmin && (
                                <span className="bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded text-xs font-medium">
                                    ADMIN
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            {/* User Info */}
                            <div className="flex items-center space-x-2">
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                    style={{ backgroundColor: user?.customization.backgroundColor }}
                                >
                                    {user?.customization.emoji}
                                </div>
                                <span className="text-white font-medium">{user?.displayName}</span>
                            </div>
                            
                            {/* Notification Center */}
                            <NotificationCenter className="relative" />
                            
                            {/* Cache Dashboard Button */}
                            <button
                                onClick={() => setShowCache(true)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                title="Cache Dashboard"
                            >
                                <DatabaseIcon className="w-5 h-5" />
                            </button>
                            
                            {/* Performance Dashboard Button */}
                            <button
                                onClick={() => setShowPerformance(true)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                title="Performance Dashboard"
                            >
                                <ActivityIcon className="w-5 h-5" />
                            </button>
                            
                            {/* Demo Button */}
                            <button
                                onClick={() => setShowDemo(true)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                title="Notification Demo"
                            >
                                <TestTubeIcon className="w-5 h-5" />
                            </button>
                            
                            {/* Settings Button */}
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                title="Settings"
                            >
                                <SettingsIcon className="w-5 h-5" />
                            </button>
                            
                            {/* Logout Button */}
                            <button
                                onClick={logout}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Logout"
                            >
                                <LogOutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <MobileOptimizedOracleInterface />
                </motion.div>
            </div>
        </div>
    );
});

const AstralDraftApp: React.FC = () => {
    return (
        <ProductionAuthProvider>
            <AppContent />
        </ProductionAuthProvider>
    );
};

export default AstralDraftApp;
