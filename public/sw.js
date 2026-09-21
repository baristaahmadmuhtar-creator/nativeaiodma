'use strict';
// Replace the legacy shell cache. Transactional pages and API data stay network-only.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('aiodma-')).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
