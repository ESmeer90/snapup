// SnapUp Service Worker v2.3.0
// Ultra-sharp PWA with high-res PNG icons + dedicated offline page
// Optimized for South African users on intermittent 3G/4G networks
// Kimberley / Johannesburg / Rural areas

const CACHE_VERSION = 'snapup-v2.3.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const LISTING_CACHE = `${CACHE_VERSION}-listings`;
const API_CACHE = `${CACHE_VERSION}-api`;

// CDN icon URLs (high-res raster icons generated from brand SVG)
const ICON_192 = 'https://d64gsuwffb70l.cloudfront.net/699701f2f91939597c7a986c_1772032842581_28cac2b8.png';
const ICON_512 = 'https://d64gsuwffb70l.cloudfront.net/699701f2f91939597c7a986c_1772047507283_726123b5.jpg';
const ICON_MASKABLE = 'https://d64gsuwffb70l.cloudfront.net/699701f2f91939597c7a986c_1772047543333_d16e1294.jpg';


// App shell files to precache (including HD icons + offline page)
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-hd.svg',
  '/placeholder.svg',
  ICON_192,
  ICON_512,
  ICON_MASKABLE,
];



// Max items in each cache
const MAX_DYNAMIC_CACHE = 50;
const MAX_IMAGE_CACHE = 100;
const MAX_LISTING_CACHE = 20;
const MAX_API_CACHE = 30;

// API patterns
const API_PATTERNS = [
  /\/rest\/v1\//,
  /\/functions\/v1\//,
  /databasepad\.com/,
  /supabase/,
];

const IMAGE_PATTERNS = [
  /images\.unsplash\.com/,
  /\.(?:png|jpg|jpeg|gif|webp|avif|svg)(\?|$)/i,
];

const STATIC_PATTERNS = [
  /\.(?:js|css|woff2?|ttf|eot)(\?|$)/i,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
];

// ============ IndexedDB for Offline Chat & Listings ============
const DB_NAME = 'snapup-offline';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Chat messages store
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('conversation_id', 'conversation_id', { unique: false });
        msgStore.createIndex('created_at', 'created_at', { unique: false });
        msgStore.createIndex('sync_status', 'sync_status', { unique: false });
      }
      
      // Offline message queue (messages sent while offline)
      if (!db.objectStoreNames.contains('message_queue')) {
        const queueStore = db.createObjectStore('message_queue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('created_at', 'created_at', { unique: false });
      }
      
      // Recently viewed listings
      if (!db.objectStoreNames.contains('listings')) {
        const listingStore = db.createObjectStore('listings', { keyPath: 'id' });
        listingStore.createIndex('viewed_at', 'viewed_at', { unique: false });
      }
      
      // User session data
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' });
      }
    };
  });
}

async function saveToStore(storeName, data) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    if (Array.isArray(data)) {
      data.forEach(item => store.put(item));
    } else {
      store.put(data);
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[SW] IndexedDB save failed:', err);
  }
}

async function getFromStore(storeName, key) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = key ? store.get(key) : store.getAll();
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (err) {
    console.warn('[SW] IndexedDB read failed:', err);
    return key ? null : [];
  }
}

async function getFromIndex(storeName, indexName, value) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (err) {
    console.warn('[SW] IndexedDB index read failed:', err);
    return [];
  }
}

async function trimStore(storeName, indexName, maxItems) {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const countReq = store.count();
      countReq.onsuccess = () => {
        const count = countReq.result;
        if (count <= maxItems) {
          db.close();
          resolve();
          return;
        }
        
        const deleteCount = count - maxItems;
        let deleted = 0;
        const cursorReq = index.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && deleted < deleteCount) {
            store.delete(cursor.primaryKey);
            deleted++;
            cursor.continue();
          }
        };
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[SW] IndexedDB trim failed:', err);
  }
}

// ============ Cache Helpers ============
function isApiRequest(url) {
  return API_PATTERNS.some(pattern => pattern.test(url));
}

function isImageRequest(url) {
  return IMAGE_PATTERNS.some(pattern => pattern.test(url));
}

function isStaticAsset(url) {
  return STATIC_PATTERNS.some(pattern => pattern.test(url));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries (FIFO)
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// ============ Offline Page Helper ============
async function getOfflinePage() {
  // Try to serve the dedicated offline page first
  const offlinePage = await caches.match('/offline.html');
  if (offlinePage) return offlinePage;
  // Fallback to cached index.html (SPA shell)
  const indexPage = await caches.match('/');
  if (indexPage) return indexPage;
  // Last resort: simple text response
  return new Response(
    '<html><body style="font-family:system-ui;text-align:center;padding:4rem;"><h1>SnapUp</h1><p>You are offline.</p><button onclick="location.reload()">Try Again</button></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html' } }
  );
}

// ============ Fetch Strategies ============

// Cache-first: Try cache, fall back to network (for static assets)
async function cacheFirst(request, cacheName, maxItems) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      if (maxItems) limitCacheSize(cacheName, maxItems);
    }
    return response;
  } catch (err) {
    // Return offline page for navigation requests
    if (isNavigationRequest(request)) {
      return getOfflinePage();
    }
    throw err;
  }
}

