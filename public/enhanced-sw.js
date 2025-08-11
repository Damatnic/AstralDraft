/**
 * Enhanced Service Worker for Intelligent Caching
 * Provides offline-first experience with smart cache strategies
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
    static: `astral-draft-static-${CACHE_VERSION}`,
    dynamic: `astral-draft-dynamic-${CACHE_VERSION}`,
    api: `astral-draft-api-${CACHE_VERSION}`,
    images: `astral-draft-images-${CACHE_VERSION}`,
};

const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.svg',
    '/offline.html',
    // Add critical CSS and JS files
    '/assets/index.css',
    '/assets/index.js',
];

const API_CACHE_STRATEGIES = {
    // Cache-first for stable data
    'players': { strategy: 'cache-first', maxAge: 30 * 60 * 1000 }, // 30 minutes
    'teams': { strategy: 'cache-first', maxAge: 60 * 60 * 1000 }, // 1 hour
    'leagues': { strategy: 'cache-first', maxAge: 15 * 60 * 1000 }, // 15 minutes
    
    // Network-first for dynamic data
    'draft': { strategy: 'network-first', maxAge: 60 * 1000 }, // 1 minute
    'oracle': { strategy: 'network-first', maxAge: 5 * 60 * 1000 }, // 5 minutes
    'analytics': { strategy: 'network-first', maxAge: 10 * 60 * 1000 }, // 10 minutes
    
    // Stale-while-revalidate for user data
    'profile': { strategy: 'stale-while-revalidate', maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
    'preferences': { strategy: 'stale-while-revalidate', maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
};

/**
 * Install event - Cache static resources
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAMES.static)
            .then((cache) => {
                console.log('Caching static resources');
                return cache.addAll(STATIC_RESOURCES);
            })
            .then(() => {
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Failed to cache static resources:', error);
            })
    );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                const deletePromises = cacheNames
                    .filter((cacheName) => {
                        // Delete old caches that don't match current version
                        return !Object.values(CACHE_NAMES).includes(cacheName);
                    })
                    .map((cacheName) => {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    });
                
                return Promise.all(deletePromises);
            })
            .then(() => {
                // Take control of all pages immediately
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - Implement intelligent caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (isStaticResource(url)) {
        event.respondWith(handleStaticResource(request));
    } else if (isAPIRequest(url)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isImageRequest(url)) {
        event.respondWith(handleImageRequest(request));
    } else {
        event.respondWith(handleDynamicResource(request));
    }
});

/**
 * Check if URL is a static resource
 */
function isStaticResource(url) {
    return STATIC_RESOURCES.some(resource => url.pathname === resource) ||
           url.pathname.includes('/assets/') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.woff') ||
           url.pathname.endsWith('.woff2');
}

/**
 * Check if URL is an API request
 */
function isAPIRequest(url) {
    return url.pathname.startsWith('/api/') ||
           url.hostname !== self.location.hostname;
}

/**
 * Check if URL is an image request
 */
function isImageRequest(url) {
    return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
}

/**
 * Handle static resources with cache-first strategy
 */
async function handleStaticResource(request) {
    try {
        const cache = await caches.open(CACHE_NAMES.static);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fetch and cache if not found
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Static resource fetch failed:', error);
        return new Response('Resource not available offline', { status: 503 });
    }
}

/**
 * Handle API requests with intelligent strategies
 */
async function handleAPIRequest(request) {
    const url = new URL(request.url);
    const endpoint = getAPIEndpoint(url.pathname);
    const strategy = API_CACHE_STRATEGIES[endpoint] || { strategy: 'network-first', maxAge: 5 * 60 * 1000 };
    
    switch (strategy.strategy) {
        case 'cache-first':
            return handleCacheFirst(request, CACHE_NAMES.api, strategy.maxAge);
        case 'network-first':
            return handleNetworkFirst(request, CACHE_NAMES.api, strategy.maxAge);
        case 'stale-while-revalidate':
            return handleStaleWhileRevalidate(request, CACHE_NAMES.api, strategy.maxAge);
        default:
            return handleNetworkFirst(request, CACHE_NAMES.api, strategy.maxAge);
    }
}

/**
 * Handle image requests with cache-first strategy
 */
async function handleImageRequest(request) {
    return handleCacheFirst(request, CACHE_NAMES.images, 24 * 60 * 60 * 1000); // 24 hours
}

/**
 * Handle dynamic resources with network-first strategy
 */
async function handleDynamicResource(request) {
    return handleNetworkFirst(request, CACHE_NAMES.dynamic, 60 * 60 * 1000); // 1 hour
}

