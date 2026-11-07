/* GOOY PWA v1 — offline shell only; Supabase and APIs remain network-only. */
const CACHE='gooy-shell-v3';
const SHELL=['/ia/','/ia/index.html','/ia/guru-pwa-icon.svg'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 if(!url.pathname.startsWith('/ia/')||url.pathname.startsWith('/ia/admin'))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put('/ia/index.html',copy))}return res}).catch(()=>caches.match('/ia/index.html')));
  return;
 }
 event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{if(res.ok&&url.pathname.match(/\.(?:css|js|mjs|svg|png|woff2?)$/i)){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res}).catch(()=>caches.match(req)));
});