// Network-first: Try network, fall back to cache (for API calls)
async function networkFirst(request, cacheName, maxItems) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      if (maxItems) limitCacheSize(cacheName, maxItems);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // For API requests, try to return cached data from IndexedDB
    if (isApiRequest(request.url)) {
      return createOfflineResponse(request);
    }
    
    throw err;
  }
}

// Stale-while-revalidate: Return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
      if (maxItems) limitCacheSize(cacheName, maxItems);
    }
    return response;
  }).catch(() => cached);
  
  return cached || fetchPromise;
}

// Create offline response for API requests using IndexedDB data
async function createOfflineResponse(request) {
  const url = new URL(request.url);
  
  // If requesting listings, return cached listings from IndexedDB
  if (url.pathname.includes('/listings') || url.pathname.includes('/rest/v1/listings')) {
    try {
      const listings = await getFromStore('listings');
      if (listings && listings.length > 0) {
        return new Response(JSON.stringify(listings), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'X-Offline': 'true',
            'X-Cache-Source': 'indexeddb'
          }
        });
      }
    } catch (e) {
      console.warn('[SW] Failed to get offline listings:', e);
    }
  }
  
  // If requesting messages, return cached messages from IndexedDB
  if (url.pathname.includes('/messages') || url.pathname.includes('/rest/v1/messages')) {
    try {
      const messages = await getFromStore('messages');
      if (messages && messages.length > 0) {
        return new Response(JSON.stringify(messages), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'X-Offline': 'true',
            'X-Cache-Source': 'indexeddb'
          }
        });
      }
    } catch (e) {
      console.warn('[SW] Failed to get offline messages:', e);
    }
  }
  
  // Generic offline response
  return new Response(
    JSON.stringify({ 
      error: 'offline', 
      message: 'You are currently offline. This data will be available when you reconnect.',
      offline: true 
    }), 
    {
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'X-Offline': 'true'
      }
    }
  );
}

// ============ Install Event ============

self.addEventListener('install', (event) => {
  console.log('[SW] Installing SnapUp Service Worker v2.3.0');


  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Precaching app shell (including HD PNG icons + offline.html)');
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('[SW] Precache failed (non-critical):', err);
        return self.skipWaiting();
      })
  );
});

// ============ Activate Event ============
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating SnapUp Service Worker v2.3.0');


  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key.startsWith('snapup-') && !key.startsWith(CACHE_VERSION))
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============ Fetch Event ============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests (except for offline message queue)
  if (request.method !== 'GET') {
    // Queue POST requests for messages when offline
    if (request.method === 'POST' && isApiRequest(request.url) && 
        (url.pathname.includes('/messages') || url.pathname.includes('/rest/v1/messages'))) {
      event.respondWith(handleOfflinePost(request));
      return;
    }
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;
  
  // Skip Supabase realtime WebSocket connections
  if (url.pathname.includes('/realtime/') || url.protocol === 'wss:') return;
  
  // Strategy selection based on request type
  if (isNavigationRequest(request)) {
    // Navigation: Network-first with dedicated offline page fallback
    event.respondWith(
      networkFirst(request, DYNAMIC_CACHE, MAX_DYNAMIC_CACHE)
        .catch(async () => {
          return getOfflinePage();
        })
    );
  } else if (isStaticAsset(request.url)) {
    // Static assets: Cache-first (JS, CSS, fonts)
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImageRequest(request.url)) {
    // Images: Cache-first with size limit
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGE_CACHE));
  } else if (isApiRequest(request.url)) {
    // API calls: Network-first with IndexedDB fallback
    event.respondWith(networkFirst(request, API_CACHE, MAX_API_CACHE));
  } else {
    // Everything else: Stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE, MAX_DYNAMIC_CACHE));
  }
});

// Handle POST requests when offline (queue for later sync)
async function handleOfflinePost(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (err) {
    // Offline - queue the message
    try {
      const body = await request.clone().json();
      await saveToStore('message_queue', {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        created_at: new Date().toISOString(),
        sync_status: 'pending'
      });
      
      // Notify the client that the message was queued
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'MESSAGE_QUEUED',
          data: body
        });
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          queued: true, 
          message: 'Message saved offline. It will be sent when you reconnect.' 
        }),
        { 
          status: 202,
          headers: { 
            'Content-Type': 'application/json',
            'X-Offline': 'true'
          }
        }
      );
    } catch (queueErr) {
      return new Response(
        JSON.stringify({ error: 'Failed to queue message offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}

// ============ Background Sync ============
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncQueuedMessages());
  }
  if (event.tag === 'sync-listings') {
    event.waitUntil(syncListingsCache());
  }
});

async function syncQueuedMessages() {
  try {
    const queue = await getFromStore('message_queue');
    if (!queue || queue.length === 0) return;
    
    const db = await openDB();
    const tx = db.transaction('message_queue', 'readwrite');
    const store = tx.objectStore('message_queue');
    
    for (const item of queue) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: JSON.stringify(item.body)
        });
        
        if (response.ok) {
          store.delete(item.id);
          console.log('[SW] Synced queued message:', item.id);
        }
      } catch (err) {
        console.warn('[SW] Failed to sync message:', item.id, err);
      }
    }
    
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE', tag: 'messages' });
    });
  } catch (err) {
    console.warn('[SW] Message sync failed:', err);
  }
}

