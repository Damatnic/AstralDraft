/**
 * Common TypeScript interfaces and types for view components
 * Provides reusable type definitions for consistent component interfaces
 */

import type { League, User } from '../types';

// Base props that many view components share
export interface BaseViewProps {
  className?: string;
  'data-testid'?: string;
}

// Props for views that work with league data
export interface LeagueViewProps extends BaseViewProps {
  league?: League;
  leagueId?: string;
}

// Props for views that need user context
export interface UserViewProps extends BaseViewProps {
  user?: User;
  userId?: string;
}

// Combined props for complex views
export interface ComplexViewProps extends LeagueViewProps, UserViewProps {
  // Additional props for views that need multiple contexts
}

// Props for views with navigation capabilities
export interface NavigableViewProps extends BaseViewProps {
  onNavigate?: (view: string, data?: any) => void;
  onBack?: () => void;
}

// Props for modal/overlay views
export interface ModalViewProps extends BaseViewProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
}

// Props for views with loading states
export interface LoadableViewProps extends BaseViewProps {
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Props for views with data fetching
export interface DataViewProps extends LoadableViewProps {
  refreshInterval?: number;
  autoRefresh?: boolean;
  onRefresh?: () => void;
}

// Generic props for analytics/reporting views
export interface AnalyticsViewProps extends DataViewProps, LeagueViewProps {
  timeframe?: 'week' | 'season' | 'all';
  selectedWeek?: number;
  selectedSeason?: number;
}

// Props for Oracle-specific views
export interface OracleViewProps extends AnalyticsViewProps {
  predictionType?: 'player' | 'game' | 'season';
  confidenceThreshold?: number;
  showDebugInfo?: boolean;
}

// Error boundary fallback props
export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  fallbackMessage?: string;
}

// Higher-order component props for wrapping views with error boundaries
export interface WithErrorBoundaryProps {
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
