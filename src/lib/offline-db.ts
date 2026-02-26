// SnapUp Offline Database (IndexedDB)
// Provides persistent offline storage for chat messages, listings, and message queue
// Critical for SA users on intermittent 3G/4G networks

const DB_NAME = 'snapup-offline';
const DB_VERSION = 2;

export interface OfflineMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  listing_id?: string;
  created_at: string;
  is_read: boolean;
  sync_status: 'synced' | 'pending' | 'failed';
}

export interface QueuedMessage {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  created_at: string;
  sync_status: 'pending' | 'syncing' | 'failed';
  retry_count?: number;
}

export interface CachedListing {
  id: string;
  title: string;
  description?: string;
  price: number;
  images?: string[];
  location?: string;
  province?: string;
  category_name?: string;
  condition?: string;
  seller_name?: string;
  user_id?: string;
  viewed_at: string;
  [key: string]: any;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Chat messages store
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('conversation_id', 'conversation_id', { unique: false });
        msgStore.createIndex('created_at', 'created_at', { unique: false });
        msgStore.createIndex('sync_status', 'sync_status', { unique: false });
      }
      
      // Offline message queue
      if (!db.objectStoreNames.contains('message_queue')) {
        const queueStore = db.createObjectStore('message_queue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('created_at', 'created_at', { unique: false });
      }
      
      // Recently viewed listings
      if (!db.objectStoreNames.contains('listings')) {
        const listingStore = db.createObjectStore('listings', { keyPath: 'id' });
        listingStore.createIndex('viewed_at', 'viewed_at', { unique: false });
      }
      
      // Session/preferences
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' });
      }
    };
  });
}

// ============ Chat Messages ============

export async function saveMessages(messages: OfflineMessage[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    
    for (const msg of messages) {
      store.put({ ...msg, sync_status: msg.sync_status || 'synced' });
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to save messages:', err);
  }
}

export async function getConversationMessages(conversationId: string): Promise<OfflineMessage[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    const index = store.index('conversation_id');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(conversationId);
      request.onsuccess = () => {
        db.close();
        const messages = (request.result as OfflineMessage[]).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        resolve(messages);
      };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to get messages:', err);
    return [];
  }
}

export async function getAllMessages(): Promise<OfflineMessage[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => { db.close(); resolve(request.result as OfflineMessage[]); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to get all messages:', err);
    return [];
  }
}

// ============ Message Queue (Offline Send) ============

export async function queueMessage(message: Omit<QueuedMessage, 'id'>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('message_queue', 'readwrite');
    const store = tx.objectStore('message_queue');
    store.add(message);
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to queue message:', err);
  }
}

export async function getQueuedMessages(): Promise<QueuedMessage[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('message_queue', 'readonly');
    const store = tx.objectStore('message_queue');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => { db.close(); resolve(request.result as QueuedMessage[]); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to get queued messages:', err);
    return [];
  }
}

export async function removeFromQueue(id: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('message_queue', 'readwrite');
    tx.objectStore('message_queue').delete(id);
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to remove from queue:', err);
  }
}

export async function clearQueue(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('message_queue', 'readwrite');
    tx.objectStore('message_queue').clear();
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to clear queue:', err);
  }
}

// ============ Sync Queued Messages ============

export async function syncQueuedMessages(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueuedMessages();
  let synced = 0;
  let failed = 0;
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: JSON.stringify(item.body),
      });
      
      if (response.ok) {
        if (item.id) await removeFromQueue(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  
  return { synced, failed };
}

// ============ Listings Cache ============

export async function cacheListing(listing: CachedListing): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('listings', 'readwrite');
    const store = tx.objectStore('listings');
    store.put({ ...listing, viewed_at: new Date().toISOString() });
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
    
    // Trim to max 20 listings
    await trimListingsCache(20);
    
    // Also tell the service worker to cache listing images
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_LISTING',
        data: listing,
      });
    }
  } catch (err) {
    console.warn('[OfflineDB] Failed to cache listing:', err);
  }
}

export async function getCachedListings(): Promise<CachedListing[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('listings', 'readonly');
    const store = tx.objectStore('listings');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        const listings = (request.result as CachedListing[]).sort(
          (a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime()
        );
        resolve(listings);
      };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to get cached listings:', err);
    return [];
  }
}

export async function getCachedListing(id: string): Promise<CachedListing | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('listings', 'readonly');
    const store = tx.objectStore('listings');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => { db.close(); resolve(request.result as CachedListing || null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to get cached listing:', err);
    return null;
  }
}

async function trimListingsCache(maxItems: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('listings', 'readwrite');
    const store = tx.objectStore('listings');
    const index = store.index('viewed_at');
    
    const countReq = store.count();
    
    await new Promise<void>((resolve, reject) => {
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
          const cursor = (e.target as IDBRequest).result;
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
    console.warn('[OfflineDB] Failed to trim listings cache:', err);
  }
}

// ============ Session/Preferences ============

export async function setSessionValue(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('session', 'readwrite');
    tx.objectStore('session').put({ key, value, updated_at: new Date().toISOString() });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to set session value:', err);
  }
}

export async function getSessionValue(key: string): Promise<any> {
  try {
    const db = await openDB();
    const tx = db.transaction('session', 'readonly');
    
    return new Promise((resolve, reject) => {
      const request = tx.objectStore('session').get(key);
      request.onsuccess = () => { db.close(); resolve(request.result?.value ?? null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (err) {
    console.warn('[OfflineDB] Failed to get session value:', err);
    return null;
  }
}

// ============ Utility: Check if IndexedDB is available ============

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

// ============ Utility: Get storage estimate ============

export async function getStorageEstimate(): Promise<{ usage: number; quota: number; percent: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        usage,
        quota,
        percent: quota > 0 ? Math.round((usage / quota) * 100) : 0,
      };
    } catch {
      return null;
    }
  }
  return null;
}
