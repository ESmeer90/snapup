import { supabase } from '@/lib/supabase';

// Lightweight Sentry-like error tracking
// Fetches DSN from edge function and reports errors

let sentryDsn: string | null = null;
let sentryInitialized = false;
let errorQueue: Array<{ message: string; stack?: string; context?: Record<string, any> }> = [];

// Parse Sentry DSN to extract project ID and key
function parseDsn(dsn: string): { publicKey: string; host: string; projectId: string } | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.hostname;
    const projectId = url.pathname.replace('/', '');
    if (!publicKey || !host || !projectId) return null;
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

// Send error to Sentry via their envelope API
async function sendToSentry(error: { message: string; stack?: string; context?: Record<string, any> }) {
  if (!sentryDsn) return;
  
  const parsed = parseDsn(sentryDsn);
  if (!parsed) return;

  const envelope = {
    event_id: crypto.randomUUID?.() || Math.random().toString(36).substring(2),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level: 'error',
    logger: 'snapup.frontend',
    release: 'snapup@1.0.0',
    environment: 'production',
    exception: {
      values: [{
        type: 'Error',
        value: error.message,
        stacktrace: error.stack ? {
          frames: error.stack.split('\n').slice(0, 10).map(line => ({
            filename: line.trim(),
            function: line.trim(),
          })),
        } : undefined,
      }],
    },
    tags: {
      app: 'snapup',
      platform: 'web',
      ...(error.context?.tags || {}),
    },
    extra: error.context || {},
    request: {
      url: window.location.href,
      headers: {
        'User-Agent': navigator.userAgent,
      },
    },
  };

  try {
    const storeUrl = `https://${parsed.host}/api/${parsed.projectId}/store/?sentry_key=${parsed.publicKey}&sentry_version=7`;
    
    await fetch(storeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
  } catch (sendErr) {
    // Silently fail - don't cause more errors from error reporting
    console.warn('[Sentry] Failed to send error:', sendErr);
  }
}

// Initialize Sentry by fetching DSN from edge function
export async function initSentry(): Promise<void> {
  if (sentryInitialized) return;
  sentryInitialized = true;

  try {
    const { data, error } = await supabase.functions.invoke('get-sentry-config', {
      body: {},
    });

    if (error || !data?.dsn) {
      console.warn('[Sentry] Could not fetch config:', error?.message || 'No DSN returned');
      return;
    }

    sentryDsn = data.dsn;
    console.log('[Sentry] Initialized with DSN');

    // Flush queued errors
    for (const queuedError of errorQueue) {
      await sendToSentry(queuedError);
    }
    errorQueue = [];

    // Set up global error handlers
    window.addEventListener('error', (event) => {
      captureException(event.error || new Error(event.message), {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      captureException(error, { source: 'unhandledrejection' });
    });

  } catch (err) {
    console.warn('[Sentry] Init failed:', err);
  }
}

// Capture an exception
export function captureException(error: Error | string, context?: Record<string, any>): void {
  const errorObj = {
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    context,
  };

  // Log to console for debugging
  console.error('[Sentry] Captured:', errorObj.message);

  if (sentryDsn) {
    sendToSentry(errorObj);
  } else {
    // Queue for later if DSN not yet loaded
    errorQueue.push(errorObj);
  }
}

// Capture a message (non-error)
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
  captureException(message, { ...context, level });
}

// Set user context for error reports
export function setUser(user: { id: string; email?: string } | null): void {
  // Store user context for future error reports
  if (user) {
    (window as any).__sentry_user = user;
  } else {
    delete (window as any).__sentry_user;
  }
}
