/* ---------- version, Test Copy, Problems ----------
   BUILD is this file's version. Team HQ opened with ?try=<version> is the Test Copy: it loads that saved
   version from releases/ instead of this one, and index.html stops every save there, so nothing anyone
   does in the Test Copy is kept. Problems: errors anyone hits are written to the errors file, and Jonna
   sees them under Problems at the foot of the left menu. */
var BUILD='__BUILD__';
if(window.__HQ_TRY && window.__HQ_TRY!==BUILD){
  if(!window.__hqTryLoad){ window.__hqTryLoad=BUILD;
    var ts=document.createElement('script'); ts.src='releases/upgrades-'+window.__HQ_TRY+'.js';
    ts.onerror=function(){ var m=document.createElement('div');
      m.style.cssText='position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:100000;background:#b42318;color:#fff;padding:10px 16px;border-radius:8px;font:600 14px/1.4 system-ui,sans-serif;max-width:90vw';
      m.textContent='Version '+window.__HQ_TRY+' isn’t saved in Team HQ’s releases folder, so nothing loaded. Check the version name.';
      (document.body||document.documentElement).appendChild(m); };
    document.head.appendChild(ts); }
  return;
}
window.__HQ_BUILD=BUILD;
/* ---------- a newer version is out (November 9, 2026) ----------
   Publish a Version writes version.json. Every 10 minutes, and whenever the tab comes back into view, an open
   Team HQ checks it. If a newer version is live, a bar says so; a tab that was in the background reloads itself
   as soon as you come back to it, once nothing is waiting to save, so an old copy never keeps running. */
