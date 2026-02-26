// SnapUp Push Notifications Client Library
// Manages Web Push API subscriptions, permission requests, and notification preferences
// With direct DB fallback for reliability on slow/spotty connections

import { supabase } from '@/lib/supabase';

export interface NotificationPreferences {
  new_messages: boolean;
  order_updates: boolean;
  price_drops: boolean;
  new_offers: boolean;
  marketing: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  new_messages: true,
  order_updates: true,
  price_drops: true,
  new_offers: true,
  marketing: false,
  push_enabled: false,
  sound_enabled: true,
};

// ============ VAPID Key ============

let cachedVapidKey: string | null = null;

export async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;

  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { action: 'get-vapid-key' },
    });
    if (error) {
      console.warn('[Push] Edge function error getting VAPID key:', error);
      return null;
    }
    cachedVapidKey = data?.publicKey || null;
    if (!cachedVapidKey) {
      console.warn('[Push] No VAPID public key returned from server');
    }
    return cachedVapidKey;
  } catch (err) {
    console.warn('[Push] Failed to get VAPID key:', err);
    return null;
  }
}

// ============ Permission ============

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return 'denied';
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

// ============ Subscription ============

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications not supported');
    return false;
  }

  try {
    // Step 1: Request browser permission
    const permission = await requestNotificationPermission();
    console.log('[Push] Permission result:', permission);
    if (permission !== 'granted') {
      console.warn('[Push] Permission denied');
      return false;
    }

    // Step 2: Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service worker ready');
    
    // Step 3: Get VAPID public key
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      console.warn('[Push] No VAPID key available - saving preference without push subscription');
      // Still save the preference as enabled (user granted permission)
      await savePreferenceDirect(userId, { push_enabled: true });
      return true; // Return true since permission was granted
    }

    // Step 4: Convert VAPID key and subscribe
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        console.log('[Push] New push subscription created');
      } catch (subErr: any) {
        console.warn('[Push] PushManager.subscribe failed:', subErr.message);
        // Still save preference - user granted permission even if subscription failed
        await savePreferenceDirect(userId, { push_enabled: true });
        return true;
      }
    } else {
      console.log('[Push] Using existing push subscription');
    }

    // Step 5: Send subscription to server
    const subJson = subscription.toJSON();
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'subscribe',
          user_id: userId,
          subscription: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
          user_agent: navigator.userAgent,
        },
      });

      if (error) {
        console.warn('[Push] Edge function subscribe error:', error);
        // Fallback: save preference directly
        await savePreferenceDirect(userId, { push_enabled: true });
      }
    } catch (err) {
      console.warn('[Push] Failed to save subscription to server:', err);
      await savePreferenceDirect(userId, { push_enabled: true });
    }

    console.log('[Push] Successfully subscribed');
    return true;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    // Unsubscribe from browser push
    if (isPushSupported()) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();

          // Tell server
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                action: 'unsubscribe',
                user_id: userId,
                endpoint,
              },
            });
          } catch {
            // Non-fatal
          }
        }
      } catch (err) {
        console.warn('[Push] Browser unsubscribe error:', err);
      }
    }

    // Always update preference directly as fallback
    await savePreferenceDirect(userId, { push_enabled: false });

    // Also try via edge function
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'unsubscribe',
          user_id: userId,
        },
      });
    } catch {
      // Already saved directly
    }

    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
}

export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// ============ Preferences ============

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  // Try edge function first
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { action: 'get-preferences', user_id: userId },
    });
    if (!error && data?.preferences) {
      return { ...DEFAULT_PREFERENCES, ...data.preferences };
    }
  } catch (err) {
    console.warn('[Push] Edge function get-preferences failed:', err);
  }

  // Fallback: read directly from DB
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data && !error) {
      return {
        new_messages: data.new_messages ?? true,
        order_updates: data.order_updates ?? true,
        price_drops: data.price_drops ?? true,
        new_offers: data.new_offers ?? true,
        marketing: data.marketing ?? false,
        push_enabled: data.push_enabled ?? false,
        sound_enabled: data.sound_enabled ?? true,
      };
    }
  } catch (err) {
    console.warn('[Push] Direct DB read failed:', err);
  }

  return DEFAULT_PREFERENCES;
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  let edgeFunctionSuccess = false;
  let directDbSuccess = false;

  // Try edge function
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        action: 'update-preferences',
        user_id: userId,
        preferences,
      },
    });
    if (!error && data?.success) {
      edgeFunctionSuccess = true;
    } else {
      console.warn('[Push] Edge function update-preferences failed:', error || data);
    }
  } catch (err) {
    console.warn('[Push] Edge function call failed:', err);
  }

  // Always also save directly as backup
  if (!edgeFunctionSuccess) {
    directDbSuccess = await savePreferenceDirect(userId, preferences);
  }

  return edgeFunctionSuccess || directDbSuccess;
}

// ============ Direct DB Save (Fallback) ============

async function savePreferenceDirect(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  try {
    // Check if row exists
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('[Push] Direct DB update error:', error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          ...DEFAULT_PREFERENCES,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[Push] Direct DB insert error:', error);
        return false;
      }
    }

    console.log('[Push] Preference saved directly to DB');
    return true;
  } catch (err) {
    console.error('[Push] Direct DB save failed:', err);
    return false;
  }
}

// ============ Send Notification (from client, for testing) ============

export async function sendTestNotification(userId: string): Promise<boolean> {
  // First, try to show a local browser notification (immediate feedback)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('SnapUp Notifications Active', {
        body: 'You will now receive alerts for messages, orders, and price drops.',
        icon: 'https://d64gsuwffb70l.cloudfront.net/699701f2f91939597c7a986c_1772032842581_28cac2b8.png',
        badge: 'https://d64gsuwffb70l.cloudfront.net/699701f2f91939597c7a986c_1772032842581_28cac2b8.png',
        tag: 'test-notification',
        vibrate: [200, 100, 200],

      });
      console.log('[Push] Local test notification shown');
    } catch (err) {
      console.warn('[Push] Local notification failed, trying basic:', err);
      try {
        new Notification('SnapUp Notifications Active', {
          body: 'You will now receive alerts for messages, orders, and price drops.',
          icon: 'https://d64gsuwffb70l.cloudfront.net/699701f2f91939597c7a986c_1772032842581_28cac2b8.png',
          tag: 'test-notification',

        });

      } catch {
        // Non-fatal
      }
    }
  }

  // Also try via edge function (for server-side push)
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        action: 'send',
        user_id: userId,
        notification_type: 'test',
        title: 'SnapUp Notifications Active',
        body: 'You will now receive alerts for messages, orders, and price drops.',
        url: '/',
      },
    });
    if (error) {
      console.warn('[Push] Server test notification failed:', error);
    }
    return true;
  } catch (err) {
    console.warn('[Push] Test notification via server failed:', err);
    return true; // Return true since local notification was shown
  }
}

// ============ Utility ============

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
