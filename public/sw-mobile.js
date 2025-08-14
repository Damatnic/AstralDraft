/**
 * Progressive Web App (PWA) Service Worker
 * Provides offline capabilities and enhanced mobile experience
 */

const CACHE_NAME = 'astral-draft-v1.2.0';
const STATIC_CACHE = 'astral-draft-static-v1.2.0';
const DYNAMIC_CACHE = 'astral-draft-dynamic-v1.2.0';

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/offline.html',
  // Core app files
  '/static/js/main.js',
  '/static/css/main.css',
  // Essential fonts and icons
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  // Core functionality
  '/api/players/essential',
  '/api/draft/basic-data'
];

// Network-first resources (always try network first)
const NETWORK_FIRST = [
  '/api/live-data',
  '/api/real-time',
  '/api/websocket',
  '/api/analytics'
];

// Cache-first resources (use cache unless expired)
const CACHE_FIRST = [
  '/api/players',
  '/api/teams',
  '/api/rankings',
  '/static/images',
  '/static/fonts'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different caching strategies based on URL patterns
  if (NETWORK_FIRST.some(pattern => url.pathname.includes(pattern))) {
    event.respondWith(networkFirstStrategy(request));
  } else if (CACHE_FIRST.some(pattern => url.pathname.includes(pattern))) {
    event.respondWith(cacheFirstStrategy(request));
  } else if (url.pathname === '/' || url.pathname.includes('.html')) {
    event.respondWith(staleWhileRevalidateStrategy(request));
  } else {
    event.respondWith(cacheFirstWithFallbackStrategy(request));
  }
});

// Network-first strategy (for real-time data)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Cache-first strategy (for static resources)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cache = caches.open(DYNAMIC_CACHE);
          cache.then(c => c.put(request, response));
        }
      })
      .catch(() => {
        // Ignore background update failures
      });
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch and cache:', request.url);
    throw error;
  }
}

// Stale-while-revalidate strategy (for app shell)
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Cache-first with offline fallback
async function cacheFirstWithFallbackStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline page for document requests
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    // Return placeholder for images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="#f3f4f6"/><text x="100" y="75" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#6b7280">Image Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'draft-predictions') {
    event.waitUntil(syncDraftPredictions());
  } else if (event.tag === 'analytics-events') {
    event.waitUntil(syncAnalyticsEvents());
  }
});

// Sync draft predictions when online
async function syncDraftPredictions() {
  try {
    const db = await openDB();
    const predictions = await db.getAll('pending-predictions');
    
    for (const prediction of predictions) {
      try {
        const response = await fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prediction.data)
        });
        
        if (response.ok) {
          await db.delete('pending-predictions', prediction.id);
          console.log('[SW] Synced prediction:', prediction.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync prediction:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync analytics events when online
async function syncAnalyticsEvents() {
  try {
    const db = await openDB();
    const events = await db.getAll('pending-analytics');
    
    for (const event of events) {
      try {
        const response = await fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event.data)
        });
        
        if (response.ok) {
          await db.delete('pending-analytics', event.id);
          console.log('[SW] Synced analytics event:', event.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync analytics event:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
  }
}

// IndexedDB helper for offline storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('astral-draft-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-predictions')) {
        db.createObjectStore('pending-predictions', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pending-analytics')) {
        db.createObjectStore('pending-analytics', { keyPath: 'id' });
      }
    };
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    title: 'Astral Draft',
    body: 'New draft activity detected!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Draft',
        icon: '/favicon.svg'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.title = data.title || options.title;
      options.body = data.body || options.body;
      options.data = { ...options.data, ...data };
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clients) => {
          // Focus existing window if available
          for (const client of clients) {
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

console.log('[SW] Service worker script loaded');
