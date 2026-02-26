// SnapUp Service Worker Registration
// Handles SW registration, updates, and online/offline events

export interface SWRegistrationCallbacks {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
  onError?: (error: Error) => void;
}

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(callbacks: SWRegistrationCallbacks = {}): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    swRegistration = registration;

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            console.log('[SW] New version available');
            callbacks.onUpdate?.(registration);
          } else {
            // First install
            console.log('[SW] Service worker installed successfully');
            callbacks.onSuccess?.(registration);
          }
        }
      });
    });

    // If already active
    if (registration.active) {
      console.log('[SW] Service worker already active');
      callbacks.onSuccess?.(registration);
    }

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      
      switch (type) {
        case 'SYNC_COMPLETE':
          console.log('[SW] Background sync complete:', data);
          window.dispatchEvent(new CustomEvent('sw-sync-complete', { detail: data }));
          break;
          
        case 'MESSAGE_QUEUED':
          console.log('[SW] Message queued for offline send');
          window.dispatchEvent(new CustomEvent('sw-message-queued', { detail: data }));
          break;
          
        case 'CACHED_MESSAGES':
          window.dispatchEvent(new CustomEvent('sw-cached-messages', { detail: data }));
          break;
          
        case 'CACHE_VERSION':
          console.log('[SW] Cache version:', data?.version);
          break;
      }
    });

    // Online/Offline events
    window.addEventListener('online', () => {
      console.log('[SW] Back online - triggering sync');
      callbacks.onOnline?.();
      triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('[SW] Gone offline');
      callbacks.onOffline?.();
    });

    // Check for updates periodically (every 30 minutes)
    setInterval(() => {
      registration.update().catch(() => {});
    }, 30 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    callbacks.onError?.(error as Error);
    return null;
  }
}

export function getRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}

export async function triggerSync(): Promise<void> {
  if (!swRegistration) return;
  
  try {
    // Use Background Sync API if available
    if ('sync' in swRegistration) {
      await (swRegistration as any).sync.register('sync-messages');
      console.log('[SW] Background sync registered');
    }
  } catch (err) {
    console.warn('[SW] Background sync registration failed:', err);
  }
}

export function skipWaiting(): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function sendToSW(type: string, data?: any): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type, data });
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isPWAInstalled(): boolean {
  return isStandalone();
}
