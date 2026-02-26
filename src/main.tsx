
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSentry } from './lib/sentry'
import { registerServiceWorker } from './lib/sw-register'

// Initialize error monitoring (async, non-blocking)
initSentry().catch(() => {
  console.warn('[SnapUp] Error monitoring initialization failed');
});

// Register Service Worker for PWA support
// Critical for SA users on intermittent 3G/4G networks
if ('serviceWorker' in navigator) {
  // Wait for page load to not block initial render
  window.addEventListener('load', () => {
    registerServiceWorker({
      onSuccess: (registration) => {
        console.log('[SnapUp] PWA ready — offline support active');
        console.log('[SnapUp] SW scope:', registration.scope);
      },
      onUpdate: (registration) => {
        console.log('[SnapUp] New version available');
        // Dispatch event for UI to show update banner
        window.dispatchEvent(new CustomEvent('sw-update-available', { 
          detail: { registration } 
        }));
      },
      onOffline: () => {
        console.log('[SnapUp] App is offline — using cached data');
      },
      onOnline: () => {
        console.log('[SnapUp] App is back online — syncing data');
      },
      onError: (error) => {
        console.warn('[SnapUp] Service worker registration failed:', error);
      },
    });
  });
}

// Remove dark mode class addition
createRoot(document.getElementById("root")!).render(<App />);

// Signal to splash screen that the app is ready
// This triggers the smooth fade-out of the splash screen
requestAnimationFrame(() => {
  // Small delay to ensure first paint is complete
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('snapup-ready'));
  }, 300);
});

