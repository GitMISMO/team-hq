/* Team HQ offline (November 7, 2026)
   Keeps a copy of the Team HQ page, its code, icons and fonts on each device, so Team HQ (and the
   Expenses app) open with no signal. Always tries the network first, so nobody ever sees an old
   version while online. The save relay is never touched: saves made offline wait in the page and
   go out when the signal is back. To switch this off, replace this file with one that only calls
   self.registration.unregister(). */
const V='team-hq-offline-1';
const SHELL=['/team-hq/','/team-hq/?app=expenses','/team-hq/team-hq.webmanifest','/team-hq/expenses.webmanifest','/team-hq/hq-icon-192.png','/team-hq/expenses-icon-192.png','/assets/session.js'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
function pageKey(u){ return '/team-hq/'+(u.searchParams.get('app')==='expenses' ? '?app=expenses' : ''); }
function keep(req, res){ if(!(res && (res.ok || res.type==='opaque'))) return; const cp=res.clone();
  caches.open(V).then(c=>{ const u=new URL(req.url);
    /* one copy of the Team HQ code at a time */
    if(/\/team-hq\/upgrades\.js$/.test(u.pathname)) c.keys().then(ks=>ks.forEach(k=>{ const ku=new URL(k.url); if(ku.pathname===u.pathname && ku.search!==u.search) c.delete(k); }));
    return c.put(req, cp); }).catch(()=>{}); }
self.addEventListener('fetch', e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  const fonts=/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(u.origin!==self.location.origin && !fonts) return;
  if(u.origin===self.location.origin && !(u.pathname.indexOf('/team-hq/')===0 || u.pathname==='/assets/session.js' || u.pathname==='/assets/tools.json')) return;
  if(u.pathname.indexOf('/team-hq/releases/')===0) return;
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{ if(res.ok){ const cp=res.clone(); caches.open(V).then(c=>c.put(pageKey(u), cp)).catch(()=>{}); } return res; })
      .catch(()=>caches.match(pageKey(u)).then(m=>m || caches.match('/team-hq/'))));
    return; }
  e.respondWith(fetch(r).then(res=>{ keep(r, res); return res; })
    .catch(()=>caches.match(r).then(m=>m || caches.match(r, {ignoreSearch:true})).then(m=>m || Response.error())));
});