/**
 * Cache-first strategy implementation
 */
async function handleCacheFirst(request, cacheName, maxAge) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
            return cachedResponse;
        }
        
        // Fetch from network
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            addTimestamp(responseToCache);
            cache.put(request, responseToCache);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache-first strategy failed:', error);
        
        // Return stale cache if available
        const cache = await caches.open(cacheName);
        const staleResponse = await cache.match(request);
        if (staleResponse) {
            return staleResponse;
        }
        
        return createOfflineResponse();
    }
}

/**
 * Network-first strategy implementation
 */
async function handleNetworkFirst(request, cacheName, maxAge) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            const responseToCache = networkResponse.clone();
            addTimestamp(responseToCache);
            cache.put(request, responseToCache);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Network-first strategy failed, trying cache:', error);
        
        // Fallback to cache
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return createOfflineResponse();
    }
}

/**
 * Stale-while-revalidate strategy implementation
 */
async function handleStaleWhileRevalidate(request, cacheName, maxAge) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Start network request in background
    const networkPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                addTimestamp(responseToCache);
                cache.put(request, responseToCache);
            }
            return networkResponse;
        })
        .catch((error) => {
            console.error('Background revalidation failed:', error);
        });
    
    // Return cached response immediately if available
    if (cachedResponse) {
        // Don't await the network request
        networkPromise.catch(() => {}); // Prevent unhandled rejection
        return cachedResponse;
    }
    
    // If no cache, wait for network
    try {
        return await networkPromise;
    } catch (error) {
        console.error('Stale-while-revalidate fallback failed:', error);
        return createOfflineResponse();
    }
}

/**
 * Extract API endpoint from pathname
 */
function getAPIEndpoint(pathname) {
    const parts = pathname.split('/');
    if (parts[1] === 'api' && parts[2]) {
        return parts[2];
    }
    return 'default';
}

/**
 * Check if cached response is expired
 */
function isExpired(response, maxAge) {
    const timestamp = response.headers.get('sw-timestamp');
    if (!timestamp) return true;
    
    const age = Date.now() - parseInt(timestamp, 10);
    return age > maxAge;
}

/**
 * Add timestamp to response headers
 */
function addTimestamp(response) {
    response.headers.set('sw-timestamp', Date.now().toString());
}

/**
 * Create offline response
 */
function createOfflineResponse() {
    return new Response(
        JSON.stringify({
            error: 'This content is not available offline',
            offline: true,
            timestamp: Date.now()
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        }
    );
}

/**
 * Handle background sync for data updates
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'draft-update') {
        event.waitUntil(syncDraftData());
    } else if (event.tag === 'analytics-sync') {
        event.waitUntil(syncAnalyticsData());
    }
});

/**
 * Sync draft data when online
 */
async function syncDraftData() {
    try {
        // Get pending draft updates from IndexedDB
        // This would integrate with your draft service
        console.log('Syncing draft data...');
        
        // Implementation would depend on your data structure
        // For now, just clear stale draft cache
        const cache = await caches.open(CACHE_NAMES.api);
        const keys = await cache.keys();
        
        for (const request of keys) {
            if (request.url.includes('/api/draft')) {
                await cache.delete(request);
            }
        }
    } catch (error) {
        console.error('Draft sync failed:', error);
    }
}

/**
 * Sync analytics data when online
 */
async function syncAnalyticsData() {
    try {
        console.log('Syncing analytics data...');
        
        // Clear analytics cache to force fresh data
        const cache = await caches.open(CACHE_NAMES.api);
        const keys = await cache.keys();
        
        for (const request of keys) {
            if (request.url.includes('/api/analytics')) {
                await cache.delete(request);
            }
        }
    } catch (error) {
        console.error('Analytics sync failed:', error);
    }
}

/**
 * Handle push notifications for cache invalidation
 */
self.addEventListener('push', (event) => {
    if (event.data) {
        try {
            const data = event.data.json();
            
            if (data.type === 'cache-invalidate') {
                event.waitUntil(invalidateCacheByTags(data.tags));
            }
        } catch (error) {
            console.error('Push event handling failed:', error);
        }
    }
});

/**
 * Invalidate cache by tags
 */
async function invalidateCacheByTags(tags) {
    try {
        for (const cacheName of Object.values(CACHE_NAMES)) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            
            for (const request of keys) {
                // Check if request URL contains any of the tags
                if (tags.some(tag => request.url.includes(tag))) {
                    await cache.delete(request);
                }
            }
        }
        
        console.log('Cache invalidated for tags:', tags);
    } catch (error) {
        console.error('Cache invalidation failed:', error);
    }
}
