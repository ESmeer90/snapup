import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, AlertTriangle, X, Loader2, CheckCircle2 } from 'lucide-react';

interface SessionExpiredBannerProps {
  /** Where the banner appears: 'global' for top-of-page, 'inline' for within a component */
  variant?: 'global' | 'inline';
  /** Optional callback after successful refresh */
  onRefreshed?: () => void;
  /** Optional: force show even if sessionExpired is false (for checkout error states) */
  forceShow?: boolean;
  /** Optional: custom message */
  message?: string;
}

const SessionExpiredBanner: React.FC<SessionExpiredBannerProps> = ({
  variant = 'global',
  onRefreshed,
  forceShow = false,
  message,
}) => {
  const { sessionExpired, refreshSessionNow, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<'idle' | 'success' | 'failed'>('idle');
  const [dismissed, setDismissed] = useState(false);

  // Only show if there's a user and session is expired (or forceShow)
  const shouldShow = !dismissed && user && (sessionExpired || forceShow);
  if (!shouldShow) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult('idle');

    try {
      const success = await refreshSessionNow();
      if (success) {
        setRefreshResult('success');
        onRefreshed?.();
        // Auto-dismiss after success
        setTimeout(() => {
          setDismissed(true);
          setRefreshResult('idle');
        }, 2000);
      } else {
        setRefreshResult('failed');
      }
    } catch {
      setRefreshResult('failed');
    } finally {
      setRefreshing(false);
    }
  };

  if (variant === 'inline') {
    return (
      <div className={`rounded-xl border p-4 ${
        refreshResult === 'success'
          ? 'bg-green-50 border-green-200'
          : refreshResult === 'failed'
          ? 'bg-red-50 border-red-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          {refreshResult === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {refreshResult === 'success' ? (
              <>
                <p className="text-sm font-semibold text-green-800">Session Refreshed</p>
                <p className="text-xs text-green-700 mt-0.5">Your session has been restored. You can now retry your action.</p>
              </>
            ) : refreshResult === 'failed' ? (
              <>
                <p className="text-sm font-semibold text-red-800">Session Refresh Failed</p>
                <p className="text-xs text-red-700 mt-0.5">Please sign out and sign back in to continue.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-amber-800">
                  {message || 'Session Expired'}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your login session has expired. Click below to refresh it automatically.
                </p>
              </>
            )}
            {refreshResult !== 'success' && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 text-amber-800 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-all disabled:opacity-50"
              >
                {refreshing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Refreshing...</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5" /> Refresh Session</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Global banner (top of page)
  return (
    <div className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
      refreshResult === 'success'
        ? 'bg-green-600'
        : refreshResult === 'failed'
        ? 'bg-red-600'
        : 'bg-amber-500'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {refreshResult === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
          )}
          <p className="text-sm text-white font-medium truncate">
            {refreshResult === 'success'
              ? 'Session refreshed successfully!'
              : refreshResult === 'failed'
              ? 'Session refresh failed — please sign out and sign back in'
              : message || 'Your session has expired — click to refresh'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {refreshResult !== 'success' && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {refreshing ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Refreshing</>
              ) : (
                <><RefreshCw className="w-3 h-3" /> Refresh</>
              )}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded transition-all"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredBanner;
