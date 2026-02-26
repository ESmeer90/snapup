import React, { useState, useEffect, useCallback } from 'react';
import { skipWaiting } from '@/lib/sw-register';
import { RefreshCw, X, Sparkles } from 'lucide-react';

/**
 * AppUpdateBanner
 * 
 * Shows a smooth slide-down banner when a new service worker version is detected.
 * Listens for the 'sw-update-available' custom event dispatched by main.tsx.
 * Provides "Update Now" (triggers SKIP_WAITING + reload) and "Dismiss" buttons.
 * Styled with SnapUp blue gradient to match brand.
 */
const AppUpdateBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleSWUpdate = () => {
      // Don't show if user already dismissed in this session
      if (!dismissed) {
        setVisible(true);
      }
    };

    window.addEventListener('sw-update-available', handleSWUpdate);
    return () => window.removeEventListener('sw-update-available', handleSWUpdate);
  }, [dismissed]);

  const handleUpdate = useCallback(() => {
    setUpdating(true);
    // Tell the waiting service worker to activate
    skipWaiting();
    // Small delay for visual feedback, then reload
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[110]"
      style={{
        animation: 'slideDownBanner 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}
    >
      <style>{`
        @keyframes slideDownBanner {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spinIcon {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Gradient banner */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg shadow-blue-900/20">
        {/* Safe area padding for notched devices */}
        <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Left: Message */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold leading-tight">
                    A new version of SnapUp is available
                  </p>
                  <p className="text-blue-200 text-xs mt-0.5 hidden sm:block">
                    Update now for the latest features, bug fixes, and HD splash screen
                  </p>
                </div>
              </div>

              {/* Right: Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 font-bold text-sm rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-all shadow-sm disabled:opacity-70 disabled:cursor-wait"
                >
                  <RefreshCw
                    className="w-4 h-4"
                    style={updating ? { animation: 'spinIcon 0.6s linear infinite' } : undefined}
                  />
                  {updating ? 'Updating...' : 'Update Now'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/25 text-white transition-all"
                  aria-label="Dismiss update banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppUpdateBanner;
