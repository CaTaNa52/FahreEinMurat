/* FahreEinMurat installable offline game shell.
   Vite production build injects its exact hashed chunks into this list.
   In Vite dev the placeholder remains, enabling network-first previews. */
const PRECACHE = '__PRECACHE_MANIFEST__';
const ASSETS = Array.isArray(PRECACHE) ? PRECACHE : ['/', '/index.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'];
const VERSION = '__PRECACHE_VERSION__';
const CACHE = 'murat-pwa-' + VERSION;
const APP_ORIGIN = self.location.origin;
self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map(url=>cache.add(new Request(url,{cache:'reload'}))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('murat-pwa-')&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==APP_ORIGIN)return;
  // Prefer the newest app HTML when online, but open installed game offline.
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request);
        if(response.ok){const cache=await caches.open(CACHE);await cache.put('/',response.clone());}
        return response;
      }catch{
        return await caches.match('/') || await caches.match('/index.html') ||
          new Response('FahreEinMurat ist offline noch nicht vollständig gespeichert.',{
            status:503,headers:{'content-type':'text/plain;charset=utf-8'}
          });
      }
    })());
    return;
  }
  // Cache hashed production assets and PWA icons. Never cache API or live data.
  if(url.pathname.startsWith('/assets/')||url.pathname.startsWith('/icons/')||
     url.pathname==='/manifest.webmanifest'){
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      if(cached)return cached;
      const response=await fetch(request);
      if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{});}
      return response;
    })());
  }
});
