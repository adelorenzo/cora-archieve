// sw.js — cache static assets + attempt to cache model shards for faster reloads
const CACHE = "webllm-react-cache-v2";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Skip service worker for development server assets
  if (url.hostname === 'localhost' && url.port === '8000') {
    // Don't intercept development server requests
    if (url.pathname.includes('@vite') || 
        url.pathname.includes('@react-refresh') || 
        url.pathname.includes('?t=') ||
        url.pathname.includes('/src/')) {
      return; // Let browser handle these directly
    }
  }
  
  // Heuristic: cache-first for model shards & tokenizer/wasm
  const isModel =
    url.hostname.includes("huggingface.co") ||
    url.href.includes(".gguf") ||
    url.href.includes("mlc-ai") ||
    url.href.includes("web-llm") ||
    url.href.includes(".wasm");

  if (isModel) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      })
    );
    return;
  }

  // For production assets: network-first with cache fallback
  if (!url.hostname.includes('localhost')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Fallback to cache for offline
          const cached = await caches.match(event.request);
          return cached || new Response('Offline', { status: 503 });
        })
    );
  }
});