(function(){
  if(window.__HQ_TRY || window.__hqVerWatch) return; window.__hqVerWatch=true;
  var newer=null, hiddenAt=0, bar=null;
  function pending(){ var n=0; try{ var F=(window.__hqRelay && window.__hqRelay.files)||{}; Object.keys(F).forEach(function(k){ n+=(F[k].pending||[]).length; }); }catch(e){} return n; }
  function show(){ if(bar || !document.body) return; bar=document.createElement('div'); bar.id='hq-newer'; bar.setAttribute('role','status');
    bar.style.cssText='position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99970;display:flex;align-items:center;gap:12px;background:#0d314c;color:#fff;border-radius:8px;padding:9px 10px 9px 14px;font:500 13.5px/1.4 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 8px 24px rgba(13,49,76,.28);max-width:calc(100vw - 32px)';
    var t=document.createElement('span'); t.textContent='A newer version of Team HQ is out. Refresh to get it.'; bar.appendChild(t);
    var b=document.createElement('button'); b.type='button'; b.textContent='Refresh'; b.style.cssText='flex:none;background:#74bfeb;color:#0d314c;border:0;border-radius:5px;padding:6px 12px;font:inherit;font-weight:700;cursor:pointer';
    b.onclick=function(){ if(pending()){ t.textContent='Saving your last change first…'; setTimeout(function(){ location.reload(); }, 2500); } else location.reload(); }; bar.appendChild(b);
    document.body.appendChild(bar); }
  function check(){ if(!navigator.onLine) return; fetch('version.json?t='+Date.now(), {cache:'no-store'}).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      if(j && j.v && /^[0-9a-z]+$/.test(j.v) && j.v!==BUILD){ newer=j.v; show(); } }).catch(function(){}); }
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){ hiddenAt=Date.now(); return; }
    if(newer && hiddenAt && !pending()){ location.reload(); return; }
    if(Date.now()-hiddenAt>60000) check(); });
  setTimeout(check, 20000); setInterval(function(){ if(!document.hidden) check(); }, 10*60000);
})();
(function(){
  if(window.__hqProb) return;
  var ADMINS=['jonna'], TEST=!!window.__HQ_TEST, MAX=25, seen={}, order=[], dirty={}, timer=null, saving=false;
  var NOISE=/ResizeObserver loop|^Script error\.?$|AbortError|aborted|Load failed|NetworkError|Failed to fetch|chrome-extension:|moz-extension:|safari-(web-)?extension:|Could not reach the relay/i;
  function S(){ return window.__S||{}; }
  function who(){ return S().me||'(signed out)'; }
  function page(){ var s=S(), on=document.querySelector('.hq.rail .on[data-nx], .hq.rail .on[data-hq], .hq.rail [aria-current="page"]');
    return (on && on.textContent.trim()) || [s.tab, s.view].filter(Boolean).join(' / ') || location.pathname; }
  function ua(){ var u=navigator.userAgent, d=/iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Android/.test(u)?'Android':/Mac/.test(u)?'Mac':/Windows/.test(u)?'Windows':'Other';
    var b=/Edg\//.test(u)?'Edge':/Chrome\//.test(u)?'Chrome':/Firefox\//.test(u)?'Firefox':/Safari\//.test(u)?'Safari':'Other';
    var app=(window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? ' app' : '';
    return d+' · '+b+app; }
  function hash(s){ var h=5381; for(var i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
  function rec(kind, msg, stack){
    msg=String(msg==null?'':msg).replace(/\s+/g,' ').trim().slice(0,300); stack=String(stack||'');
    if(!msg || NOISE.test(msg) || NOISE.test(stack)) return;
    var me=who(), day=new Date().toISOString().slice(0,10), k=me+'|'+kind+'|'+msg, now=Date.now();
    var e=seen[k];
    if(e){ e.n++; e.last=now; }
    else { if(order.length>=MAX) return;
      e=seen[k]={ id:'e'+hash(day+'|'+k), kind:kind, msg:msg, stack:stack.split('\n').slice(0,4).join('\n').slice(0,600), who:me,
        page:page(), build:window.__HQ_BUILD||'', device:ua(), day:day, first:now, last:now, n:1 };
      order.push(k); }
    dirty[k]=1;
    if(TEST){ if(window.__hqCheckLive) window.__hqCheckLive(e); return; }
    if(!timer) timer=setTimeout(flush, 8000);
  }
  function door(){ var s=S(); return s.db && s.db.collection ? s.db.collection('errors') : null; }
  function flush(){ timer=null; if(saving) { timer=setTimeout(flush, 8000); return; }
    var d=door(); if(!d){ timer=setTimeout(flush, 15000); return; }
    var ks=Object.keys(dirty); dirty={}; if(!ks.length) return; saving=true;
    Promise.all(ks.map(function(k){ var e=seen[k], body={}; Object.keys(e).forEach(function(f){ if(f!=='id') body[f]=e[f]; });
      return Promise.resolve().then(function(){ return d.doc(e.id).set(body); }).catch(function(){}); }))
      .then(function(){ saving=false; }, function(){ saving=false; });
  }
  window.addEventListener('error', function(ev){
    if(ev.filename && ev.filename.indexOf(location.origin)!==0 && !/lambda-url|cdnjs|jsdelivr/.test(ev.filename)) return;
    rec('Page error', ev.message, (ev.error && ev.error.stack) || ((ev.filename||'').split('/').pop()+':'+ev.lineno)); }, true);
  window.addEventListener('unhandledrejection', function(ev){ var r=ev.reason||{};
    if(r && (r.code==='OFFLINE' || r.code==='SIGNED_OUT' || r.status===401)) return;
    rec('Page error', r.message||String(r), r.stack||''); });
  var ce=console.error; console.error=function(){ try{ var a=[].slice.call(arguments);
      var m=a.map(function(x){ return x && x.message ? x.message : (typeof x==='string' ? x : ''); }).filter(Boolean).join(' — ');
      var st=(a.find(function(x){ return x && x.stack; })||{}).stack;
      if(m) rec('Logged error', m, st); }catch(x){} return ce.apply(console, arguments); };
  var of=window.fetch.bind(window);
  window.fetch=function(u,o){ var url=String(u&&u.url||u), m=((o&&o.method)||(u&&u.method)||'GET').toUpperCase();
    var p=of(u,o);
    if(m==='GET' || !/\.lambda-url\.[^\/]+\.on\.aws\//.test(url) || /\/data\/errors(\?|$)/.test(url) || /\/ask(\?|$)/.test(url)) return p;
    return p.then(function(r){ if(!r.ok && r.status!==409 && r.status!==401){ var path=url.replace(/^https:\/\/[^\/]+/,'');
        r.clone().json().catch(function(){ return {}; }).then(function(b){ rec('Save refused', 'Saving '+path.replace(/^\/[^\/]+\/(data|file)\//,'')+' was refused ('+r.status+(b&&b.error?' '+b.error:'')+(b&&b.message?': '+b.message:'')+')'); }); }
      return r; });
  };
  window.__hqProb={ version:'1.0', list:function(){ return order.map(function(k){ return seen[k]; }); }, rec:rec, flush:flush };

  /* ---------- shared bits for System Health and the Test Copy ---------- */
  function h(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
  var css=document.createElement('style'); css.textContent=
    '#hq-prob-btn .pdot{width:8px;height:8px;border-radius:50%;background:#d92d20;display:inline-block;margin-left:auto}'+
    '#hq-prob-btn:not(.has) .pdot{display:none}'+
    '.hq-prob{position:fixed;inset:0;z-index:99990;background:rgba(6,32,47,.45);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px}'+
    '.hq-prob .pp{background:var(--surface,#fff);color:var(--ink,#0d314c);border-radius:12px;width:min(860px,100%);max-height:84vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.25)}'+
    '.hq-prob .ph{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line,#dde6ee);position:sticky;top:0;background:inherit}'+
    '.hq-prob .ph b{font-size:17px}.hq-prob .ph .sp{flex:1}.hq-prob .ph button,.hq-prob .pr button{font:inherit;font-size:13px;border:1px solid var(--line,#c9d6e2);background:transparent;color:inherit;border-radius:6px;padding:5px 10px;cursor:pointer}'+
    '.hq-prob .pr{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:12px 18px;border-bottom:1px solid var(--line,#eef2f6)}'+
    '.hq-prob .pr .m{font-weight:600;word-break:break-word}.hq-prob .pr .meta{grid-column:1;font-size:12.5px;opacity:.75}'+
    '.hq-prob .pr .st{grid-column:1/-1;font:11.5px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;opacity:.65;max-height:5.6em;overflow:hidden}'+
    '.hq-prob .pr .act{grid-row:1/3;grid-column:2;align-self:start}.hq-prob .none{padding:28px 18px;text-align:center;opacity:.8}'+
    '.hq-prob .kind{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:1px 6px;border-radius:4px;background:#fde7e5;color:#912018;margin-right:6px}';
  document.head.appendChild(css);
  /* ---------- System Health (like Summit HQ's, November 7, 2026) ----------
     Team HQ leans on things nobody sees: the save relay, and the Power Automate flows that fill
     calendars and email and carry out Outlook actions. This watches what the page can see, every
     5 minutes while Team HQ is open, and the Team Error Log gathers errors from everyone's screen. */
  css.textContent+=
    '#hh-btn{position:relative}#hh-btn .hh-dot{position:absolute;left:21px;top:6px;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.35);box-shadow:0 0 0 2px var(--navy,#0d314c)}'+
    '#hh-btn .hh-dot.ok{background:#72C08E}#hh-btn .hh-dot.warn{background:#E0A83C}#hh-btn .hh-dot.bad{background:#F08579}body.railmini #hh-btn .hh-dot{left:24px;top:7px}'+
    '#hh-bar{position:fixed;top:calc(64px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:9980;display:flex;align-items:center;gap:12px;max-width:min(760px,calc(100vw - 32px));background:#FBE8E6;color:#7A1913;border:1px solid #A32219;border-radius:8px;padding:9px 10px 9px 14px;font:500 13px/1.4 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 6px 20px rgba(13,49,76,.16)}'+
    '#hh-bar[hidden]{display:none}#hh-bar .hh-go{flex:none;background:#A32219;color:#fff;border:0;border-radius:5px;padding:6px 11px;font:inherit;font-weight:600;cursor:pointer}#hh-bar .hh-x{flex:none;background:none;border:0;color:inherit;font-size:20px;line-height:1;padding:0 4px;cursor:pointer}'+
    '.hh-in{padding:14px 18px 18px}.hh-sum{display:flex;align-items:center;gap:10px;margin:0 0 12px;font-size:13.5px}.hh-big{width:12px;height:12px;border-radius:50%;flex:none}'+
    '.hh-big.ok,.hh-row.ok::before{background:var(--good,#0F7B5C)}.hh-big.warn,.hh-row.warn::before{background:#A2701A}.hh-big.bad,.hh-row.bad::before{background:#A32219}.hh-big.off,.hh-row.off::before{background:var(--ink-3,#71777F)}'+
    '.hh-grid{columns:3 230px;column-gap:8px}.hh-row{break-inside:avoid;margin:0 0 8px;position:relative;border:1px solid var(--border,#DFDCD5);border-radius:6px;padding:9px 11px 9px 22px;background:var(--surface,#fff)}'+
    '.hh-row::before{content:"";position:absolute;left:9px;top:14px;width:7px;height:7px;border-radius:50%}.hh-row.bad{border-color:#A32219;background:#FBE8E6}.hh-row.warn{border-color:#A2701A;background:#FBF0DC}'+
    '.hh-t{font-weight:700;font-size:13px}.hh-l{font-size:12.5px;color:var(--ink-2,#414750);margin-top:2px}.hh-row ul{margin:5px 0 0;padding-left:16px;font-size:12px;color:var(--ink-2,#414750)}'+
    '.hh-bars{margin-top:5px;display:flex;flex-direction:column;gap:4px}.hh-bars div{display:grid;grid-template-columns:1fr 46px;gap:8px;align-items:center;font-size:11.5px;color:var(--ink-2,#414750)}'+
    '.hh-bars i{display:block;height:5px;border-radius:3px;background:var(--border,#DFDCD5);overflow:hidden;grid-column:1/-1}.hh-bars i s{display:block;height:100%;background:var(--navy-mid,#14486E)}.hh-bars i s.warn{background:#A2701A}.hh-bars i s.bad{background:#A32219}'+
    '.hh-quiet{color:var(--ink-3,#71777F);font-size:12.5px;margin:6px 0 0;line-height:1.5}.hh-in h4{margin:16px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3,#71777F)}'+
    '.hh-log{border:1px solid var(--border,#DFDCD5);border-radius:6px;overflow:hidden}.hh-lr{display:grid;grid-template-columns:auto 1fr auto;gap:2px 10px;padding:8px 10px;border-top:1px solid var(--border,#eef2f6);font-size:12.5px}.hh-lr:first-child{border-top:0}'+
    '.hh-lr .d2{grid-row:1/3;grid-column:3;align-self:start;color:#2b8a3e;font-size:12px;font-weight:600;white-space:nowrap}'+
    '.hh-lr .w{white-space:nowrap;color:var(--ink-3,#71777F)}.hh-lr .m{font-weight:600;word-break:break-word}.hh-lr .d{grid-column:2;color:var(--ink-3,#71777F);font-size:12px}.hh-lr button{grid-row:1/3;grid-column:3;align-self:start}'+
    '.hh-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.hh-in button{font:inherit;font-size:13px;border:1px solid var(--border,#c9d6e2);background:transparent;color:inherit;border-radius:6px;padding:5px 10px;cursor:pointer}.hh-in .pri{background:var(--navy,#0d314c);color:#fff;border-color:transparent}';
  var MIN=60000, last=null, hbtn=null, hdot=null, hbar=null, hov=null, pendSince={}, running=null, logDocs=null;
  var NAMES={tasks:'Tasks', planitems:'Plan Items', plans:'Plans', rocks:'Team Projects', dates:'Key Dates', expenses:'Expenses', profiles:'Board Layouts', people:'People', agenda:'Team Meeting Agenda',
    notes:'Notes', asks:'Asks', nudges:'Nudges', figures:'Figures', blocks:'Time Aside', comments:'Comments', errors:'Error Log', syncs:'Sync Ups', syncitems:'Sync Up Cards', expinbox:'Emailed Receipts', outbox:'Outlook Requests', myitems:'My Items'};
  function nice(n){ n=String(n).replace(/^[^:]*:/,''); return NAMES[n] || n.replace(/-/g,' ').replace(/\b\w/g,function(c){ return c.toUpperCase(); }); }
  function esc(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function when(t){ var d=new Date(t); if(isNaN(d)) return ''; var tm=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    return new Date().toDateString()===d.toDateString() ? tm : d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' at '+tm; }
  function ago(t){ var m=Math.round((Date.now()-t)/MIN); if(m<60) return m<=1?'just now':m+' min ago'; var hh=Math.round(m/60); if(hh<48) return hh+' hr ago'; return Math.round(hh/24)+' days ago'; }
  function row(key,title,level,line,list,extra){ return {key:key,title:title,level:level,line:line,list:list||[],extra:extra||''}; }
  function first(id){ var p=(S().people||[]).find(function(x){ return x.id===id; }); return p ? p.name.split(' ')[0] : id; }
  function chkSaving(){ var R=window.__hqRelay; if(!R) return row('save','Saving','off','The save relay hasn’t started on this page.');
    var st=R.status||{}, F=R.files||{}, n=0, now=Date.now(), oldest=0;
    Object.keys(F).forEach(function(k){ var p=(F[k].pending||[]).length; if(p){ n+=p; if(!pendSince[k]) pendSince[k]=now; oldest=Math.max(oldest, now-pendSince[k]); } else delete pendSince[k]; });
    var age=Math.round(oldest/MIN), refused=order.map(function(k){ return seen[k]; }).filter(function(e){ return e.kind==='Save refused'; });
    if(refused.length) return row('save','Saving','bad', refused.length+' save'+(refused.length>1?'s were':' was')+' refused since this page was opened. Make the change again; if it keeps happening, tell Perry.', refused.slice(-3).map(function(e){ return when(e.last)+': '+e.msg; }));
    if(n && age>=5) return row('save','Saving','bad', n+' change'+(n>1?'s have':' has')+' been waiting '+age+' minutes to save. Keep this tab open; if it doesn’t clear, the save relay may be down (tell Perry).');
    if(st.offline) return row('save','Saving','warn','Can’t reach the save relay right now. Changes wait here, on this computer too, and save when it’s back.');
    if(n && st.lastError) return row('save','Saving','warn', n+' change'+(n>1?'s are':' is')+' being tried again'+(R.why && R.why() ? ' ('+R.why()+')' : '')+'.');
    return row('save','Saving','ok', n ? n+' change'+(n>1?'s':'')+' saving now.' : 'Every change is saved.'); }
  function chkStorage(){ var R=window.__hqRelay; if(!R) return row('store','Storage','off','Not loaded yet.');
    var cap=940000, F=R.files||{}, sizes=[];
    Object.keys(F).forEach(function(k){ var f=F[k]; if(!f.loaded || !f.server || f.proj!=='team-hq') return; var n=0; try{ n=JSON.stringify(f.server).length; }catch(e){} sizes.push({name:f.name||k, n:n, pct:Math.round(n*100/cap)}); });
    sizes.sort(function(a,b){ return b.n-a.n; }); var top=sizes.slice(0,4), w=top[0];
    var lvl=!w ? 'ok' : w.pct>=90 ? 'bad' : w.pct>=70 ? 'warn' : 'ok';
    var bars='<div class="hh-bars">'+top.map(function(s){ return '<div><span>'+esc(nice(s.name))+'</span><span>'+s.pct+'%</span><i><s class="'+(s.pct>=90?'bad':s.pct>=70?'warn':'')+'" style="width:'+Math.max(1,Math.min(100,s.pct))+'%"></s></i></div>'; }).join('')+'</div>';
    var line=!w ? 'Nothing loaded yet.' : lvl==='bad' ? nice(w.name)+' is '+w.pct+'% full. Tell Perry before it reaches 100%: saves to it would stop.'
      : lvl==='warn' ? nice(w.name)+' is '+w.pct+'% full. Plenty for now; the new database removes this limit.' : 'Every shared file has room. The fullest is '+w.pct+'% full.';
    return row('store','Storage',lvl,line,[],bars); }
  function chkEmail(){ var R=window.__hqRelay, me=S().me; if(!R || !R.readOther || !me) return Promise.resolve([]);
    var ids=[me].concat(ADMINS.indexOf(me)>=0 ? ['jonna','vanessa'] : []).filter(function(x,i,a){ return a.indexOf(x)===i; });
    return Promise.all(ids.map(function(id){ return R.readOther('team-hq','mail-'+id).then(function(d){
        if(!d || !d.at) return null; var t=typeof d.at==='number' ? d.at : Date.parse(d.at), a=Math.round((Date.now()-t)/MIN), title='Email Flow – '+first(id);
        if(a>60) return row('mail-'+id, title, 'bad', 'Last read the inbox '+ago(t)+'. It runs every 15 minutes, so the Team HQ Email – '+first(id)+' flow may be off or failing: open it in Power Automate and check its runs.');
        if(a>30) return row('mail-'+id, title, 'warn', 'Last read the inbox '+ago(t)+' (it runs every 15 minutes).');
        return row('mail-'+id, title, 'ok', 'Read the inbox '+ago(t)+'.'); }, function(){ return null; }); }))
      .then(function(L){ return L.filter(Boolean); }); }
  function chkOutlook(){ var C=window.__cal && window.__cal.CAL, P=S().people||[]; if(!C || !C.by || !Object.keys(C.by).length) return row('cal','Outlook Calendar Flows','off','Calendars haven’t loaded yet.');
    var t0=new Date(); t0.setHours(0,0,0,0); var stale=[];
    P.forEach(function(p){ var L=C.by[p.id]; if(!Array.isArray(L)) return; if(!L.some(function(e){ return (e.s||0)>=t0.getTime(); })) stale.push(p.name); });
    var n=P.filter(function(p){ return Array.isArray(C.by[p.id]); }).length;
    if(stale.length) return row('cal','Outlook Calendar Flows','warn', stale.length+' calendar'+(stale.length>1?'s have':' has')+' nothing from today on. That can be a quiet stretch or time off, or that person’s Team HQ Outlook flow may have stopped.', stale);
    return row('cal','Outlook Calendar Flows','ok', 'All '+n+' calendars have meetings from today on.'+(C.at ? ' Read '+ago(C.at)+'.' : '')); }
  function chkActions(){ var x=window.__hqx, A=x && x.ACT, s=S(); if(!A || !A.on) return null;
    var L=(s.bset && Array.isArray(s.bset.hqActs)) ? s.bset.hqActs : [], now=Date.now();
    var wait=L.filter(function(z){ return !z.fin && !z.err; }), late=wait.filter(function(z){ return now-(z.at||now)>10*MIN; }), errs=L.filter(function(z){ return z.err && now-(z.at||0)<24*60*MIN; });
    if(late.length) return row('act','Do It in Outlook Flow','bad', late.length+' Outlook change'+(late.length>1?'s have':' has')+' waited more than 10 minutes. The Team HQ Actions flow may be off or failing: open it in Power Automate and check its runs.');
    if(errs.length) return row('act','Do It in Outlook Flow','warn', errs.length+' Outlook change'+(errs.length>1?'s':'')+' didn’t go through today. Outlook may have refused '+(errs.length>1?'them':'it')+'; try again.');
    return row('act','Do It in Outlook Flow','ok', wait.length ? wait.length+' change'+(wait.length>1?'s':'')+' on the way.' : 'Nothing waiting.'+(A.sent ? ' Last carried out a change '+when(A.sent)+'.' : '')); }
  function chkErrors(){ var L=order.map(function(k){ return seen[k]; }).filter(function(e){ return e.kind!=='Save refused'; });
    if(!L.length) return row('err','Errors on This Page','ok','None since this page was opened.');
    var n=L.reduce(function(a,e){ return a+e.n; },0);
    return row('err','Errors on This Page','warn', n+' error'+(n>1?'s':'')+' since this page was opened. Usually harmless; they’re in the Team Error Log below.', L.slice(-4).reverse().map(function(e){ return when(e.last)+': '+e.msg.slice(0,110); })); }
  function worst(rows){ return rows.some(function(r){ return r.level==='bad'; }) ? 'bad' : rows.some(function(r){ return r.level==='warn'; }) ? 'warn' : 'ok'; }
  function run(){ if(running) return running;
    running=chkEmail().catch(function(){ return []; }).then(function(mail){ var out=[chkSaving(), chkStorage()].concat(mail);
      try{ out.push(chkOutlook()); }catch(e){} try{ var a=chkActions(); if(a) out.push(a); }catch(e){} out.push(chkErrors());
      last={at:Date.now(), rows:out}; running=null; paint(); return last; }, function(){ running=null; });
    return running; }
  function placeBtn(){ var box=document.querySelector('.hq.rail .mast-right'); if(!box) return false;
    if(!hbtn){ hbtn=h('button','theme-btn'); hbtn.type='button'; hbtn.id='hh-btn'; hbtn.title='System Health';
      hbtn.innerHTML='<svg class="ti" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.5-6 4 12 2.5-6H21"/></svg><i class="hh-dot" aria-hidden="true"></i><span>System Health</span>';
      hbtn.addEventListener('click', openHealth); hdot=hbtn.querySelector('.hh-dot'); }
    var before=document.getElementById('help-btn') || document.getElementById('theme-btn');
    if(hbtn.parentNode!==box || (before && hbtn.nextSibling!==before)) box.insertBefore(hbtn, before||box.firstChild); return true; }
  function paint(){ placeBtn(); if(!last) return; var w=worst(last.rows);
    if(hdot) hdot.className='hh-dot '+w; if(hbtn) hbtn.setAttribute('aria-label','System Health: '+(w==='bad'?'needs attention':w==='warn'?'a warning':'all working'));
    var bad=last.rows.filter(function(r){ return r.level==='bad'; }), sig=bad.map(function(r){ return r.key+':'+r.line; }).join('|'), gone='';
    try{ gone=sessionStorage.getItem('hq:health-dismissed')||''; }catch(e){}
    if(!hbar){ hbar=h('div'); hbar.id='hh-bar'; hbar.setAttribute('role','alert'); hbar.hidden=true; document.body.appendChild(hbar); }
    if(!bad.length || sig===gone) hbar.hidden=true;
    else { hbar.innerHTML='<span><b>'+esc(bad[0].title)+':</b> '+esc(bad[0].line)+(bad.length>1?' (and '+(bad.length-1)+' more)':'')+'</span><button type="button" class="hh-go">Details</button><button type="button" class="hh-x" aria-label="Hide until something else changes">&times;</button>';
      hbar.querySelector('.hh-go').onclick=openHealth; hbar.querySelector('.hh-x').onclick=function(){ try{ sessionStorage.setItem('hq:health-dismissed', sig); }catch(e){} hbar.hidden=true; }; hbar.hidden=false; }
    if(hov && hov.isConnected) drawHealth(); }
  function loadLog(){ var R=window.__hqRelay; if(!R || !R.readOther) return Promise.resolve([]);
    return R.readOther('team-hq','errors').then(function(d){ var o=(d&&d.docs)||{};
      logDocs=Object.keys(o).map(function(id){ var x=Object.assign({}, o[id]); x.id=id; return x; }).sort(function(a,b){ return (b.last||0)-(a.last||0); }); return logDocs; }, function(){ return logDocs||[]; }); }
  function delLog(ids){ var d=door(); if(!d) return Promise.resolve(); return Promise.all(ids.map(function(id){ return Promise.resolve().then(function(){ return d.doc(id).delete(); }).catch(function(){}); })); }
  function report(){ if(!last) return ''; return ['Team HQ System Health, '+new Date(last.at).toLocaleString('en-US')+', version '+BUILD,'']
      .concat(last.rows.map(function(r){ return (r.level==='ok'?'OK':r.level==='warn'?'WARNING':r.level==='bad'?'PROBLEM':'NOT CHECKED')+' | '+r.title+': '+r.line+(r.list.length?'\n   - '+r.list.join('\n   - '):''); }))
      .concat(['','Team Error Log (last 7 days):']).concat((logDocs||[]).filter(function(x){ return (x.last||0)>Date.now()-7*864e5; }).map(function(x){ return '  '+new Date(x.last).toLocaleString('en-US')+' '+first(x.who)+' | '+x.page+' | '+x.kind+' x'+x.n+' | '+x.msg; })).join('\n'); }
  /* Recently Deleted: every delete is kept for 30 days by the Team HQ Recently Deleted job in the private data
     repository, which reads each save's history (so nothing has to remember to keep a copy). Restore puts it back. */
  var KIND={tasks:'Task',rocks:'Team Project',dates:'Key Date',plans:'Plan',planitems:'Plan Item',agenda:'Agenda Item',notes:'Note',nudges:'Nudge',asks:'Ask',expenses:'Expense',comments:'Comment',syncitems:'Sync Up Item',syncs:'Sync Up',myitems:'My Item',people:'Person',templates:'Template',rules:'Rule',blocks:'Block',figures:'Figure',profiles:'Profile',datekinds:'Date Kind',plankinds:'Plan Kind'};
  function label(x){ var d=x.data||{}; var t=d.title||d.name||d.t||d.text||d.subject||d.what||d.label||''; return String(t||x.id).replace(/\s+/g,' ').slice(0,90); }
  function paintDeleted(box, adm){ var R=window.__hqRelay; if(!box) return; if(!R || !R.readOther){ box.innerHTML=''; box.appendChild(h('p','hh-quiet','Can’t read the list right now.')).style.cssText='padding:8px 10px;margin:0'; return; }
    R.readOther('team-hq','trash').then(function(t){ var o=(t&&t.docs)||{}, me=S().me, cut=Date.now()-30*864e5;
      var L=Object.keys(o).map(function(k){ return Object.assign({key:k}, o[k]); }).filter(function(x){ return x && x.col && x.id && (x.at||0)>cut && (adm || x.by===me); }).sort(function(a,b){ return (b.at||0)-(a.at||0); });
      box.textContent='';
      if(!L.length){ box.appendChild(h('p','hh-quiet', adm ? 'Nothing deleted in the last 30 days. Anything anyone deletes shows up here within the hour, and can be put back.' : 'Nothing you deleted in the last 30 days. Anything you delete shows up here within the hour, and can be put back.')).style.cssText='padding:8px 10px;margin:0'; return; }
      var cols={}; L.forEach(function(x){ cols[x.col]=1; });
      Promise.all(Object.keys(cols).map(function(c){ return R.readOther('team-hq', c).then(function(d){ return [c, (d&&d.docs)||{}]; }, function(){ return [c, null]; }); })).then(function(P){ var now={}; P.forEach(function(p){ now[p[0]]=p[1]; });
        L.slice(0,60).forEach(function(x){ var r=h('div','hh-lr'); r.appendChild(h('span','w', when(x.at))); r.appendChild(h('span','m', (KIND[x.col]||x.col)+': '+label(x)));
          var back=now[x.col] && Object.prototype.hasOwnProperty.call(now[x.col], x.id);
          if(back) r.appendChild(h('span','d2','Back in place'));
          else { var b=h('button',null,'Restore'); b.onclick=function(){ var s=S(); if(!s.db || !s.db.collection || !x.data){ b.textContent='Couldn’t Restore'; return; } b.disabled=true; b.textContent='Restoring…';
              Promise.resolve().then(function(){ return s.db.collection(x.col).doc(x.id).set(x.data); }).then(function(){ b.replaceWith(h('span','d2','Restored. Refresh to see it.')); }, function(){ b.disabled=false; b.textContent='Couldn’t Restore. Try Again'; }); };
            r.appendChild(b); }
          r.appendChild(h('span','d', [first(x.by||'someone'), 'deleted it'].join(' '))); box.appendChild(r); }); }); },
      function(){ box.textContent=''; box.appendChild(h('p','hh-quiet','The list of deleted items isn’t there yet. It fills in within the hour.')).style.cssText='padding:8px 10px;margin:0'; }); }
  function drawHealth(){ if(!hov || !last) return; var body=hov.querySelector('.hh-in'), w=worst(last.rows), adm=ADMINS.indexOf(S().me)>=0;
    body.innerHTML='<div class="hh-sum"><i class="hh-big '+w+'"></i><span><b>'+(w==='bad'?'Something Needs Attention':w==='warn'?'Working, With a Warning':'Everything Is Working')+'</b>. Checked '+when(last.at)+'; it checks again every 5 minutes while Team HQ is open.</span></div>'
      +'<div class="hh-grid">'+last.rows.map(function(r){ return '<div class="hh-row '+r.level+'"><div class="hh-t">'+esc(r.title)+'</div><div class="hh-l">'+esc(r.line)+'</div>'+(r.list.length?'<ul>'+r.list.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul>':'')+r.extra+'</div>'; }).join('')+'</div>'
      +'<p class="hh-quiet">Not watched from here (their work never shows in Team HQ’s data until it lands, so a stop can’t be seen): the Team HQ Expense Inbox flow for receipts emailed to expense@. Power Automate emails a flow’s owner when it keeps failing.</p>'
      +'<h4>Recently Deleted (Last 30 Days)</h4><div class="hh-log hh-del"><p class="hh-quiet" style="padding:8px 10px;margin:0">Loading…</p></div>'
      +'<h4>Team Error Log (Last 7 Days)</h4><div class="hh-log"><p class="hh-quiet" style="padding:8px 10px;margin:0">Loading…</p></div>'
      +'<div class="hh-acts"><button type="button" class="pri" data-hh="again">Check Again</button><button type="button" data-hh="copy">Copy Report</button>'+(adm?'<button type="button" data-hh="clear">Clear the Log</button>':'')+'</div>';
    body.querySelector('[data-hh="again"]').onclick=function(e){ e.target.disabled=true; e.target.textContent='Checking…'; run(); };
    body.querySelector('[data-hh="copy"]').onclick=function(e){ loadLog().then(function(){ return navigator.clipboard.writeText(report()); }).then(function(){ e.target.textContent='Copied'; }, function(){ e.target.textContent='Couldn’t Copy'; }); };
    var cb=body.querySelector('[data-hh="clear"]'); if(cb) cb.onclick=function(){ cb.disabled=true; delLog((logDocs||[]).map(function(x){ return x.id; })).then(function(){ logDocs=[]; paintLog(); cb.disabled=false; }); };
    function paintLog(){ var box=body.querySelector('.hh-log'); box.textContent=''; var L=(logDocs||[]).filter(function(x){ return (x.last||0)>Date.now()-7*864e5; });
      if(!L.length){ box.appendChild(h('p','hh-quiet','Nothing in the last 7 days. When something breaks on anyone’s screen, it shows up here: who, which page, and what went wrong.')).style.cssText='padding:8px 10px;margin:0'; return; }
      L.slice(0,40).forEach(function(x){ var r=h('div','hh-lr'); r.appendChild(h('span','w', when(x.last))); r.appendChild(h('span','m', (x.kind||'Error')+': '+(x.msg||'')));
        if(adm){ var b=h('button',null,'Clear'); b.onclick=function(){ b.disabled=true; delLog([x.id]).then(function(){ logDocs=logDocs.filter(function(z){ return z.id!==x.id; }); paintLog(); }); }; r.appendChild(b); }
        r.appendChild(h('span','d', [first(x.who), x.page, x.device, x.n>1?x.n+' times':'once', x.build?'version '+x.build:''].filter(Boolean).join(' · '))); box.appendChild(r); }); }
    paintDeleted(body.querySelector('.hh-del'), adm);
    loadLog().then(function(L){ var old=L.filter(function(x){ return (x.last||0)<Date.now()-30*864e5; }); if(old.length && adm) delLog(old.map(function(x){ return x.id; })); paintLog(); }); }
  function openHealth(){ if(hov && hov.isConnected){ return; } hov=h('div','hq-prob'); var pp=h('div','pp'), ph=h('div','ph'); hov.appendChild(pp); pp.appendChild(ph);
    pp.setAttribute('role','dialog'); pp.setAttribute('aria-modal','true'); pp.setAttribute('aria-label','System Health');
    ph.appendChild(h('b',null,'System Health')); ph.appendChild(h('span','sp')); var cls=h('button',null,'Close'); ph.appendChild(cls);
    var body=h('div','hh-in'); pp.appendChild(body); body.appendChild(h('p','hh-quiet','Checking…'));
    function close(){ if(hov){ hov.remove(); hov=null; } document.removeEventListener('keydown', escK); } function escK(e){ if(e.key==='Escape') close(); }
    cls.onclick=close; hov.addEventListener('click', function(e){ if(e.target===hov) close(); }); document.addEventListener('keydown', escK);
    document.body.appendChild(hov); setTimeout(function(){ cls.focus(); }, 0);
    if(last) drawHealth(); run(); }
  (function wait(n){ if(placeBtn()){ var s=S(); if(s.ready) setTimeout(run, 6000); else if(n<120) setTimeout(function(){ wait(n+1); }, 1000); return; } if(n<120) setTimeout(function(){ wait(n+1); }, 1000); })(0);
  setInterval(function(){ if(!document.hidden) run(); }, 5*MIN);
  window.__hqProb.open=openHealth; window.__hqHealth={run:run, open:openHealth, last:function(){ return last; }};

  /* ---------- works offline (November 7, 2026) ----------
     sw.js keeps a copy of Team HQ on the device so it opens with no signal; changes made offline wait
     on the device and save when the signal is back. A bar says so while offline. */
  try{ if('serviceWorker' in navigator && location.protocol==='https:' && !TEST) navigator.serviceWorker.register('/team-hq/sw.js', {scope:'/team-hq/'}).catch(function(e){ rec('Logged error', 'Offline copy could not be set up: '+(e && e.message || e)); }); }catch(e){}
  var offBar=null;
  function paintOff(){ var R=window.__hqRelay, off=!navigator.onLine || !!(R && R.status && R.status.offline);
    if(!offBar){ if(!off || !document.body) return; offBar=h('div','hq-off'); offBar.setAttribute('role','status'); document.body.appendChild(offBar); }
    var n=0; try{ var F=(R && R.files)||{}; Object.keys(F).forEach(function(k){ n+=(F[k].pending||[]).length; }); }catch(e){}
    offBar.hidden=!off;
    offBar.textContent= off ? 'You\u2019re offline. '+(n ? n+' change'+(n>1?'s are':' is')+' kept on this device and will save' : 'Anything you change is kept on this device and saves')+' when you\u2019re back online.' : ''; }
  css.textContent+='.hq-off{position:fixed;left:50%;transform:translateX(-50%);top:calc(64px + env(safe-area-inset-top,0px));z-index:9985;max-width:calc(100vw - 24px);background:#FBF0DC;color:#6b4a0f;border:1px solid #A2701A;border-radius:8px;padding:8px 12px;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 6px 18px rgba(13,49,76,.14)}.hq-off[hidden]{display:none}';
  window.addEventListener('online', paintOff); window.addEventListener('offline', paintOff); setInterval(paintOff, 10000);

  /* ---------- the Test Copy: banner, and the check that opens every page and tile ---------- */
  if(!TEST) return;
  var live=[]; window.__hqCheckLive=function(e){ live.push(e); };
  css.textContent+=
    '.hq-test{position:fixed;left:12px;bottom:12px;z-index:99980;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#fef0c7;color:#7a2e0e;border:1px solid #f5c66b;border-radius:10px;padding:8px 10px;font:600 13px/1.3 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.15);max-width:calc(100vw - 24px)}'+
    '.hq-test button{font:inherit;border:1px solid #d9a441;background:#fff8e6;color:inherit;border-radius:6px;padding:4px 10px;cursor:pointer}'+
    '.hq-check .ok{color:#067647;font-weight:700}.hq-check .bad{color:#b42318;font-weight:700}.hq-check .pr{grid-template-columns:1fr}';
  var bar=h('div','hq-test'); bar.appendChild(h('span',null,'Test Copy · version '+BUILD+' · nothing you do here is saved'));
  var rb=h('button',null,'Run Check'), lb=h('button',null,'Leave Test Copy'); bar.appendChild(rb); bar.appendChild(lb);
  lb.onclick=function(){ location.href=location.pathname; };
  rb.onclick=function(){ runCheck(); };
  (function put(){ if(document.body) document.body.appendChild(bar); else setTimeout(put, 200); })();
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function txt(el){ return (el && el.innerText) || ''; }
  async function runCheck(){
    rb.disabled=true; rb.textContent='Checking…';
    var res=[], nav=[].slice.call(document.querySelectorAll('.hq.rail [data-nx], .hq.rail [data-hq]')).filter(function(b){ return b.textContent.trim(); });
    for(var i=0;i<nav.length;i++){ var b=nav[i], name=b.textContent.trim(), before=live.length;
      rb.textContent='Checking '+name+'…';
      try{ b.click(); }catch(e){ rec('Page error', e.message, e.stack); }
      await sleep(2500);
      var main=b.hasAttribute('data-nx') ? document.querySelector('.nx .nx-body') : document.getElementById('main'), t=txt(main), issues=[];
      live.slice(before).forEach(function(e){ issues.push(e.kind+': '+e.msg); });
      if(t.replace(/\s+/g,'').length<30) issues.push('The page came up empty');
      var bad=(t.match(/\bundefined\b|\bNaN\b|\[object Object\]|Invalid Date/g)||[]); if(bad.length) issues.push('Shows “'+bad[0]+'” on the page');
      var se=document.scrollingElement; if(se && se.scrollWidth>se.clientWidth+4) issues.push('The page is wider than the screen');
      res.push({name:name, issues:issues}); }
    var first=document.querySelector('.hq.rail [data-nx="day"]'); if(first) first.click();
    rb.textContent='Checking tiles…';
    var tiles={name:'Every tile, every size', issues:[]};
    try{ if(window.__hqGallery){ var before2=live.length; window.__hqGallery(); await sleep(6000);
        [].slice.call(document.querySelectorAll('#hq-gallery [data-gal]')).forEach(function(el){ var nm=el.dataset.gal, r=el.getBoundingClientRect();
          if(/^ERROR /.test(txt(el))) tiles.issues.push(nm+': '+txt(el).slice(0,140));
          else if([].slice.call(el.children).some(function(c){ var q=c.getBoundingClientRect(); return q.height>0 && q.bottom>r.top+el.clientHeight+2; })) tiles.issues.push(nm+': content runs past the tile');
          else if(/\bundefined\b|\bNaN\b|\[object Object\]/.test(txt(el))) tiles.issues.push(nm+': shows a broken value');
          if(r.height<20) tiles.issues.push(nm+': came up blank'); });
        live.slice(before2).forEach(function(e){ tiles.issues.push(e.kind+': '+e.msg); });
        var g=document.getElementById('hq-gallery'); if(g) g.remove(); }
      else tiles.issues.push('The tile gallery isn’t in this version'); }catch(e){ tiles.issues.push('The tile check itself failed: '+e.message); }
    res.push(tiles);
    rb.disabled=false; rb.textContent='Run Check Again';
    show(res); return res; }
  function show(res){ var fails=res.filter(function(r){ return r.issues.length; }).length;
    var ov=h('div','hq-prob hq-check'), pp=h('div','pp'), ph=h('div','ph'); ov.appendChild(pp); pp.appendChild(ph);
    ph.appendChild(h('b',null, fails ? 'Check Found '+fails+' Problem'+(fails>1?'s':'') : 'Check Passed'));
    ph.appendChild(h('span','sp')); var c=h('button',null,'Close'); ph.appendChild(c); c.onclick=function(){ ov.remove(); };
    pp.appendChild(h('div','pr',null)).appendChild(h('div','meta','Version '+BUILD+' · '+res.length+' checks · '+(window.__HQ_BLOCKED||[]).length+' saves held back (the Test Copy never saves)'));
    res.forEach(function(r){ var row=h('div','pr'); var m=h('div','m'); m.appendChild(h('span', r.issues.length?'bad':'ok', r.issues.length?'✕ ':'✓ ')); m.appendChild(document.createTextNode(r.name)); row.appendChild(m);
      r.issues.slice(0,12).forEach(function(s){ row.appendChild(h('div','meta',s)); }); if(r.issues.length>12) row.appendChild(h('div','meta','…and '+(r.issues.length-12)+' more'));
      pp.appendChild(row); });
    document.body.appendChild(ov);
    window.__hqCheckResult={version:BUILD, fails:fails, results:res}; }
  window.__hqCheck=runCheck;
  if(/[?&]check=1(&|$)/.test(location.search)) (function go(n){ var s=S(); if(s.ready && document.querySelector('.hq.rail [data-nx]')) setTimeout(runCheck, 5000); else if(n<120) setTimeout(function(){ go(n+1); }, 1000); })(0);
})();