async function syncListingsCache() {
  // Trim old listings from IndexedDB
  await trimStore('listings', 'viewed_at', MAX_LISTING_CACHE);
}

// ============ Message Handler (from main app) ============
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_LISTING':
      // Cache a recently viewed listing in IndexedDB
      if (data) {
        saveToStore('listings', { ...data, viewed_at: new Date().toISOString() })
          .then(() => trimStore('listings', 'viewed_at', MAX_LISTING_CACHE))
          .catch(err => console.warn('[SW] Failed to cache listing:', err));
      }
      break;
      
    case 'CACHE_MESSAGES':
      // Cache chat messages in IndexedDB
      if (data && Array.isArray(data)) {
        const messagesWithSync = data.map(msg => ({ ...msg, sync_status: 'synced' }));
        saveToStore('messages', messagesWithSync)
          .catch(err => console.warn('[SW] Failed to cache messages:', err));
      }
      break;
      
    case 'GET_CACHED_MESSAGES':
      // Return cached messages for a conversation
      if (data?.conversation_id) {
        getFromIndex('messages', 'conversation_id', data.conversation_id)
          .then(messages => {
            event.source.postMessage({
              type: 'CACHED_MESSAGES',
              data: { conversation_id: data.conversation_id, messages }
            });
          })
          .catch(() => {
            event.source.postMessage({
              type: 'CACHED_MESSAGES',
              data: { conversation_id: data.conversation_id, messages: [] }
            });
          });
      }
      break;
      
    case 'GET_QUEUED_MESSAGES':
      // Return queued (unsent) messages
      getFromStore('message_queue')
        .then(queue => {
          event.source.postMessage({
            type: 'QUEUED_MESSAGES',
            data: queue || []
          });
        })
        .catch(() => {
          event.source.postMessage({
            type: 'QUEUED_MESSAGES',
            data: []
          });
        });
      break;
      
    case 'CLEAR_QUEUE':
      // Clear the message queue after successful sync
      openDB().then(db => {
        const tx = db.transaction('message_queue', 'readwrite');
        tx.objectStore('message_queue').clear();
        tx.oncomplete = () => db.close();
      }).catch(() => {});
      break;
      
    case 'CACHE_VERSION_CHECK':
      event.source.postMessage({
        type: 'CACHE_VERSION',
        data: { version: CACHE_VERSION }
      });
      break;

    default:
      break;
  }
});

// ============ Push Notifications ============
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    let data;
    try {
      data = event.data.json();
    } catch {
      data = { title: 'SnapUp', body: event.data.text() };
    }
    const notifType = data.type || 'general';
    // Use PNG icon for push notifications (better Android compatibility than SVG)
    // SVG may not render on all Android notification trays
    const notifIcon = ICON_192;
    // Badge is the small monochrome icon shown in status bar
    const notifBadge = '/favicon.svg';

    const options = {
      body: data.body || 'You have a new notification',
      icon: notifIcon,
      badge: notifBadge,

      vibrate: [100, 50, 100],
      tag: `snapup-${notifType}-${Date.now()}`,
      renotify: true,
      requireInteraction: notifType === 'new_message' || notifType === 'new_offer',
      data: {
        url: data.url || '/',
        type: notifType,
        timestamp: data.timestamp || new Date().toISOString(),
        ...data.data
      },
      actions: data.actions || [],
    };

    // Add type-specific actions
    if (notifType === 'new_message' && (!data.actions || data.actions.length === 0)) {
      options.actions = [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View Chat' }
      ];
    } else if (notifType === 'new_offer' && (!data.actions || data.actions.length === 0)) {
      options.actions = [
        { action: 'view', title: 'View Offer' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    } else if (notifType === 'order_update' && (!data.actions || data.actions.length === 0)) {
      options.actions = [
        { action: 'track', title: 'Track Order' }
      ];
    } else if (notifType === 'price_drop' && (!data.actions || data.actions.length === 0)) {
      options.actions = [
        { action: 'view', title: 'View Item' }
      ];
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'SnapUp', options)
    );
  } catch (err) {
    console.warn('[SW] Push notification failed:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notifData = event.notification.data || {};
  const action = event.action;
  let url = notifData.url || '/';

  // Handle action-specific routing
  if (action === 'reply' || action === 'view') {
    if (notifData.type === 'new_message') {
      url = '/?view=messages';
    }
  } else if (action === 'track') {
    url = '/?view=orders';
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        return self.clients.openWindow(url);
      })
  );
});

// Handle notification close (for analytics)
self.addEventListener('notificationclose', (event) => {
  const notifData = event.notification.data || {};
  console.log('[SW] Notification dismissed:', notifData.type);
});

// ============ Periodic Background Sync (if supported) ============
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      Promise.all([
        syncQueuedMessages(),
        syncListingsCache()
      ])
    );
  }
});

console.log('[SW] SnapUp Service Worker loaded - v2.3.0');

