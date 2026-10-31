/* Team HQ upgrades — loaded by index.html after the app is ready.
 * skin: MISMO Media look, My Board styling + Tidy Up, Expenses on phones
 * projects-v2: Team Projects (Board, Timeline, Who's on What, workstream panel)
 * hub: My Hub at the top of My Board (My Day, systems, quick actions, Jump To)
 * findtime: Find a Time as its own tab, like the Scheduler, with a Doodle-style table
 * plans-v2: the Plans list as visual cards
 * today: Counting Down that rolls forward, The Next Four Weeks timeline
 * meeting: Team Meeting run of show and Put It on the Screen
 * mobile: bottom tab bar and phone layout for every tab
 * Each part runs on its own; if one fails, the rest of Team HQ is untouched. */
(function(){
'use strict';
var MODS=[];
/* ===== skin.js ===== */
MODS.push(function(){
/* Team HQ skin — the MISMO Media look across every tab, the restyled My Board,
   and Expenses as a phone app (save to home screen, opens straight to Expenses). */
(function(){
'use strict';
if(window.__skin && window.__skin.destroy) window.__skin.destroy();
const added=[];
function add(el){ document.head.appendChild(el); added.push(el); return el; }
const qs=new URLSearchParams(location.search);
const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const appExp = qs.get('app')==='expenses' || (standalone && /expenses/.test(location.search+location.hash));

/* ---------- phone app: manifest + home-screen tags ---------- */
function meta(name, content){ const m=document.createElement('meta'); m.name=name; m.content=content; return add(m); }
function link(rel, href, extra){ const l=document.createElement('link'); l.rel=rel; l.href=href; if(extra) Object.assign(l, extra); return add(l); }
if(!document.querySelector('link[rel="manifest"]')) link('manifest', '/team-hq/expenses.webmanifest');
link('apple-touch-icon', '/team-hq/expenses-icon-180.png');
meta('apple-mobile-web-app-capable','yes');
meta('mobile-web-app-capable','yes');
meta('apple-mobile-web-app-title','Expenses');
meta('apple-mobile-web-app-status-bar-style','black-translucent');
if(!document.querySelector('meta[name="theme-color"]')) meta('theme-color','#0d314c');
if(appExp) document.documentElement.classList.add('app-exp');

/* ---------- styles ---------- */
const css=document.createElement('style'); css.id='skin-css'; css.textContent=`
/* ===== MISMO Media treatment, every tab ===== */
:root{--band:#0d314c;--band-line:rgba(116,191,235,.28);--band-tile:rgba(255,255,255,.07);--hot:#f3a59b}
:root[data-theme="dark"]{--band:#0a2433;--band-tile:rgba(255,255,255,.05)}
.view > .vhead,.view > .pv2 > .vhead{align-items:flex-end;gap:14px;margin-bottom:2px}
.view > .vhead .grow::before,.view > .pv2 > .vhead .grow::before{content:"Team HQ";display:block;margin-bottom:2px;font-size:10.5px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-3)}
.view > .vhead h1,.view > .pv2 > .vhead h1{font-size:27px;font-weight:700;line-height:1.15;letter-spacing:-.012em;color:var(--ink)}
.view > .vhead p{margin-top:3px;font-size:13.5px;color:var(--ink-2)}
.vhead a.btn{text-decoration:none;white-space:nowrap;min-width:max-content}
.headline{background:var(--band);border:1px solid var(--band-line);padding:16px 18px 18px;gap:14px}
.headline .hl-date{font-size:10.5px;font-weight:700;letter-spacing:.11em;color:var(--sky)}
.headline .hl-say{font-size:16.5px;line-height:1.45;margin:-6px 0 0}
.headline .hl-say em{color:var(--sky)}
.headline .hl-say em.hl-late{color:var(--hot)}
.tiles{gap:10px}
.tile{background:var(--band-tile);border:1px solid var(--band-line);border-radius:6px;padding:12px 14px}
.tile:hover{background:rgba(255,255,255,.12)}
.tile b{font-size:27px;line-height:1.1;color:#fff}
.tile span{font-size:12.5px;font-weight:600;color:var(--sky);margin-top:5px}
.tile small{font-size:11.5px;color:rgba(255,255,255,.62);margin-top:1px}
.tile.bad b{color:var(--hot)}
.tile.warn b{color:#ffcf73}
.tile.sky b{color:var(--sky)}
/* cards: a header bar with the title, like MISMO Media's .card > .ch */
.box{border-radius:8px;box-shadow:none}
.box > .sect-t:first-child,.box > .hb-ch:first-child > .sect-t,.box > .hb-dh:first-child > .sect-t{font-size:15.5px;font-weight:700;letter-spacing:-.012em;text-transform:none;color:var(--ink)}
.box > .sect-t:first-child{margin:-18px -20px 14px;padding:12px 20px;border-bottom:1px solid var(--rule)}
.box > .hb-ch:first-child,.box > .hb-dh:first-child{margin:-18px -20px 14px;padding:10px 20px;border-bottom:1px solid var(--rule)}
.hb-acts > .sect-t{margin:-18px -20px 14px !important;padding:12px 20px;border-bottom:1px solid var(--rule)}
.sect-t{color:var(--ink-3)}
.filterbar .pill{border-radius:4px}
/* Team Projects and Hub cards borrow the same edges */
.pv2-card,.pv2-tl,.pv2-mxw,.hb-sys{box-shadow:none}
.pv2-card:hover,.hb-sys:hover{box-shadow:0 2px 4px rgba(13,49,76,.06),0 10px 24px rgba(13,49,76,.10)}

/* ===== My Board: the drag-and-drop board ===== */
.nbcanvas{margin:10px 0 16px;border:1px solid var(--rule);border-radius:10px;
  background-color:var(--surface-2);
  background-image:radial-gradient(color-mix(in srgb,var(--border-strong) 70%,transparent) 1px,transparent 1.3px);
  background-size:22px 22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}
:root[data-theme="dark"] .nbcanvas{background-color:color-mix(in srgb,var(--ground) 60%,var(--surface));box-shadow:none}
.widget{border-radius:10px;border-color:var(--border);
  box-shadow:0 1px 2px rgba(13,49,76,.06),0 4px 14px rgba(13,49,76,.07);
  transition:box-shadow .16s ease,transform .16s ease,border-color .16s ease}
.nbcanvas > .widget:hover{box-shadow:0 2px 4px rgba(13,49,76,.08),0 12px 28px rgba(13,49,76,.14);border-color:color-mix(in srgb,var(--pc) 55%,var(--border))}
:root[data-theme="dark"] .widget{box-shadow:0 1px 2px rgba(0,0,0,.35),0 6px 18px rgba(0,0,0,.28)}
.widget.bold::before{height:4px}
.widget > header{min-height:44px;background:var(--surface);gap:9px}
.widget.bold > header{background:linear-gradient(180deg,color-mix(in srgb,var(--pc) 10%,var(--surface)),color-mix(in srgb,var(--pc) 4%,var(--surface)));padding-top:4px}
#app-mine .widget > header h3,#app-mine .widget.bold > header h3{font-size:14px;font-weight:700;letter-spacing:-.005em;text-transform:none;color:var(--ink)!important}
.widget.bold > header h3::before{content:"";display:inline-block;width:8px;height:8px;margin-right:8px;border-radius:2px;background:var(--pc);vertical-align:1px}
.widget > header .tog:hover h3{color:var(--pc,var(--c1));text-decoration:none}
#app-mine .widget > header .cnt{font-size:11.5px;font-weight:700;color:var(--ink-2)!important;background:var(--surface)!important;border:1px solid color-mix(in srgb,var(--pc) 45%,var(--border))!important;border-radius:4px;padding:0 6px;line-height:18px}
.widget > header .grip{opacity:0;transition:opacity .15s}
.widget > header:hover .grip{opacity:.9}
.widget > header .wgear{opacity:.5}
.widget .wbody{padding:14px 16px}
.wmeter{min-height:36px;padding:0 16px;background:var(--surface)}
.widget.bold .wmeter{background:color-mix(in srgb,var(--pc) 4%,var(--surface))}
.wmeter .wmlab{font-size:12.5px;color:var(--ink-2)}
.nbsize{width:16px;height:16px;right:3px;bottom:3px;border-radius:0 0 7px 0;opacity:.35;
  background:radial-gradient(circle,var(--ink-3) 1.2px,transparent 1.6px) 0 0/5px 5px;
  -webkit-mask:linear-gradient(135deg,transparent 45%,#000 46%);mask:linear-gradient(135deg,transparent 45%,#000 46%)}
.widget:hover > .nbsize,.nbp:hover > .nbsize{opacity:.9}
.nbp.nbmoving{transform:rotate(.6deg) scale(1.012);box-shadow:0 20px 44px rgba(6,32,47,.30)!important;border-color:var(--pc)}
.widget.lifted{outline:2px solid var(--pc,var(--c1));outline-offset:3px}
body.moving-panel .widget:not(.dragging){outline:1px dashed color-mix(in srgb,var(--pc) 60%,var(--border))}
.boardbar{margin-bottom:0}
.boardbar .btn,.boardbar button{white-space:nowrap;min-width:max-content}

/* ===== phones ===== */
@media (max-width:640px){
  main{padding-inline:12px}
  .view > .vhead h1,.view > .pv2 > .vhead h1{font-size:23px}
  .headline{padding:14px}
  .headline .hl-say{font-size:15px}
  .tile b{font-size:23px}
  .tiles.one{grid-template-columns:repeat(2,minmax(0,1fr))}
  .pv2-panel{width:100vw}
  .hb-ag{grid-template-columns:1fr}
}

/* ===== Expenses: phone-first ===== */
@media (max-width:640px){
  #app-expenses > .vhead p{display:none}
  #app-expenses .snapzone{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:150px;padding:20px;border-radius:12px;border:2px dashed var(--sky);background:var(--sky-wash)}
  #app-expenses .snapzone svg{width:38px;height:38px}
  #app-expenses .exphead{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  #app-expenses .filterbar{overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;padding-bottom:4px}
  #app-expenses .filterbar > *{flex:0 0 auto}
  #app-expenses button,#app-expenses .btn,#app-expenses input,#app-expenses select{min-height:44px;font-size:16px}
  #app-expenses .filterbar .pill{min-height:38px;font-size:14px}
}
.exp-install{display:none}
@media (max-width:820px){ .exp-install{display:flex} }
.exp-install{align-items:center;gap:12px;padding:12px 14px;margin:0 0 14px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--sky);border-radius:8px;font-size:13.5px;color:var(--ink)}
.exp-install img{width:40px;height:40px;border-radius:9px;flex:0 0 auto}
.exp-install b{display:block}
.exp-install small{display:block;color:var(--ink-2);font-size:12.5px;line-height:1.4}
.exp-install .x{margin-left:auto;border:0;background:transparent;color:var(--ink-3);font-size:20px;line-height:1;cursor:pointer;padding:6px}
.app-exp .exp-install{display:none!important}

/* app mode: launched from the home screen */
html.app-exp body{padding-left:0!important}
html.app-exp .hq.rail,html.app-exp .railscrim,html.app-exp #newtask,html.app-exp #jot{display:none!important}
html.app-exp .hqtop{margin-left:0!important;width:100%!important;padding-top:env(safe-area-inset-top,0px)}
html.app-exp .hqname{font-size:0}
html.app-exp .hqname::after{content:"Expenses";font-size:17px}
html.app-exp main{padding:16px 14px calc(100px + env(safe-area-inset-bottom,0px))}
html.app-exp #app-expenses > .vhead{display:none}
html.app-exp #app-expenses .snapzone{min-height:180px}
.exp-dock{display:none}
html.app-exp .exp-dock{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:90;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));background:var(--surface);border-top:1px solid var(--border);box-shadow:0 -6px 20px rgba(6,32,47,.10)}
.exp-dock button{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;border-radius:8px;font:inherit;font-size:16px;font-weight:700;cursor:pointer;border:1px solid var(--navy);white-space:nowrap}
.exp-dock .snap{background:var(--navy);color:#fff}
.exp-dock .hand{background:var(--surface);color:var(--ink);border-color:var(--border-strong)}
:root[data-theme="dark"] .exp-dock .snap{background:var(--sky);color:var(--navy-deep);border-color:var(--sky)}
.exp-dock svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
`;
add(css);

/* ---------- Expenses: install tip + app dock ---------- */
const exp=document.getElementById('app-expenses');
let deferred=null;
const onBIP=e=>{ e.preventDefault(); deferred=e; paintExp(); };
window.addEventListener('beforeinstallprompt', onBIP);
const isiOS=/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
function dismissed(){ try{ return localStorage.getItem('tools:team-hq:exp.install.x')==='1'; }catch(e){ return false; } }
function paintExp(){
  if(!exp) return;
  mo && mo.disconnect();
  if(!standalone && !dismissed() && !exp.querySelector(':scope > .exp-install')){
    const tip=document.createElement('div'); tip.className='exp-install';
    const img=document.createElement('img'); img.src='/team-hq/expenses-icon-180.png'; img.alt=''; img.onerror=()=>img.remove(); tip.appendChild(img);
    const tx=document.createElement('div');
    const b=document.createElement('b'); b.textContent='Put Expenses on your phone'; tx.appendChild(b);
    const s=document.createElement('small');
    s.textContent = isiOS ? 'In Safari, tap Share, then Add to Home Screen. It opens straight to Expenses, like an app.'
                  : deferred ? 'Install it and it opens straight to Expenses, like an app.'
                  : 'In Chrome, open the menu and tap Add to Home screen. It opens straight to Expenses, like an app.';
    tx.appendChild(s); tip.appendChild(tx);
    if(deferred && !isiOS){ const ib=document.createElement('button'); ib.className='btn'; ib.type='button'; ib.textContent='Install'; ib.onclick=async()=>{ deferred.prompt(); try{ await deferred.userChoice; }catch(e){} deferred=null; tip.remove(); }; tip.appendChild(ib); }
    const x=document.createElement('button'); x.className='x'; x.type='button'; x.setAttribute('aria-label','Hide this tip'); x.textContent='×';
    x.onclick=()=>{ try{ localStorage.setItem('tools:team-hq:exp.install.x','1'); }catch(e){} tip.remove(); }; tip.appendChild(x);
    const vh=exp.querySelector(':scope > .vhead'); vh ? vh.after(tip) : exp.prepend(tip);
  }
  mo && mo.observe(exp, {childList:true});
}
let dock=null;
if(appExp){
  dock=document.createElement('div'); dock.className='exp-dock';
  const mk=(cls, ic, label, fn)=>{ const b=document.createElement('button'); b.type='button'; b.className=cls; b.innerHTML='<svg viewBox="0 0 24 24">'+ic+'</svg><span></span>'; b.querySelector('span').textContent=label; b.onclick=fn; dock.appendChild(b); };
  mk('snap','<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>','Snap a Receipt', ()=>{ const i=exp && exp.querySelector('input[type=file]'); i && i.click(); });
  mk('hand','<path d="M12 5v14M5 12h14"/>','Add by Hand', ()=>{ const b=exp && [...exp.querySelectorAll('button')].find(x=>/Add by Hand/i.test(x.textContent)); b && b.click(); });
  document.body.appendChild(dock);
  const go=()=>{ if(window.__S && window.__S.ready && window.__show){ window.__show('expenses'); } else setTimeout(go, 150); }; go();
}
const mo=exp ? new MutationObserver(()=>paintExp()) : null;
if(exp){ mo.observe(exp, {childList:true}); paintExp(); }

/* ---------- My Board: Tidy Up (lays the panels out in a neat grid; Undo puts them back) ---------- */
const mineRoot=document.getElementById('app-mine');
let tidyPrev=null;
function curTab(){ const S=window.__S; if(!S || !S.nb || !S.nb.pages) return null;
  const pg=S.nb.pages.find(p=>p.id===S.nb.cp) || S.nb.pages[0]; if(!pg || !pg.tabs) return null;
  return pg.tabs.find(t=>t.id===S.nb.ct) || pg.tabs[0]; }
function tidy(){
  const tab=curTab(); if(!tab || !Array.isArray(tab.L)) return;
  const ws=[]; tab.L.forEach(row=>(row.r||[]).forEach(w=>ws.push(w)));
  if(!ws.length) return;
  tidyPrev={tab, L:JSON.parse(JSON.stringify(tab.L))};
  const narrow=window.innerWidth<1100, cols=narrow?2:3, gap=1.2, w=(100-gap*(cols-1))/cols;
  ws.sort((a,b)=>(a.nby||0)-(b.nby||0) || (a.nbx||0)-(b.nbx||0));
  const colY=new Array(cols).fill(0);
  ws.forEach((x,i)=>{ const c=colY.indexOf(Math.min(...colY)); x.nbx=+(c*(w+gap)).toFixed(2); x.nbw=+w.toFixed(2); x.nby=colY[c]; colY[c]+=(x.c ? 84 : (x.nbh||120))+14; });
  window.__saveMine && window.__saveMine(); window.__show && window.__show('mine'); toast('Tidied into a neat grid.', true);
}
function undoTidy(){ if(!tidyPrev) return; tidyPrev.tab.L=tidyPrev.L; tidyPrev=null; window.__saveMine && window.__saveMine(); window.__show && window.__show('mine'); toast('Put back the way it was.'); }
let toastEl=null;
function toast(msg, undo){ toastEl && toastEl.remove(); toastEl=document.createElement('div'); toastEl.className='skin-toast'; toastEl.textContent=msg;
  if(undo){ const u=document.createElement('button'); u.type='button'; u.textContent='Undo'; u.onclick=()=>{ undoTidy(); }; toastEl.appendChild(u); }
  document.body.appendChild(toastEl); const me=toastEl; setTimeout(()=>{ me.remove(); if(toastEl===me) toastEl=null; }, 7000); }
function paintBar(){
  if(!mineRoot) return; const bar=mineRoot.querySelector('.boardbar'); if(!bar || bar.querySelector('.skin-tidy')) return;
  const b=document.createElement('button'); b.type='button'; b.className='btn ghost skin-tidy'; b.title='Line the panels up in a neat grid';
  b.innerHTML='<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Tidy Up</span>';
  b.onclick=tidy; bar.insertBefore(b, bar.firstChild);
}
const mo2=mineRoot ? new MutationObserver(()=>paintBar()) : null;
if(mineRoot){ mo2.observe(mineRoot, {childList:true, subtree:false}); paintBar(); }
const css2=document.createElement('style'); css2.textContent=`.skin-tidy{margin-right:auto}
.skin-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:300;display:flex;align-items:center;gap:14px;padding:10px 14px;background:var(--navy);color:#fff;border-radius:6px;box-shadow:0 10px 30px rgba(6,32,47,.35);font-size:13.5px;font-weight:600}
.skin-toast button{border:1px solid rgba(255,255,255,.4);background:transparent;color:var(--sky);font:inherit;font-weight:700;padding:4px 10px;border-radius:4px;cursor:pointer}`; add(css2);

window.__skin={ version:'1.0', appExp, tidy, undoTidy,
  destroy(){ mo && mo.disconnect(); mo2 && mo2.disconnect(); const tb=mineRoot && mineRoot.querySelector('.skin-tidy'); tb && tb.remove(); window.removeEventListener('beforeinstallprompt', onBIP); added.forEach(e=>e.remove()); dock && dock.remove();
    document.documentElement.classList.remove('app-exp'); const t=exp && exp.querySelector('.exp-install'); t && t.remove(); } };
})();

});
/* ===== projects-v2.js ===== */
MODS.push(function(){
/* Team Projects v2 — a visual Team Projects page for Team HQ.
   Plugs into the existing page: it draws over #app-rocks whenever the app
   renders that tab, reads window.__S, and edits through the app's own
   editors (__edit for tasks, __editRock for projects) so saving, conflict
   checks and permissions stay exactly as they are. */
(function(){
'use strict';
if(window.__pv2 && window.__pv2.destroy) window.__pv2.destroy();
const S = window.__S, root = document.getElementById('app-rocks');
if(!S || !root) return;

const KEY = 'tools:team-hq:mismo.teamhq.pv2';
const ui = {view:'board', status:'Active', who:'', focus:'', pmode:'part'};
try{ Object.assign(ui, JSON.parse(localStorage.getItem(KEY) || '{}')); }catch(e){}
ui.focus = '';
const saveUi = ()=>{ try{ localStorage.setItem(KEY, JSON.stringify(ui)); }catch(e){} };
const P = {open:null, who:''};

/* ---------- helpers ---------- */
function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function btn(cls, txt, fn){ const b=h('button', cls, txt); b.type='button'; if(fn) b.addEventListener('click', fn); return b; }
const PLUS = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const today = ()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
const pd = s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); return m ? new Date(+m[1], m[2]-1, +m[3]) : null; };
const days = s=>{ const d=pd(s); return d ? Math.round((d - today())/864e5) : null; };
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WDL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const fmt = s=>{ const d=pd(s); if(!d) return ''; return MON[d.getMonth()]+' '+d.getDate()+(d.getFullYear()!==today().getFullYear() ? ', '+d.getFullYear() : ''); };
const st = t=>{ const s=t.s||'Not Started'; return /^waiting/i.test(s) ? 'Waiting on Someone' : s; };
const slug = s=>String(s).toLowerCase().replace(/[^a-z]+/g,'-');
const isOpen = t=> st(t)!=='Done';
const isLate = t=> isOpen(t) && t.due && days(t.due) < 0;
const doers = t=> (t.d && t.d.length) ? t.d.slice() : (t.o ? [t.o] : []);
const person = id=> S.people.find(p=>p.id===id);
const first = id=>{ const p=person(id); return p ? p.name.split(' ')[0] : ''; };
const ini = p=> p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const cvar = n=> 'var(--c'+(((n||0)%7)+1)+')';
const byName = (a,b)=> a.name.localeCompare(b.name);
const byDue = (a,b)=>{ const da=a.due||'9999', db=b.due||'9999'; if(da!==db) return da<db?-1:1;
  const pa=st(a)==='In Progress'?0:1, pb=st(b)==='In Progress'?0:1; if(pa!==pb) return pa-pb; return (a.ord||0)-(b.ord||0); };
function av(id, size){ const p=person(id), a=h('span','av pv2-av');
  if(!p){ a.textContent='?'; a.style.background='var(--cn)'; return a; }
  a.textContent=ini(p); a.style.background=cvar(p.color); a.title=p.name;
  if(size){ a.style.width=a.style.height=size+'px'; a.style.fontSize=Math.round(size*.42)+'px'; }
  return a; }
function stack(ids, max, size){ const s=h('span','pv2-stack'); ids.slice(0,max).forEach(i=>s.appendChild(av(i,size)));
  if(ids.length>max){ const m=h('span','av pv2-av pv2-more','+'+(ids.length-max)); if(size){m.style.width=m.style.height=size+'px';} s.appendChild(m); } return s; }
function tag(txt, k){ return h('span','pv2-tag'+(k?' '+k:''), txt); }
function statusTag(t){ const s=st(t); const k={ 'In Progress':'info', 'Waiting on Someone':'warn', 'Done':'good' }[s]||''; return tag(s, k); }
function dueTag(t){
  if(!t.due) return tag('No Date', 'faint');
  const n=days(t.due);
  if(!isOpen(t)) return tag(fmt(t.due));
  if(n<0) return tag((-n)+(n===-1?' Day':' Days')+' Late','bad');
  if(n===0) return tag('Due Today','warn');
  if(n===1) return tag('Due Tomorrow','warn');
  if(n<=7) return tag('Due '+WD[pd(t.due).getDay()]+' '+fmt(t.due),'warn');
  return tag(fmt(t.due));
}
function keyAct(e){ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); e.currentTarget.click(); } }
function clickable(e, fn){ e.tabIndex=0; e.setAttribute('role','button'); e.addEventListener('click', fn); e.addEventListener('keydown', keyAct); return e; }
const editTask = t=> window.__edit && window.__edit(t);
const newTask = (r, w)=> editTask({t:'', o:S.me||'', d:[], r:r||'', w:w||'', s:'Not Started', p:'Normal', due:'', notes:'', rail:0, ord:(S.tasks.length+1)*10, at:Date.now()});

/* ---------- the numbers behind a project ---------- */
const tasksOf = r=> S.tasks.filter(t=>t.r===r.id);
function stats(r, who){
  let ts=tasksOf(r); if(who) ts=ts.filter(t=>doers(t).indexOf(who)>=0);
  const open=ts.filter(isOpen);
  const n=t=>days(t.due);
  const s={ ts, open,
    late: open.filter(t=>t.due && n(t)<0),
    week: open.filter(t=>t.due && n(t)>=0 && n(t)<=7),
    soon: open.filter(t=>t.due && n(t)>=0 && n(t)<=14),
    wait: open.filter(t=>st(t)==='Waiting on Someone'),
    prog: open.filter(t=>st(t)==='In Progress'),
    nodate: open.filter(t=>!t.due),
    done: ts.length-open.length, who:[] };
  const w=new Set(); if(r.lead) w.add(r.lead); open.forEach(t=>doers(t).forEach(i=>w.add(i)));
  s.who=Array.from(w).filter(person).sort((a,b)=>(person(a).ord||0)-(person(b).ord||0));
  return s;
}
function nextTask(s){ return s.open.slice().sort(byDue)[0] || null; }
function health(r, s){
  const status=r.status||'Active';
  if(status!=='Active') return {k:'', t:status};
  if(!s.ts.length) return {k:'faint', t:'No Tasks Yet'};
  if(!s.open.length) return {k:'good', t:'All Done'};
  if(s.late.length) return {k:'bad', t:s.late.length+' Past Due'};
  if(s.week.length) return {k:'warn', t:'Due This Week'};
  if(s.open.length===s.nodate.length) return {k:'faint', t:'No Dates Yet'};
  return {k:'good', t:'On Track'};
}
function partState(ts){
  if(!ts.length) return 'none';
  const open=ts.filter(isOpen);
  if(!open.length) return 'done';
  if(open.some(isLate)) return 'late';
  if(open.some(t=>st(t)==='Waiting on Someone')) return 'wait';
  if(open.some(t=>st(t)==='In Progress') || open.length<ts.length) return 'go';
  return 'ns';
}
function partsOf(r, ts){
  const ws=(r.ws||[]).slice(), out=ws.map(w=>({w, ts:ts.filter(t=>t.w===w)}));
  const loose=ts.filter(t=>!t.w || ws.indexOf(t.w)<0);
  if(loose.length) out.push({w:'', ts:loose});
  return out;
}
function segbar(ts){
  const b=h('div','pv2-segbar'), tot=ts.length||1;
  const c={ d:ts.filter(t=>!isOpen(t)).length, p:ts.filter(t=>st(t)==='In Progress').length, w:ts.filter(t=>st(t)==='Waiting on Someone').length };
  [['d',c.d],['p',c.p],['w',c.w]].forEach(([k,v])=>{ if(!v) return; const i=h('i',k); i.style.width=(v/tot*100)+'%'; b.appendChild(i); });
  return b;
}

/* ---------- which projects ---------- */
const STAT = {
  'Active': r=>(r.status||'Active')==='Active',
  'On Deck': r=>r.status==='Next Up' || r.status==='Someday',
  'Done': r=>r.status==='Done',
  'Not Pursuing': r=>r.status==='Not Pursuing',
  'All': ()=>true };
const FOCUS = {
  late: s=>s.late.length, soon: s=>s.soon.length, wait: s=>s.wait.length, nodate: s=>s.nodate.length };
function involves(r, id){ if(!id) return true; if(r.lead===id) return true; return tasksOf(r).some(t=>isOpen(t) && doers(t).indexOf(id)>=0); }
function baseList(){ return S.rocks.filter(STAT[ui.status]||STAT.Active).filter(r=>involves(r, ui.who)).sort(byName); }
function list(){ const f=FOCUS[ui.focus]; return baseList().filter(r=> !f || f(stats(r, ui.who))); }

/* ---------- page ---------- */
function draw(){
  const wrap=h('div','pv2');
  const base=baseList();
  wrap.appendChild(head());
  wrap.appendChild(band(base));
  wrap.appendChild(toolbar());
  const L=list();
  if(ui.focus){
    const fl={late:'Past Due Work', soon:'Work Landing in the Next Two Weeks', wait:'Work Waiting on Someone', nodate:'Work With No Date'}[ui.focus];
    const note=h('div','pv2-note');
    note.appendChild(h('span',null,'Showing projects with '+fl.toLowerCase().replace('work','work')+' — '+L.length+(L.length===1?' project':' projects')+'.'));
    note.appendChild(btn('btn ghost','Show All Projects', ()=>{ ui.focus=''; redraw(); }));
    wrap.appendChild(note);
  }
  if(!L.length){
    const e=h('div','pv2-empty');
    e.appendChild(h('b',null,'Nothing here.'));
    e.appendChild(h('span',null, ui.who ? first(ui.who)+' has no open work in '+ui.status.toLowerCase()+' projects.' : 'No '+ui.status.toLowerCase()+' projects yet.'));
    if(ui.who || ui.focus) e.appendChild(btn('btn ghost','Show Everyone', ()=>{ ui.who=''; ui.focus=''; saveUi(); redraw(); }));
    wrap.appendChild(e);
  } else if(ui.view==='timeline') wrap.appendChild(timeline(L));
  else if(ui.view==='people') wrap.appendChild(matrix(L));
  else wrap.appendChild(board(L));
  return wrap;
}

function head(){
  const v=h('div','vhead pv2-head');
  const g=h('div','grow'); g.appendChild(h('h1',null,'Team Projects')); v.appendChild(g);
  const r=h('div','rowflex');
  const at=btn('btn ghost',null, ()=>newTask('','')); at.innerHTML=PLUS+'<span>Add a Task</span>'; r.appendChild(at);
  const np=btn('btn',null, ()=>window.__editRock && window.__editRock()); np.innerHTML=PLUS+'<span>New Team Project</span>'; r.appendChild(np);
  v.appendChild(r);
  return v;
}

function band(base){
  const all=base.map(r=>({r, s:stats(r, ui.who)}));
  const sum=k=> all.reduce((n,x)=>n+x.s[k].length,0);
  const late=sum('late'), soon=sum('soon'), wait=sum('wait'), nod=sum('nodate'), open=sum('open');
  const b=h('div','headline pv2-band');
  const d=today();
  b.appendChild(h('div','hl-date', (ui.who ? 'Where '+first(ui.who)+'’s Projects Stand' : 'Where Our Projects Stand')+' · '+WDL[d.getDay()]+', '+MONL[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear()));
  const say=h('div','hl-say');
  const em=(t,c)=>{ const e=h('em',c||null,t); return e; };
  if(late){
    const top=all.filter(x=>x.s.late.length).sort((a,b)=>b.s.late.length-a.s.late.length || byName(a.r,b.r)).slice(0,2);
    say.append('Start with ', em(top[0].r.name,'hl-late'));
    if(top[1]) say.append(' and ', em(top[1].r.name,'hl-late'));
    const n=top.reduce((k,x)=>k+x.s.late.length,0);
    say.append(top[1] ? ' — between them they hold '+n+' of the '+late+' past-due tasks.' : ' — it holds '+n+' of the '+late+' past-due tasks.');
  } else if(soon){
    const nx=all.flatMap(x=>x.s.soon.map(t=>({t, r:x.r}))).sort((a,b)=>byDue(a.t,b.t))[0];
    say.append('Nothing is past due. Next to land: ', em(nx.t.t), ' for '+nx.r.name+', '+fmt(nx.t.due)+'.');
  } else if(open){ say.append('Nothing is past due or landing in the next two weeks.'); }
  else say.append('No open work in these projects.');
  b.appendChild(say);
  const tiles=h('div','tiles one pv2-tiles');
  const tile=(n, label, small, cls, focus)=>{
    const t=btn('tile'+(cls?' '+cls:''), null, ()=>{ ui.focus = (ui.focus===focus ? '' : focus); redraw(); });
    t.setAttribute('aria-pressed', String(ui.focus===focus && !!focus));
    t.appendChild(h('b',null,String(n))); t.appendChild(h('span',null,label)); t.appendChild(h('small',null,small)); tiles.appendChild(t);
  };
  const deck=S.rocks.filter(STAT['On Deck']).filter(r=>involves(r, ui.who)).length;
  tile(base.length, ui.status==='Active' ? 'Active Projects' : ui.status+' Projects', deck+' more on deck', '', '');
  tile(late, 'Past Due', late ? 'in '+all.filter(x=>x.s.late.length).length+' projects' : 'nothing late', late?'bad':'', 'late');
  tile(soon, 'Landing Soon', 'due in the next two weeks', soon?'warn':'', 'soon');
  tile(wait, 'Waiting', wait ? 'on someone else' : 'nothing blocked', '', 'wait');
  tile(nod, 'No Date Yet', 'open tasks without a due date', '', 'nodate');
  b.appendChild(tiles);
  return b;
}

function toolbar(){
  const wrap=h('div','pv2-tools');
  const row=h('div','pv2-bar');
  const vs=h('div','filterbar pv2-views');
  [['board','Board'],['timeline','Timeline'],['people','Who’s on What']].forEach(([k,l])=>{
    const b=btn('pill', l, ()=>{ ui.view=k; saveUi(); redraw(); }); b.setAttribute('aria-pressed', String(ui.view===k)); vs.appendChild(b); });
  row.appendChild(vs);
  const sf=h('div','filterbar pv2-status');
  Object.keys(STAT).forEach(k=>{
    const n=S.rocks.filter(STAT[k]).filter(r=>involves(r, ui.who)).length;
    if(!n && k!=='Active' && k!==ui.status) return;
    const b=btn('pill', null, ()=>{ ui.status=k; ui.focus=''; saveUi(); redraw(); });
    b.append(k+' ', h('b',null,String(n))); b.setAttribute('aria-pressed', String(ui.status===k)); sf.appendChild(b); });
  row.appendChild(sf);
  wrap.appendChild(row);
  const who=h('div','pv2-who');
  const ev=btn('pv2-wb', 'Everyone', ()=>{ ui.who=''; saveUi(); redraw(); }); ev.setAttribute('aria-pressed', String(!ui.who)); who.appendChild(ev);
  S.people.slice().sort((a,b)=>(a.ord||0)-(b.ord||0)).forEach(p=>{
    const n=S.rocks.filter(STAT[ui.status]||STAT.Active).filter(r=>involves(r,p.id)).length;
    const b=btn('pv2-wb', null, ()=>{ ui.who = ui.who===p.id ? '' : p.id; saveUi(); redraw(); });
    b.appendChild(av(p.id, 22)); b.appendChild(h('span',null, p.id===S.me ? 'Me' : p.name.split(' ')[0])); b.appendChild(h('span','n', String(n)));
    b.title=p.name+' leads or has open work in '+n+' of these projects';
    b.setAttribute('aria-pressed', String(ui.who===p.id)); who.appendChild(b); });
  wrap.appendChild(who);
  return wrap;
}

/* ---------- Board ---------- */
function board(L){ const g=h('div','pv2-grid'); L.forEach(r=>g.appendChild(card(r))); return g; }
function card(r){
  const s=stats(r), hl=health(r,s);
  const c=clickable(h('div','pv2-card'), ()=>openPanel(r.id));
  c.style.setProperty('--rc', cvar(r.color));
  const top=h('div','pv2-ct'); top.appendChild(h('h3',null,r.name)); top.appendChild(tag(hl.t, hl.k)); c.appendChild(top);
  if(r.desc) c.appendChild(h('p','pv2-desc', r.desc));
  const pr=h('div','pv2-prog'); pr.appendChild(segbar(s.ts));
  const pl=h('div','pv2-pl'); const pct=s.ts.length ? Math.round(s.done/s.ts.length*100) : 0;
  pl.appendChild(h('span',null, s.ts.length ? pct+'% Done' : 'No Tasks Yet'));
  pl.appendChild(h('span',null, s.open.length+' Open · '+s.done+' Done')); pr.appendChild(pl); c.appendChild(pr);
  const nx=nextTask(s);
  const nb=h('div','pv2-next');
  if(nx){
    nb.appendChild(h('span','lbl', isLate(nx) ? 'Overdue — Needs a Push' : 'Up Next'));
    nb.appendChild(h('span','tt', nx.t));
    const m=h('span','mt'); m.appendChild(stack(doers(nx),3,20)); if(nx.w) m.appendChild(h('span',null,nx.w)); m.appendChild(dueTag(nx)); nb.appendChild(m);
    nb.addEventListener('click', e=>{ e.stopPropagation(); editTask(nx); });
    nb.classList.add('go'); nb.title='Open this task';
  } else {
    nb.appendChild(h('span','lbl','Up Next'));
    nb.appendChild(h('span','tt faint', s.ts.length ? 'Everything here is done.' : 'Nothing planned yet — add the first task.'));
  }
  c.appendChild(nb);
  const parts=partsOf(r, s.ts);
  if(parts.length){
    const pp=h('div','pv2-parts'); pp.appendChild(h('span','lbl', (r.ws||[]).length+((r.ws||[]).length===1?' Workstream':' Workstreams')));
    const sq=h('span','sq');
    parts.forEach(x=>{ const i=h('i','ps-'+partState(x.ts)); const d=x.ts.filter(t=>!isOpen(t)).length;
      i.title=(x.w||'No Workstream Yet')+' — '+(x.ts.length ? d+' of '+x.ts.length+' done' : 'no tasks yet'); sq.appendChild(i); });
    pp.appendChild(sq); c.appendChild(pp);
  }
  const f=h('div','pv2-foot');
  if(r.lead){ f.appendChild(av(r.lead,22)); f.appendChild(h('span',null,'Led by '+first(r.lead))); }
  else f.appendChild(h('span','faint','No lead yet'));
  const others=s.who.filter(i=>i!==r.lead);
  if(others.length){ f.appendChild(h('span','sep','·')); f.appendChild(stack(others,5,22)); }
  if(S.me){ const mine=s.open.filter(t=>doers(t).indexOf(S.me)>=0).length;
    if(mine) f.appendChild(h('span','pv2-you', 'You: '+mine+' Open')); }
  c.appendChild(f);
  return c;
}

/* ---------- Timeline ---------- */
function timeline(L){
  const t0=today(), start=new Date(t0.getFullYear(), t0.getMonth()-1, 1), end=new Date(t0.getFullYear(), t0.getMonth()+5, 1);
  const span=end-start, x=d=> Math.max(0, Math.min(100, (d-start)/span*100));
  const months=[]; for(let m=0;m<6;m++) months.push(new Date(start.getFullYear(), start.getMonth()+m, 1));
  const box=h('div','pv2-tl'), inn=h('div','pv2-tl-in'); box.appendChild(inn);
  const lines=tk=>{ months.forEach(m=>{ const l=h('i','pv2-ml'); l.style.left=x(m)+'%'; tk.appendChild(l); });
    const n=h('i','pv2-now'); n.style.left=x(t0)+'%'; tk.appendChild(n); };
  const hd=h('div','pv2-tr hd'); hd.appendChild(h('div','pv2-tn','Project'));
  const ht=h('div','pv2-tk'); lines(ht);
  months.forEach(m=>{ const l=h('span','pv2-mo', MON[m.getMonth()]+(m.getMonth()===0||m===months[0] ? ' '+m.getFullYear() : '')); l.style.left=x(m)+'%'; ht.appendChild(l); });
  const tl=h('span','pv2-tdl','Today'); tl.style.left=x(t0)+'%'; ht.appendChild(tl);
  hd.appendChild(ht); inn.appendChild(hd);
  /* key dates lane */
  const kd=(S.dates||[]).filter(d=>!/travel|out of office/i.test(d.k||'') && d.d).filter(d=>{ const a=pd(d.d); return a && a>=start && a<end; });
  if(kd.length){
    const row=h('div','pv2-tr kd'); const nm=h('div','pv2-tn'); nm.appendChild(h('span',null,'Key Dates')); row.appendChild(nm);
    const tk=h('div','pv2-tk'); lines(tk);
    let lastX=[-99,-99], li=0;
    kd.sort((a,b)=>a.d<b.d?-1:1).forEach(d=>{ const px=x(pd(d.d)), m=btn('pv2-kd', null, ()=>window.__editDate && window.__editDate(d)); m.style.left=px+'%';
      m.title=d.t+' — '+fmt(d.d)+(d.k ? ' ('+d.k+')' : ''); tk.appendChild(m);
      if(d.pin){ const lane=(px-lastX[0] > 13) ? 0 : (px-lastX[1] > 13 ? 1 : -1); if(lane<0) return;
        lastX[lane]=px; const l=h('span','pv2-kdl '+(lane?'lo':'hi'), d.t); l.style.left='calc('+px+'% - 4px)'; l.title=m.title; tk.appendChild(l); } });
    row.appendChild(tk); inn.appendChild(row);
  }
  L.forEach(r=>{
    const s=stats(r, ui.who), row=h('div','pv2-tr'); row.style.setProperty('--rc', cvar(r.color));
    const nm=clickable(h('div','pv2-tn'), ()=>openPanel(r.id, {who:ui.who}));
    nm.appendChild(h('i','sw')); nm.appendChild(h('span','nmt', r.name));
    if(s.nodate.length){ const u=h('span','ct', s.nodate.length+' Undated'); u.title=s.nodate.length+' open tasks have no date, so they are not on the line'; nm.appendChild(u); }
    row.appendChild(nm);
    const tk=h('div','pv2-tk'); lines(tk);
    const dated=s.ts.filter(t=>pd(t.due));
    if(dated.length){
      const ds=dated.map(t=>pd(t.due)).sort((a,b)=>a-b);
      const bar=h('i','pv2-span'); bar.style.left=x(ds[0])+'%'; bar.style.width=Math.max(.6, x(ds[ds.length-1])-x(ds[0]))+'%'; tk.appendChild(bar);
      dated.forEach(t=>{ const k=!isOpen(t)?'done':isLate(t)?'late':st(t)==='In Progress'?'go':st(t)==='Waiting on Someone'?'wait':'ns';
        const dt=pd(t.due), d=btn('pv2-dot '+k+(dt<start?' early':dt>=end?' later':''), null, e=>{ e.stopPropagation(); editTask(t); });
        d.style.left=x(dt)+'%'; d.title=t.t+'\n'+fmt(t.due)+' · '+st(t)+' · '+doers(t).map(first).join(', ')+(t.w ? ' · '+t.w : ''); tk.appendChild(d); });
    } else tk.appendChild(h('span','pv2-none', s.ts.length ? 'No dated tasks yet' : 'No tasks yet'));
    row.appendChild(tk); inn.appendChild(row);
  });
  const lg=h('div','pv2-legend');
  [['late','Past Due'],['go','In Progress'],['wait','Waiting on Someone'],['ns','Not Started'],['done','Done']].forEach(([k,l])=>{ const i=h('span','li'); i.appendChild(h('i','pv2-dot '+k)); i.append(l); lg.appendChild(i); });
  const ki=h('span','li'); ki.appendChild(h('i','pv2-kd')); ki.append('Key Date'); lg.appendChild(ki);
  lg.appendChild(h('span','hint','Click a square to open that task, or a project name to open the project.'));
  box.appendChild(lg);
  return box;
}

/* ---------- Who's on What ---------- */
function matrix(L){
  const ppl=S.people.slice().sort((a,b)=>(a.ord||0)-(b.ord||0));
  const w=h('div','pv2-mxw'), t=h('table','pv2-mx'); w.appendChild(t);
  const th=h('thead'), hr=h('tr'); hr.appendChild(h('th','nm','Project'));
  ppl.forEach(p=>{ const c=h('th'); const d=h('div','pv2-mh'); d.appendChild(av(p.id,26)); d.appendChild(h('span',null,p.id===S.me?'Me':p.name.split(' ')[0])); c.appendChild(d); hr.appendChild(c); });
  hr.appendChild(h('th','tot','Open')); th.appendChild(hr); t.appendChild(th);
  const tb=h('tbody'), tot={}, totLate={};
  L.forEach(r=>{
    const tr=h('tr'); tr.style.setProperty('--rc', cvar(r.color));
    const s=stats(r);
    const nm=clickable(h('td','nm'), ()=>openPanel(r.id)); nm.appendChild(h('i','sw')); nm.appendChild(h('span',null,r.name)); tr.appendChild(nm);
    ppl.forEach(p=>{
      const mine=s.open.filter(t=>doers(t).indexOf(p.id)>=0), late=mine.filter(isLate).length;
      tot[p.id]=(tot[p.id]||0)+mine.length; totLate[p.id]=(totLate[p.id]||0)+late;
      const td=h('td'), b=btn('pv2-c'+(r.lead===p.id?' lead':''), null, ()=>openPanel(r.id, {who:p.id}));
      if(mine.length){ b.appendChild(h('span','v',String(mine.length))); b.style.background='color-mix(in srgb, var(--sky) '+Math.min(80, 16+mine.length*14)+'%, var(--surface))'; }
      if(late){ const l=h('span','lt',String(late)); l.title=late+' past due'; b.appendChild(l); }
      b.title=p.name+(r.lead===p.id?' leads '+r.name+'. ':' — ')+mine.length+' open'+(late?', '+late+' past due':'');
      td.appendChild(b); tr.appendChild(td); });
    tr.appendChild(h('td','tot', String(s.open.length)));
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  const tf=h('tfoot'), fr=h('tr'); fr.appendChild(h('td','nm','Open Tasks Across These Projects'));
  ppl.forEach(p=>{ const td=h('td','pv2-ft'); td.appendChild(h('b',null,String(tot[p.id]||0))); if(totLate[p.id]) td.appendChild(h('span','lt2', totLate[p.id]+' late')); fr.appendChild(td); });
  fr.appendChild(h('td','tot', String(L.reduce((n,r)=>n+stats(r).open.length,0)))); tf.appendChild(fr); t.appendChild(tf);
  const lg=h('div','pv2-legend'); lg.appendChild(h('span','hint','Each square is how many open tasks that person is doing in that project. Darker means more. Red corner is past due. Click any square to see just their tasks.'));
  w.appendChild(lg);
  return w;
}

/* ---------- the project panel ---------- */
let pnl=null, scrim=null;
function ensurePanel(){
  if(pnl) return;
  scrim=h('div','pv2-scrim'); scrim.addEventListener('click', closePanel);
  pnl=h('aside','pv2-panel'); pnl.setAttribute('aria-label','Team Project');
  document.body.appendChild(scrim); document.body.appendChild(pnl);
}
function openPanel(id, opt){ P.open=id; P.who=(opt && opt.who)||''; ensurePanel(); drawPanel(); pnl.scrollTop=0;
  requestAnimationFrame(()=>{ pnl.classList.add('on'); scrim.classList.add('on'); }); }
function closePanel(){ P.open=null; if(pnl){ pnl.classList.remove('on'); scrim.classList.remove('on'); } }
function drawPanel(){
  const r=S.rocks.find(x=>x.id===P.open); if(!r){ closePanel(); return; }
  const keep=pnl.querySelector('.pv2-pb'), sy=keep ? keep.scrollTop : 0;
  const cols=pnl.querySelector('.pv2-cols'), sx=cols ? cols.scrollLeft : 0;
  pnl.textContent=''; pnl.style.setProperty('--rc', cvar(r.color));
  const s=stats(r), hl=health(r,s);
  const ph=h('div','pv2-ph');
  const tt=h('div','ttl'); tt.appendChild(h('h2',null,r.name));
  const m=h('div','mt'); m.appendChild(tag(r.status||'Active', (r.status||'Active')==='Active'?'info':'')); if((r.status||'Active')==='Active') m.appendChild(tag(hl.t, hl.k));
  if(r.lead){ const l=h('span','ld'); l.appendChild(av(r.lead,22)); l.append('Led by '+(person(r.lead)||{}).name); m.appendChild(l); }
  const oth=s.who.filter(i=>i!==r.lead);
  if(oth.length){ const l=h('span','ld'); l.appendChild(stack(oth,7,22)); l.append('Also working on it: '+oth.map(first).join(', ')); m.appendChild(l); }
  tt.appendChild(m); ph.appendChild(tt);
  const acts=h('div','acts');
  const ad=btn('btn', null, ()=>newTask(r.id,'')); ad.innerHTML=PLUS+'<span>Add a Task</span>'; acts.appendChild(ad);
  acts.appendChild(btn('btn ghost','Edit Project', ()=>window.__editRock && window.__editRock(r)));
  const x=btn('x pv2-x', null, closePanel); x.setAttribute('aria-label','Close the panel'); x.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'; acts.appendChild(x);
  ph.appendChild(acts); pnl.appendChild(ph);
  const pb=h('div','pv2-pb'); pnl.appendChild(pb);
  if(r.desc) pb.appendChild(h('p','pv2-pdesc', r.desc));
  const tl=h('div','tiles2 pv2-ptiles');
  const t2=(v,l,sm,cls)=>{ const t=h('div','tile2'+(cls?' '+cls:'')); t.appendChild(h('b',null,String(v))); t.appendChild(h('span',null,l)); if(sm) t.appendChild(h('small',null,sm)); tl.appendChild(t); };
  const nx=nextTask(s);
  t2(s.open.length,'Open', s.prog.length+' in progress');
  t2(s.done,'Done', s.ts.length ? Math.round(s.done/s.ts.length*100)+'% of all tasks' : 'no tasks yet');
  t2(s.late.length,'Past Due', s.late.length ? 'oldest '+fmt(s.late.slice().sort(byDue)[0].due) : 'nothing late', s.late.length?'pv2-bad':'');
  t2(s.wait.length,'Waiting', 'on someone else');
  if(nx && nx.due) t2(fmt(nx.due),'Next Due', nx.t);
  pb.appendChild(tl);
  const prog=h('div','pv2-prog'); prog.appendChild(segbar(s.ts)); pb.appendChild(prog);
  const ctl=h('div','pv2-pctl');
  const md=h('div','filterbar');
  [['part','By Workstream'],['date','By Date'],['person','By Person']].forEach(([k,l])=>{ const b=btn('pill', l, ()=>{ ui.pmode=k; saveUi(); drawPanel(); }); b.setAttribute('aria-pressed', String(ui.pmode===k)); md.appendChild(b); });
  ctl.appendChild(md);
  const wf=h('div','pv2-who sm');
  const ev=btn('pv2-wb','Everyone', ()=>{ P.who=''; drawPanel(); }); ev.setAttribute('aria-pressed', String(!P.who)); wf.appendChild(ev);
  s.who.forEach(id=>{ const b=btn('pv2-wb', null, ()=>{ P.who = P.who===id ? '' : id; drawPanel(); }); b.appendChild(av(id,20)); b.appendChild(h('span',null, id===S.me?'Me':first(id))); b.setAttribute('aria-pressed', String(P.who===id)); wf.appendChild(b); });
  ctl.appendChild(wf);
  pb.appendChild(ctl);
  let ts=s.ts; if(P.who) ts=ts.filter(t=>doers(t).indexOf(P.who)>=0);
  if(ui.pmode==='date') pb.appendChild(byDate(ts));
  else if(ui.pmode==='person') pb.appendChild(byPerson(ts));
  else pb.appendChild(byPart(r, ts));
  pb.scrollTop=sy; const nc=pnl.querySelector('.pv2-cols'); if(nc) nc.scrollLeft=sx;
}
function tcard(t, showPart){
  const k=!isOpen(t)?'done':isLate(t)?'late':slug(st(t));
  const c=clickable(h('div','pv2-t s-'+k), ()=>editTask(t));
  c.appendChild(h('span','tt', t.t||'(untitled)'));
  const m=h('div','mt'); m.appendChild(dueTag(t)); if(st(t)!=='Not Started') m.appendChild(statusTag(t));
  if(t.p==='High') m.appendChild(tag('High Priority','bad'));
  if(showPart && t.w) m.appendChild(h('span','pt', t.w));
  const a=stack(doers(t),3,22); a.classList.add('avs'); m.appendChild(a);
  c.appendChild(m); return c;
}
function byPart(r, ts){
  const wrap=h('div','pv2-cols');
  const parts=partsOf(r, ts);
  (r.ws||[]).length || parts.length || wrap.appendChild(h('div','pv2-empty','No workstreams or tasks yet. Add a task, or use Edit Project to name the workstreams in this project.'));
  parts.forEach(x=>{
    const col=h('div','pv2-col'), hd=h('div','pv2-colh'), d=x.ts.filter(t=>!isOpen(t)).length, ps=partState(x.ts);
    const nm=h('div','nm'); nm.appendChild(h('i','ps-'+ps)); nm.appendChild(h('span',null, x.w||'No Workstream Yet')); hd.appendChild(nm);
    hd.appendChild(h('div','sub', x.ts.length ? d+' of '+x.ts.length+' done' : 'No tasks yet'));
    hd.appendChild(segbar(x.ts)); col.appendChild(hd);
    const ls=h('div','pv2-coll');
    x.ts.filter(isOpen).sort(byDue).forEach(t=>ls.appendChild(tcard(t)));
    x.ts.filter(t=>!isOpen(t)).forEach(t=>ls.appendChild(tcard(t)));
    col.appendChild(ls);
    const add=btn('btn ghost pv2-add', null, ()=>newTask(r.id, x.w)); add.innerHTML=PLUS+'<span>Add to '+(x.w ? 'This Workstream' : 'Project')+'</span>'; col.appendChild(add);
    wrap.appendChild(col);
  });
  return wrap;
}
function groupList(groups){
  const w=h('div','pv2-groups');
  groups.forEach(([label, ts, cls])=>{ if(!ts.length) return;
    const g=h('div','pv2-grp'); const t=h('h4','sect-t'+(cls?' '+cls:''), label+' '); t.appendChild(h('span','n',String(ts.length))); g.appendChild(t);
    const rows=h('div','pv2-rows'); ts.forEach(x=>rows.appendChild(tcard(x, true))); g.appendChild(rows); w.appendChild(g); });
  if(!w.children.length) w.appendChild(h('div','pv2-empty','No tasks here yet.'));
  return w;
}
function byDate(ts){
  const o=ts.filter(isOpen).sort(byDue), n=t=>days(t.due);
  return groupList([
    ['Past Due', o.filter(t=>t.due && n(t)<0), 'bad'],
    ['This Week', o.filter(t=>t.due && n(t)>=0 && n(t)<=7)],
    ['Later', o.filter(t=>t.due && n(t)>7)],
    ['No Date Yet', o.filter(t=>!t.due)],
    ['Done', ts.filter(t=>!isOpen(t))] ]);
}
function byPerson(ts){
  const ids=new Set(); ts.forEach(t=>doers(t).forEach(i=>ids.add(i)));
  const g=Array.from(ids).filter(person).sort((a,b)=>person(a).name.localeCompare(person(b).name))
    .map(id=>[person(id).name, ts.filter(t=>doers(t).indexOf(id)>=0).sort((a,b)=>(isOpen(a)?0:1)-(isOpen(b)?0:1) || byDue(a,b))]);
  const none=ts.filter(t=>!doers(t).length); if(none.length) g.push(['Nobody Yet', none]);
  return groupList(g);
}

/* ---------- styles ---------- */
const css=h('style'); css.id='pv2-css'; css.textContent=`
.pv2{display:flex;flex-direction:column;gap:18px;font-variant-numeric:tabular-nums}
.pv2 .btn,.pv2-panel .btn{white-space:nowrap;min-width:max-content}
.pv2-band .tile[aria-pressed="true"]{background:rgba(255,255,255,.18);border-color:var(--sky);box-shadow:inset 0 0 0 1px var(--sky)}
.pv2-tools{display:flex;flex-direction:column;gap:12px}
.pv2-bar{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between}
.pv2-bar .filterbar{margin:0}
.pv2-who{display:flex;flex-wrap:wrap;gap:8px}
.pv2-wb{display:inline-flex;align-items:center;gap:7px;padding:4px 10px 4px 5px;min-height:32px;border:1px solid var(--border);background:var(--surface);border-radius:4px;font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;white-space:nowrap}
.pv2-wb:first-child{padding:4px 12px}
.pv2-wb:hover{border-color:var(--border-strong)}
.pv2-wb .n{font-size:11px;font-weight:700;color:var(--ink-3);background:var(--surface-3);border-radius:3px;padding:0 5px}
.pv2-wb[aria-pressed="true"]{border-color:var(--navy);box-shadow:inset 0 0 0 1px var(--navy);background:var(--sky-wash)}
:root[data-theme="dark"] .pv2-wb[aria-pressed="true"]{border-color:var(--sky);box-shadow:inset 0 0 0 1px var(--sky)}
.pv2-who.sm .pv2-wb{min-height:28px;font-size:12.5px}
.pv2-note{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--info-soft);border:1px solid var(--border);border-left:3px solid var(--sky);border-radius:6px;padding:8px 12px;font-size:13px;color:var(--ink)}
.pv2-empty{display:flex;flex-direction:column;align-items:flex-start;gap:8px;background:var(--surface);border:1px dashed var(--border-strong);border-radius:8px;padding:22px;color:var(--ink-2);font-size:13.5px}
.pv2-empty b{color:var(--ink);font-size:15px}
.pv2-tag{display:inline-flex;align-items:center;white-space:nowrap;font-size:11.5px;font-weight:600;line-height:1.5;padding:1px 7px;border-radius:3px;background:var(--surface-3);color:var(--ink-2)}
.pv2-tag.bad{background:var(--bad-soft);color:var(--bad)}
.pv2-tag.warn{background:var(--warn-soft);color:var(--warn)}
.pv2-tag.good{background:var(--good-soft);color:var(--good)}
.pv2-tag.info{background:var(--info-soft);color:var(--c1)}
.pv2-tag.faint{background:transparent;border:1px dashed var(--border-strong);color:var(--ink-3);padding:0 6px}
.faint{color:var(--ink-3)}
.pv2-av{width:22px;height:22px;font-size:9.5px}
.pv2-stack{display:inline-flex;align-items:center}
.pv2-stack .av{box-shadow:0 0 0 2px var(--surface)}
.pv2-stack .av+.av{margin-left:-6px}
.pv2-more{background:var(--surface-3)!important;color:var(--ink-2)!important}
.pv2-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr));gap:16px;align-items:stretch}
.pv2-card{position:relative;display:flex;flex-direction:column;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow);padding:16px 18px 14px 22px;cursor:pointer;overflow:hidden;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}
.pv2-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--rc)}
.pv2-card:hover,.pv2-card:focus-visible{transform:translateY(-2px);border-color:var(--border-strong);box-shadow:0 2px 4px rgba(13,49,76,.08),0 14px 30px rgba(13,49,76,.14);outline:none}
.pv2-ct{display:flex;align-items:flex-start;gap:10px}
.pv2-ct h3{flex:1;margin:0;font-size:16.5px;font-weight:700;line-height:1.3;color:var(--ink)}
.pv2-desc{margin:-4px 0 0;color:var(--ink-2);font-size:13px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pv2-segbar{display:flex;height:8px;border-radius:3px;overflow:hidden;background:var(--surface-3)}
.pv2-segbar i{display:block;height:100%}
.pv2-segbar i.d{background:var(--good)}.pv2-segbar i.p{background:var(--c1)}.pv2-segbar i.w{background:var(--warn)}
.pv2-pl{display:flex;justify-content:space-between;gap:10px;margin-top:6px;font-size:12px;font-weight:600;color:var(--ink-2);white-space:nowrap}
.pv2-next{display:flex;flex-direction:column;gap:6px;background:var(--surface-2);border:1px solid var(--rule);border-radius:6px;padding:10px 12px;margin-top:auto}
.pv2-next.go{cursor:pointer}.pv2-next.go:hover{border-color:var(--border-strong);background:var(--sky-wash)}
.pv2-next .lbl,.pv2-parts .lbl{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);white-space:nowrap}
.pv2-next .tt{font-size:13.5px;font-weight:600;line-height:1.35;color:var(--ink)}
.pv2-next .mt{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--ink-2)}
.pv2-parts{display:flex;align-items:center;gap:10px}
.pv2-parts .sq{display:flex;flex-wrap:wrap;gap:3px}
.pv2-parts .sq i,.pv2-colh .nm i{display:block;width:18px;height:8px;border-radius:2px;background:var(--surface-3)}
.ps-done{background:var(--good)!important}.ps-late{background:var(--bad)!important}.ps-go{background:var(--c1)!important}.ps-wait{background:var(--warn)!important}.ps-ns{background:var(--border-strong)!important}
.pv2-foot{display:flex;align-items:center;gap:8px;padding-top:11px;border-top:1px solid var(--rule);font-size:12.5px;font-weight:600;color:var(--ink-2);white-space:nowrap}
.pv2-foot .sep{color:var(--ink-3)}
.pv2-you{margin-left:auto;color:var(--ink);background:var(--sky-wash);border-radius:3px;padding:1px 7px;font-size:11.5px}
/* timeline */
.pv2-tl{background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow);overflow-x:auto}
.pv2-tl-in{min-width:980px}
.pv2-tr{display:grid;grid-template-columns:260px 1fr;border-bottom:1px solid var(--rule);min-height:42px}
.pv2-tr.hd{min-height:38px;background:var(--surface-2)}
.pv2-tr.kd{background:var(--surface-2);min-height:46px}
.pv2-tn{position:sticky;left:0;z-index:3;display:flex;align-items:center;gap:9px;padding:8px 14px;background:inherit;background-color:var(--surface);border-right:1px solid var(--rule);font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden}
.pv2-tr.hd .pv2-tn,.pv2-tr.kd .pv2-tn{background-color:var(--surface-2);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.pv2-tn[role=button]{cursor:pointer}.pv2-tn[role=button]:hover{color:var(--c1)}
.pv2-tn .sw,.pv2-mx .sw{flex:0 0 auto;display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--rc)}
.pv2-tn .nmt{overflow:hidden;text-overflow:ellipsis}
.pv2-tn .ct{margin-left:auto;font-size:10.5px;font-weight:700;color:var(--ink-3);background:var(--surface-3);border-radius:3px;padding:0 5px}
.pv2-tk{position:relative}
.pv2-ml{position:absolute;top:0;bottom:0;width:1px;background:var(--rule)}
.pv2-now{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--sky);z-index:1}
.pv2-mo{position:absolute;top:11px;padding-left:7px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2);white-space:nowrap}
.pv2-tdl{position:absolute;bottom:2px;margin-left:5px;font-size:10px;font-weight:700;color:var(--c1);text-transform:uppercase;letter-spacing:.06em}
.pv2-span{position:absolute;top:50%;height:14px;margin-top:-7px;background:var(--rc);opacity:.2;border-radius:3px}
.pv2-dot{position:absolute;top:50%;width:13px;height:13px;margin:-6.5px 0 0 -6.5px;padding:0;border-radius:3px;border:2px solid var(--surface);background:var(--ink-3);cursor:pointer;z-index:2;transition:transform .1s}
.pv2-dot:hover{transform:scale(1.4);z-index:4}
.pv2-dot.late{background:var(--bad)}.pv2-dot.go{background:var(--c1)}.pv2-dot.wait{background:var(--warn)}.pv2-dot.ns{background:var(--ink-3)}.pv2-dot.done{background:var(--good);opacity:.5}
.pv2-dot.early{border-left-color:var(--bad)}
.pv2-none{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--ink-3)}
.pv2-kd{position:absolute;top:50%;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;padding:0;border:0;background:var(--navy);transform:rotate(45deg);cursor:pointer;z-index:2}
:root[data-theme="dark"] .pv2-kd{background:var(--sky)}
.pv2-kdl{position:absolute;max-width:150px;overflow:hidden;text-overflow:ellipsis;font-size:10.5px;font-weight:600;line-height:1.3;color:var(--ink-2);white-space:nowrap;z-index:2}
.pv2-kdl.hi{top:4px}.pv2-kdl.lo{bottom:4px}
.pv2-tr.kd{min-height:58px}
.pv2-tr.hd{min-height:48px}
.pv2-mx thead th{border:0;border-bottom:1px solid var(--rule);box-shadow:none;border-radius:0}
.pv2-legend{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;padding:10px 14px;font-size:12px;color:var(--ink-2);border-top:1px solid var(--rule)}
.pv2-legend .li{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
.pv2-legend .pv2-dot,.pv2-legend .pv2-kd{position:static;margin:0;display:inline-block}
.pv2-legend .hint{margin-left:auto;color:var(--ink-3)}
/* who's on what */
.pv2-mxw{background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow);overflow-x:auto}
.pv2-mx{border-collapse:collapse;width:100%;min-width:860px;table-layout:fixed}
.pv2-mx th.nm{width:250px}.pv2-mx th.tot{width:70px}
.pv2-mx th,.pv2-mx td{border-bottom:1px solid var(--rule);padding:0;text-align:center}
.pv2-mx thead th{padding:10px 6px;background:var(--surface-2);font-size:12px;font-weight:700;color:var(--ink-2)}
.pv2-mx .pv2-mh{display:flex;flex-direction:column;align-items:center;gap:5px}
.pv2-mx .nm{position:sticky;left:0;z-index:2;background:var(--surface);text-align:left;padding:10px 14px;font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap}
.pv2-mx thead .nm,.pv2-mx tfoot .nm{background:var(--surface-2);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.pv2-mx td.nm[role=button]{cursor:pointer}.pv2-mx td.nm[role=button]:hover{color:var(--c1)}
.pv2-mx td.nm .sw{margin-right:9px;vertical-align:-1px}
.pv2-c{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:46px;border:0;border-left:1px solid var(--rule);background:transparent;font:inherit;font-size:15px;font-weight:700;color:var(--ink);cursor:pointer}
.pv2-c:hover{box-shadow:inset 0 0 0 2px var(--c1)}
.pv2-c.lead{box-shadow:inset 0 0 0 2px var(--navy)}
:root[data-theme="dark"] .pv2-c.lead{box-shadow:inset 0 0 0 2px var(--sky)}
.pv2-c.lead::after{content:"Lead";position:absolute;bottom:3px;left:0;right:0;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
.pv2-c.lead .v{margin-top:-8px}
.pv2-c .lt{position:absolute;top:4px;right:5px;font-size:10px;font-weight:700;line-height:1.4;color:#fff;background:var(--bad);border-radius:3px;padding:0 4px}
.pv2-mx .tot{padding:0 14px;font-weight:700;color:var(--ink-2);border-left:1px solid var(--rule)}
.pv2-mx tfoot td{background:var(--surface-2);padding:9px 4px}
.pv2-mx tfoot .pv2-ft b{display:block;font-size:15px;color:var(--ink)}
.pv2-mx .lt2{display:block;font-size:11px;font-weight:700;color:var(--bad)}
/* panel */
.pv2-scrim{position:fixed;left:0;right:0;bottom:0;top:calc(var(--hq-h) + env(safe-area-inset-top,0px));background:rgba(6,32,47,.32);opacity:0;pointer-events:none;transition:opacity .2s;z-index:96}
.pv2-scrim.on{opacity:1;pointer-events:auto}
.pv2-panel{position:fixed;top:calc(var(--hq-h) + env(safe-area-inset-top,0px));right:0;bottom:0;width:75vw;z-index:97;display:flex;flex-direction:column;background:var(--ground);border-left:1px solid var(--border-strong);box-shadow:-12px 0 32px rgba(6,32,47,.22);transform:translateX(104%);transition:transform .22s cubic-bezier(.4,0,.2,1);font-variant-numeric:tabular-nums}
.pv2-panel.on{transform:none}
@media(max-width:760px){.pv2-panel{width:100vw}}
.pv2-ph{position:relative;display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px 20px;padding:18px 22px 16px 30px;background:var(--surface);border-bottom:1px solid var(--border)}
.pv2-ph::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--rc)}
.pv2-ph .ttl{flex:1 1 360px;min-width:0}
.pv2-ph h2{margin:0;font-size:22px;font-weight:700;color:var(--ink)}
.pv2-ph .mt{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:9px;font-size:13px;color:var(--ink-2)}
.pv2-ph .ld{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
.pv2-ph .acts{display:flex;align-items:center;gap:8px}
.pv2-x{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--ink);cursor:pointer}
.pv2-x svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
.pv2-pb{flex:1;overflow:auto;display:flex;flex-direction:column;gap:16px;padding:18px 22px 40px 30px}
.pv2-pb>*{flex-shrink:0}
.pv2-pdesc{margin:0;font-size:14px;line-height:1.5;color:var(--ink-2)}
.pv2-ptiles .tile2 small{display:block;font-size:11.5px;color:var(--ink-3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pv2-ptiles .tile2.pv2-bad b{color:var(--bad)}
.pv2-pctl{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px}
.pv2-pctl .filterbar{margin:0}
.pv2-cols{display:flex;gap:14px;align-items:flex-start;overflow-x:auto;padding-bottom:10px}
.pv2-col{flex:0 0 280px;display:flex;flex-direction:column;background:var(--surface-2);border:1px solid var(--border);border-radius:8px}
.pv2-colh{display:flex;flex-direction:column;gap:6px;padding:12px 12px 11px;border-bottom:1px solid var(--rule)}
.pv2-colh .nm{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:var(--ink)}
.pv2-colh .nm i{width:10px;height:10px}
.pv2-colh .sub{font-size:11.5px;font-weight:600;color:var(--ink-2)}
.pv2-colh .pv2-segbar{height:5px}
.pv2-coll{display:flex;flex-direction:column;gap:8px;padding:10px}
.pv2-add{margin:0 10px 10px;justify-content:center}
.pv2-t{display:flex;flex-direction:column;gap:7px;padding:9px 10px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--ink-3);border-radius:5px;cursor:pointer}
.pv2-t:hover,.pv2-t:focus-visible{border-color:var(--border-strong);border-left-color:inherit;box-shadow:var(--shadow);outline:none}
.pv2-t.s-in-progress{border-left-color:var(--c1)}.pv2-t.s-waiting-on-someone{border-left-color:var(--warn)}.pv2-t.s-late{border-left-color:var(--bad)}
.pv2-t.s-done{border-left-color:var(--good);opacity:.6}
.pv2-t .tt{font-size:13px;font-weight:600;line-height:1.35;color:var(--ink)}
.pv2-t .mt{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.pv2-t .pt{font-size:11.5px;color:var(--ink-3);white-space:nowrap}
.pv2-t .avs{margin-left:auto}
.pv2-groups{display:flex;flex-direction:column;gap:18px}
.pv2-grp .sect-t{display:flex;align-items:center;gap:7px}
.pv2-grp .sect-t.bad{color:var(--bad)}
.pv2-grp .sect-t .n{font-size:11px;letter-spacing:0;background:var(--surface-3);color:var(--ink-2);border-radius:3px;padding:0 6px}
.pv2-rows{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:8px}
`;
document.head.appendChild(css);

/* ---------- wiring ---------- */
let mo=null;
function paint(){
  if(mo) mo.disconnect();
  const sy=window.scrollY;
  root.textContent=''; root.appendChild(draw());
  if(mo) mo.observe(root, {childList:true});
  window.scrollTo(0, sy);
  if(P.open && pnl) drawPanel();
}
function redraw(){ paint(); }
mo=new MutationObserver(()=>{ if(!root.querySelector(':scope > .pv2')) paint(); });
mo.observe(root, {childList:true});
const onKey=e=>{ if(e.key!=='Escape' || !P.open) return; const ap=document.getElementById('panel'); if(ap && !ap.classList.contains('off')) return; closePanel(); };
const onNav=e=>{ const b=e.target.closest && e.target.closest('[data-hq]'); if(b && P.open) closePanel(); };
document.addEventListener('keydown', onKey);
document.addEventListener('click', onNav, true);
paint();

window.__pv2={ redraw, openPanel, closePanel, version:'2.0',
  destroy(){ if(mo) mo.disconnect(); mo=null; document.removeEventListener('keydown', onKey); document.removeEventListener('click', onNav, true);
    if(pnl) pnl.remove(); if(scrim) scrim.remove(); css.remove(); root.textContent=''; if(window.__show) window.__show('rocks'); } };
})();

});
/* ===== hub.js ===== */
MODS.push(function(){
/* My Hub — the top of My Board: the day ahead from Outlook, the person's own
   numbers, every MISMO system they can open, quick actions, and Jump To (Ctrl/Cmd+K).
   Plugs into the existing page the same way projects-v2.js does: it sits at the top
   of #app-mine, reads window.__S and the Outlook calendar sync (window.__cal), and
   hands every edit to the app's own editors. */
(function(){
'use strict';
if(window.__hub && window.__hub.destroy) window.__hub.destroy();
const S=window.__S, root=document.getElementById('app-mine');
if(!S || !root) return;
const KEY='tools:team-hq:mismo.teamhq.hub';
const ui={fav:[], open:'', tab:'day', tf:'mine'};
try{ Object.assign(ui, JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){}
ui.open='';
const saveUi=()=>{ try{ localStorage.setItem(KEY, JSON.stringify({fav:ui.fav, tab:ui.tab, tf:ui.tf})); }catch(e){} };

/* ---------- helpers ---------- */
function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function btn(cls, txt, fn){ const b=h('button', cls, txt); b.type='button'; if(fn) b.addEventListener('click', fn); return b; }
const ICON={
  plus:'<path d="M12 5v14M5 12h14"/>', note:'<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', rcpt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  agenda:'<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>', ask:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  out:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>' };
const svg=(k, cls)=>'<svg class="'+(cls||'')+'" viewBox="0 0 24 24">'+ICON[k]+'</svg>';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WDL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const today=()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
const pd=s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); return m ? new Date(+m[1], m[2]-1, +m[3]) : null; };
const days=s=>{ const d=pd(s); return d ? Math.round((d-today())/864e5) : null; };
const fmt=s=>{ const d=pd(s); return d ? MON[d.getMonth()]+' '+d.getDate() : ''; };
const st=t=>/^waiting/i.test(t.s||'') ? 'Waiting on Someone' : (t.s||'Not Started');
const isOpen=t=>st(t)!=='Done';
const doers=t=>(t.d && t.d.length) ? t.d.slice() : (t.o ? [t.o] : []);
const person=id=>S.people.find(p=>p.id===id);
const first=id=>{ const p=person(id); return p ? p.name.split(' ')[0] : ''; };
const rock=id=>S.rocks.find(r=>r.id===id);
const tm=ms=>{ const d=new Date(ms); let hh=d.getHours(), mm=d.getMinutes(); const ap=hh<12?'AM':'PM'; hh=hh%12||12; return hh+(mm?':'+String(mm).padStart(2,'0'):'')+' '+ap; };
const etFmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York', hour:'numeric', minute:'2-digit'});
const tmET=ms=>etFmt.format(ms).replace(':00','');
const localIsET=(()=>{ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone==='America/New_York'; }catch(e){ return false; } })();
const dur=min=>{ const hh=Math.floor(min/60), mm=Math.round(min%60); return (hh? hh+(mm?'h ':'h') : '')+(mm? mm+'m' : (hh?'':'0m')); };
const hrs=min=>{ const q=Math.round(min/30)/2; return (q%1 ? Math.floor(q)+'½' : String(q))+(q===1?' hour':' hours'); };
function etAt(day, hour){ /* that day at hour:00 Eastern, as a timestamp */
  let t=Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hour+5, 0);
  const e=+new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York', hour:'numeric', hourCycle:'h23'}).format(t);
  return t+(hour-e)*3600e3; }
function av(id, size){ const p=person(id), a=h('span','av'); if(!p) return a; a.textContent=p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join(''); a.style.background='var(--c'+(((p.color||0)%7)+1)+')'; if(size){ a.style.width=a.style.height=size+'px'; a.style.fontSize=Math.round(size*.42)+'px'; } a.title=p.name; return a; }
const goTab=t=>{ window.__show && window.__show(t); window.scrollTo(0,0); };
const editTask=t=>window.__edit && window.__edit(t);

/* ---------- my work ---------- */
const me=()=>S.me;
const mine=()=>S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(me())>=0);
const watching=()=>S.tasks.filter(t=>isOpen(t) && t.o===me() && doers(t).indexOf(me())<0);
const late=L=>L.filter(t=>t.due && days(t.due)<0);
const week=L=>L.filter(t=>t.due && days(t.due)>=0 && days(t.due)<=7);
const byDue=(a,b)=>{ const x=a.due||'9999', y=b.due||'9999'; return x<y?-1:x>y?1:(a.ord||0)-(b.ord||0); };

/* ---------- the calendar ---------- */
function workDay(){ /* today, or the next working day once today's hours are over */
  const now=Date.now(); let d=today();
  for(let i=0;i<10;i++){ const wd=d.getDay(); const end=etAt(d,17);
    if(wd!==0 && wd!==6 && !(i===0 && now>end)) return d; d=new Date(d.getFullYear(), d.getMonth(), d.getDate()+1); }
  return d; }
function eventsOn(day, id){
  const by=(window.__cal && window.__cal.CAL && window.__cal.CAL.by) || {};
  const ev=by[id||me()]; if(!Array.isArray(ev)) return null;
  const a=day.getTime(), b=a+864e5;
  return ev.filter(e=>e.e>a && e.s<b).sort((x,y)=>x.s-y.s); }
function dayPlan(day){
  const ev=eventsOn(day); const ws=etAt(day,9), we=etAt(day,17);
  if(!ev) return {ev:null, ws, we, free:[], busyMin:0, freeMin:0};
  const timed=ev.filter(e=>!e.all && e.show!=='free');
  const busy=timed.filter(e=>e.show!=='oof').map(e=>[Math.max(e.s,ws), Math.min(e.e,we)]).filter(x=>x[1]>x[0]).sort((a,b)=>a[0]-b[0]);
  const free=[]; let c=ws;
  busy.forEach(([s,e])=>{ if(s>c) free.push([c,s]); c=Math.max(c,e); }); if(we>c) free.push([c,we]);
  const gaps=free.filter(([s,e])=>e-s>=30*60e3);
  const oofAll=ev.some(e=>e.show==='oof' && e.s<=ws && e.e>=we);
  return {ev:timed, ws, we, free:gaps, oofAll, freeMin:gaps.reduce((n,[s,e])=>n+(e-s)/60e3,0)}; }

/* ---------- systems ---------- */
const SYS=[
  ['team-hq','Team HQ','/team-hq/','#0D314C','Planning','This page'],
  ['summit-hq','Summit HQ','/summit-hq/','#B45309','Planning','Summit planning, schedule and run of show'],
  ['meeting-trackers','Meeting Trackers','/meeting-trackers/','#6D28D9','Planning','Workgroup meetings, schedules and attendance'],
  ['scheduler','Scheduler','/scheduler/','#2477B8','Planning','Set up meetings without the back-and-forth'],
  ['member-360','Member 360','/member-360/','#0F7B5C','Planning','Members, prospects and stakeholders'],
  ['financials','MISMO Money','/financials/','#16A34A','Planning','Budget, forecast, reconciliation and board reporting'],
  ['iif-hq','IIF Planning HQ','/iif-hq/','#4D7C0F','Planning','Lenders, invoices and payments for the IIF'],
  ['marketing-hq','MISMO Media','/marketing-hq/','#EB6834','Planning','MISMO Matters, Mic’d Up, LinkedIn and requests'],
  ['elections-hq','Elections HQ','/elections-hq/','#0E7490','Planning','CoP, Board and Governance Committee elections'],
  ['website-migration','Website Migration HQ','/website-migration/','#475569','Planning','Pages, decisions and cutover'],
  ['cms','Certification Management System','/cms/','#BE123C','Certification','Certifications, renewals and assessors'],
  ['so','Service Orders and Agreements','/service-orders/','#E11D48','Certification','Contractor agreements and e-signature'],
  ['sponsorship','Sponsorship Portal','/sponsorship/','#0EA5E9','Sponsorship','Sponsor packages, prospects and commitments'],
  ['hub','Initiative Hub','/initiative-hub/','#2A4DFF','Standards & Tools','Active workgroup initiatives by domain'],
  ['hub-requests','Work Requests','/initiative-hub/work-requests.html','#14486E','Standards & Tools','Requests coming in for the standards work'],
  ['glossary','Business Glossary','/glossary/','#0F9D77','Standards & Tools','MISMO’s terms and definitions'],
  ['mismo-link','MISMO Link','/mismo-link/','#1E3A8A','Standards & Tools','The MISMO Link AI beta'],
  ['qr','QR Code Manager','/qr/','#2477B8','Standards & Tools','Codes, scan tracking and expiry']
].map(([k,n,u,c,g,d])=>({k,n,u,c,g,d}));
const EVERYDAY=[
  {k:'x-mail', n:'Outlook Mail', u:'https://outlook.office.com/mail/', c:'#0F6CBD', d:'Your inbox'},
  {k:'x-cal', n:'Outlook Calendar', u:'https://outlook.office.com/calendar/', c:'#0F6CBD', d:'Your calendar'},
  {k:'x-teams', n:'Microsoft Teams', u:'https://teams.microsoft.com/', c:'#5B5FC7', d:'Chat and calls'},
  {k:'x-site', n:'mismo.org', u:'https://www.mismo.org/', c:'#0D314C', d:'The public website'},
  {k:'x-gh', n:'GitHub', u:'https://github.com/GitMISMO', c:'#24292F', d:'Where MISMO’s tools live'}
];
const FIGSRC={ 'Meeting Trackers':'meeting-trackers', 'Certification Management System':'cms', 'Member 360':'member-360', 'Financial System':'financials', 'Service Orders':'so', 'Sponsorship Portal':'sponsorship' };
function access(){ try{ const s=window.ResourcesSession && window.ResourcesSession.current(); return (s && s.access) || null; }catch(e){ return null; } }
function canOpen(k){ const a=access(); if(!a) return true; if(k==='so') return Object.keys(a).some(x=>/^so-/.test(x)); if(k==='scheduler'||k==='team-hq') return true; return !!a[k]; }
function figFor(k){ const f=(S.figures||[]).filter(x=>FIGSRC[x.src]===k && String(x.v||'').trim()!=='');
  return f.length ? f[0] : null; }

/* ---------- the hub ---------- */
function draw(){
  const w=h('div','hb');
  w.appendChild(band());
  w.appendChild(actionBar());
  w.appendChild(workspace());
  return w;
}
/* ---------- one workspace, switched by tabs, instead of a long scroll ---------- */
function wsTabs(){
  const T=[['day','My Day'],['week','My Week'],['tasks','My Tasks'],['projects','My Projects'],['systems','My Systems']];
  const A=asksForMe(), N=nudgesForMe().filter(n=>!(me()===ASK_OWNER && n.k==='Asked For'));
  if(A.length || N.length) T.splice(0,0,['asks', me()===ASK_OWNER ? 'Asks for You' : 'Asks and Nudges']);
  return T;
}
function badge(k){
  if(k==='tasks') return mine().length;
  if(k==='asks'){ const n=asksForMe().filter(a=>a.state==='New').length + nudgesForMe().filter(x=>!(me()===ASK_OWNER && x.k==='Asked For')).length; return n; }
  if(k==='projects'){ return S.rocks.filter(r=>(r.status||'Active')==='Active').filter(r=>r.lead===me() || S.tasks.some(t=>t.r===r.id && isOpen(t) && doers(t).indexOf(me())>=0)).length; }
  if(k==='day'){ const P=dayPlan(workDay()); return P.ev ? P.ev.length : 0; }
  return 0;
}
function workspace(){
  const T=wsTabs(); if(!T.some(t=>t[0]===ui.tab)) ui.tab=T[0][0];
  const box=h('div','box hb-ws');
  const nav=h('div','hb-tabs'); nav.setAttribute('role','tablist');
  T.forEach(([k,l])=>{ const b=btn('hb-tab'+(ui.tab===k?' on':'')+(k==='asks'?' hot':''), null, ()=>setTab(k)); b.setAttribute('role','tab'); b.setAttribute('aria-selected', String(ui.tab===k));
    b.appendChild(h('span',null,l)); const n=badge(k); if(n) b.appendChild(h('b',null,String(n))); nav.appendChild(b); });
  box.appendChild(nav);
  const body=h('div','hb-wsb'); body.dataset.tab=ui.tab;
  let inner=null;
  try{ inner = ui.tab==='day' ? dayCard() : ui.tab==='week' ? myWeek() : ui.tab==='tasks' ? tasksView() : ui.tab==='projects' ? (myProjects() || emptyNote('You don\u2019t lead or have open work in an active Team Project.')) : ui.tab==='asks' ? (forYou() || emptyNote('Nothing waiting for you.')) : launch(); }catch(e){ console.error(e); inner=emptyNote('Something went wrong showing this. Try another tab.'); }
  body.appendChild(inner);
  box.appendChild(body);
  /* swipe between tabs on a phone */
  let x0=null, y0=null;
  body.addEventListener('touchstart', e=>{ const t=e.touches[0]; x0=t.clientX; y0=t.clientY; }, {passive:true});
  body.addEventListener('touchend', e=>{ if(x0===null) return; const t=e.changedTouches[0], dx=t.clientX-x0, dy=t.clientY-y0; x0=null;
    if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.6 && !e.target.closest('.hb-strip,.hb-wk,.hb-list,.hb-grid')){ const i=T.findIndex(z=>z[0]===ui.tab); const n=T[i+(dx<0?1:-1)]; if(n) setTab(n[0]); } }, {passive:true});
  return box;
}
function setTab(k){ ui.tab=k; saveUi(); paint(); const ws=document.querySelector('.hb-ws'); if(ws){ const r=ws.getBoundingClientRect(); if(r.top<60 || r.top>window.innerHeight*.6) ws.scrollIntoView({behavior:'smooth', block:'start'}); } }
function emptyNote(t){ const d=h('div','hb-empty-ws'); d.appendChild(h('p','hb-empty',t)); return d; }
/* ---------- quick actions as one compact bar ---------- */
function actionBar(){
  const bar=h('div','hb-bar');
  const add=(ic, label, fn, pri)=>{ const b=btn('hb-qb'+(pri?' pri':''), null, fn); b.innerHTML=svg(ic)+'<span></span>'; b.querySelector('span').textContent=label; bar.appendChild(b); };
  const click=id=>()=>{ const b=document.getElementById(id); b && b.click(); };
  add('plus','Add a Task', click('newtask'), true);
  add('note','Jot It Down', click('jot'));
  add('clock','Find a Time', ()=>goTab('findtime'));
  add('agenda','Raise at Team Meeting', ()=>goTab('agenda'));
  add('rcpt','Snap a Receipt', ()=>goTab('expenses'));
  add('ask','Ask for Something', ()=>window.__ask2 && window.__ask2());
  const j=btn('hb-qb hb-jump', null, openPal); j.innerHTML=svg('search')+'<span>Jump to Anything</span><kbd>'+(/Mac/.test(navigator.platform)?'\u2318K':'Ctrl K')+'</kbd>'; bar.appendChild(j);
  return bar;
}
/* ---------- My Tasks, filtered ---------- */
function tasksView(){
  const box=h('div','hb-tv');
  const F=[['mine','Open', mine()],['late','Past Due', late(mine())],['week','This Week', week(mine())],['watch','I\u2019m Accountable', watching()]];
  if(!F.some(f=>f[0]===ui.tf)) ui.tf='mine';
  const fb=h('div','filterbar hb-tf');
  F.forEach(([k,l,L])=>{ const b=btn('pill', null, ()=>{ ui.tf=k; saveUi(); paint(); }); b.append(l+' '); b.appendChild(h('b',null,String(L.length))); b.setAttribute('aria-pressed', String(ui.tf===k)); fb.appendChild(b); });
  const ad=btn('btn hb-tadd', null, ()=>{ const b=document.getElementById('newtask'); b && b.click(); }); ad.innerHTML=svg('plus')+'<span>Add a Task</span>';
  const top=h('div','hb-tvh'); top.appendChild(fb); top.appendChild(ad); box.appendChild(top);
  const L=(F.find(f=>f[0]===ui.tf)||F[0])[2];
  if(!L.length){ box.appendChild(h('p','hb-empty', ui.tf==='late' ? 'Nothing past due. Nice.' : 'Nothing here.')); return box; }
  const g=h('div','hb-list');
  L.slice().sort(byDue).forEach(t=>{
    const r=btn('hb-task', null, ()=>editTask(t));
    const n=days(t.due); r.classList.add(n!==null && n<0 ? 'late' : st(t)==='In Progress' ? 'go' : st(t)==='Waiting on Someone' ? 'wait' : 'ns');
    r.appendChild(h('span','tt', t.t));
    const m=h('span','mt'); const rk=rock(t.r);
    if(rk) m.appendChild(h('span','pj', rk.name+(t.w?' \u00b7 '+t.w:'')));
    m.appendChild(h('span','dt'+(n!==null&&n<0?' bad':''), t.due ? (n<0 ? (-n)+' days late' : n===0 ? 'Today' : fmt(t.due)) : 'No date'));
    if(ui.tf==='watch') doers(t).forEach(i=>m.appendChild(av(i,20)));
    r.appendChild(m); g.appendChild(r); });
  box.appendChild(g);
  return box;
}
function band(){
  const b=h('div','headline hb-band'), now=new Date(), hr=now.getHours();
  const hi=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  b.appendChild(h('div','hl-date', WDL[now.getDay()]+', '+MONL[now.getMonth()]+' '+now.getDate()+' · '+hi+', '+first(me())));
  const M=mine(), L=late(M).sort(byDue), W=week(M), wd=workDay(), P=dayPlan(wd);
  const isToday=wd.getTime()===today().getTime(), dayName=isToday?'Today':WDL[wd.getDay()];
  const say=h('div','hl-say');
  const em=(t,c)=>h('em',c||null,t);
  if(P.ev){
    if(P.oofAll) say.append(dayName+' you’re out of the office.');
    else { say.append(dayName+' you have ', em(P.ev.length+(P.ev.length===1?' meeting':' meetings')), ' and ', em(hrs(P.freeMin)+' free'));
      const big=P.free.slice().sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0];
      if(big && (big[1]-big[0])>=60*60e3) say.append(' — your longest stretch is '+tm(big[0])+'–'+tm(big[1]));
      say.append('. '); }
  }
  if(L.length) say.append('Start with ', em(L[0].t,'hl-late'), ' — '+(-days(L[0].due))+' days late.');
  else if(W.length) say.append('Next to land: ', em(W.sort(byDue)[0].t), ', '+fmt(W[0].due)+'.');
  else if(!P.ev) say.append('Nothing of yours is late or due this week.');
  else say.append('Nothing of yours is late.');
  b.appendChild(say);
  const tiles=h('div','tiles one');
  const tile=(k, n, label, small, cls)=>{ const t=btn('tile'+(cls?' '+cls:''), null, ()=>{ if(k==='meet') setTab('day'); else if(k==='asks') setTab(wsTabs().some(x=>x[0]==='asks') ? 'asks' : 'tasks'); else { ui.tf=k; setTab('tasks'); } });
    const on = (k==='meet' && ui.tab==='day') || (k==='asks' && ui.tab==='asks') || (ui.tab==='tasks' && ui.tf===k); t.setAttribute('aria-pressed', String(on)); t.appendChild(h('b',null,String(n))); t.appendChild(h('span',null,label)); t.appendChild(h('small',null,small)); tiles.appendChild(t); };
  tile('mine', M.length, 'My Open Tasks', M.filter(t=>st(t)==='In Progress').length+' in progress');
  tile('late', L.length, 'Past Due', L.length ? 'oldest '+fmt(L[0].due) : 'nothing late', L.length?'bad':'');
  tile('week', W.length, 'Due This Week', 'next seven days', W.length?'warn':'');
  tile('watch', watching().length, 'I’m Accountable For', 'someone else is doing it');
  tile('meet', P.ev ? P.ev.length : '—', 'Meetings '+(isToday?'Today':WDL[wd.getDay()]), P.ev ? hrs(P.freeMin)+' free' : 'Outlook not connected');
  if(me()===ASK_OWNER && openAsks().length){ const oa=openAsks(), nw=oa.filter(a=>a.state==='New').length; tile('asks', oa.length, 'Asks for You', nw ? nw+' new to look at' : 'nothing new', nw?'warn':''); }
  b.appendChild(tiles);
  return b;
}

function drill(){
  const box=h('div','box hb-drill');
  const map={ mine:['My Open Tasks', mine()], late:['Past Due', late(mine())], week:['Due This Week', week(mine())], watch:['I’m Accountable For', watching()] };
  const [title, L]=map[ui.open]||['',[]];
  const hd=h('div','hb-dh'); hd.appendChild(h('h3','sect-t', title+' · '+L.length));
  hd.appendChild(btn('btn ghost','Close', ()=>{ ui.open=''; paint(); })); box.appendChild(hd);
  if(!L.length){ box.appendChild(h('p','hb-empty','Nothing here. Nice.')); return box; }
  const g=h('div','hb-list');
  L.slice().sort(byDue).forEach(t=>{
    const r=btn('hb-task', null, ()=>editTask(t));
    const n=days(t.due); r.classList.add(n!==null && n<0 ? 'late' : st(t)==='In Progress' ? 'go' : st(t)==='Waiting on Someone' ? 'wait' : 'ns');
    r.appendChild(h('span','tt', t.t));
    const m=h('span','mt'); const rk=rock(t.r);
    if(rk) m.appendChild(h('span','pj', rk.name+(t.w?' · '+t.w:'')));
    m.appendChild(h('span','dt'+(n!==null&&n<0?' bad':''), t.due ? (n<0 ? (-n)+' days late' : n===0 ? 'Today' : fmt(t.due)) : 'No date'));
    if(ui.open==='watch') doers(t).forEach(i=>m.appendChild(av(i,20)));
    r.appendChild(m); g.appendChild(r); });
  box.appendChild(g);
  return box;
}

function dayCard(){
  const c=h('div','box hb-day'), wd=workDay(), P=dayPlan(wd), isToday=wd.getTime()===today().getTime();
  const hd=h('div','hb-ch'); hd.appendChild(h('h3','sect-t', isToday ? 'My Day' : 'My Day · '+WDL[wd.getDay()]+', '+MON[wd.getMonth()]+' '+wd.getDate()));
  const right=h('div','rowflex');
  /* Find a Time lives in the action bar */
  
  const sc=h('a','btn'); sc.href='/scheduler/#tab=new'; sc.target='_blank'; sc.rel='noopener'; sc.innerHTML=svg('cal')+'<span>Schedule a Meeting</span>'; right.appendChild(sc);
  hd.appendChild(right); c.appendChild(hd);
  if(!P.ev){ c.appendChild(h('p','hb-empty','Your Outlook calendar isn’t coming through yet, so meetings can’t show here.')); return c; }
  const now=Date.now();
  const nx=P.ev.find(e=>e.e>now && !(e.show==='oof'));
  if(nx){
    const n=h('div','hb-next'+(nx.s<=now?' on':''));
    const mins=Math.round((nx.s-now)/60e3);
    n.appendChild(h('span','lbl', nx.s<=now ? 'On Now' : (isToday ? (mins<60 ? 'Next · in '+mins+' min' : 'Next · '+tm(nx.s)) : 'First · '+tm(nx.s))));
    n.appendChild(h('span','tt', nx.t||'Busy'));
    n.appendChild(h('span','mt', tm(nx.s)+'–'+tm(nx.e)+(localIsET?'':' ('+tmET(nx.s)+'–'+tmET(nx.e)+' ET)')+(nx.show==='tentative'?' · tentative':'')));
    c.appendChild(n);
  }
  /* the strip */
  let a=Math.min(P.ws, ...P.ev.map(e=>e.s)), b=Math.max(P.we, ...P.ev.map(e=>e.e));
  const ah=new Date(a); ah.setMinutes(0,0,0); a=ah.getTime(); const bh=new Date(b); if(bh.getMinutes()) bh.setHours(bh.getHours()+1,0,0,0); b=bh.getTime();
  const span=b-a, x=t=>(Math.max(a,Math.min(b,t))-a)/span*100;
  const strip=h('div','hb-strip');
  const work=h('i','hb-work'); work.style.left=x(P.ws)+'%'; work.style.width=(x(P.we)-x(P.ws))+'%'; strip.appendChild(work);
  for(let t=a;t<=b;t+=3600e3){ const l=h('span','hb-hr', tm(t).replace(':00','').replace(' ','').toLowerCase()); l.style.left=x(t)+'%'; strip.appendChild(l); const g=h('i','hb-gl'); g.style.left=x(t)+'%'; strip.appendChild(g); }
  P.free.forEach(([s,e])=>{ const f=h('span','hb-free', dur((e-s)/60e3)+' free'); f.style.left=x(s)+'%'; f.style.width=(x(e)-x(s))+'%'; f.title='Free '+tm(s)+'–'+tm(e); strip.appendChild(f); });
  /* overlapping meetings stack into lanes */
  const lanes=[]; P.ev.forEach(e=>{ let i=lanes.findIndex(end=>end<=e.s); if(i<0){ i=lanes.length; lanes.push(0); } lanes[i]=e.e; e._ln=i; });
  const nl=Math.max(1,lanes.length); strip.style.setProperty('--lanes', nl);
  P.ev.forEach(e=>{ const m=h('span','hb-ev '+(e.show||'busy')+(e.e<now?' past':'')+(e.s<=now&&e.e>now?' now':''), e.t||'Busy');
    m.style.left=x(e.s)+'%'; m.style.width=Math.max(.8,x(e.e)-x(e.s))+'%'; m.style.top='calc(20px + '+e._ln+' * var(--lh))';
    m.title=(e.t||'Busy')+'\n'+tm(e.s)+'–'+tm(e.e)+(localIsET?'':' ('+tmET(e.s)+'–'+tmET(e.e)+' ET)')+(e.show==='tentative'?' · tentative':''); strip.appendChild(m); });
  if(isToday && now>a && now<b){ const n=h('i','hb-now'); n.style.left=x(now)+'%'; strip.appendChild(n); }
  c.appendChild(strip);
  const ag=h('div','hb-agl');
  P.ev.forEach(e=>{ const r=h('div','hb-ai'+(e.e<now?' past':'')+(e.s<=now&&e.e>now?' now':''));
    r.appendChild(h('span','t', tm(e.s))); r.appendChild(h('span','n', e.t||'Busy'));
    r.appendChild(h('span','d', dur((e.e-e.s)/60e3)+(e.show==='tentative'?' \u00b7 tentative':e.show==='oof'?' \u00b7 out':''))); ag.appendChild(r); });
  c.appendChild(ag);
  const foot=h('div','hb-dfoot');
  foot.appendChild(h('span',null, P.ev.length+(P.ev.length===1?' meeting':' meetings')+' · '+hrs(P.freeMin)+' free inside 9–5 Eastern'+(localIsET?'':' ('+tm(P.ws)+'–'+tm(P.we)+' your time)')));
  /* who on the team is out that day */
  const out=S.people.filter(p=>p.id!==me()).filter(p=>{ const e=eventsOn(wd,p.id); return e && e.some(x=>x.show==='oof' && x.s<=P.ws+3600e3 && x.e>=P.we-3600e3); });
  if(out.length){ const o=h('span','hb-out'); o.append('Out: '); out.forEach(p=>o.appendChild(av(p.id,20))); foot.appendChild(o); }
  c.appendChild(foot);
  return c;
}

/* ---------- For You: Ask for Something requests and nudges ---------- */
const ASK_OWNER='jonna';
const ASK_KIND={panel:'A Panel That Is Not There', number:'A Number I Cannot Find', change:'Something That Should Work Differently', other:'Something Else'};
const ASK_C={'New':'var(--c1)', 'Looking at It':'var(--warn)', 'Built':'var(--good)', 'Not Doing':'var(--ink-3)'};
const openAsks=()=>(S.asks||[]).filter(a=>a.state!=='Built' && a.state!=='Not Doing');
const asksForMe=()=> me()===ASK_OWNER ? openAsks() : (S.asks||[]).filter(a=>a.by===me() && ((a.state!=='Built' && a.state!=='Not Doing') || (a.reply && Date.now()-(a.at||0)<30*864e5)));
const nudgesForMe=()=>(S.nudges||[]).filter(n=>n.to===me() && !n.done).sort((a,b)=>(b.at||0)-(a.at||0));
function ago(t){ if(!t) return ''; const m=Math.round((Date.now()-t)/60e3); if(m<60) return m<=1?'just now':m+' min ago'; const hh=Math.round(m/60); if(hh<24) return hh+(hh===1?' hour ago':' hours ago'); const d=Math.round(hh/24); return d===1?'yesterday':d+' days ago'; }
function forYou(){
  const owner=me()===ASK_OWNER;
  const A=asksForMe().slice().sort((a,b)=>(a.state==='New'?0:1)-(b.state==='New'?0:1) || (b.at||0)-(a.at||0));
  const N=nudgesForMe().filter(n=>!(owner && n.k==='Asked For'));
  if(!A.length && !N.length) return null;
  const c=h('div','box hb-fy'+((A.some(a=>a.state==='New')||N.length)?' hot':''));
  const hd=h('div','hb-ch'); const nNew=A.filter(a=>a.state==='New').length;
  hd.appendChild(h('h3','sect-t', owner ? 'Asks for You' : 'Your Asks and Nudges'));
  if(owner && nNew) hd.appendChild(h('span','hb-new', nNew+' new'));
  hd.appendChild(h('span','hb-hint', owner ? 'everything sent with Ask for Something lands here' : 'where your asks stand, and what people have asked of you'));
  c.appendChild(hd);
  const g=h('div','hb-fyl');
  A.forEach(a=>{ const r=btn('hb-fyi', null, ()=>window.__editAsk && window.__editAsk(a)); r.style.setProperty('--sc', ASK_C[a.state]||'var(--c1)');
    const top=h('div','tp'); if(a.by && owner) top.appendChild(av(a.by,22)); top.appendChild(h('b',null, a.t||'(no title)')); top.appendChild(h('span','st', a.state||'New')); r.appendChild(top);
    r.appendChild(h('div','mt', (ASK_KIND[a.kind]||'Ask')+(owner && a.by ? ' · from '+first(a.by) : '')+' · '+ago(a.at)));
    if(a.reply && !owner) r.appendChild(h('div','rp', 'Reply: '+String(a.reply).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()));
    g.appendChild(r); });
  N.forEach(n=>{ const r=h('div','hb-fyi nudge'); r.style.setProperty('--sc','var(--c2)');
    const top=h('div','tp'); if(n.by) top.appendChild(av(n.by,22)); top.appendChild(h('b',null, n.m||n.k||'A nudge')); r.appendChild(top);
    r.appendChild(h('div','mt', (n.k||'Nudge')+(n.by?' · from '+first(n.by):'')+' · '+ago(n.at)));
    const ok=btn('btn ghost hb-ok','Done', ()=>{ if(window.__put){ window.__put('nudges', Object.assign({}, n, {done:1})); } }); r.appendChild(ok);
    g.appendChild(r); });
  c.appendChild(g);
  return c;
}

/* ---------- My Week: five working days at a glance ---------- */
function myWeek(){
  const c=h('div','box hb-week');
  const hd=h('div','hb-ch'); hd.appendChild(h('h3','sect-t','My Week')); hd.appendChild(h('span','hb-hint','meetings from Outlook, what’s due, and the dates that matter')); c.appendChild(hd);
  const g=h('div','hb-wk'); const now=Date.now(), t0=today();
  let d=workDay(); const cols=[];
  while(cols.length<5){ if(d.getDay()!==0 && d.getDay()!==6) cols.push(new Date(d)); d=new Date(d.getFullYear(), d.getMonth(), d.getDate()+1); }
  const M=mine(); const lateN=late(M).length;
  cols.forEach((day,ci)=>{
    const isT=day.getTime()===t0.getTime(), P=dayPlan(day), dIso=day.getFullYear()+'-'+String(day.getMonth()+1).padStart(2,'0')+'-'+String(day.getDate()).padStart(2,'0');
    const col=h('div','hb-wd'+(isT?' today':''));
    const top=h('div','hb-wdh'); top.appendChild(h('small',null, WDL[day.getDay()].slice(0,3))); top.appendChild(h('b',null, String(day.getDate()))); top.appendChild(h('small',null, MON[day.getMonth()])); col.appendChild(top);
    let hol=''; try{ const r=window.__t && window.__t.holidayOn(day); hol=r ? (typeof r==='string'?r:(r.n||r.t||r.name||'Holiday')) : ''; }catch(e){}
    const body=h('div','hb-wdb');
    if(hol){ body.appendChild(h('div','hb-hol', hol)); }
    else if(P.ev){
      const busyMin=P.ev.filter(e=>e.show!=='oof').reduce((n,e)=>n+(Math.min(e.e,P.we)-Math.max(e.s,P.ws))/60e3,0);
      const meter=h('div','hb-meter'); const fill=h('i'); fill.style.width=Math.max(0,Math.min(100, busyMin/480*100))+'%'; meter.appendChild(fill); body.appendChild(meter);
      body.appendChild(h('div','hb-wds', P.oofAll ? 'Out of office' : (P.ev.length+(P.ev.length===1?' meeting':' meetings')+' · '+hrs(P.freeMin)+' free')));
      P.ev.slice(0,4).forEach(e=>{ const r=h('div','hb-wm'+(e.e<now?' past':'')+(e.show==='tentative'?' tent':'')); r.appendChild(h('span','t', tm(e.s).replace(':00','').replace(' AM','a').replace(' PM','p'))); r.appendChild(h('span','n', e.t||'Busy')); r.title=(e.t||'Busy')+' · '+tm(e.s)+'–'+tm(e.e); body.appendChild(r); });
      if(P.ev.length>4) body.appendChild(h('div','hb-more','+'+(P.ev.length-4)+' more'));
    }
    let kd=[]; try{ kd=(window.__dOn ? window.__dOn(day) : []).filter(x=>!/travel|out of office/i.test(x.k||'') || (x.who||[]).indexOf(me())>=0); }catch(e){}
    kd.slice(0,3).forEach(x=>{ const k=btn('hb-kd', x.t, ()=>window.__editDate && window.__editDate(x)); k.title=(x.k||'Key date')+' · '+x.t; body.appendChild(k); });
    const due=M.filter(t=>t.due===dIso);
    if(ci===0 && lateN){ const l=btn('hb-due late', lateN+' carried over, late', ()=>{ ui.tf='late'; setTab('tasks'); }); body.appendChild(l); }
    due.forEach(t=>{ const b=btn('hb-due', t.t, ()=>editTask(t)); b.title='Due · '+t.t; body.appendChild(b); });
    if(!hol && !(P.ev&&P.ev.length) && !kd.length && !due.length) body.appendChild(h('div','hb-clear','Clear day'));
    col.appendChild(body);
    if(!hol && P.free && P.free.length){ const big=P.free.slice().sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0]; if(big[1]-big[0]>=60*60e3) col.appendChild(h('div','hb-wdf','Best focus: '+tm(big[0]).replace(':00','')+'–'+tm(big[1]).replace(':00',''))); }
    g.appendChild(col);
  });
  c.appendChild(g);
  return c;
}
/* ---------- My Projects: the Team Projects I lead or have work in ---------- */
function myProjects(){
  const R=S.rocks.filter(r=>(r.status||'Active')==='Active').filter(r=>r.lead===me() || S.tasks.some(t=>t.r===r.id && isOpen(t) && doers(t).indexOf(me())>=0));
  if(!R.length) return null;
  const c=h('div','box hb-proj');
  const hd=h('div','hb-ch'); hd.appendChild(h('h3','sect-t','My Team Projects · '+R.length)); const all=btn('btn ghost','All Team Projects', ()=>goTab('rocks')); hd.appendChild(all); c.appendChild(hd);
  const g=h('div','hb-pg2');
  R.sort((a,b)=>a.name.localeCompare(b.name)).forEach(r=>{
    const ts=S.tasks.filter(t=>t.r===r.id), open=ts.filter(isOpen), mineT=open.filter(t=>doers(t).indexOf(me())>=0).sort(byDue), lt=open.filter(t=>t.due && days(t.due)<0).length;
    const k=btn('hb-pc', null, ()=>{ goTab('rocks'); setTimeout(()=>window.__pv2 && window.__pv2.openPanel(r.id, {who:me()}), 80); });
    k.style.setProperty('--rc', 'var(--c'+(((r.color||0)%7)+1)+')');
    const t=h('div','hd'); t.appendChild(h('b',null, r.name)); if(lt) t.appendChild(h('span','lt', lt+' late')); if(r.lead===me()) t.appendChild(h('span','ld','You lead')); k.appendChild(t);
    const pct=ts.length ? Math.round((ts.length-open.length)/ts.length*100) : 0;
    const bar=h('div','br'); const f=h('i'); f.style.width=pct+'%'; bar.appendChild(f); k.appendChild(bar);
    k.appendChild(h('div','st', pct+'% done · '+(mineT.length ? mineT.length+' yours' : 'nothing of yours open')));
    if(mineT[0]) k.appendChild(h('div','nx', 'Next: '+mineT[0].t));
    g.appendChild(k); });
  c.appendChild(g);
  return c;
}

function actions(){
  const c=h('div','box hb-acts');
  c.appendChild(h('h3','sect-t','Quick Actions'));
  const g=h('div','hb-ag');
  const add=(ic, label, sub, fn)=>{ const b=btn('hb-a', null, fn); b.innerHTML=svg(ic)+'<span><b></b><small></small></span>'; b.querySelector('b').textContent=label; b.querySelector('small').textContent=sub; g.appendChild(b); };
  const click=id=>()=>{ const b=document.getElementById(id); b && b.click(); };
  add('plus','Add a Task','press T anywhere', click('newtask'));
  add('note','Jot It Down','press N anywhere', click('jot'));
  add('agenda','Raise at Team Meeting', nextMeetingLabel(), ()=>goTab('agenda'));
  add('rcpt','Snap a Receipt','straight to Expenses', ()=>goTab('expenses'));
  add('ask','Ask for Something','a panel, a fix, a system', ()=>window.__ask2 && window.__ask2());
  add('search','Jump to Anything', /Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl+K', openPal);
  c.appendChild(g);
  return c;
}
function nextMeetingLabel(){ try{ const n=window.__mtg && window.__mtg.next && window.__mtg.next(); const d=n && (n.d||n.date||n); const dd=typeof d==='string'?pd(d):(d instanceof Date?d:null); return dd ? 'next one '+MON[dd.getMonth()]+' '+dd.getDate() : 'add it to the agenda'; }catch(e){ return 'add it to the agenda'; } }

function launch(){
  const c=h('div','box hb-launch');
  const hd=h('div','hb-ch'); hd.appendChild(h('h3','sect-t','My Systems'));
  hd.appendChild(h('span','hb-hint','Star the ones you use most and they move to the front.')); c.appendChild(hd);
  const fav=new Set(ui.fav);
  const list=SYS.filter(s=>s.k!=='team-hq');
  const open=list.filter(s=>canOpen(s.k)), locked=list.filter(s=>!canOpen(s.k));
  const order=a=>a.slice().sort((x,y)=>(fav.has(y.k)-fav.has(x.k)) || x.n.localeCompare(y.n));
  const grid=h('div','hb-grid');
  order(open).forEach(s=>grid.appendChild(tileFor(s, fav)));
  c.appendChild(grid);
  c.appendChild(h('h4','hb-sub','Every Day'));
  const g2=h('div','hb-grid sm'); order(EVERYDAY).forEach(s=>g2.appendChild(tileFor(s, fav))); c.appendChild(g2);
  if(locked.length){ c.appendChild(h('h4','hb-sub','You Don’t Have These Yet'));
    const g3=h('div','hb-grid sm'); locked.forEach(s=>g3.appendChild(tileFor(s, fav, true))); c.appendChild(g3); }
  return c;
}
function tileFor(s, fav, locked){
  const t=h('a','hb-sys'+(locked?' locked':'')); t.style.setProperty('--sc', s.c);
  if(locked){ t.href='#'; t.addEventListener('click', e=>{ e.preventDefault(); window.__ask2 && window.__ask2({kind:'system', t:'Access to '+s.n, why:''}); }); t.title='Ask for access to '+s.n; }
  else { t.href=s.u; t.target='_blank'; t.rel='noopener'; t.title='Open '+s.n; }
  const AB={'summit-hq':'SH','meeting-trackers':'MT','scheduler':'SC','member-360':'360','financials':'$','iif-hq':'IIF','marketing-hq':'MD','elections-hq':'EL','website-migration':'WM','cms':'CMS','so':'SO','sponsorship':'SP','hub':'IH','hub-requests':'WR','glossary':'BG','mismo-link':'LK','qr':'QR','x-mail':'OM','x-cal':'OC','x-teams':'T','x-site':'M','x-gh':'GH'};
  const ic=h('span','ic', AB[s.k] || s.n.slice(0,2)); if((AB[s.k]||'').length>2) ic.style.fontSize='11.5px';
  t.appendChild(ic);
  const tx=h('span','tx'); tx.appendChild(h('b',null,s.n)); tx.appendChild(h('small',null, locked ? 'Ask for access' : s.d)); t.appendChild(tx);
  const f=!locked && figFor(s.k);
  if(f){ const n=h('span','hb-fig'); n.appendChild(h('b',null,String(f.v))); n.appendChild(h('small',null,f.n)); t.appendChild(n); }
  if(!locked){ const on=fav.has(s.k); const st=btn('star'+(on?' on':''), null, e=>{ e.preventDefault(); e.stopPropagation();
      const i=ui.fav.indexOf(s.k); if(i>=0) ui.fav.splice(i,1); else ui.fav.push(s.k); saveUi(); paint(); });
    st.innerHTML=svg('star'); st.title=on?'Unstar':'Star'; st.setAttribute('aria-label', st.title); t.appendChild(st); }
  else { const l=h('span','lk'); l.innerHTML=svg('lock'); t.appendChild(l); }
  return t;
}

/* ---------- Jump To (Ctrl/Cmd+K) ---------- */
let pal=null;
function items(){
  const out=[];
  const tabs=[['today','Today'],['mine','My Board'],['rocks','Team Projects'],['plans','Plans'],['dates','Key Dates'],['findtime','Find a Time'],['agenda','Team Meeting'],['syncs','Sync Ups'],['expenses','Expenses']];
  tabs.forEach(([k,n])=>out.push({g:'Go To', t:n, s:'Team HQ', run:()=>goTab(k)}));
  [['Add a Task','press T',()=>document.getElementById('newtask').click()],['Jot It Down','press N',()=>document.getElementById('jot').click()],
   ['Find a Time','see when people are free',()=>goTab('findtime')],
   ['Schedule a Meeting','opens the Scheduler',()=>window.open('/scheduler/#tab=new','_blank')],
   ['New Team Project','',()=>window.__editRock && window.__editRock()],
   ['Ask for Something','',()=>window.__ask2 && window.__ask2()]].forEach(([t,s,run])=>out.push({g:'Do', t, s, run}));
  SYS.concat(EVERYDAY).filter(s=>s.k!=='team-hq' && canOpen(s.k)).forEach(s=>out.push({g:'Open', t:s.n, s:s.d, run:()=>window.open(s.u,'_blank')}));
  S.rocks.forEach(r=>out.push({g:'Team Projects', t:r.name, s:(r.status||'Active')+(r.lead?' · '+first(r.lead):''), run:()=>{ goTab('rocks'); setTimeout(()=>window.__pv2 && window.__pv2.openPanel(r.id), 80); }}));
  S.tasks.filter(isOpen).forEach(t=>{ const r=rock(t.r); out.push({g:'Tasks', t:t.t, s:doers(t).map(first).join(', ')+(r?' · '+r.name:'')+(t.due?' · '+fmt(t.due):''), mine:doers(t).indexOf(me())>=0, run:()=>editTask(t)}); });
  (S.dates||[]).forEach(d=>out.push({g:'Key Dates', t:d.t, s:(d.d?fmt(d.d)+' · ':'')+(d.k||''), run:()=>window.__editDate && window.__editDate(d)}));
  (S.plans||[]).forEach(p=>out.push({g:'Plans', t:p.title, s:p.kind||'', run:()=>goTab('plans')}));
  return out;
}
function openPal(){
  if(pal) return;
  pal=h('div','hb-pal'); const box=h('div','hb-pbox'); pal.appendChild(box);
  const inp=h('input','hb-pin'); inp.placeholder='Jump to a system, project, task, date — or type what you want to do'; box.appendChild(inp);
  const res=h('div','hb-pres'); box.appendChild(res);
  box.appendChild(h('div','hb-pft','↑ ↓ to move · Enter to open · Esc to close'));
  const all=items(); let sel=0, shown=[];
  const norm=s=>String(s||'').toLowerCase();
  const draw=()=>{ const q=norm(inp.value).trim(), words=q.split(/\s+/).filter(Boolean);
    shown=(q ? all.filter(i=>words.every(w=>norm(i.t+' '+i.s+' '+i.g).indexOf(w)>=0))
             : all.filter(i=>i.g==='Do' || (i.g==='Open' && ui.fav.indexOf((SYS.concat(EVERYDAY).find(s=>s.n===i.t)||{}).k)>=0) || (i.g==='Tasks' && i.mine)))
      .sort((a,b)=>(b.mine?1:0)-(a.mine?1:0) || (norm(a.t).indexOf(q)===0?-1:0)-(norm(b.t).indexOf(q)===0?-1:0)).slice(0,40);
    const G=['Do','Open','Go To','Tasks','Team Projects','Key Dates','Plans']; shown.sort((a,b)=>G.indexOf(a.g)-G.indexOf(b.g));
    sel=Math.min(sel, Math.max(0,shown.length-1)); res.textContent=''; let lg='';
    shown.forEach((i,n)=>{ if(i.g!==lg){ res.appendChild(h('div','hb-pg', i.g==='Tasks' && !q ? 'My Tasks' : i.g)); lg=i.g; }
      const r=btn('hb-pr'+(n===sel?' on':''), null, ()=>run(i)); r.appendChild(h('b',null,i.t)); if(i.s) r.appendChild(h('small',null,i.s));
      r.addEventListener('mousemove', ()=>{ if(sel!==n){ sel=n; draw(); } }); res.appendChild(r); });
    if(!shown.length) res.appendChild(h('div','hb-pg','Nothing matches.'));
    const on=res.querySelector('.on'); on && on.scrollIntoView({block:'nearest'}); };
  const run=i=>{ closePal(); setTimeout(i.run, 10); };
  inp.addEventListener('input', ()=>{ sel=0; draw(); });
  inp.addEventListener('keydown', e=>{ if(e.key==='ArrowDown'){ e.preventDefault(); sel=Math.min(shown.length-1, sel+1); draw(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); sel=Math.max(0, sel-1); draw(); }
    else if(e.key==='Enter'){ e.preventDefault(); shown[sel] && run(shown[sel]); }
    else if(e.key==='Escape'){ e.preventDefault(); closePal(); } });
  pal.addEventListener('mousedown', e=>{ if(e.target===pal) closePal(); });
  document.body.appendChild(pal); draw(); inp.focus();
}
function closePal(){ if(pal){ pal.remove(); pal=null; } }
const onKey=e=>{ if((e.metaKey||e.ctrlKey) && !e.altKey && (e.key==='k'||e.key==='K')){ e.preventDefault(); pal ? closePal() : openPal(); } };
document.addEventListener('keydown', onKey);

/* ---------- styles ---------- */
const css=h('style'); css.id='hb-css'; css.textContent=`
.hb{display:flex;flex-direction:column;gap:16px;margin-bottom:18px;font-variant-numeric:tabular-nums}
.hb .btn{white-space:nowrap;min-width:max-content;text-decoration:none}
.hb-band .tile[aria-pressed="true"]{background:rgba(255,255,255,.18);border-color:var(--sky);box-shadow:inset 0 0 0 1px var(--sky)}
.hb .sect-t{margin:0}
.hb-row{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:16px;align-items:stretch}
@media(max-width:1000px){.hb-row{grid-template-columns:1fr}}
.hb-ch,.hb-dh{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px}
.hb-hint{font-size:12.5px;color:var(--ink-3)}
.hb-empty{margin:0;color:var(--ink-2);font-size:13.5px}
.hb-drill{border-left:3px solid var(--sky)}
.hb-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr));gap:8px}
.hb-task{display:flex;flex-direction:column;gap:5px;text-align:left;padding:9px 11px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--ink-3);border-radius:5px;font:inherit;color:var(--ink);cursor:pointer}
.hb-task:hover{border-color:var(--border-strong);box-shadow:var(--shadow)}
.hb-task.late{border-left-color:var(--bad)}.hb-task.go{border-left-color:var(--c1)}.hb-task.wait{border-left-color:var(--warn)}
.hb-task .tt{font-size:13.5px;font-weight:600;line-height:1.35}
.hb-task .mt{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--ink-2)}
.hb-task .dt{margin-left:auto;font-weight:700;white-space:nowrap}.hb-task .dt.bad{color:var(--bad)}
.hb-day{display:flex;flex-direction:column}
.hb-next{display:flex;flex-direction:column;gap:3px;padding:10px 12px;margin-bottom:12px;background:var(--sky-wash);border:1px solid var(--border);border-left:3px solid var(--c1);border-radius:6px}
.hb-next.on{border-left-color:var(--good)}
.hb-next .lbl{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--c1)}
.hb-next.on .lbl{color:var(--good)}
.hb-next .tt{font-size:15px;font-weight:700;color:var(--ink)}
.hb-next .mt{font-size:12.5px;color:var(--ink-2)}
.hb-strip{--lh:30px;position:relative;height:calc(46px + var(--lanes,1) * var(--lh));background:var(--surface-2);border:1px solid var(--rule);border-radius:6px;overflow:hidden}
.hb-work{position:absolute;top:0;bottom:0;background:var(--surface)}
.hb-gl{position:absolute;top:20px;bottom:0;width:1px;background:var(--rule)}
.hb-hr{position:absolute;top:3px;margin-left:4px;font-size:10.5px;font-weight:600;color:var(--ink-3);white-space:nowrap}
.hb-free{position:absolute;bottom:3px;height:16px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap;font-size:10.5px;font-weight:700;color:var(--good);background:var(--good-soft);border-radius:3px;margin-left:1px}
.hb-ev{position:absolute;height:calc(var(--lh) - 4px);display:flex;align-items:center;padding:0 6px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11.5px;font-weight:600;color:#fff;background:var(--c1);border-radius:4px;border:1px solid rgba(255,255,255,.5);cursor:default}
.hb-ev.tentative{background:repeating-linear-gradient(135deg,var(--info-soft) 0 6px,var(--surface) 6px 12px);color:var(--c1);border:1px dashed var(--c1)}
.hb-ev.oof{background:var(--warn-soft);color:var(--warn);border-color:var(--warn)}
.hb-ev.past{opacity:.45}.hb-ev.now{box-shadow:0 0 0 2px var(--good)}
.hb-now{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--bad);z-index:3}
.hb-agl{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:4px 16px;margin-top:10px}
.hb-ai{display:flex;align-items:baseline;gap:10px;padding:5px 0;border-bottom:1px solid var(--rule);font-size:13px;min-width:0}
.hb-ai .t{flex:0 0 64px;font-weight:700;color:var(--c1);white-space:nowrap}
.hb-ai .n{flex:1;min-width:0;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-ai .d{font-size:11.5px;color:var(--ink-3);white-space:nowrap}
.hb-ai.past{opacity:.5}.hb-ai.now .t{color:var(--good)}
.hb-dfoot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:10px;font-size:12.5px;color:var(--ink-2)}
.hb-out{display:inline-flex;align-items:center;gap:4px;font-weight:600}
.hb-acts .sect-t{margin-bottom:12px}
.hb-bar{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 1px 4px}
.hb-bar::-webkit-scrollbar{display:none}
.hb-qb{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:6px 14px 6px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px;font-weight:700;white-space:nowrap;cursor:pointer;transition:transform .12s,border-color .12s,box-shadow .12s}
.hb-qb:hover{transform:translateY(-1px);border-color:var(--border-strong);box-shadow:0 6px 16px rgba(13,49,76,.10)}
.hb-qb svg{width:26px;height:26px;padding:5px;border-radius:6px;background:var(--surface-3);color:var(--c1);fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hb-qb.pri{background:var(--navy);border-color:var(--navy);color:#fff}
.hb-qb.pri svg{background:rgba(255,255,255,.14);color:#fff}
:root[data-theme="dark"] .hb-qb.pri{background:var(--sky);border-color:var(--sky);color:var(--navy-deep)}
:root[data-theme="dark"] .hb-qb.pri svg{color:var(--navy-deep)}
.hb-jump{margin-left:auto;color:var(--ink-2)}
.hb-jump kbd{font:inherit;font-size:11px;font-weight:700;color:var(--ink-3);background:var(--surface-2);border:1px solid var(--border);border-radius:4px;padding:1px 6px}
.hb-ws{padding:0!important;overflow:hidden}
.hb-tabs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;padding:0 10px;border-bottom:1px solid var(--rule);background:var(--surface-2)}
.hb-tabs::-webkit-scrollbar{display:none}
.hb-tab{position:relative;flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;padding:13px 14px 12px;border:0;background:transparent;color:var(--ink-2);font:inherit;font-size:14px;font-weight:700;white-space:nowrap;cursor:pointer}
.hb-tab:hover{color:var(--ink)}
.hb-tab b{font-size:11px;font-weight:700;color:var(--ink-2);background:var(--surface-3);border-radius:4px;padding:0 6px;line-height:18px}
.hb-tab.on{color:var(--ink)}
.hb-tab.on::after{content:"";position:absolute;left:10px;right:10px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--navy)}
:root[data-theme="dark"] .hb-tab.on::after{background:var(--sky)}
.hb-tab.on b{background:var(--navy);color:#fff}
:root[data-theme="dark"] .hb-tab.on b{background:var(--sky);color:var(--navy-deep)}
.hb-tab.hot b{background:var(--warn);color:#fff}
.hb-wsb{padding:16px 20px 18px;animation:hbIn .22s ease}
@keyframes hbIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.hb-wsb > .box{border:0;padding:0;margin:0;box-shadow:none;background:transparent}
.hb-wsb > .box > .hb-ch,.hb-wsb > .box > .hb-dh{margin:0 0 12px!important;padding:0!important;border:0!important}
.hb-wsb > .box > .hb-ch > .sect-t,.hb-wsb > .box > .hb-dh > .sect-t{display:none}
.hb-wsb > .box > .hb-ch .hb-hint{margin-right:auto}
.hb-wsb > .hb-fy.hot{border-left:0}
.hb-tvh{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px}
.hb-tvh .filterbar{margin:0}
.hb-tadd{margin-left:auto;white-space:nowrap;min-width:max-content}
.hb-empty-ws{padding:6px 0}
@media(max-width:640px){.hb-wsb{padding:12px 12px 14px}.hb-tab{padding:12px 11px 11px;font-size:13px}.hb-jump{margin-left:0}.hb-jump kbd{display:none}.hb-tadd{margin-left:0;width:100%;justify-content:center}}
.hb-fy.hot{border-left:3px solid var(--warn)}
.hb-new{font-size:11.5px;font-weight:700;color:#fff;background:var(--warn);border-radius:4px;padding:1px 8px}
.hb-fyl{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr));gap:8px}
.hb-fyi{position:relative;display:flex;flex-direction:column;gap:5px;text-align:left;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--sc);border-radius:6px;font:inherit;color:var(--ink);cursor:pointer}
.hb-fyi.nudge{cursor:default;padding-right:74px}
.hb-fyi:hover{border-color:var(--border-strong);border-left-color:var(--sc);box-shadow:var(--shadow)}
.hb-fyi .tp{display:flex;align-items:center;gap:8px;min-width:0}
.hb-fyi .tp b{flex:1;min-width:0;font-size:13.5px;line-height:1.35}
.hb-fyi .st{flex:0 0 auto;font-size:11px;font-weight:700;color:#fff;background:var(--sc);border-radius:3px;padding:1px 7px;white-space:nowrap}
.hb-fyi .mt{font-size:12px;color:var(--ink-3)}
.hb-fyi .rp{font-size:12.5px;color:var(--ink-2);background:var(--surface-2);border-radius:4px;padding:6px 8px}
.hb-ok{position:absolute;top:10px;right:10px;padding:4px 10px}
.hb-wk{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
@media(max-width:900px){.hb-wk{grid-auto-flow:column;grid-template-columns:none;grid-auto-columns:minmax(200px,72%);overflow-x:auto;padding-bottom:6px}}
.hb-wd{display:flex;flex-direction:column;min-width:0;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.hb-wdh{display:flex;align-items:baseline;gap:6px;padding:9px 12px;background:var(--surface);border-bottom:1px solid var(--rule)}
.hb-wdh b{font-size:22px;font-weight:700;line-height:1;color:var(--ink)}
.hb-wdh small{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.hb-wd.today .hb-wdh{background:var(--navy);border-color:var(--navy)}
.hb-wd.today .hb-wdh b{color:#fff}.hb-wd.today .hb-wdh small{color:var(--sky)}
:root[data-theme="dark"] .hb-wd.today .hb-wdh{background:var(--sky)}
:root[data-theme="dark"] .hb-wd.today .hb-wdh b,:root[data-theme="dark"] .hb-wd.today .hb-wdh small{color:var(--navy-deep)}
.hb-wdb{display:flex;flex-direction:column;gap:5px;padding:9px 10px;flex:1}
.hb-meter{height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden}
.hb-meter i{display:block;height:100%;background:linear-gradient(90deg,var(--sky),var(--c1));border-radius:3px}
.hb-wds{font-size:11.5px;font-weight:600;color:var(--ink-2);margin-bottom:2px}
.hb-wm{display:flex;gap:6px;align-items:baseline;font-size:12px;min-width:0}
.hb-wm .t{flex:0 0 auto;font-weight:700;color:var(--c1);font-size:11px}
.hb-wm .n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.hb-wm.past{opacity:.5}.hb-wm.tent .n{color:var(--ink-3)}
.hb-more{font-size:11px;color:var(--ink-3);font-weight:600}
.hb-kd,.hb-due{display:block;width:100%;text-align:left;padding:4px 7px;border:0;border-radius:4px;font:inherit;font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.hb-kd{background:color-mix(in srgb,var(--c2) 14%,var(--surface));color:var(--ink);box-shadow:inset 3px 0 0 var(--c2)}
.hb-due{background:var(--surface);color:var(--ink);box-shadow:inset 3px 0 0 var(--c1);border:1px solid var(--border)}
.hb-due.late{background:var(--bad-soft);color:var(--bad);box-shadow:inset 3px 0 0 var(--bad);border-color:transparent}
.hb-hol{padding:6px 8px;border-radius:4px;background:var(--warn-soft);color:var(--warn);font-size:12px;font-weight:700}
.hb-clear{font-size:12px;color:var(--good);font-weight:600}
.hb-wdf{padding:6px 10px;border-top:1px solid var(--rule);font-size:11px;font-weight:700;color:var(--good);background:color-mix(in srgb,var(--good) 7%,var(--surface))}
.hb-pg2{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));gap:10px}
.hb-pc{position:relative;display:flex;flex-direction:column;gap:7px;text-align:left;padding:12px 14px 12px 17px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font:inherit;color:var(--ink);cursor:pointer;overflow:hidden;transition:transform .14s,box-shadow .14s,border-color .14s}
.hb-pc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--rc)}
.hb-pc:hover{transform:translateY(-2px);border-color:var(--rc);box-shadow:0 10px 22px rgba(13,49,76,.12)}
.hb-pc .hd{display:flex;align-items:center;gap:6px;min-width:0}
.hb-pc .hd b{flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-pc .lt{font-size:11px;font-weight:700;color:var(--bad);background:var(--bad-soft);border-radius:3px;padding:0 6px;white-space:nowrap}
.hb-pc .ld{font-size:11px;font-weight:700;color:var(--c1);background:var(--info-soft);border-radius:3px;padding:0 6px;white-space:nowrap}
.hb-pc .br{height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden}
.hb-pc .br i{display:block;height:100%;background:var(--rc)}
.hb-pc .st{font-size:12px;font-weight:600;color:var(--ink-2)}
.hb-pc .nx{font-size:12px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-ag{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hb-a{display:flex;align-items:center;gap:10px;text-align:left;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;font:inherit;color:var(--ink);cursor:pointer;min-width:0}
.hb-a:hover{border-color:var(--border-strong);background:var(--sky-wash)}
.hb-a svg{flex:0 0 auto;width:30px;height:30px;padding:6px;border-radius:5px;background:var(--navy);color:#fff;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
:root[data-theme="dark"] .hb-a svg{background:var(--sky);color:var(--navy-deep)}
.hb-a b{display:block;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-a small{display:block;font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-a span{min-width:0}
.hb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr));gap:10px}
.hb-grid.sm{grid-template-columns:repeat(auto-fill,minmax(min(210px,100%),1fr))}
.hb-sub{margin:16px 0 8px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
.hb-sys{position:relative;display:flex;align-items:center;gap:11px;padding:11px 34px 11px 11px;background:var(--surface);border:1px solid var(--border);border-radius:7px;color:var(--ink);text-decoration:none;transition:transform .12s,box-shadow .12s,border-color .12s;min-width:0}
.hb-sys:hover{transform:translateY(-2px);border-color:var(--sc);box-shadow:0 2px 4px rgba(13,49,76,.08),0 10px 22px rgba(13,49,76,.12)}
.hb-sys .ic{flex:0 0 auto;width:38px;height:38px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:var(--sc);color:#fff;font-weight:700;font-size:14px;letter-spacing:.02em}
.hb-grid.sm .hb-sys .ic{width:32px;height:32px;font-size:12.5px}
.hb-sys .tx{min-width:0;flex:1}
.hb-sys .tx b{display:block;font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-sys .tx small{display:block;font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-sys .hb-fig{flex:0 0 auto;text-align:right;max-width:92px}
.hb-sys .hb-fig b{display:block;font-size:17px;font-weight:700;line-height:1.1;color:var(--ink)}
.hb-sys .hb-fig small{display:block;font-size:10px;line-height:1.2;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-sys .star{position:absolute;top:6px;right:6px;width:24px;height:24px;padding:3px;border:0;background:transparent;color:var(--border-strong);cursor:pointer;border-radius:4px}
.hb-sys .star svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round}
.hb-sys .star:hover{color:var(--warn);background:var(--surface-3)}
.hb-sys .star.on{color:var(--c4)}.hb-sys .star.on svg{fill:currentColor}
.hb-sys.locked{opacity:.6;border-style:dashed}.hb-sys.locked .ic{background:var(--surface-3);color:var(--ink-3)}
.hb-sys .lk{position:absolute;top:9px;right:9px;width:16px;height:16px;color:var(--ink-3)}
.hb-sys .lk svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2}
.hb-pal{position:fixed;inset:0;z-index:200;background:rgba(6,32,47,.45);display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px}
.hb-pbox{width:min(720px,100%);background:var(--surface);border:1px solid var(--border-strong);border-radius:8px;box-shadow:0 20px 60px rgba(6,32,47,.4);overflow:hidden;display:flex;flex-direction:column;max-height:70vh;font-variant-numeric:tabular-nums}
.hb-pin{border:0;border-bottom:1px solid var(--border);padding:16px 18px;font:inherit;font-size:16px;color:var(--ink);background:var(--surface);outline:none}
.hb-pres{overflow:auto;padding:6px}
.hb-pg{padding:10px 10px 4px;font-size:10.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
.hb-pr{display:flex;align-items:baseline;gap:10px;width:100%;text-align:left;padding:8px 10px;border:0;border-radius:4px;background:transparent;font:inherit;color:var(--ink);cursor:pointer}
.hb-pr b{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}
.hb-pr small{font-size:12px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-pr.on{background:var(--sky-wash)}
.hb-pft{padding:8px 14px;border-top:1px solid var(--rule);font-size:11.5px;color:var(--ink-3)}
`;
document.head.appendChild(css);

/* ---------- wiring ---------- */
let mo=null, timer=null;
function paint(){
  if(mo) mo.disconnect();
  const old=root.querySelector(':scope > .hb'); const node=draw();
  if(old) old.remove(); root.insertBefore(node, root.firstChild);
  if(mo) mo.observe(root, {childList:true});
}
mo=new MutationObserver(()=>{ const n=root.querySelector(':scope > .hb'); if(!n || n!==root.firstElementChild) paint(); });
mo.observe(root, {childList:true});
timer=setInterval(()=>{ if(!root.hidden && !document.hidden) paint(); }, 60e3);
let calSig=''; const calSigNow=()=>{ const C=window.__cal && window.__cal.CAL; return C ? Object.keys(C.by||{}).length+':'+(C.at||'') : ''; };
calSig=calSigNow(); const calTimer=setInterval(()=>{ const s=calSigNow(); if(s!==calSig){ calSig=s; paint(); } }, 1500);
paint();
window.__hub={ paint, openPal, closePal, version:'1.0',
  destroy(){ if(mo) mo.disconnect(); mo=null; clearInterval(timer); clearInterval(calTimer); document.removeEventListener('keydown', onKey); closePal(); css.remove(); const n=root.querySelector(':scope > .hb'); n && n.remove(); } };
})();

});
/* ===== findtime.js ===== */
MODS.push(function(){
/* Find a Time — Key Dates' "Who Is Free", rebuilt like the Scheduler's picker:
   a 10-working-day grid coloured from everyone's Outlook (green free, amber
   tentative, red busy), click the start times to offer or press Suggest 5, then a
   Doodle-style table shows who can make each one, with an Outlook invite per time. */
(function(){
'use strict';
if(window.__ft && window.__ft.destroy) window.__ft.destroy();
const S=window.__S, root=document.getElementById('app-dates');
if(!S || !root) return;
const KEY='tools:team-hq:mismo.teamhq.ft';
const st={who:[S.me], dur:30, page:0, subj:''};
try{ Object.assign(st, JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){}
if(!Array.isArray(st.who) || !st.who.length) st.who=[S.me];
const picks=new Set();
const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify({who:st.who, dur:st.dur})); }catch(e){} };

function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function btn(cls, txt, fn){ const b=h('button', cls, txt); b.type='button'; if(fn) b.addEventListener('click', fn); return b; }
const person=id=>S.people.find(p=>p.id===id);
const first=id=>{ const p=person(id); return p ? p.name.split(' ')[0] : id; };
function av(id, size){ const p=person(id), a=h('span','av'); if(!p) return a; a.textContent=p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join(''); a.style.background='var(--c'+(((p.color||0)%7)+1)+')'; if(size){ a.style.width=a.style.height=size+'px'; a.style.fontSize=Math.round(size*.42)+'px'; } return a; }
const email=id=>{ const p=person(id); if(!p) return ''; if(p.email) return p.email; const n=p.name.toLowerCase().split(/\s+/); return n[0][0]+n[n.length-1]+'@mismo.org'; };
const ET='America/New_York';
const etParts=ms=>{ const o={}; new Intl.DateTimeFormat('en-US',{timeZone:ET, year:'numeric', month:'2-digit', day:'2-digit', hour:'numeric', minute:'2-digit', hourCycle:'h23', weekday:'short'}).formatToParts(ms).forEach(p=>o[p.type]=p.value); return o; };
function etAt(y, m, d, hr, mi){ let t=Date.UTC(y, m, d, hr+5, mi||0); const p=etParts(t); t+=((hr*60+(mi||0))-(+p.hour*60+ +p.minute))*60e3; return t; }
const localIsET=(()=>{ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone===ET; }catch(e){ return false; } })();
const tmL=ms=>new Date(ms).toLocaleTimeString('en-US',{hour:'numeric', minute:'2-digit'}).replace(':00','');
const tmE=ms=>new Intl.DateTimeFormat('en-US',{timeZone:ET, hour:'numeric', minute:'2-digit'}).format(ms).replace(':00','');
const dayL=ms=>new Date(ms).toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric'});
const range=(s,e)=>tmL(s)+'–'+tmL(e)+(localIsET?'':' ('+tmE(s)+'–'+tmE(e)+' ET)');

/* ---------- calendars ---------- */
function cal(id){ const by=(window.__cal && window.__cal.CAL && window.__cal.CAL.by)||{}; const ev=by[id]; return Array.isArray(ev) ? ev : null; }
const coverEnd={};
function covered(id, s){ const ev=cal(id); if(!ev || !ev.length) return false; if(!(id in coverEnd)) coverEnd[id]=Math.max(...ev.map(e=>e.e)); return s < coverEnd[id]; }
function pstate(id, s, e){ /* 'free' | 'tent' | 'busy' | 'unk' */
  const ev=cal(id); if(!ev || !covered(id, s)) return 'unk';
  let tent=false;
  for(const x of ev){ if(x.e<=s || x.s>=e || x.show==='free') continue; if(x.show==='tentative'){ tent=true; continue; } return 'busy'; }
  return tent ? 'tent' : 'free'; }
function slot(s){
  const e=s+st.dur*60e3, busy=[], tent=[], unk=[];
  st.who.forEach(id=>{ const k=pstate(id, s, e); if(k==='busy') busy.push(id); else if(k==='tent') tent.push(id); else if(k==='unk') unk.push(id); });
  if(busy.length) return {c:'busy', n: busy.length===1 ? first(busy[0]) : busy.length+' busy', t:'Busy: '+busy.map(first).join(', ')};
  if(unk.length===st.who.length) return {c:'unk', n:'', t:'No Outlook to check'};
  if(tent.length) return {c:'some', n:'tentative', t:'Tentative: '+tent.map(first).join(', ')+(unk.length?' · can’t see '+unk.map(first).join(', '):'')};
  return {c:'free', n:'', t: unk.length ? 'Free · can’t see '+unk.map(first).join(', ') : 'Everyone free'};
}
function holiday(d){ try{ const t=window.__t; if(!t || !t.holidayOn) return ''; const r=t.holidayOn(d); return r ? (typeof r==='string' ? r : (r.n||r.t||r.name||'Holiday')) : ''; }catch(e){ return ''; } }
function days(){ /* 10 working days, starting today if there is time left today (Eastern) */
  const out=[]; const now=Date.now(); let p=etParts(now); let y=+p.year, m=+p.month-1, d=+p.day;
  if(etAt(y,m,d,17,0)-st.dur*60e3 <= now) d++;
  let skip=st.page*10;
  for(let i=0; out.length<10 && i<60; i++){ const dt=new Date(Date.UTC(y,m,d+i,12)); const wd=dt.getUTCDay(); if(wd===0||wd===6) continue;
    if(skip>0){ skip--; continue; } out.push({y:dt.getUTCFullYear(), m:dt.getUTCMonth(), d:dt.getUTCDate(), noon:etAt(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0)}); }
  return out; }
function rows(){ const r=[]; for(let mi=9*60; mi+st.dur<=17*60; mi+=30) r.push(mi); return r; }

/* ---------- draw ---------- */
let host=null;
function draw(){
  const w=h('div','ft');
  w.appendChild(setup());
  w.appendChild(grid());
  w.appendChild(doodle());
  return w;
}
function setup(){
  const c=h('div','box ft-setup');
  c.appendChild(h('h3','sect-t','Who and How Long'));
  const r1=h('div','ft-row'); r1.appendChild(h('span','ft-lbl','Who Needs to Be There'));
  const ch=h('div','ft-chips');
  S.people.slice().sort((a,b)=>(a.ord||0)-(b.ord||0)).forEach(p=>{
    const on=st.who.indexOf(p.id)>=0, b=btn('ft-chip'+(on?' on':''), null, ()=>{ const i=st.who.indexOf(p.id); if(i>=0){ if(st.who.length>1) st.who.splice(i,1); } else st.who.push(p.id); save(); paint(); });
    b.appendChild(av(p.id,22)); b.appendChild(h('span',null, p.name.split(' ')[0]+(p.id===S.me?' (Me)':'')));
    if(!cal(p.id)) { b.appendChild(h('small',null,'no Outlook')); }
    b.setAttribute('aria-pressed', String(on)); ch.appendChild(b); });
  const all=btn('ft-chip ghost','Whole Team', ()=>{ st.who=S.people.map(p=>p.id); save(); paint(); }); ch.appendChild(all);
  r1.appendChild(ch); c.appendChild(r1);
  const r2=h('div','ft-row two');
  const a=h('div'); a.appendChild(h('span','ft-lbl','How Long'));
  const seg=h('div','filterbar ft-seg');
  [[15,'15 Min'],[30,'30 Min'],[45,'45 Min'],[60,'1 Hour'],[90,'1½ Hours'],[120,'2 Hours']].forEach(([v,l])=>{ const b=btn('pill', l, ()=>{ st.dur=v; picks.clear(); save(); paint(); }); b.setAttribute('aria-pressed', String(st.dur===v)); seg.appendChild(b); });
  a.appendChild(seg); r2.appendChild(a);
  const b2=h('div'); b2.appendChild(h('span','ft-lbl','What It’s For'));
  const inp=h('input','ft-in'); inp.placeholder='Becomes the subject of the Outlook invite'; inp.value=st.subj; inp.addEventListener('input', ()=>{ st.subj=inp.value; }); b2.appendChild(inp);
  r2.appendChild(b2); c.appendChild(r2);
  return c;
}
function grid(){
  const c=h('div','box ft-gridbox');
  const ds=days(), rs=rows();
  const top=h('div','ft-top');
  top.appendChild(btn('btn ghost','← Earlier', ()=>{ if(st.page>0){ st.page--; paint(); } }));
  top.lastChild.disabled=st.page===0;
  top.appendChild(btn('btn ghost','Later →', ()=>{ st.page++; paint(); }));
  const sug=btn('btn', null, suggest); sug.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg><span>Suggest 5 Good Times</span>'; top.appendChild(sug);
  if(picks.size) top.appendChild(btn('btn ghost','Clear', ()=>{ picks.clear(); paint(); }));
  top.appendChild(h('span','ft-range', dayL(ds[0].noon)+' – '+dayL(ds[ds.length-1].noon)));
  const lg=h('span','ft-legend');
  [['free','Everyone free'],['some','Tentative'],['busy','Busy'],['unk','Can’t see'],['on','Picked']].forEach(([k,l])=>{ const i=h('span','li'); i.appendChild(h('i','s-'+k)); i.append(l); lg.appendChild(i); });
  top.appendChild(lg);
  c.appendChild(top);
  c.appendChild(h('p','ft-note', 'Click the start times you want to offer — three to six is plenty. '+(localIsET ? 'Times are Eastern.' : 'Times are in your time, Eastern in brackets.')));
  const wrap=h('div','ft-wrap'), t=h('table','ft-tp'); wrap.appendChild(t);
  const thd=h('thead'), tr=h('tr'); tr.appendChild(h('th'));
  ds.forEach(d=>{ const th=h('th'); th.appendChild(h('b',null, new Date(d.noon).toLocaleDateString('en-US',{weekday:'short'}))); th.appendChild(h('span',null, new Date(d.noon).toLocaleDateString('en-US',{month:'short', day:'numeric'})));
    const hol=holiday(new Date(d.y,d.m,d.d)); if(hol){ th.classList.add('hol'); th.appendChild(h('small',null,hol)); } tr.appendChild(th); });
  thd.appendChild(tr); t.appendChild(thd);
  const tb=h('tbody'); const now=Date.now();
  const cover=new Set(); picks.forEach(p=>{ for(let x=p+30*60e3; x<p+st.dur*60e3; x+=30*60e3) cover.add(x); });
  rs.forEach(mi=>{
    const r=h('tr'); const s0=etAt(ds[0].y, ds[0].m, ds[0].d, Math.floor(mi/60), mi%60);
    const lab=h('td','tl'); lab.appendChild(h('b',null, tmL(s0))); if(!localIsET) lab.appendChild(h('small',null, tmE(s0)+' ET')); r.appendChild(lab);
    ds.forEach(d=>{ const s=etAt(d.y, d.m, d.d, Math.floor(mi/60), mi%60), td=h('td');
      const hol=holiday(new Date(d.y,d.m,d.d));
      if(s<now || hol){ td.appendChild(h('span','slot s-past', hol ? '' : '')); r.appendChild(td); return; }
      const k=slot(s), on=picks.has(s), inn=cover.has(s);
      const b=btn('slot s-'+k.c+(on?' s-on':'')+(inn?' s-in':''), on ? '✓ '+tmL(s) : k.n, ()=>{ on ? picks.delete(s) : picks.add(s); paint(); });
      b.title=dayL(s)+' · '+range(s, s+st.dur*60e3)+'\n'+k.t; td.appendChild(b); r.appendChild(td); });
    tb.appendChild(r); });
  t.appendChild(tb);
  c.appendChild(wrap);
  return c;
}
function suggest(){
  picks.clear(); const ds=days(), pref=[600, 660, 780, 840, 570, 630, 690, 810, 870, 900, 540, 720, 750, 930];
  const now=Date.now();
  for(const d of ds){ if(picks.size>=5) break; if(holiday(new Date(d.y,d.m,d.d))) continue;
    for(const mi of pref){ if(mi+st.dur>17*60) continue; const s=etAt(d.y,d.m,d.d,Math.floor(mi/60),mi%60); if(s<now) continue; if(slot(s).c==='free'){ picks.add(s); break; } } }
  paint();
}
function doodle(){
  const c=h('div','box ft-doodle');
  const P=[...picks].sort((a,b)=>a-b);
  const hd=h('div','ft-dh'); hd.appendChild(h('h3','sect-t','Who Can Make It'));
  if(P.length){ const r=h('div','rowflex');
    r.appendChild(btn('btn ghost','Copy These Times', copyTimes));
    const sc=h('a','btn'); sc.href='/scheduler/#tab=new'; sc.target='_blank'; sc.rel='noopener'; sc.textContent='People Outside MISMO? Use the Scheduler';
    sc.addEventListener('click', ()=>copyTimes(true)); r.appendChild(sc); hd.appendChild(r); }
  c.appendChild(hd);
  if(!P.length){ c.appendChild(h('p','ft-note','Pick some times above, or press Suggest 5 Good Times, and this fills in like a Doodle poll — each person, each time, who can make it.')); return c; }
  const wrap=h('div','ft-dwrap'), t=h('table','ft-dt'); wrap.appendChild(t);
  const thd=h('thead'), tr=h('tr'); tr.appendChild(h('th','nm',''));
  const score=P.map(s=>st.who.filter(id=>pstate(id,s,s+st.dur*60e3)==='free').length);
  const best=Math.max(...score);
  P.forEach((s,i)=>{ const th=h('th', score[i]===best ? 'best' : null);
    th.appendChild(h('span','d', new Date(s).toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric'})));
    th.appendChild(h('b',null, tmL(s))); if(!localIsET) th.appendChild(h('small',null, tmE(s)+' ET'));
    const x=btn('ft-x','×', ()=>{ picks.delete(s); paint(); }); x.title='Remove this time'; th.appendChild(x);
    tr.appendChild(th); });
  thd.appendChild(tr); t.appendChild(thd);
  const tb=h('tbody');
  st.who.forEach(id=>{ const r=h('tr'); const n=h('td','nm'), nw=h('div','nmw'); nw.appendChild(av(id,24)); nw.appendChild(h('span',null, person(id) ? person(id).name : id)); n.appendChild(nw); r.appendChild(n);
    P.forEach(s=>{ const k=pstate(id, s, s+st.dur*60e3); const td=h('td','v-'+k);
      td.appendChild(h('span','mk', {free:'✓', tent:'?', busy:'✕', unk:'–'}[k])); td.title={free:'Free', tent:'Tentative', busy:'Busy', unk:'Can’t see their Outlook'}[k]; r.appendChild(td); });
    tb.appendChild(r); });
  t.appendChild(tb);
  const tf=h('tfoot'), fr=h('tr'); fr.appendChild(h('td','nm','Can Make It'));
  P.forEach((s,i)=>{ const td=h('td', score[i]===best ? 'best' : null); td.appendChild(h('b',null, score[i]+' of '+st.who.length));
    const a=h('a','btn'+(score[i]===best?'':' ghost'), 'Send Invite'); a.href=invite(s); a.target='_blank'; a.rel='noopener'; a.title='Opens a new Outlook invite with everyone on it';
    td.appendChild(a); fr.appendChild(td); });
  tf.appendChild(fr); t.appendChild(tf);
  c.appendChild(wrap);
  return c;
}
function invite(s){
  const e=s+st.dur*60e3, to=st.who.filter(id=>id!==S.me).map(email).filter(Boolean).join(',');
  const q=new URLSearchParams({path:'/calendar/action/compose', rru:'addevent', subject: st.subj || 'MISMO Meeting', startdt:new Date(s).toISOString(), enddt:new Date(e).toISOString(), to, online:'true'});
  return 'https://outlook.office.com/calendar/0/deeplink/compose?'+q.toString();
}
function copyTimes(quiet){
  const P=[...picks].sort((a,b)=>a-b);
  const txt=P.map(s=>'• '+new Date(s).toLocaleDateString('en-US',{weekday:'long', month:'long', day:'numeric'})+', '+tmE(s)+'–'+tmE(s+st.dur*60e3)+' ET').join('\n');
  try{ navigator.clipboard.writeText(txt).then(()=>flash(quiet===true ? 'Times copied — paste them into the Scheduler.' : 'Copied '+P.length+' times, ready to paste.')); }catch(e){}
}
function flash(msg){ const t=h('div','ft-toast', msg); document.body.appendChild(t); setTimeout(()=>t.remove(), 4000); }

/* ---------- styles ---------- */
const css=h('style'); css.id='ft-css'; css.textContent=`
div.ft{display:flex;flex-direction:column;gap:16px;margin-top:18px;font-variant-numeric:tabular-nums;
  --free:#d9efe5;--some:#fbecc9;--busy:#f3d6d2;--unk:#eef3f7;--pick:#0d314c;--pick-ink:#fff}
:root[data-theme="dark"] div.ft{--free:#16463a;--some:#4a3b17;--busy:#4b2422;--unk:#173547;--pick:#74bfeb;--pick-ink:#06202f}
.ft .btn{white-space:nowrap;min-width:max-content;text-decoration:none}
.ft-row{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
.ft-row.two{display:grid;grid-template-columns:auto minmax(240px,1fr);gap:16px;align-items:end;margin-bottom:0}
@media(max-width:760px){.ft-row.two{grid-template-columns:1fr}}
.ft-lbl{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
.ft-chips{display:flex;flex-wrap:wrap;gap:8px}
.ft-chip{display:inline-flex;align-items:center;gap:7px;padding:4px 11px 4px 5px;min-height:34px;border:1px solid var(--border);background:var(--surface);border-radius:4px;font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;white-space:nowrap}
.ft-chip small{font-size:10.5px;color:var(--ink-3);font-weight:600}
.ft-chip.ghost{padding:4px 12px;color:var(--ink-2);border-style:dashed}
.ft-chip.on{border-color:var(--navy);background:var(--sky-wash);box-shadow:inset 0 0 0 1px var(--navy)}
:root[data-theme="dark"] .ft-chip.on{border-color:var(--sky);box-shadow:inset 0 0 0 1px var(--sky)}
.ft-seg{margin:0}
.ft-in{width:100%;min-height:36px;padding:7px 10px;border:1px solid var(--border-strong);border-radius:4px;background:var(--surface);color:var(--ink);font:inherit;font-size:13.5px}
.ft-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-bottom:8px}
.ft-range{font-size:13px;font-weight:700;color:var(--ink)}
.ft-legend{margin-left:auto;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--ink-2)}
.ft-legend .li{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.ft-legend i{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid var(--border)}
.ft-note{margin:0 0 10px;font-size:12.5px;color:var(--ink-3)}
.ft-wrap{overflow:auto;max-height:min(62vh,640px);border:1px solid var(--border);border-radius:8px}
.ft-tp{border-collapse:separate;border-spacing:0;width:100%;font-size:12px}
.ft-tp th{position:sticky;top:0;z-index:2;background:var(--surface-2);padding:6px 4px;border-bottom:1px solid var(--border);min-width:84px;font-weight:600;color:var(--ink-2)}
.ft-tp th b{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.ft-tp th span{display:block;font-size:13px;font-weight:700;color:var(--ink)}
.ft-tp th small{display:block;font-size:10.5px;color:var(--warn)}
.ft-tp th:first-child,.ft-tp td.tl{position:sticky;left:0;z-index:3;background:var(--surface);min-width:70px;text-align:right;padding:0 8px 0 6px}
.ft-tp th:first-child{z-index:4;background:var(--surface-2)}
.ft-tp td{padding:1px 2px;border-bottom:1px solid var(--rule)}
.ft-tp td.tl b{display:block;font-size:11.5px;font-weight:600;color:var(--ink-2);white-space:nowrap}
.ft-tp td.tl small{display:block;font-size:10px;color:var(--ink-3);white-space:nowrap}
.slot{appearance:none;display:block;width:100%;height:26px;border:1px solid transparent;border-radius:4px;padding:0 4px;text-align:left;font:inherit;font-size:10.5px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer;transition:transform .08s}
.slot:hover{transform:scale(1.04);border-color:var(--border-strong);position:relative;z-index:1}
.s-free{background:var(--free);color:var(--good)}
.s-some{background:var(--some);color:var(--warn)}
.s-busy{background:var(--busy);color:var(--bad)}
.s-unk{background:var(--unk);color:var(--ink-3)}
.s-past{background:repeating-linear-gradient(135deg,transparent 0 5px,var(--rule) 5px 6px);cursor:default}
.s-past:hover{transform:none;border-color:transparent}
.s-on{background:var(--pick)!important;color:var(--pick-ink)!important;border-color:var(--pick)}
.s-in{background:color-mix(in srgb,var(--pick) 55%,transparent)!important;color:var(--pick-ink)!important}
.ft-legend i.s-on{background:var(--pick)}
.ft-dh{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:-18px -20px 14px;padding:10px 20px;border-bottom:1px solid var(--rule)}
.ft-dh .sect-t{margin:0;font-size:15.5px;font-weight:700;text-transform:none;letter-spacing:-.012em;color:var(--ink)}
.ft-dwrap{overflow-x:auto}
.ft-dt{border-collapse:separate;border-spacing:0;min-width:100%}
.ft-dt th,.ft-dt td{padding:8px 10px;text-align:center;border-bottom:1px solid var(--rule)}
.ft-dt th{position:relative;min-width:120px;background:var(--surface-2);border-bottom:1px solid var(--border);vertical-align:bottom}
.ft-dt th .d{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.ft-dt th b{display:block;font-size:16px;color:var(--ink)}
.ft-dt th small{display:block;font-size:11px;color:var(--ink-3)}
.ft-dt th.best,.ft-dt td.best{background:color-mix(in srgb,var(--good) 10%,var(--surface))}
.ft-dt th.best::before{content:"Best";position:absolute;top:4px;left:6px;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--good)}
.ft-x{position:absolute;top:2px;right:4px;border:0;background:transparent;color:var(--ink-3);font-size:16px;line-height:1;cursor:pointer;padding:2px 4px;border-radius:3px}
.ft-x:hover{color:var(--bad);background:var(--surface-3)}
.ft-dt .nm{text-align:left;white-space:nowrap;font-weight:600;font-size:13.5px;color:var(--ink);position:sticky;left:0;background:var(--surface);z-index:1}
.ft-dt .nmw{display:flex;align-items:center;gap:9px}
.ft-dt td .mk{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:5px;font-size:15px;font-weight:700}
.v-free .mk{background:var(--free);color:var(--good)}
.v-tent .mk{background:var(--some);color:var(--warn)}
.v-busy .mk{background:var(--busy);color:var(--bad)}
.v-unk .mk{background:var(--unk);color:var(--ink-3)}
.ft-dt tfoot td{border-bottom:0;padding-top:12px}
.ft-dt tfoot td b{display:block;margin-bottom:8px;font-size:13px;color:var(--ink)}
.ft-dt tfoot .nm{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.ft-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:300;padding:10px 16px;background:var(--navy);color:#fff;border-radius:6px;box-shadow:0 10px 30px rgba(6,32,47,.35);font-size:13.5px;font-weight:600}
`;
document.head.appendChild(css);

/* ---------- wiring: Find a Time is its own tab, next to Key Dates ---------- */
const dates=root;
let sec=document.getElementById('app-findtime');
if(!sec){ sec=document.createElement('section'); sec.className='view'; sec.id='app-findtime'; sec.hidden=true; dates.after(sec); }
let nav=document.querySelector('.hq nav button[data-hq="findtime"]');
if(!nav){ const dn=document.querySelector('.hq nav button[data-hq="dates"]');
  nav=document.createElement('button'); nav.type='button'; nav.dataset.hq='findtime'; nav.title='Find a Time';
  nav.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2M9 2h6"></path></svg><span>Find a Time</span>';
  if(dn) dn.after(nav); }
const goFt=()=>{ window.__show && window.__show('findtime'); };
nav.addEventListener('click', goFt);
function head(){
  const v=h('div','vhead'); const g=h('div','grow'); g.appendChild(h('h1',null,'Find a Time'));
  g.appendChild(h('p',null,'Everyone’s Outlook side by side. Pick the times that work, see who can make each one, send the invite.')); v.appendChild(g);
  const r=h('div','rowflex'); const a=h('a','btn ghost'); a.href='/scheduler/#tab=new'; a.target='_blank'; a.rel='noopener'; a.textContent='Open the Scheduler'; r.appendChild(a); v.appendChild(r);
  return v; }
function paint(){
  const sy=window.scrollY; sec.textContent=''; sec.appendChild(head()); sec.appendChild(draw());
  if(!sec.hidden) window.scrollTo(0, sy);
}
/* Key Dates keeps The List and The Month; Who Is Free moved here */
let mo=null;
function tidyDates(){
  if(mo) mo.disconnect();
  if(S.dateView==='free'){ S.dateView='list'; setTimeout(()=>{ if(S.tab==='dates' && window.__show) window.__show('dates'); }, 0); }
  [...dates.querySelectorAll(':scope > .vhead button')].forEach(b=>{ if(b.textContent.trim()==='Who Is Free'){ b.hidden=true; } });
  if(!dates.querySelector(':scope > .vhead .ft-jump')){ const rf=dates.querySelector(':scope > .vhead .rowflex'); if(rf){ const j=h('button','btn ghost ft-jump'); j.type='button'; j.innerHTML='<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg><span>Find a Time</span>'; j.addEventListener('click', goFt); rf.insertBefore(j, rf.firstChild); } }
  if(mo) mo.observe(dates, {childList:true});
}
mo=new MutationObserver(tidyDates);
mo.observe(dates, {childList:true});
tidyDates();
const vis=new MutationObserver(()=>{ if(!sec.hidden && !sec.querySelector('.ft')) paint(); });
vis.observe(sec, {attributes:true, attributeFilter:['hidden']});
paint();
let calSig=''; const calSigNow=()=>{ const C=window.__cal && window.__cal.CAL; return C ? Object.keys(C.by||{}).length+':'+(C.at||'') : ''; };
calSig=calSigNow(); const calTimer=setInterval(()=>{ const s=calSigNow(); if(s!==calSig){ calSig=s; for(const k in coverEnd) delete coverEnd[k]; paint(); } }, 1500);
window.__ft={ paint, open:goFt, version:'2.0', destroy(){ if(mo) mo.disconnect(); mo=null; vis.disconnect(); clearInterval(calTimer); css.remove(); nav.removeEventListener('click', goFt); } };
})();

});
/* ===== plans-v2.js ===== */
MODS.push(function(){
/* Plans v2 — the Plans list as a visual page: a navy band with where every plan
   stands, and a rich card per plan (progress ring, phase timeline with today on it,
   what's behind, what's next, who's on it). Opening a plan still uses the app's own
   plan view, and an item opens in the app's own item panel. */
(function(){
'use strict';
if(window.__plv2 && window.__plv2.destroy) window.__plv2.destroy();
const S=window.__S, root=document.getElementById('app-plans');
if(!S || !root) return;

function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function btn(cls, txt, fn){ const b=h('button', cls, txt); b.type='button'; if(fn) b.addEventListener('click', fn); return b; }
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WDL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const today=()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
const pd=s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); return m ? new Date(+m[1], m[2]-1, +m[3]) : null; };
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const days=s=>{ const d=pd(s); return d ? Math.round((d-today())/864e5) : null; };
const fmt=s=>{ const d=pd(s); return d ? MON[d.getMonth()]+' '+d.getDate() : ''; };
const num=v=>v!==null && v!=='' && v!==undefined && !isNaN(+v);
const person=id=>S.people.find(p=>p.id===id);
const first=id=>{ const p=person(id); return p ? p.name.split(' ')[0] : ''; };
function av(id, size){ const p=person(id), a=h('span','av'); if(!p) return a; a.textContent=p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join(''); a.style.background='var(--c'+(((p.color||0)%7)+1)+')'; a.title=p.name; if(size){ a.style.width=a.style.height=size+'px'; a.style.fontSize=Math.round(size*.42)+'px'; } return a; }
const cvar=n=>'var(--c'+(((n||0)%7)+1)+')';

/* ---------- the same rules the plan view uses ---------- */
const secOf=(p,id)=>(p.secs||[]).find(s=>s.id===id)||null;
const items=p=>(S.planitems||[]).filter(x=>x.plan===p.id && x.s!=='Not Needed');
const task=it=>it && it.task ? S.tasks.find(t=>t.id===it.task)||null : null;
const status=it=>{ const t=task(it); if(t) return t.s==='Done' ? 'Done' : (/^waiting/i.test(t.s||'') ? 'Waiting on Someone' : t.s||'Not Started'); return it.s||'Not Started'; };
const done=it=>status(it)==='Done';
function addWork(d, n){ const x=new Date(d); let k=0; while(k<n-1){ x.setDate(x.getDate()+1); const w=x.getDay(); if(w!==0 && w!==6) k++; } return x; }
function dayNo(it,p){ if(num(it.day)) return +it.day; const s=secOf(p,it.sec); return s && num(s.to) ? +s.to : null; }
function due(it,p){ if(it.date) return it.date; const st=pd(p.start); if(!st) return '';
  if(num(it.wd)) return iso(addWork(st, +it.wd)); const n=dayNo(it,p); if(n===null) return '';
  const d=new Date(st); d.setDate(d.getDate()+(n<=0 ? -1 : n-1)); return iso(d); }
const behind=(it,p)=>{ if(done(it)) return false; const d=due(it,p); return !!d && days(d)<0; };
const soon=(it,p)=>{ if(done(it)) return false; const d=due(it,p); const n=d ? days(d) : null; return n!==null && n>=0 && n<=14; };
function planDay(p){ const st=pd(p.start); if(!st) return null; return Math.round((today()-st)/864e5)+1; }
function planLen(p){ const t=(p.secs||[]).filter(s=>num(s.to)).map(s=>+s.to); return t.length ? Math.max(...t) : null; }
function stats(p){ const L=items(p), d=L.filter(done).length;
  return { L, total:L.length, done:d, pct:L.length ? Math.round(d/L.length*100) : 0,
    behind:L.filter(i=>behind(i,p)), soon:L.filter(i=>soon(i,p)), prog:L.filter(i=>!done(i) && status(i)==='In Progress') }; }
function nextUp(p, L){
  return L.filter(i=>!done(i)).map(i=>({i, d:due(i,p)})).sort((a,b)=>{
    const ba=a.d && days(a.d)<0 ? 0 : 1, bb=b.d && days(b.d)<0 ? 0 : 1; if(ba!==bb) return ba-bb;
    const x=a.d||'9999', y=b.d||'9999'; if(x!==y) return x<y?-1:1;
    const pa=status(a.i)==='In Progress'?0:1, pb=status(b.i)==='In Progress'?0:1; if(pa!==pb) return pa-pb;
    return (a.i.ord||0)-(b.i.ord||0); }).map(x=>x.i); }
function dueLabel(it,p){ const d=due(it,p); if(!d) return {t:'No date', k:'faint'}; const n=days(d);
  if(done(it)) return {t:fmt(d), k:''}; if(n<0) return {t:(-n)+(n===-1?' day late':' days late'), k:'bad'}; if(n===0) return {t:'Today', k:'warn'}; if(n<=7) return {t:fmt(d), k:'warn'}; return {t:fmt(d), k:''}; }
const openPlan=id=>{ S.planOpen=id; window.__show && window.__show('plans'); window.scrollTo(0,0); };
const openItem=(p,it)=>{ window.__itemPanel && window.__itemPanel(p.id, it.id); };

/* ---------- pieces ---------- */
function ring(pct, color){
  const r=26, c=2*Math.PI*r, w=h('div','pl-ring');
  w.innerHTML='<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="'+r+'" class="tr"/><circle cx="32" cy="32" r="'+r+'" class="pg" stroke-dasharray="'+(c*pct/100).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 32 32)"/></svg>';
  w.querySelector('.pg').style.stroke=color; w.appendChild(h('b',null,pct+'%')); return w; }
function phases(p){
  const ss=(p.secs||[]).filter(s=>num(s.from) && num(s.to) && +s.to>=1);
  /* the broad phases: drop windows that sit inside a wider one (Week 1 inside Days 1–30) */
  return ss.filter(s=>!ss.some(o=>o!==s && +o.from<=+s.from && +o.to>=+s.to && (+o.to-+o.from)>(+s.to-+s.from))).sort((a,b)=>+a.from-+b.from); }
function timeline(p, L){
  const ph=phases(p), len=planLen(p), n=planDay(p);
  if(!ph.length || !len) return null;
  const w=h('div','pl-tl'), bar=h('div','pl-tlb');
  ph.forEach(s=>{ const its=L.filter(i=>i.sec===s.id), d=its.filter(done).length, late=its.some(i=>behind(i,p));
    const seg=h('div','pl-seg'+(late?' late':'')+(n!==null && n>=+s.from && n<=+s.to ? ' now':''));
    seg.style.left=((+s.from-1)/len*100)+'%'; seg.style.width=((+s.to-+s.from+1)/len*100)+'%';
    const fill=h('i'); fill.style.width=(its.length ? d/its.length*100 : 0)+'%'; seg.appendChild(fill);
    seg.appendChild(h('span',null, s.name.replace(/^Days?\s[\d–-]+:\s*/,'')));
    seg.title=s.name+' — '+d+' of '+its.length+' done'; bar.appendChild(seg); });
  if(n!==null && n>=1 && n<=len){ const m=h('i','pl-now'); m.style.left=((n-.5)/len*100)+'%'; m.appendChild(h('b',null,'Day '+n)); bar.appendChild(m); }
  w.appendChild(bar);
  const sc=h('div','pl-scale'); [1, Math.round(len/3), Math.round(len*2/3), len].forEach(k=>{ const t=h('span',null,'Day '+k); t.style.left=((k-1)/len*100)+'%'; sc.appendChild(t); }); w.appendChild(sc);
  return w; }
function sections(p, L){
  const w=h('div','pl-secs');
  (p.secs||[]).map(s=>({s, its:L.filter(i=>i.sec===s.id)})).filter(x=>x.its.length)
    .sort((a,b)=>{ const oa=a.its.filter(i=>!done(i)).length, ob=b.its.filter(i=>!done(i)).length; return (ob>0)-(oa>0) || a.s.name.localeCompare(b.s.name); })
    .slice(0,8).forEach(({s,its})=>{ const d=its.filter(done).length, late=its.some(i=>behind(i,p));
      const r=h('div','pl-sec'+(d===its.length?' done':'')+(late?' late':'')); r.title=s.name+' — '+d+' of '+its.length+' done';
      r.appendChild(h('span','n', s.name)); const b=h('span','b'); const f=h('i'); f.style.width=(d/its.length*100)+'%'; b.appendChild(f); r.appendChild(b);
      r.appendChild(h('span','c', d+'/'+its.length)); w.appendChild(r); });
  return w; }

function card(p){
  const st=stats(p), col=cvar(p.color), c=h('div','pl-card'); c.style.setProperty('--rc', col);
  c.tabIndex=0; c.setAttribute('role','button');
  c.addEventListener('click', ()=>openPlan(p.id)); c.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); openPlan(p.id); } });
  const top=h('div','pl-top');
  const tx=h('div','pl-tx'); tx.appendChild(h('h3',null, p.title||'Untitled Plan'));
  const tg=h('div','pl-tags');
  tg.appendChild(h('span','pv2-tag '+((p.status||'Active')==='Active'?'info':(p.status==='Done'?'good':'')), p.status||'Active'));
  tg.appendChild(h('span','pv2-tag', p.kind||'Plan'));
  if(p.who){ const f=h('span','pv2-tag pl-for'); f.appendChild(av(p.who,16)); f.append('For '+first(p.who)); tg.appendChild(f); }
  if(st.behind.length) tg.appendChild(h('span','pv2-tag bad', st.behind.length+' Behind'));
  else if(st.total && st.done<st.total) tg.appendChild(h('span','pv2-tag good','On Track'));
  tx.appendChild(tg);
  const n=planDay(p), len=planLen(p);
  tx.appendChild(h('div','pl-meta', (n===null ? 'No start date yet' : n<1 ? 'Starts '+fmt(p.start) : 'Day '+n+(len ? ' of '+len : ''))+(p.owner ? ' · run by '+first(p.owner) : '')));
  top.appendChild(tx); top.appendChild(ring(st.pct, col)); c.appendChild(top);
  if(p.summary) c.appendChild(h('p','pl-sum', p.summary));
  const nums=h('div','pl-nums');
  const nb=(v,l,k)=>{ const x=h('div','pl-num'+(k?' '+k:'')); x.appendChild(h('b',null,String(v))); x.appendChild(h('span',null,l)); nums.appendChild(x); };
  nb(st.done+' of '+st.total,'Done'); nb(st.behind.length,'Behind', st.behind.length?'bad':''); nb(st.soon.length,'Due in Two Weeks', st.soon.length?'warn':''); nb(st.prog.length,'In Progress');
  c.appendChild(nums);
  const tl=timeline(p, st.L); c.appendChild(tl || sections(p, st.L));
  const up=nextUp(p, st.L).slice(0,3);
  const ub=h('div','pl-next'); ub.appendChild(h('span','lbl', up.length && behind(up[0],p) ? 'Needs a Push' : 'Up Next'));
  if(!up.length) ub.appendChild(h('span','pl-none','Everything here is done.'));
  up.forEach(it=>{ const r=btn('pl-item'+(behind(it,p)?' late':status(it)==='In Progress'?' go':''), null, e=>{ e.stopPropagation(); openItem(p,it); });
    r.appendChild(h('span','t', it.t)); const m=h('span','m'); const sec=secOf(p,it.sec); if(sec) m.appendChild(h('span','s', sec.name));
    const dl=dueLabel(it,p); m.appendChild(h('span','pv2-tag '+dl.k, dl.t)); if(it.who) m.appendChild(av(it.who,20)); r.appendChild(m); ub.appendChild(r); });
  c.appendChild(ub);
  const f=h('div','pl-foot');
  if(p.owner){ f.appendChild(av(p.owner,22)); f.appendChild(h('span',null,'Run by '+first(p.owner))); }
  const who=[...new Set(st.L.filter(i=>!done(i)).map(i=>i.who).filter(Boolean))].filter(person);
  if(who.length){ f.appendChild(h('span','sep','·')); const sk=h('span','pv2-stack'); who.slice(0,6).forEach(i=>sk.appendChild(av(i,22))); f.appendChild(sk); }
  const rk=p.rock && S.rocks.find(r=>r.id===p.rock);
  if(rk){ const l=btn('pl-rock', null, e=>{ e.stopPropagation(); window.__show && window.__show('rocks'); setTimeout(()=>window.__pv2 && window.__pv2.openPanel(rk.id), 80); });
    l.textContent=rk.name+(p.part ? ' · '+p.part : ''); l.title='Open this Team Project'; f.appendChild(l); }
  f.appendChild(h('span','pl-open','Open Plan →'));
  c.appendChild(f);
  return c;
}
function band(list){
  const all=list.map(p=>({p, st:stats(p)}));
  const tot=all.reduce((n,x)=>n+x.st.total,0), dn=all.reduce((n,x)=>n+x.st.done,0);
  const late=all.reduce((n,x)=>n+x.st.behind.length,0), sn=all.reduce((n,x)=>n+x.st.soon.length,0);
  const mine=all.reduce((n,x)=>n+x.st.L.filter(i=>!done(i) && i.who===S.me).length,0);
  const b=h('div','headline pl-band'), d=today();
  b.appendChild(h('div','hl-date','Where Our Plans Stand · '+WDL[d.getDay()]+', '+MONL[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear()));
  const say=h('div','hl-say');
  const worst=all.filter(x=>x.st.behind.length).sort((a,b)=>b.st.behind.length-a.st.behind.length)[0];
  if(worst){ const it=nextUp(worst.p, worst.st.L)[0]; const n=planDay(worst.p), len=planLen(worst.p);
    say.append(h('em',null,worst.p.title)); say.append((n && n>=1 ? ' is on Day '+n+(len?' of '+len:'')+' with ' : ' has ')+worst.st.behind.length+' behind. Start with ');
    say.append(h('em','hl-late', it ? it.t : 'the oldest one')); say.append('.'); }
  else if(sn) say.append('Nothing is behind. '+sn+' items land in the next two weeks.');
  else say.append('Nothing is behind or due in the next two weeks.');
  b.appendChild(say);
  const tiles=h('div','tiles one');
  const t=(v,l,s,k)=>{ const x=h('div','tile'+(k?' '+k:'')); x.style.cursor='default'; x.appendChild(h('b',null,String(v))); x.appendChild(h('span',null,l)); x.appendChild(h('small',null,s)); tiles.appendChild(x); };
  t(list.filter(p=>(p.status||'Active')==='Active').length,'Active Plans', list.length+' showing');
  t((tot?Math.round(dn/tot*100):0)+'%','Done', dn+' of '+tot+' items', 'sky');
  t(late,'Behind', late?'past their date':'nothing late', late?'bad':'');
  t(sn,'Due in Two Weeks','the next 14 days', sn?'warn':'');
  t(mine,'Mine to Do','items with my name on them');
  b.appendChild(tiles);
  return b;
}

/* ---------- styles ---------- */
const css=h('style'); css.id='pl-css'; css.textContent=`
.pl-band{margin:4px 0 16px}
.pl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(460px,100%),1fr));gap:16px;align-items:start;font-variant-numeric:tabular-nums}
.pl-card{position:relative;display:flex;flex-direction:column;gap:14px;padding:18px 20px 14px 24px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;overflow:hidden;transition:transform .14s,box-shadow .14s,border-color .14s}
.pl-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--rc)}
.pl-card:hover,.pl-card:focus-visible{transform:translateY(-2px);border-color:var(--border-strong);box-shadow:0 2px 4px rgba(13,49,76,.06),0 12px 28px rgba(13,49,76,.12);outline:none}
.pl-top{display:flex;gap:16px;align-items:flex-start}
.pl-tx{flex:1;min-width:0}
.pl-tx h3{margin:0;font-size:18px;font-weight:700;line-height:1.3;color:var(--ink)}
.pl-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.pl-for{gap:5px;padding-left:3px}
.pl-meta{margin-top:8px;font-size:12.5px;font-weight:600;color:var(--ink-2)}
.pl-ring{position:relative;flex:0 0 auto;width:72px;height:72px}
.pl-ring svg{width:100%;height:100%}
.pl-ring circle{fill:none;stroke-width:7}
.pl-ring .tr{stroke:var(--surface-3)}
.pl-ring .pg{stroke-linecap:round;transition:stroke-dasharray .5s ease}
.pl-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--ink)}
.pl-sum{margin:-4px 0 0;font-size:13px;line-height:1.5;color:var(--ink-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pl-nums{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media(max-width:560px){.pl-nums{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pl-num{padding:8px 10px;background:var(--surface-2);border:1px solid var(--rule);border-radius:6px}
.pl-num b{display:block;font-size:18px;font-weight:700;line-height:1.15;color:var(--ink)}
.pl-num span{display:block;font-size:11.5px;font-weight:600;color:var(--ink-3)}
.pl-num.bad b{color:var(--bad)}.pl-num.warn b{color:var(--warn)}
.pl-tl{padding-top:16px}
.pl-tlb{position:relative;height:34px;background:var(--surface-3);border-radius:5px}
.pl-seg{position:absolute;top:0;bottom:0;border-right:2px solid var(--surface);overflow:hidden;background:color-mix(in srgb,var(--rc) 14%,var(--surface))}
.pl-seg:first-child{border-radius:5px 0 0 5px}.pl-seg:last-of-type{border-right:0;border-radius:0 5px 5px 0}
.pl-seg i{position:absolute;left:0;top:0;bottom:0;background:color-mix(in srgb,var(--rc) 45%,var(--surface))}
.pl-seg.late{box-shadow:inset 0 -3px 0 var(--bad)}
.pl-seg span{position:relative;display:block;padding:0 8px;line-height:34px;font-size:11.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-now{position:absolute;top:-14px;bottom:-4px;width:2px;margin-left:-1px;background:var(--bad);z-index:2}
.pl-now b{position:absolute;top:-2px;left:4px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--bad);white-space:nowrap}
.pl-scale{position:relative;height:16px;margin-top:3px}
.pl-scale span{position:absolute;font-size:10.5px;color:var(--ink-3);white-space:nowrap;transform:translateX(-0%)}
.pl-scale span:last-child{transform:translateX(-100%)}
.pl-secs{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(200px,100%),1fr));gap:6px 16px}
.pl-sec{display:grid;grid-template-columns:minmax(0,1fr) 70px auto;align-items:center;gap:8px;font-size:12.5px}
.pl-sec .n{font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-sec .b{height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden}
.pl-sec .b i{display:block;height:100%;background:var(--rc)}
.pl-sec.done .b i{background:var(--good)}.pl-sec.late .n{color:var(--bad)}
.pl-sec .c{font-size:11.5px;font-weight:700;color:var(--ink-3)}
.pl-next{display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--rule);border-radius:6px}
.pl-next .lbl{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.pl-none{font-size:13px;color:var(--ink-3)}
.pl-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:7px 9px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--ink-3);border-radius:5px;font:inherit;color:var(--ink);cursor:pointer}
.pl-item:hover{border-color:var(--border-strong);box-shadow:var(--shadow)}
.pl-item.late{border-left-color:var(--bad)}.pl-item.go{border-left-color:var(--c1)}
.pl-item .t{flex:1;min-width:0;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-item .m{display:flex;align-items:center;gap:7px;flex:0 0 auto}
.pl-item .s{font-size:11.5px;color:var(--ink-3);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:560px){.pl-item{flex-direction:column;align-items:flex-start}.pl-item .t{white-space:normal}}
.pl-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:11px;border-top:1px solid var(--rule);font-size:12.5px;font-weight:600;color:var(--ink-2)}
.pl-foot .sep{color:var(--ink-3)}
.pl-rock{border:1px solid var(--border);background:var(--surface-2);border-radius:4px;padding:2px 8px;font:inherit;font-size:12px;font-weight:600;color:var(--ink-2);cursor:pointer;white-space:nowrap}
.pl-rock:hover{border-color:var(--rc);color:var(--ink)}
.pl-open{margin-left:auto;font-weight:700;color:var(--c1);white-space:nowrap}
`;
document.head.appendChild(css);

/* ---------- wiring: take over the list view only ---------- */
let mo=null;
function paint(){
  if(S.planOpen) return;
  const cards=root.querySelector(':scope > .plancards'); if(!cards) return;
  if(mo) mo.disconnect();
  const list=[...cards.querySelectorAll('.plancard h3')].map(x=>S.plans.find(p=>(p.title||'Untitled Plan')===x.textContent)).filter(Boolean);
  const wrap=h('div','pl-wrap');
  wrap.appendChild(band(list));
  const g=h('div','pl-grid'); list.forEach(p=>g.appendChild(card(p))); wrap.appendChild(g);
  cards.replaceWith(wrap);
  if(mo) mo.observe(root, {childList:true});
}
mo=new MutationObserver(()=>{ if(!S.planOpen && root.querySelector(':scope > .plancards')) paint(); });
mo.observe(root, {childList:true});
paint();
window.__plv2={ paint, version:'1.0', destroy(){ if(mo) mo.disconnect(); mo=null; css.remove(); if(window.__show && S.tab==='plans') window.__show('plans'); } };
})();

});
/* ===== today.js ===== */
MODS.push(function(){
/* Today, levelled up — Counting Down that never sits empty (it rolls forward to
   the next range with dates in it), and The Next Four Weeks: one timeline with
   key dates, project deadlines and who is away, like MISMO Media's schedule. */
(function(){
'use strict';
if(window.__td && window.__td.destroy) window.__td.destroy();
const S=window.__S, root=document.getElementById('app-today');
if(!S || !root) return;
const KEY='tools:team-hq:mismo.teamhq.td';
const ui={range:''};
try{ Object.assign(ui, JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){}
const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(ui)); }catch(e){} };

function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function btn(cls, txt, fn){ const b=h('button', cls, txt); b.type='button'; if(fn) b.addEventListener('click', fn); return b; }
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const today=()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
const pd=s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); return m ? new Date(+m[1], m[2]-1, +m[3]) : null; };
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const dd=(a,b)=>Math.round((b-a)/864e5);
const fmt=d=>WD[d.getDay()]+', '+MON[d.getMonth()]+' '+d.getDate()+(d.getFullYear()!==today().getFullYear()?', '+d.getFullYear():'');
const person=id=>S.people.find(p=>p.id===id);
const first=id=>{ const p=person(id); return p ? p.name.split(' ')[0] : ''; };
function av(id, size){ const p=person(id), a=h('span','av'); if(!p) return a; a.textContent=p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join(''); a.style.background='var(--c'+(((p.color||0)%7)+1)+')'; a.title=p.name; if(size){ a.style.width=a.style.height=size+'px'; a.style.fontSize=Math.round(size*.42)+'px'; } return a; }
const KC={Summit:2, Annual:5, Milestone:6, Board:1, Governance:7, Finance:3, Contract:0, Deadline:4, Meeting:1, Travel:4, 'Out of Office':5};
const kc=k=>'var(--c'+((KC[k]!=null?KC[k]:0)%7+1)+')';
const AWAY=/travel|out of office/i;
const holiday=d=>{ try{ const r=window.__t && window.__t.holidayOn(d); return r ? (typeof r==='string' ? r : (r.n||r.t||r.name||'Holiday')) : ''; }catch(e){ return ''; } };

/* every occurrence of every key date between a and b (repeating ones included) */
function occ(a, b){
  const out=[];
  (S.dates||[]).forEach(x=>{
    if(x.rec && x.rec.f){
      let list=[]; try{ list=window.__t.recUpcoming(x.rec, 40)||[]; }catch(e){}
      const len=Math.max(1, +(x.rec.len||1));
      list.forEach(s=>{ const sd=pd(typeof s==='string' ? s : (s && (s.on||s.d))); if(!sd) return; const ed=addD(sd, len-1); if(ed>=a && sd<=b) out.push({x, s:sd, e:ed}); });
    } else if(x.d){ const sd=pd(x.d), ed=pd(x.e)||sd; if(sd && ed>=a && sd<=b) out.push({x, s:sd, e:ed}); }
  });
  return out.sort((p,q)=>p.s-q.s);
}
const editDate=x=>window.__editDate && window.__editDate(x);

/* ---------- Counting Down ---------- */
const RANGES=[['week','This Week',()=>{ const t=today(); return addD(t, 6-((t.getDay()+6)%7)); }],
              ['month','This Month',()=>{ const t=today(); return new Date(t.getFullYear(), t.getMonth()+1, 0); }],
              ['q','Next 90 Days',()=>addD(today(),90)],
              ['year','Next 12 Months',()=>addD(today(),365)]];
function countdown(){
  const box=h('div','box td-cd');
  const hd=h('div','td-h'); hd.appendChild(h('h3','sect-t','Counting Down'));
  const t0=today();
  const all=occ(t0, addD(t0,365)).filter(o=>!AWAY.test(o.x.k||'') && o.x.k!=='Meeting');
  const inRange=k=>{ const end=RANGES.find(r=>r[0]===k)[2](); return all.filter(o=>o.s<=end); };
  let pick=ui.range && RANGES.some(r=>r[0]===ui.range) ? ui.range : '';
  let auto=false;
  if(!pick || !inRange(pick).length){ const firstHit=RANGES.find(r=>inRange(r[0]).length); const wanted=pick; pick=firstHit ? firstHit[0] : 'year'; auto=!!wanted && wanted!==pick; }
  const seg=h('div','filterbar');
  RANGES.forEach(([k,l])=>{ const n=inRange(k).length; const b=btn('pill', null, ()=>{ ui.range=k; save(); paint(); }); b.append(l+' '); b.appendChild(h('b',null,String(n))); b.setAttribute('aria-pressed', String(pick===k)); seg.appendChild(b); });
  hd.appendChild(seg); box.appendChild(hd);
  const L=inRange(pick);
  if(auto){ const wl=RANGES.find(r=>r[0]===ui.range); box.appendChild(h('p','td-note','Nothing lands '+(wl?wl[1].toLowerCase():'then')+' — here’s what’s next.')); }
  if(!all.length){ box.appendChild(h('p','td-note','No key dates in the next year. Add one in Key Dates.')); return box; }
  const row=h('div','td-cards');
  const base=(L.length ? L : all).slice(0,12);
  const fill=base.length<6 ? all.filter(o=>base.indexOf(o)<0).slice(0, 6-base.length) : [];
  base.concat(fill).forEach((o,ix)=>{
    if(ix===base.length && fill.length){ const sep=h('div','td-sep'); sep.appendChild(h('span',null,'After That')); row.appendChild(sep); }
    const n=dd(t0,o.s), running=o.s<=t0 && o.e>=t0;
    const c=btn('td-card'+(o.x.pin?' pin':'')+(n<=7?' soon':'')+(ix>=base.length?' later':''), null, ()=>editDate(o.x)); c.style.setProperty('--kc', kc(o.x.k));
    const top=h('div','tp'); top.appendChild(h('span','k', o.x.k||'Date')); if(o.x.pin) top.appendChild(h('span','pn','★')); c.appendChild(top);
    const big=h('div','big'); big.appendChild(h('b',null, running ? (n===0?'Today':'On') : n===1 ? '1' : String(n))); big.appendChild(h('span',null, running ? (n===0?'':'now') : n===1 ? 'day to go' : 'days to go')); c.appendChild(big);
    c.appendChild(h('div','t', o.x.t||'Untitled'));
    c.appendChild(h('div','d', fmt(o.s)+(+o.e!==+o.s ? ' – '+MON[o.e.getMonth()]+' '+o.e.getDate() : '')));
    const who=(o.x.who||[]).filter(person); if(who.length && who.length<S.people.length){ const w=h('div','w'); who.slice(0,5).forEach(i=>w.appendChild(av(i,20))); c.appendChild(w); }
    else if(who.length===S.people.length){ c.appendChild(h('div','w all','Whole team')); }
    row.appendChild(c); });
  const more=btn('td-more', null, ()=>window.__show && window.__show('dates')); more.innerHTML='<b>All Key Dates</b><span>'+all.length+' in the next year →</span>'; row.appendChild(more);
  box.appendChild(row);
  return box;
}

/* ---------- The Next Four Weeks ---------- */
function fourWeeks(){
  const box=h('div','box td-4w');
  const t0=today(), mon=addD(t0, -((t0.getDay()+6)%7)), N=28, end=addD(mon, N-1);
  const hd=h('div','td-h'); hd.appendChild(h('h3','sect-t','The Next Four Weeks'));
  hd.appendChild(h('span','td-sub','key dates, project deadlines and who’s away · hover a marker for what it is'));
  box.appendChild(hd);
  const days=[...Array(N)].map((_,i)=>addD(mon,i));
  const wrap=h('div','td-tlw'), grid=h('div','td-tl'); grid.style.setProperty('--n', N); wrap.appendChild(grid);
  const col=d=>dd(mon,d);
  /* header: week labels + day numbers */
  const hr=h('div','td-row hd'); hr.appendChild(h('div','td-lab',''));
  const cells=h('div','td-cells');
  days.forEach((d,i)=>{ const c=h('div','td-day'+(d.getDay()===0||d.getDay()===6?' we':'')+(+d===+t0?' now':'')+(holiday(d)?' hol':''));
    if(d.getDay()===1) c.appendChild(h('span','wk','Week of '+MON[d.getMonth()]+' '+d.getDate()));
    c.appendChild(h('span','dn', String(d.getDate()))); c.title=fmt(d)+(holiday(d)?' · '+holiday(d):''); cells.appendChild(c); });
  hr.appendChild(cells); grid.appendChild(hr);
  const shade=cl=>{ days.forEach((d,i)=>{ const c=h('i','td-bg'+(d.getDay()===0||d.getDay()===6?' we':'')+(+d===+t0?' now':'')+(holiday(d)?' hol':'')); c.style.gridColumn=(i+1)+' / span 1'; cl.appendChild(c); }); };
  const mkRow=(label, sw, opts)=>{ const r=h('div','td-row'+(opts&&opts.cls?' '+opts.cls:'')); const lb=h('div','td-lab'); if(sw) lb.appendChild(sw); lb.appendChild(h('span',null,label)); r.appendChild(lb); const c=h('div','td-cells'); shade(c); r.appendChild(c); grid.appendChild(r); return c; };
  const sw=color=>{ const s=h('i','sw'); s.style.background=color; return s; };
  const marker=(cells, i, items, color, onClick)=>{ const m=btn('td-mk'+(items.length>1?' many':''), items.length>1?String(items.length):'', onClick); m.style.gridColumn=(i+1)+' / span 1'; m.style.setProperty('--mc', color); m.title=items.join('\n'); cells.appendChild(m); };
  const bar=(cells, a, b, label, color, title, onClick)=>{ const s=Math.max(0,col(a)), e=Math.min(N-1,col(b)); if(e<0||s>N-1) return; const x=btn('td-bar', label, onClick); x.style.gridColumn=(s+1)+' / '+(e+2); x.style.setProperty('--mc', color); x.title=title; cells.appendChild(x); };
  /* key dates by group */
  const O=occ(mon, end);
  const GROUPS=[['Summits and Events',['Summit','Annual','Milestone'],kc('Summit')],['Board and Governance',['Board','Governance'],kc('Board')],['Finance and Contracts',['Finance','Contract'],kc('Finance')],['Deadlines',['Deadline'],kc('Deadline')],['Team Meetings',['Meeting'],kc('Meeting')]];
  GROUPS.forEach(([name, kinds, color])=>{
    const these=O.filter(o=>kinds.indexOf(o.x.k)>=0); const c=mkRow(name, sw(color));
    const byDay={}; these.forEach(o=>{ if(+o.e!==+o.s && dd(o.s,o.e)>=1){ bar(c, o.s, o.e, o.x.t, color, o.x.t+'\n'+fmt(o.s)+' – '+fmt(o.e), ()=>editDate(o.x)); return; } const i=col(o.s); (byDay[i]=byDay[i]||[]).push(o); });
    Object.keys(byDay).forEach(i=>{ const L=byDay[i]; marker(c, +i, L.map(o=>o.x.t), color, ()=>editDate(L[0].x)); });
  });
  /* project deadlines */
  const pc=mkRow('Project Deadlines', sw('var(--c1)'), {cls:'gap'});
  const byDay={}; S.tasks.filter(t=>t.s!=='Done' && t.r && t.due).forEach(t=>{ const d=pd(t.due); if(!d||d<mon||d>end) return; const i=col(d); (byDay[i]=byDay[i]||[]).push(t); });
  Object.keys(byDay).forEach(i=>{ const L=byDay[i]; const late=addD(mon,+i)<t0; marker(pc, +i, L.map(t=>t.t+' — '+((S.rocks.find(r=>r.id===t.r)||{}).name||'')), late?'var(--bad)':'var(--c1)', ()=>{ if(L.length===1) window.__edit && window.__edit(L[0]); else { window.__show && window.__show('rocks'); } }); });
  /* who's away */
  const cal=(window.__cal && window.__cal.CAL && window.__cal.CAL.by)||{};
  S.people.slice().sort((a,b)=>(a.ord||0)-(b.ord||0)).forEach((p,k)=>{
    const lb=av(p.id,20); const c=mkRow(p.name.split(' ')[0], lb, {cls:'pp'+(k===0?' gap':'')});
    O.filter(o=>AWAY.test(o.x.k||'') && (o.x.who||[]).indexOf(p.id)>=0).forEach(o=>bar(c, o.s, o.e, o.x.t, kc(o.x.k), p.name+': '+o.x.t+'\n'+fmt(o.s)+(+o.e!==+o.s?' – '+fmt(o.e):''), ()=>editDate(o.x)));
    const ev=Array.isArray(cal[p.id]) ? cal[p.id] : [];
    const oofDays=new Set(); ev.filter(e=>e.show==='oof' && (e.e-e.s)>=4*3600e3).forEach(e=>{ for(let t=e.s; t<e.e; t+=864e5){ const d=new Date(t); d.setHours(0,0,0,0); if(d>=mon && d<=end && d.getDay()%6) oofDays.add(+d); } });
    const runs=[]; [...oofDays].sort((x,y)=>x-y).forEach(t=>{ const d=new Date(t); if(O.some(o=>AWAY.test(o.x.k||'') && (o.x.who||[]).indexOf(p.id)>=0 && d>=o.s && d<=o.e)) return;
      const last=runs[runs.length-1]; const gap=last ? dd(last[1], d) : 99; if(last && gap>=1 && gap<=3 && [...Array(gap-1)].every((_,k)=>{ const m=addD(last[1],k+1); return m.getDay()===0||m.getDay()===6; })) last[1]=d; else runs.push([d,d]); });
    runs.forEach(([a,b])=>bar(c, a, b, dd(a,b)>=1 ? 'Out' : '', 'var(--warn)', p.name+' \u2014 out of office in Outlook \u00b7 '+fmt(a)+(+a!==+b?' \u2013 '+fmt(b):'')));
    /* how busy their weekdays are, from Outlook */
    if(ev.length) days.forEach((d,i)=>{ if(d<t0 || d.getDay()===0 || d.getDay()===6) return; const a=+d, b=a+864e5; const mins=ev.filter(e=>e.show!=='free' && e.show!=='oof' && e.s<b && e.e>a).reduce((n,e)=>n+(Math.min(e.e,b)-Math.max(e.s,a))/60e3,0); if(mins<30) return;
      const l=h('i','td-load'); l.style.gridColumn=(i+1)+' / span 1'; l.style.setProperty('--h', Math.min(100, mins/480*100)+'%'); l.title=p.name+' — '+Math.round(mins/60*10)/10+' hours of meetings · '+fmt(d); c.appendChild(l); });
  });
  box.appendChild(wrap);
  const lg=h('div','td-legend');
  [['Key date', 'var(--c3)', 'mk'],['Travel', kc('Travel'), 'bar'],['Out of office', 'var(--warn)', 'bar'],['Meeting load', 'var(--sky)', 'ld']].forEach(([l,c,k])=>{ const s=h('span','li'); const i=h('i',k); i.style.setProperty('--mc', c); s.appendChild(i); s.append(l); lg.appendChild(s); });
  box.appendChild(lg);
  return box;
}

/* ---------- styles ---------- */
const css=h('style'); css.id='td-css'; css.textContent=`
.td-wrap{display:flex;flex-direction:column;gap:16px;font-variant-numeric:tabular-nums}
.td-h{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:-18px -20px 14px;padding:10px 20px;border-bottom:1px solid var(--rule)}
.td-h .sect-t{margin:0;font-size:15.5px;font-weight:700;letter-spacing:-.012em;text-transform:none;color:var(--ink)}
.td-h .filterbar{margin:0 0 0 auto}
.td-sub,.td-note{font-size:12.5px;color:var(--ink-3)}
.td-note{margin:-4px 0 12px}
.td-cards{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px;scroll-snap-type:x proximity}
.td-card{flex:1 0 200px;max-width:260px;scroll-snap-align:start;position:relative;display:flex;flex-direction:column;gap:6px;text-align:left;padding:12px 14px 12px 16px;min-height:168px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font:inherit;color:var(--ink);cursor:pointer;overflow:hidden;transition:transform .14s,box-shadow .14s,border-color .14s}
.td-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--kc)}
.td-card:hover{transform:translateY(-2px);border-color:var(--kc);box-shadow:0 10px 24px rgba(13,49,76,.12)}
.td-card.soon{background:linear-gradient(160deg,color-mix(in srgb,var(--kc) 10%,var(--surface)),var(--surface) 60%)}
.td-card .tp{display:flex;align-items:center;gap:6px}
.td-card .k{font-size:10.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--kc)}
.td-card .pn{margin-left:auto;color:var(--c4);font-size:13px}
.td-card .big{display:flex;align-items:baseline;gap:6px;margin-top:2px}
.td-card .big b{font-size:36px;font-weight:700;line-height:1;letter-spacing:-.02em;color:var(--ink)}
.td-card.soon .big b{color:var(--kc)}
.td-card .big span{font-size:12px;font-weight:600;color:var(--ink-3)}
.td-card .t{font-size:13.5px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.td-card .d{font-size:12px;color:var(--ink-2)}
.td-card .w{display:flex;gap:3px;margin-top:auto;font-size:11.5px;font-weight:600;color:var(--ink-3)}
.td-sep{display:flex;align-items:center;justify-content:center;width:28px;min-height:168px}
.td-sep span{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);border-left:1px dashed var(--border-strong);padding-left:8px}
.td-cards{grid-template-columns:none}
.td-card.later{background:var(--surface)}
.td-more{flex:0 0 170px;display:flex;flex-direction:column;justify-content:center;gap:4px;padding:14px;min-height:168px;background:var(--surface-2);border:1px dashed var(--border-strong);border-radius:8px;font:inherit;color:var(--ink);cursor:pointer;text-align:left}
.td-more b{font-size:14px}.td-more span{font-size:12.5px;color:var(--c1);font-weight:600}
.td-more:hover{border-color:var(--c1);background:var(--sky-wash)}
.td-tlw{overflow-x:auto;margin:0 -4px;padding:0 4px}
.td-tl{min-width:880px}
.td-row{display:grid;grid-template-columns:170px 1fr;align-items:stretch;border-bottom:1px solid var(--rule);min-height:34px}
.td-row.gap{border-top:2px solid var(--border)}
.td-row.hd{border-bottom:1px solid var(--border);min-height:46px}
.td-lab{display:flex;align-items:center;gap:8px;padding:4px 10px 4px 0;font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:sticky;left:0;background:var(--surface);z-index:3}
.td-lab .sw{flex:0 0 auto;width:10px;height:10px;border-radius:2px}
.td-row.pp .td-lab{font-weight:600;color:var(--ink-2)}
.td-cells{position:relative;display:grid;grid-template-columns:repeat(var(--n,28),minmax(0,1fr));align-items:center;column-gap:0}
.td-day{position:relative;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding-bottom:4px;height:100%;font-size:11px;color:var(--ink-3)}
.td-day .wk{position:absolute;top:4px;left:4px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);white-space:nowrap}
.td-day .dn{font-weight:600}
.td-day.we{color:color-mix(in srgb,var(--ink-3) 60%,transparent)}
.td-day.now .dn{background:var(--navy);color:#fff;border-radius:4px;padding:0 5px}
:root[data-theme="dark"] .td-day.now .dn{background:var(--sky);color:var(--navy-deep)}
.td-day.hol .dn{color:var(--warn)}
.td-bg{grid-row:1;align-self:stretch;height:100%;min-height:34px;border-left:1px solid transparent}
.td-bg.we{background:color-mix(in srgb,var(--surface-3) 70%,transparent)}
.td-bg.hol{background:repeating-linear-gradient(135deg,transparent 0 5px,color-mix(in srgb,var(--warn) 18%,transparent) 5px 6px)}
.td-bg.now{background:var(--accent-soft,var(--sky-wash));box-shadow:inset 2px 0 0 var(--sky)}
.td-mk{grid-row:1;justify-self:center;align-self:center;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:var(--mc);color:#fff;font:inherit;font-size:10.5px;font-weight:700;cursor:pointer;z-index:2;box-shadow:0 1px 2px rgba(0,0,0,.15);transition:transform .1s}
.td-mk.many{width:22px;height:22px}
.td-mk:hover{transform:scale(1.25)}
.td-bar{grid-row:1;align-self:center;height:20px;margin:0 2px;padding:0 6px;border:0;border-radius:5px;background:color-mix(in srgb,var(--mc) 85%,transparent);color:#fff;font:inherit;font-size:11px;font-weight:700;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;z-index:2}
.td-bar:hover{filter:brightness(1.08)}
.td-load{grid-row:1;align-self:end;justify-self:center;width:60%;height:calc(var(--h) * .28);min-height:3px;margin-bottom:3px;background:color-mix(in srgb,var(--sky) 70%,transparent);border-radius:2px 2px 0 0;z-index:1}
.td-legend{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:12px;font-size:12px;color:var(--ink-2)}
.td-legend .li{display:inline-flex;align-items:center;gap:7px}
.td-legend i{display:inline-block;background:var(--mc)}
.td-legend i.mk{width:12px;height:12px;border-radius:3px}
.td-legend i.mk2{width:14px;height:14px;border-radius:3px}
.td-legend i.bar{width:26px;height:10px;border-radius:3px}
.td-legend i.ld{width:6px;height:12px;border-radius:2px 2px 0 0}
#app-today > .td-hidden{display:none!important}
@media(max-width:640px){.td-card{flex-basis:72%}.td-row{grid-template-columns:110px 1fr}}
`;
document.head.appendChild(css);

/* ---------- wiring ---------- */
let mo=null;
function paint(){
  if(mo) mo.disconnect();
  /* the old Counting Down block gives way to the new one */
  [...root.children].forEach(c=>{ if(!c.classList.contains('td-wrap') && c.querySelector && c.querySelector('.cdbar')) c.classList.add('td-hidden'); });
  const old=root.querySelector(':scope > .td-wrap'), w=h('div','td-wrap');
  try{ w.appendChild(countdown()); }catch(e){ console.error(e); }
  try{ w.appendChild(fourWeeks()); }catch(e){ console.error(e); }
  if(old) old.replaceWith(w); else { const ask=root.querySelector(':scope > .askwrap'), hl=root.querySelector(':scope > .headline'); const after=ask||hl; after ? after.after(w) : root.prepend(w); }
  if(mo) mo.observe(root, {childList:true});
}
mo=new MutationObserver(()=>{ if(!root.querySelector(':scope > .td-wrap') || [...root.children].some(c=>!c.classList.contains('td-hidden') && !c.classList.contains('td-wrap') && c.querySelector && c.querySelector('.cdbar'))) paint(); });
mo.observe(root, {childList:true});
/* Key Dates' pinned countdown: if the chosen range is empty, roll forward to the next one */
const datesRoot=document.getElementById('app-dates');
let advancing=0;
function rollForward(){
  if(!datesRoot || datesRoot.hidden) return;
  const bar=datesRoot.querySelector('.cdbar'); if(!bar) return;
  const box=bar.parentElement; if(!/Nothing Pinned Lands/i.test(box.textContent)){ advancing=0; return; }
  if(advancing>4) return;
  const bs=[...bar.querySelectorAll('button')]; const cur=bs.findIndex(b=>b.getAttribute('aria-pressed')==='true' || b.classList.contains('on') || b.classList.contains('active'));
  const nx=bs[cur+1]; if(nx){ advancing++; setTimeout(()=>nx.click(), 0); }
}
const mo3=datesRoot ? new MutationObserver(()=>rollForward()) : null;
if(datesRoot){ mo3.observe(datesRoot, {childList:true, subtree:true}); rollForward(); }
let calSig=''; const calSigNow=()=>{ const C=window.__cal && window.__cal.CAL; return C ? Object.keys(C.by||{}).length+':'+(C.at||'') : ''; };
calSig=calSigNow(); const calTimer=setInterval(()=>{ const s=calSigNow(); if(s!==calSig){ calSig=s; if(!root.hidden) paint(); } }, 1500);
paint();
window.__td={ paint, version:'1.0', destroy(){ if(mo) mo.disconnect(); mo=null; mo3 && mo3.disconnect(); clearInterval(calTimer); css.remove(); const n=root.querySelector(':scope > .td-wrap'); n && n.remove(); [...root.querySelectorAll('.td-hidden')].forEach(c=>c.classList.remove('td-hidden')); } };
})();

});
/* ===== meeting.js ===== */
MODS.push(function(){
/* Team Meeting, plussed up — the meeting always runs in the same order:
   1 Before Normal Business (what people put on the agenda), 2 Team Projects
   (standing item), 3 Around the Room (each staff member's updates),
   4 For the Good of the Order. Start the Meeting puts it on the screen, one
   step at a time, with notes and outcomes saved back to the agenda. */
(function(){
'use strict';
if(window.__mt && window.__mt.destroy) window.__mt.destroy();
const S=window.__S, root=document.getElementById('app-agenda');
if(!S || !root) return;

function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function btn(cls, txt, fn){ const b=h('button', cls, txt); b.type='button'; if(fn) b.addEventListener('click', fn); return b; }
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WDL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const today=()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
const pd=s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); return m ? new Date(+m[1], m[2]-1, +m[3]) : null; };
const days=s=>{ const d=pd(s); return d ? Math.round((d-today())/864e5) : null; };
const fmt=s=>{ const d=pd(s); return d ? MON[d.getMonth()]+' '+d.getDate() : ''; };
const longD=s=>{ const d=pd(s); return d ? WDL[d.getDay()]+', '+MONL[d.getMonth()]+' '+d.getDate() : ''; };
const person=id=>S.people.find(p=>p.id===id);
const first=id=>{ const p=person(id); return p ? p.name.split(' ')[0] : ''; };
const people=()=>S.people.slice().sort((a,b)=>(a.ord||0)-(b.ord||0));
function av(id, size){ const p=person(id), a=h('span','av'); if(!p) return a; a.textContent=p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join(''); a.style.background='var(--c'+(((p.color||0)%7)+1)+')'; a.title=p.name; if(size){ a.style.width=a.style.height=size+'px'; a.style.fontSize=Math.round(size*.4)+'px'; } return a; }
const st=t=>/^waiting/i.test(t.s||'') ? 'Waiting on Someone' : (t.s||'Not Started');
const isOpen=t=>st(t)!=='Done';
const doers=t=>(t.d && t.d.length) ? t.d.slice() : (t.o ? [t.o] : []);
const txt=v=>String(v||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const put=(c,o)=>window.__put ? window.__put(c,o) : Promise.resolve();

/* ---------- the meeting ---------- */
function sel(){ try{ return S.mtgPick || window.__mtg.next(); }catch(e){ return ''; } }
function nextAfter(m){ try{ return window.__mtg.after(m); }catch(e){ return ''; } }
const SECTIONS=[
  {k:'bnb',  n:'Before Normal Business', d:'What people put on the agenda to discuss'},
  {k:'proj', n:'Team Projects', d:'Standing item — where every Team Project stands'},
  {k:'room', n:'Around the Room', d:'Each staff member gives their updates'},
  {k:'good', n:'For the Good of the Order', d:'Anything else, from anyone'}];
const items=m=>(S.agenda||[]).filter(x=>x.mtg===m && x.kind!=='Update' && x.kind!=='Good of the Order').sort((a,b)=>(a.ord||0)-(b.ord||0) || (a.at||0)-(b.at||0));
const updateOf=(m,id)=>(S.agenda||[]).find(x=>x.mtg===m && x.kind==='Update' && x.who===id);
const goodOf=m=>(S.agenda||[]).find(x=>x.mtg===m && x.kind==='Good of the Order');
function pstats(id, m){
  const T=S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(id)>=0);
  const nx=nextAfter(m);
  const late=T.filter(t=>t.due && days(t.due)<0).sort((a,b)=>a.due<b.due?-1:1);
  const soon=T.filter(t=>t.due && days(t.due)>=0 && (!nx || t.due<=nx)).sort((a,b)=>a.due<b.due?-1:1);
  const prog=T.filter(t=>st(t)==='In Progress');
  const lead=S.rocks.filter(r=>(r.status||'Active')==='Active' && r.lead===id);
  let away=[]; try{ const t0=today(); for(let i=0;i<21;i++){ const d=new Date(t0); d.setDate(d.getDate()+i); (window.__dOn ? window.__dOn(d) : []).forEach(x=>{ if(/travel|out of office/i.test(x.k||'') && (x.who||[]).indexOf(id)>=0 && !away.some(a=>a.x===x)) away.push({x, d}); }); } }catch(e){}
  return {T, late, soon, prog, lead, away};
}
function rockHealth(r){
  const ts=S.tasks.filter(t=>t.r===r.id), open=ts.filter(isOpen), late=open.filter(t=>t.due && days(t.due)<0);
  const next=open.slice().sort((a,b)=>(a.due||'9999')<(b.due||'9999')?-1:1)[0];
  return {ts, open, late, next, pct: ts.length ? Math.round((ts.length-open.length)/ts.length*100) : 0,
    k: late.length ? 'bad' : open.some(t=>t.due && days(t.due)<=7) ? 'warn' : open.length ? 'good' : '',
    t: late.length ? late.length+' Past Due' : open.some(t=>t.due && days(t.due)<=7) ? 'Due This Week' : open.length ? 'On Track' : (ts.length ? 'All Done' : 'No Tasks Yet')}; }

/* ---------- the planning page ---------- */
function runOfShow(){
  const m=sel(), I=items(m), mins=I.reduce((n,x)=>n+(+x.mins||0),0);
  const box=h('div','box mt-ros');
  const hd=h('div','mt-h'); hd.appendChild(h('h3','sect-t','Run of Show · '+longD(m)));
  const go=btn('btn mt-go', null, ()=>present(0)); go.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 4h18v12H3zM8 20h8M12 16v4"/></svg><span>Start the Meeting</span>'; hd.appendChild(go);
  box.appendChild(hd);
  const g=h('div','mt-steps');
  const room=people().length;
  const counts={bnb: I.length ? I.length+(I.length===1?' item':' items')+(mins?' · '+mins+' min':'') : 'nothing yet — put something on',
    proj: S.rocks.filter(r=>(r.status||'Active')==='Active').length+' active · '+S.rocks.filter(r=>(r.status||'Active')==='Active' && rockHealth(r).late.length).length+' with late work',
    room: room+' people · '+people().filter(p=>updateOf(m,p.id)).length+' updates in',
    good: goodOf(m) ? 'notes taken' : 'open floor'};
  SECTIONS.forEach((s,i)=>{ const c=btn('mt-step', null, ()=>{ const at=stepIndex(s.k); present(at); });
    c.appendChild(h('span','n', String(i+1))); const tx=h('span','tx'); tx.appendChild(h('b',null,s.n)); tx.appendChild(h('small',null, counts[s.k])); c.appendChild(tx);
    if(s.k==='proj') c.appendChild(h('span','tag','Standing'));
    g.appendChild(c); });
  box.appendChild(g);
  return box;
}
function roomCard(){
  const m=sel(), box=h('div','box mt-room');
  const hd=h('div','mt-h'); hd.appendChild(h('h3','sect-t','Around the Room')); hd.appendChild(h('span','mt-sub','what each person will cover — pulled from their work in Team HQ')); box.appendChild(hd);
  const g=h('div','mt-pg');
  people().forEach(p=>{ const s=pstats(p.id, m), u=updateOf(m,p.id);
    const c=btn('mt-pc', null, ()=>present(stepIndex('room')+people().indexOf(p)));
    const t=h('div','tp'); t.appendChild(av(p.id,32)); const nm=h('div','nm'); nm.appendChild(h('b',null,p.name)); nm.appendChild(h('small',null,p.role||'')); t.appendChild(nm); c.appendChild(t);
    const n=h('div','nums');
    const k=(v,l,cl)=>{ const x=h('span','k'+(cl?' '+cl:'')); x.appendChild(h('b',null,String(v))); x.appendChild(h('small',null,l)); n.appendChild(x); };
    k(s.T.length,'open'); k(s.late.length,'late', s.late.length?'bad':''); k(s.soon.length,'due by next', s.soon.length?'warn':''); c.appendChild(n);
    c.appendChild(h('div','up'+(u?' done':''), u ? 'Update in: '+txt(u.notes).slice(0,90) : 'No update yet'));
    g.appendChild(c); });
  box.appendChild(g);
  return box;
}

/* ---------- on the screen ---------- */
let pres=null, step=0, startAt=0, tick=null, steps=[];
function buildSteps(){
  const m=sel(), I=items(m);
  steps=[{k:'cover'}];
  if(I.length) I.forEach((x,i)=>steps.push({k:'bnb', x, i, n:I.length})); else steps.push({k:'bnb', x:null});
  steps.push({k:'proj'});
  people().forEach((p,i)=>steps.push({k:'room', p, i}));
  steps.push({k:'good'}); steps.push({k:'wrap'});
}
function stepIndex(k){ buildSteps(); const i=steps.findIndex(s=>s.k===k); return i<0?0:i; }
function present(at){
  buildSteps(); step=Math.max(0, Math.min(steps.length-1, at||0));
  if(!pres){ pres=h('div','mt-pres'); document.body.appendChild(pres); document.documentElement.classList.add('mt-on'); startAt=startAt||Date.now(); tick=setInterval(paintClock, 1000);
    document.addEventListener('keydown', onKey); try{ pres.requestFullscreen && pres.requestFullscreen().catch(()=>{}); }catch(e){} }
  drawPres();
}
function closePres(){ if(!pres) return; try{ document.fullscreenElement && document.exitFullscreen(); }catch(e){} pres.remove(); pres=null; clearInterval(tick); document.removeEventListener('keydown', onKey); document.documentElement.classList.remove('mt-on'); paint(); }
function onKey(e){ if(!pres) return; const a=document.activeElement; const typing=a && (a.tagName==='INPUT' || a.tagName==='TEXTAREA' || a.isContentEditable);
  if(e.key==='Escape'){ e.preventDefault(); closePres(); }
  else if(!typing && (e.key==='ArrowRight' || e.key==='PageDown' || e.key===' ')){ e.preventDefault(); go(1); }
  else if(!typing && (e.key==='ArrowLeft' || e.key==='PageUp')){ e.preventDefault(); go(-1); } }
function go(d){ step=Math.max(0, Math.min(steps.length-1, step+d)); drawPres(); }
function paintClock(){ if(!pres) return; const c=pres.querySelector('.mt-clock'); if(!c) return; const s=Math.floor((Date.now()-startAt)/1000); c.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function drawPres(){
  const m=sel(), S0=steps[step];
  pres.textContent='';
  const top=h('div','mt-top');
  const t1=h('div','mt-tl'); t1.appendChild(h('span','ey','MISMO Team Meeting')); t1.appendChild(h('b',null, longD(m)+' · 10–11 AM ET')); top.appendChild(t1);
  const nav=h('div','mt-nav');
  SECTIONS.forEach((s,i)=>{ const on=S0.k===s.k; const b=btn('mt-chip'+(on?' on':''), null, ()=>{ step=stepIndex(s.k); drawPres(); }); b.appendChild(h('span','n',String(i+1))); b.append(s.n); nav.appendChild(b); });
  top.appendChild(nav);
  const r=h('div','mt-tr'); r.appendChild(h('span','mt-clock','00:00')); r.appendChild(btn('mt-x','Exit', closePres)); top.appendChild(r);
  pres.appendChild(top);
  const body=h('div','mt-body'); pres.appendChild(body);
  ({cover:slideCover, bnb:slideItem, proj:slideProjects, room:slidePerson, good:slideGood, wrap:slideWrap})[S0.k](body, S0, m);
  const foot=h('div','mt-foot');
  foot.appendChild(btn('mt-nb', '← Back', ()=>go(-1))); foot.lastChild.disabled=step===0;
  const bar=h('div','mt-prog'); const f=h('i'); f.style.width=((step)/(steps.length-1)*100)+'%'; bar.appendChild(f); foot.appendChild(bar);
  foot.appendChild(h('span','mt-of', (step+1)+' of '+steps.length));
  foot.appendChild(btn('mt-nb pri', step===steps.length-1 ? 'Finish' : 'Next →', ()=>{ if(step===steps.length-1) closePres(); else go(1); }));
  pres.appendChild(foot);
  paintClock();
}
function slideHead(body, n, title, sub){ const h1=h('div','mt-sh'); if(n) h1.appendChild(h('span','mt-num', String(n))); const tx=h('div'); tx.appendChild(h('div','ey', n ? SECTIONS[n-1].n : '')); tx.appendChild(h('h2',null,title)); if(sub) tx.appendChild(h('p',null,sub)); h1.appendChild(tx); body.appendChild(h1); }
function slideCover(body, s, m){
  const w=h('div','mt-cover');
  w.appendChild(h('div','ey','MISMO Team Meeting'));
  w.appendChild(h('h1',null, longD(m)));
  w.appendChild(h('p','when','10:00–11:00 AM Eastern'));
  const o=h('ol','mt-order'); const I=items(m);
  SECTIONS.forEach((x,i)=>{ const li=btn('mt-oi', null, ()=>{ step=stepIndex(x.k); drawPres(); }); li.appendChild(h('span','n',String(i+1))); const t=h('span','t'); t.appendChild(h('b',null,x.n)); t.appendChild(h('small',null, x.k==='bnb' ? (I.length ? I.length+' on the agenda' : 'nothing on the agenda') : x.d)); li.appendChild(t); o.appendChild(li); });
  w.appendChild(o);
  const away=[]; people().forEach(p=>{ try{ const d=pd(m); if(d && (window.__dOn ? window.__dOn(d) : []).some(x=>/travel|out of office/i.test(x.k||'') && (x.who||[]).indexOf(p.id)>=0)) away.push(p.id); }catch(e){} });
  const who=h('div','mt-who'); people().forEach(p=>{ const a=av(p.id,40); if(away.indexOf(p.id)>=0){ a.classList.add('away'); a.title=p.name+' — away'; } who.appendChild(a); }); w.appendChild(who);
  if(away.length) w.appendChild(h('p','note', 'Away: '+away.map(first).join(', ')));
  body.appendChild(w);
}
function slideItem(body, s, m){
  if(!s.x){ slideHead(body, 1, 'Nothing on the agenda', 'Nobody put anything on before the meeting. Move on to Team Projects, or add something now.');
    const a=btn('btn','Put Something On', ()=>{ closePres(); const b=[...root.querySelectorAll('.vhead button')].find(x=>/Put Something On/.test(x.textContent)); b && b.click(); }); body.appendChild(a); return; }
  const x=s.x;
  slideHead(body, 1, x.t, (s.i+1)+' of '+s.n+' · '+(x.kind||'Discuss')+(x.mins ? ' · '+x.mins+' min' : ''));
  const card=h('div','mt-item');
  const who=h('div','mt-by'); if(x.who){ who.appendChild(av(x.who,36)); who.appendChild(h('span',null,'Raised by '+(person(x.who)||{}).name)); } card.appendChild(who);
  if(x.info) card.appendChild(h('div','mt-info', txt(x.info)));
  const g=h('div','mt-fields');
  const f1=h('label','mt-f'); f1.appendChild(h('span',null,'Outcome')); const i1=h('input'); i1.value=txt(x.outcome); i1.placeholder='What we decided'; f1.appendChild(i1); g.appendChild(f1);
  const f2=h('label','mt-f'); f2.appendChild(h('span',null,'Notes')); const i2=h('input'); i2.value=txt(x.notes); i2.placeholder='Anything worth keeping'; f2.appendChild(i2); g.appendChild(f2);
  card.appendChild(g);
  const acts=h('div','mt-acts');
  const cov=h('label','mt-cov'); const cb=h('input'); cb.type='checkbox'; cb.checked=!!x.done; cov.appendChild(cb); cov.append('Covered'); acts.appendChild(cov);
  const sv=btn('btn','Save', async()=>{ sv.disabled=true; await put('agenda', Object.assign({}, x, {outcome:i1.value.trim(), notes:i2.value.trim(), done:cb.checked?1:0})); sv.textContent='Saved'; setTimeout(()=>{ sv.textContent='Save'; sv.disabled=false; }, 1400); });
  acts.appendChild(sv);
  acts.appendChild(btn('btn ghost','Make It a Task', ()=>{ window.__edit && window.__edit({t:x.t, o:x.who||S.me||'', d:[], r:'', w:'', s:'Not Started', p:'Normal', due:'', notes:'', rail:0, ord:(S.tasks.length+1)*10, at:Date.now()}); }));
  card.appendChild(acts);
  body.appendChild(card);
}
function slideProjects(body, s, m){
  const R=S.rocks.filter(r=>(r.status||'Active')==='Active').sort((a,b)=>a.name.localeCompare(b.name));
  const lateN=R.filter(r=>rockHealth(r).late.length).length;
  slideHead(body, 2, 'Team Projects', R.length+' active · '+lateN+' with past-due work · click one to open it');
  const g=h('div','mt-rg');
  R.forEach(r=>{ const H=rockHealth(r); const c=btn('mt-rc', null, ()=>{ closePres(); window.__show && window.__show('rocks'); setTimeout(()=>window.__pv2 && window.__pv2.openPanel(r.id), 80); });
    c.style.setProperty('--rc','var(--c'+(((r.color||0)%7)+1)+')');
    const t=h('div','tp'); t.appendChild(h('b',null,r.name)); t.appendChild(h('span','pv2-tag '+H.k, H.t)); c.appendChild(t);
    const bar=h('div','br'); const f=h('i'); f.style.width=H.pct+'%'; bar.appendChild(f); c.appendChild(bar);
    const mt=h('div','mt'); if(r.lead){ mt.appendChild(av(r.lead,20)); mt.append(first(r.lead)+' · '); } mt.append(H.pct+'% done · '+H.open.length+' open'); c.appendChild(mt);
    if(H.next) c.appendChild(h('div','nx', (H.next.due && days(H.next.due)<0 ? 'Late: ' : 'Next: ')+H.next.t));
    g.appendChild(c); });
  body.appendChild(g);
}
function slidePerson(body, s, m){
  const p=s.p, st2=pstats(p.id, m), u=updateOf(m, p.id), nx=nextAfter(m);
  const w=h('div','mt-person');
  const left=h('div','mt-pl'); const top=h('div','mt-plt'); top.appendChild(av(p.id,72)); const nm=h('div'); nm.appendChild(h('b',null,p.name.split(' ')[0])); nm.appendChild(h('p','role',p.role||'')); top.appendChild(nm); left.appendChild(top);
  if(p.focus) left.appendChild(h('p','focus',p.focus));
  const n=h('div','mt-pn'); const k=(v,l,cl)=>{ const x=h('div','k'+(cl?' '+cl:'')); x.appendChild(h('b',null,String(v))); x.appendChild(h('small',null,l)); n.appendChild(x); };
  k(st2.T.length,'Open'); k(st2.prog.length,'In Progress'); k(st2.late.length,'Late', st2.late.length?'bad':''); k(st2.soon.length,'Due by '+(nx?fmt(nx):'next time'), st2.soon.length?'warn':''); left.appendChild(n);
  w.appendChild(left);
  const right=h('div','mt-pr');
  const col=(title, L, empty, render)=>{ const c=h('div','mt-col'); c.appendChild(h('h4',null,title)); if(!L.length) c.appendChild(h('p','empty',empty)); L.slice(0,5).forEach(x=>c.appendChild(render(x))); if(L.length>5) c.appendChild(h('p','more','+'+(L.length-5)+' more')); right.appendChild(c); };
  const trow=(t,cl)=>{ const r=btn('mt-t'+(cl?' '+cl:''), null, ()=>window.__edit && window.__edit(t)); r.appendChild(h('span','t',t.t)); const rk=S.rocks.find(x=>x.id===t.r); r.appendChild(h('span','m', (rk?rk.name+' · ':'')+(t.due?fmt(t.due):'No date'))); return r; };
  col('Past Due', st2.late, 'Nothing late.', t=>trow(t,'late'));
  col('Coming Up Before the Next Meeting', st2.soon, 'Nothing due before '+(nx?fmt(nx):'the next meeting')+'.', t=>trow(t,''));
  const extra=h('div','mt-col'); extra.appendChild(h('h4',null,'Leading and Away'));
  if(st2.lead.length) st2.lead.forEach(r=>{ const c=h('span','mt-lead', r.name); c.style.setProperty('--rc','var(--c'+(((r.color||0)%7)+1)+')'); extra.appendChild(c); }); else extra.appendChild(h('p','empty','Not leading a Team Project.'));
  st2.away.forEach(a=>extra.appendChild(h('p','away', (a.x.k||'Away')+': '+a.x.t+' · '+MON[a.d.getMonth()]+' '+a.d.getDate())));
  right.appendChild(extra);
  const up=h('div','mt-up'); up.appendChild(h('h4',null,'Their Update'));
  const ta=h('textarea'); ta.rows=3; ta.placeholder='What '+p.name.split(' ')[0]+' shared — wins, what’s next, where they need help'; ta.value=u ? txt(u.notes) : ''; up.appendChild(ta);
  const sv=btn('btn','Save Update', async()=>{ sv.disabled=true; const rec=u ? Object.assign({}, u, {notes:ta.value.trim()}) : {t:'Around the Room: '+p.name, kind:'Update', who:p.id, mtg:m, mins:0, notes:ta.value.trim(), outcome:'', info:'', done:1, ord:900+people().indexOf(p), at:Date.now()};
    await put('agenda', rec); sv.textContent='Saved'; setTimeout(()=>{ sv.textContent='Save Update'; sv.disabled=false; }, 1400); });
  up.appendChild(sv); right.appendChild(up);
  w.appendChild(right);
  slideHead(body, 3, p.name, (s.i+1)+' of '+people().length+' around the room');
  body.appendChild(w);
}
function slideGood(body, s, m){
  slideHead(body, 4, 'For the Good of the Order', 'Anything else, from anyone — shout-outs, heads-ups, ideas.');
  const g=goodOf(m), card=h('div','mt-item');
  const ta=h('textarea'); ta.rows=6; ta.placeholder='Notes from the open floor'; ta.value=g ? txt(g.notes) : ''; card.appendChild(ta);
  const acts=h('div','mt-acts');
  const sv=btn('btn','Save', async()=>{ sv.disabled=true; const rec=g ? Object.assign({}, g, {notes:ta.value.trim()}) : {t:'For the Good of the Order', kind:'Good of the Order', who:S.me||'', mtg:m, mins:0, notes:ta.value.trim(), outcome:'', info:'', done:1, ord:999, at:Date.now()};
    await put('agenda', rec); sv.textContent='Saved'; setTimeout(()=>{ sv.textContent='Save'; sv.disabled=false; }, 1400); });
  acts.appendChild(sv);
  acts.appendChild(btn('btn ghost','Add a Task', ()=>{ const b=document.getElementById('newtask'); b && b.click(); }));
  card.appendChild(acts); body.appendChild(card);
}
function slideWrap(body, s, m){
  const I=items(m), cov=I.filter(x=>x.done).length, ups=people().filter(p=>updateOf(m,p.id)).length, nx=nextAfter(m);
  const w=h('div','mt-cover');
  w.appendChild(h('div','ey','That’s a Wrap'));
  w.appendChild(h('h1',null,'Thanks, everyone.'));
  const n=h('div','mt-pn big'); const k=(v,l)=>{ const x=h('div','k'); x.appendChild(h('b',null,String(v))); x.appendChild(h('small',null,l)); n.appendChild(x); };
  k(cov+' of '+I.length,'Agenda items covered'); k(ups+' of '+people().length,'Updates captured'); k(nx?fmt(nx):'—','Next meeting'); w.appendChild(n);
  if(I.length>cov) w.appendChild(h('p','note', (I.length-cov)+' not covered — they stay on the list for next time.'));
  body.appendChild(w);
}

/* ---------- styles ---------- */
const css=h('style'); css.id='mt-css'; css.textContent=`
.mt-wrap{display:flex;flex-direction:column;gap:16px;margin:16px 0;font-variant-numeric:tabular-nums}
.mt-h{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:-18px -20px 14px;padding:10px 20px;border-bottom:1px solid var(--rule)}
.mt-h .sect-t{margin:0;font-size:15.5px;font-weight:700;letter-spacing:-.012em;text-transform:none;color:var(--ink)}
.mt-sub{font-size:12.5px;color:var(--ink-3)}
.mt-go{margin-left:auto;white-space:nowrap;min-width:max-content}
.mt-go svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mt-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
@media(max-width:900px){.mt-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
.mt-step{position:relative;display:flex;align-items:flex-start;gap:12px;text-align:left;padding:14px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;font:inherit;color:var(--ink);cursor:pointer;transition:transform .12s,box-shadow .12s,border-color .12s}
.mt-step:hover{transform:translateY(-2px);border-color:var(--c1);box-shadow:0 10px 22px rgba(13,49,76,.12)}
.mt-step .n,.mt-num,.mt-oi .n,.mt-chip .n{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;background:var(--navy);color:#fff;font-weight:700;font-size:14px}
:root[data-theme="dark"] .mt-step .n{background:var(--sky);color:var(--navy-deep)}
.mt-step .tx b{display:block;font-size:14px}
.mt-step .tx small{display:block;margin-top:3px;font-size:12px;color:var(--ink-3)}
.mt-step .tag{position:absolute;top:8px;right:8px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--c1);background:var(--info-soft);border-radius:3px;padding:1px 6px}
.mt-pg{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr));gap:10px}
.mt-pc{display:flex;flex-direction:column;gap:10px;text-align:left;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font:inherit;color:var(--ink);cursor:pointer}
.mt-pc:hover{border-color:var(--border-strong);box-shadow:var(--shadow)}
.mt-pc .tp{display:flex;align-items:center;gap:10px}
.mt-pc .nm b{display:block;font-size:14px}.mt-pc .nm small{display:block;font-size:11.5px;color:var(--ink-3)}
.mt-pc .nums{display:flex;gap:6px}
.mt-pc .k{flex:1;padding:6px 8px;background:var(--surface-2);border-radius:5px}
.mt-pc .k b{display:block;font-size:17px;line-height:1.1}.mt-pc .k small{font-size:11px;color:var(--ink-3)}
.mt-pc .k.bad b{color:var(--bad)}.mt-pc .k.warn b{color:var(--warn)}
.mt-pc .up{font-size:12px;color:var(--ink-3)}.mt-pc .up.done{color:var(--good);font-weight:600}
#app-agenda .mt-renamed{font-size:0}
#app-agenda .mt-renamed::after{content:"1 · Before Normal Business";font-size:12px}
/* on the screen */
html.mt-on{overflow:hidden}
.mt-pres{position:fixed;inset:0;z-index:500;display:flex;flex-direction:column;background:var(--ground);color:var(--ink);font-variant-numeric:tabular-nums}
.mt-top{display:flex;align-items:center;gap:16px;padding:14px 24px;background:var(--navy);color:#fff;flex-wrap:wrap}
:root[data-theme="dark"] .mt-top{background:#0a2433}
.mt-tl .ey{display:block;font-size:10.5px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--sky)}
.mt-tl b{font-size:16px}
.mt-nav{display:flex;gap:6px;flex-wrap:wrap;margin:0 auto}
.mt-chip{display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;border:1px solid rgba(116,191,235,.28);background:rgba(255,255,255,.06);border-radius:6px;color:rgba(255,255,255,.8);font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.mt-chip .n{width:24px;height:24px;font-size:12px;background:rgba(255,255,255,.12)}
.mt-chip.on{background:var(--sky);color:var(--navy-deep);border-color:var(--sky)}
.mt-chip.on .n{background:var(--navy);color:#fff}
.mt-tr{display:flex;align-items:center;gap:12px}
.mt-clock{font-size:20px;font-weight:700;color:var(--sky);min-width:64px;text-align:right}
.mt-x{border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;font:inherit;font-weight:700;padding:6px 14px;border-radius:5px;cursor:pointer}
.mt-body{flex:1;overflow:auto;padding:clamp(16px,3vh,32px) clamp(20px,5vw,72px)}
@media(max-height:700px){.mt-top{padding:8px 16px}.mt-sh{margin-bottom:12px}}
.mt-foot{display:flex;align-items:center;gap:16px;padding:12px 24px;background:var(--surface);border-top:1px solid var(--border)}
.mt-nb{border:1px solid var(--border-strong);background:var(--surface);color:var(--ink);font:inherit;font-size:15px;font-weight:700;padding:10px 20px;border-radius:6px;cursor:pointer;white-space:nowrap}
.mt-nb.pri{background:var(--navy);border-color:var(--navy);color:#fff}
:root[data-theme="dark"] .mt-nb.pri{background:var(--sky);border-color:var(--sky);color:var(--navy-deep)}
.mt-nb:disabled{opacity:.4;cursor:default}
.mt-prog{flex:1;height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden}
.mt-prog i{display:block;height:100%;background:linear-gradient(90deg,var(--sky),var(--c1));transition:width .3s}
.mt-of{font-size:13px;font-weight:700;color:var(--ink-3);white-space:nowrap}
.mt-sh{display:flex;align-items:flex-start;gap:16px;margin-bottom:24px}
.mt-sh .mt-num{width:48px;height:48px;font-size:22px;border-radius:10px}
.mt-sh .ey,.mt-cover .ey{font-size:12px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-3)}
.mt-sh h2{margin:2px 0 0;font-size:clamp(26px,3.2vw,40px);font-weight:700;line-height:1.15;letter-spacing:-.015em}
.mt-sh p{margin:6px 0 0;font-size:16px;color:var(--ink-2)}
.mt-cover{max-width:980px;margin:0 auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
.mt-cover h1{margin:0;font-size:clamp(34px,5vw,60px);font-weight:700;letter-spacing:-.02em}
.mt-cover .when{margin:0;font-size:18px;color:var(--ink-2)}
.mt-order{list-style:none;margin:20px 0 10px;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%}
@media(max-width:760px){.mt-order{grid-template-columns:1fr}}
.mt-oi{display:flex;align-items:center;gap:14px;text-align:left;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;font:inherit;color:var(--ink);cursor:pointer}
.mt-oi:hover{border-color:var(--c1)}
.mt-oi .n{width:40px;height:40px;font-size:18px;border-radius:8px}
.mt-oi b{display:block;font-size:18px}.mt-oi small{display:block;font-size:13px;color:var(--ink-3)}
.mt-who{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px}
.mt-who .av.away{opacity:.3}
.mt-cover .note,.mt-pres .note{font-size:14px;color:var(--ink-3);margin:6px 0 0}
.mt-item{max-width:1000px;display:flex;flex-direction:column;gap:16px;padding:22px;background:var(--surface);border:1px solid var(--border);border-radius:10px}
.mt-by{display:flex;align-items:center;gap:12px;font-size:16px;font-weight:600;color:var(--ink-2)}
.mt-info{font-size:18px;line-height:1.55;color:var(--ink)}
.mt-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:760px){.mt-fields{grid-template-columns:1fr}}
.mt-f span{display:block;margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
.mt-f input,.mt-item textarea,.mt-up textarea{width:100%;padding:10px 12px;border:1px solid var(--border-strong);border-radius:6px;background:var(--surface);color:var(--ink);font:inherit;font-size:15px}
.mt-acts{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.mt-acts .btn{white-space:nowrap;min-width:max-content}
.mt-cov{display:inline-flex;align-items:center;gap:8px;margin-right:auto;font-size:15px;font-weight:700}
.mt-cov input{width:20px;height:20px}
.mt-rg{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:12px}
.mt-rc{position:relative;display:flex;flex-direction:column;gap:8px;text-align:left;padding:14px 16px 14px 19px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font:inherit;color:var(--ink);cursor:pointer;overflow:hidden}
.mt-rc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--rc)}
.mt-rc:hover{border-color:var(--rc);box-shadow:0 10px 22px rgba(13,49,76,.12)}
.mt-rc .tp{display:flex;align-items:flex-start;gap:8px}.mt-rc .tp b{flex:1;font-size:16px;line-height:1.3}
.mt-rc .br{height:7px;background:var(--surface-3);border-radius:4px;overflow:hidden}.mt-rc .br i{display:block;height:100%;background:var(--rc)}
.mt-rc .mt{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-2)}
.mt-rc .nx{font-size:13px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-person{display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:28px;align-items:start}
@media(max-width:900px){.mt-person{grid-template-columns:1fr}}
.mt-pl{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:22px;background:var(--surface);border:1px solid var(--border);border-radius:10px}
.mt-plt{display:flex;align-items:center;gap:14px}.mt-plt b{display:block;font-size:22px}
.mt-pl .role{margin:0;font-size:15px;color:var(--ink-2)}
.mt-pl .focus{margin:4px 0 0;font-size:14px;color:var(--ink-3)}
.mt-pn{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:12px}
.mt-pn.big{grid-template-columns:repeat(3,minmax(0,1fr));max-width:720px;margin-top:20px}
.mt-pn .k{padding:10px 12px;background:var(--surface-2);border:1px solid var(--rule);border-radius:8px;text-align:left}
.mt-pn .k b{display:block;font-size:26px;line-height:1.1}.mt-pn .k small{font-size:12px;color:var(--ink-3)}
.mt-pn .k.bad b{color:var(--bad)}.mt-pn .k.warn b{color:var(--warn)}
.mt-pr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
@media(max-width:1100px){.mt-pr{grid-template-columns:1fr 1fr}}
.mt-col{display:flex;flex-direction:column;gap:8px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;min-width:0}
.mt-col h4,.mt-up h4{margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
.mt-col .empty{margin:0;font-size:14px;color:var(--good);font-weight:600}
.mt-col .more{margin:0;font-size:12.5px;color:var(--ink-3)}
.mt-col .away{margin:4px 0 0;font-size:13.5px;color:var(--warn);font-weight:600}
.mt-t{display:flex;flex-direction:column;gap:3px;text-align:left;padding:8px 10px;border:1px solid var(--border);border-left:3px solid var(--c1);border-radius:6px;background:var(--surface);font:inherit;color:var(--ink);cursor:pointer}
.mt-t.late{border-left-color:var(--bad)}
.mt-t .t{font-size:14px;font-weight:600;line-height:1.35}.mt-t .m{font-size:12px;color:var(--ink-3)}
.mt-lead{display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border-radius:5px;background:color-mix(in srgb,var(--rc) 14%,var(--surface));box-shadow:inset 3px 0 0 var(--rc);font-size:13px;font-weight:600}
.mt-up{grid-column:1/-1;display:flex;flex-direction:column;gap:8px;padding:16px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--sky);border-radius:10px}
.mt-up .btn{align-self:flex-start}
`;
document.head.appendChild(css);

/* ---------- wiring ---------- */
let mo=null;
function paint(){
  if(mo) mo.disconnect();
  const old=root.querySelector(':scope > .mt-wrap'); const w=h('div','mt-wrap');
  try{ w.appendChild(runOfShow()); }catch(e){ console.error(e); }
  if(old) old.replaceWith(w); else { const after=root.querySelector(':scope > .headline') || root.querySelector(':scope > .cdbar') || root.querySelector(':scope > .vhead'); after ? after.after(w) : root.prepend(w); }
  /* the agenda list is section 1 */
  [...root.querySelectorAll(':scope > div > .sect-t')].forEach(t=>{ if(t.textContent.trim()==='The Agenda') t.classList.add('mt-renamed'); });
  const oldR=root.querySelector(':scope > .mt-roomwrap'); const rw=h('div','mt-roomwrap mt-wrap');
  try{ rw.appendChild(projCard()); rw.appendChild(roomCard()); rw.appendChild(goodCard()); }catch(e){ console.error(e); }
  if(oldR) oldR.replaceWith(rw); else { const list=[...root.children].find(c=>c.querySelector && c.querySelector(':scope > .mt-renamed')); list ? list.after(rw) : root.appendChild(rw); }
  /* a Start the Meeting button in the header too */
  const vr=root.querySelector(':scope > .vhead .rowflex'); if(vr && !vr.querySelector('.mt-hgo')){ const b=btn('btn ghost mt-hgo', null, ()=>present(0)); b.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 4h18v12H3zM8 20h8M12 16v4"/></svg><span>Put It on the Screen</span>'; vr.insertBefore(b, vr.firstChild); }
  if(mo) mo.observe(root, {childList:true});
}
function projCard(){
  const box=h('div','box mt-projc');
  const R=S.rocks.filter(r=>(r.status||'Active')==='Active').sort((a,b)=>a.name.localeCompare(b.name));
  const hd=h('div','mt-h'); hd.appendChild(h('h3','sect-t','2 · Team Projects')); hd.appendChild(h('span','mt-sub','standing item, every meeting')); hd.appendChild(btn('btn ghost mt-go','Open Team Projects', ()=>window.__show && window.__show('rocks'))); box.appendChild(hd);
  const g=h('div','mt-rg');
  R.forEach(r=>{ const H=rockHealth(r); const c=btn('mt-rc', null, ()=>{ window.__show && window.__show('rocks'); setTimeout(()=>window.__pv2 && window.__pv2.openPanel(r.id), 80); });
    c.style.setProperty('--rc','var(--c'+(((r.color||0)%7)+1)+')');
    const t=h('div','tp'); t.appendChild(h('b',null,r.name)); t.appendChild(h('span','pv2-tag '+H.k, H.t)); c.appendChild(t);
    const bar=h('div','br'); const f=h('i'); f.style.width=H.pct+'%'; bar.appendChild(f); c.appendChild(bar);
    g.appendChild(c); });
  box.appendChild(g); return box;
}
function goodCard(){
  const m=sel(), g=goodOf(m), box=h('div','box');
  const hd=h('div','mt-h'); hd.appendChild(h('h3','sect-t','4 · For the Good of the Order')); hd.appendChild(h('span','mt-sub','open floor at the end — notes are taken on the screen')); box.appendChild(hd);
  box.appendChild(h('p','mt-sub', g && txt(g.notes) ? txt(g.notes) : 'Nothing noted yet for this meeting.'));
  return box;
}
const _room=roomCard; roomCard=function(){ const b=_room(); const t=b.querySelector('.sect-t'); if(t) t.textContent='3 · Around the Room'; return b; };
mo=new MutationObserver(()=>{ if(!root.querySelector(':scope > .mt-wrap') || !root.querySelector(':scope > .mt-roomwrap')) paint(); });
mo.observe(root, {childList:true});
paint();
window.__mt={ paint, present, version:'1.0', destroy(){ if(mo) mo.disconnect(); mo=null; closePres(); css.remove(); [...root.querySelectorAll('.mt-wrap')].forEach(n=>n.remove()); const b=root.querySelector('.mt-hgo'); b && b.remove(); } };
})();

});
/* ===== mobile.js ===== */
MODS.push(function(){
/* Team HQ on a phone — the side rail gives way to a bottom tab bar (Today,
   My Board, Projects, Find a Time, More), More opens every tab plus Jump To,
   Help and Dark Mode, and every page is tightened for a 390px screen. */
(function(){
'use strict';
if(window.__mob && window.__mob.destroy) window.__mob.destroy();
const S=window.__S; if(!S) return;
function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
const railBtn=k=>document.querySelector('.hq.rail button[data-hq="'+k+'"]') || document.querySelector('.hq nav button[data-hq="'+k+'"]');
const iconOf=k=>{ const b=railBtn(k); const s=b && b.querySelector('svg'); return s ? s.outerHTML : ''; };
const MORE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
let sheet=null;
const go=k=>{ closeMore(); const b=railBtn(k); if(b) b.click(); else if(window.__show) window.__show(k); window.scrollTo(0,0); };

/* ---------- the bottom bar ---------- */
const bar=h('nav','mob-bar'); bar.setAttribute('aria-label','Team HQ');
const TABS=[['today','Today'],['mine','My Board'],['rocks','Projects'],['findtime','Find a Time']];
TABS.forEach(([k,l])=>{ const b=h('button','mob-b'); b.type='button'; b.dataset.k=k; b.innerHTML=iconOf(k)+'<span></span>'; b.querySelector('span').textContent=l; b.addEventListener('click', ()=>go(k)); bar.appendChild(b); });
const mb=h('button','mob-b'); mb.type='button'; mb.dataset.k='more'; mb.innerHTML=MORE+'<span>More</span>'; mb.addEventListener('click', ()=> sheet ? closeMore() : openMore()); bar.appendChild(mb);
document.body.appendChild(bar);
let lastTab='';
function mark(){ if(S.tab===lastTab && !sheet) return; lastTab=S.tab; const inBar=TABS.some(t=>t[0]===S.tab);
  [...bar.children].forEach(b=>{ const on = sheet ? b.dataset.k==='more' : (b.dataset.k===S.tab || (!inBar && b.dataset.k==='more')); b.classList.toggle('on', on); b.setAttribute('aria-current', on?'page':'false'); }); }
const timer=setInterval(mark, 300); mark();

/* ---------- More ---------- */
function openMore(){
  sheet=h('div','mob-sheet'); const box=h('div','mob-box'); sheet.appendChild(box);
  sheet.addEventListener('click', e=>{ if(e.target===sheet) closeMore(); });
  box.appendChild(h('div','mob-grab'));
  const jump=h('button','mob-jump'); jump.type='button'; jump.innerHTML='<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>Jump to anything — a system, project, task or date</span>';
  jump.addEventListener('click', ()=>{ closeMore(); window.__hub && window.__hub.openPal(); }); box.appendChild(jump);
  box.appendChild(h('div','mob-lbl','Every Tab'));
  const g=h('div','mob-grid');
  [...document.querySelectorAll('.hq.rail nav button[data-hq], .hq nav button[data-hq]')].filter((b,i,a)=>a.findIndex(x=>x.dataset.hq===b.dataset.hq)===i).forEach(b=>{
    const k=b.dataset.hq, t=h('button','mob-t'+(S.tab===k?' on':'')); t.type='button'; const sv=b.querySelector('svg'); t.innerHTML=(sv?sv.outerHTML:'')+'<span></span>'; t.querySelector('span').textContent=(b.textContent||'').trim(); t.addEventListener('click', ()=>go(k)); g.appendChild(t); });
  box.appendChild(g);
  box.appendChild(h('div','mob-lbl','Quick'));
  const q=h('div','mob-q');
  const qa=(label, fn)=>{ const b=h('button','btn ghost',label); b.type='button'; b.addEventListener('click', ()=>{ closeMore(); fn(); }); q.appendChild(b); };
  qa('Add a Task', ()=>{ const b=document.getElementById('newtask'); b && b.click(); });
  qa('Jot It Down', ()=>{ const b=document.getElementById('jot'); b && b.click(); });
  qa('Ask for Something', ()=>window.__ask2 && window.__ask2());
  const help=document.getElementById('help-btn'); if(help) qa('Help', ()=>help.click());
  const th=document.getElementById('theme-btn'); if(th) qa((th.textContent||'Dark Mode').trim(), ()=>th.click());
  box.appendChild(q);
  document.body.appendChild(sheet); document.documentElement.classList.add('mob-sheet-on');
  requestAnimationFrame(()=>sheet && sheet.classList.add('in')); lastTab=''; mark();
}
function closeMore(){ if(!sheet) return; sheet.remove(); sheet=null; document.documentElement.classList.remove('mob-sheet-on'); lastTab=''; mark(); }
const onKey=e=>{ if(e.key==='Escape' && sheet) closeMore(); };
document.addEventListener('keydown', onKey);

/* ---------- styles ---------- */
const css=h('style'); css.id='mob-css'; css.textContent=`
.mob-bar,.mob-sheet{display:none}
@media (max-width:640px){
  body,body.railmini,body:not(.railmini){padding-left:0!important;padding-bottom:calc(66px + env(safe-area-inset-bottom,0px))}
  .hq.rail,.railscrim,.railmini-btn{display:none!important}
  .hqtop,body.railmini .hqtop,body:not(.railmini) .hqtop{margin-left:0!important;width:100%!important;padding:0 10px!important}
  .logoplate{padding:5px 8px}
  .logoplate svg{width:96px;height:auto}
  .mastrule{margin:0 8px!important;height:24px!important}
  .hqname{font-size:15px!important;white-space:nowrap}
  .hqtop-r{gap:6px}
  .hqtop-r .mastbtn{width:34px;height:34px}
  .whoami{padding:3px!important}
  main{padding:14px 12px 24px!important}
  .mob-bar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:95;background:var(--surface);border-top:1px solid var(--border);box-shadow:0 -6px 20px rgba(6,32,47,.10);padding:4px 4px calc(4px + env(safe-area-inset-bottom,0px))}
  .mob-b{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:54px;border:0;background:transparent;color:var(--ink-3);font:inherit;font-size:10.5px;font-weight:700;cursor:pointer;border-radius:8px;-webkit-tap-highlight-color:transparent}
  .mob-b svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .mob-b[data-k="more"] svg{fill:currentColor;stroke:none}
  .mob-b.on{color:var(--navy);background:var(--sky-wash)}
  :root[data-theme="dark"] .mob-b.on{color:var(--sky);background:var(--surface-3)}
  html.app-exp .mob-bar{display:none!important}
  html.mob-sheet-on{overflow:hidden}
  .mob-sheet{display:flex;position:fixed;inset:0;z-index:94;align-items:flex-end;background:rgba(6,32,47,0);transition:background .2s}
  .mob-sheet.in{background:rgba(6,32,47,.45)}
  .mob-box{width:100%;max-height:80vh;overflow:auto;background:var(--surface);border-radius:14px 14px 0 0;padding:8px 14px calc(78px + env(safe-area-inset-bottom,0px));transform:translateY(30px);opacity:0;transition:transform .2s,opacity .2s}
  .mob-sheet.in .mob-box{transform:none;opacity:1}
  .mob-grab{width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:4px auto 12px}
  .mob-jump{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-2);color:var(--ink-2);font:inherit;font-size:14px;text-align:left;cursor:pointer}
  .mob-jump svg{width:18px;height:18px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
  .mob-lbl{margin:16px 2px 8px;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
  .mob-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .mob-t{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:76px;padding:8px 4px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:12px;font-weight:700;text-align:center;cursor:pointer}
  .mob-t svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;color:var(--c1)}
  .mob-t.on{border-color:var(--navy);background:var(--sky-wash)}
  .mob-q{display:flex;flex-wrap:wrap;gap:8px}
  .mob-q .btn{flex:1 1 45%;justify-content:center;min-height:44px}

  /* every page, tightened */
  .view > .vhead,.view > .pv2 > .vhead{flex-direction:column;align-items:stretch;gap:10px}
  .view > .vhead .rowflex,.view > .pv2 > .vhead .rowflex{display:flex;flex-wrap:wrap;gap:8px}
  .view > .vhead .grow,.view > .pv2 > .vhead .grow{flex:0 0 auto!important}
  .view > .vhead .rowflex > *{flex:1 1 auto;justify-content:center}
  .view > .vhead p{display:none}
  .filterbar{flex-wrap:nowrap!important;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px}
  .filterbar::-webkit-scrollbar{display:none}
  .filterbar > *{flex:0 0 auto}
  .headline{padding:14px;gap:12px}
  .headline .hl-say{font-size:15px}
  .headline .hl-date{font-size:10px}
  .tiles,.tiles.one{display:flex!important;gap:8px;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity;margin:0 -14px;padding:0 14px 2px}
  .tiles::-webkit-scrollbar{display:none}
  .tiles > .tile{flex:0 0 138px;scroll-snap-align:start}
  .tile{padding:10px 11px}
  .tile b{font-size:22px}
  .tile span{font-size:12px}
  .tile small{font-size:11px}
  .box{padding:14px 14px}
  .box > .sect-t:first-child,.box > .hb-ch:first-child,.box > .hb-dh:first-child,.td-h,.mt-h,.ft-dh{margin:-14px -14px 12px!important;padding:10px 14px!important}
  .hb-acts > .sect-t{margin:-14px -14px 12px!important;padding:10px 14px!important}
  .td-h .filterbar{margin:0!important;width:100%}
  .hb-hint,.td-sub,.mt-sub{display:none}
  .btn{min-height:38px}
  /* side panels open full width */
  .panel,.panel.wide,.pv2-panel{width:100%!important;left:0!important;right:0!important;border-left:0!important}
  .pv2-ph{padding:14px 14px 12px 18px}
  .pv2-ph h2{font-size:19px}
  .pv2-ph .acts{width:100%}
  .pv2-ph .acts .btn{flex:1;justify-content:center}
  .pv2-pb{padding:14px 12px 30px 16px}
  .pv2-col{flex-basis:84vw}
  .pv2-ptiles{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  /* Team Projects */
  .pv2-bar{flex-direction:column;align-items:stretch}
  .pv2-who{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
  .pv2-who > *{flex:0 0 auto}
  .pv2-card{padding:14px 14px 12px 18px}
  .pv2-tn{padding:6px 8px}
  .pv2-tr{grid-template-columns:150px 1fr}
  .pv2-legend .hint{display:none}
  .pv2-mx th.nm{width:140px}
  .pv2-mx .nm{white-space:normal;font-size:12.5px;padding:8px 10px}
  .pv2-mx{min-width:640px}
  /* My Board hub */
  .hb-row{grid-template-columns:1fr!important}
  .hb-grid,.hb-grid.sm{grid-template-columns:1fr}
  .hb-ag{grid-template-columns:1fr 1fr}
  .hb-a{padding:8px}
  .hb-a small{display:none}
  .hb-strip{--lh:26px}
  .hb-ev{font-size:10.5px;padding:0 4px}
  .hb-free{font-size:0}
  .hb-hr{font-size:9.5px}
  .boardbar{flex-wrap:wrap;gap:8px}
  .nbcanvas{margin:8px 0 12px}
  /* Today */
  .td-row{grid-template-columns:96px 1fr}
  .td-lab{font-size:12px}
  /* Find a Time */
  .ft-top .ft-legend{margin-left:0;width:100%}
  .ft-tp th{min-width:70px}
  .ft-dt th{min-width:104px}
  /* Plans */
  .pl-card{padding:14px 14px 12px 18px}
  .pl-top{gap:10px}
  .pl-ring{width:58px;height:58px}
  /* Team Meeting on the screen */
  .mt-top{padding:8px 12px;gap:8px}
  .mt-tl b{font-size:14px}
  .mt-nav{order:3;width:100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0}
  .mt-chip{flex:0 0 auto}
  .mt-body{padding:16px 14px}
  .mt-sh .mt-num{width:38px;height:38px;font-size:18px}
  .mt-foot{padding:10px 12px;gap:10px}
  .mt-nb{padding:10px 14px}
  .mt-of{display:none}
  .mt-pr{grid-template-columns:1fr}
  .mt-pn.big{grid-template-columns:1fr}
  .mt-steps{grid-template-columns:1fr}
  /* app sheets and modals fit the screen */
  .modal,.sheetbox,.sheet-box{max-width:100vw!important}
}
`;
document.head.appendChild(css);

window.__mob={ version:'1.0', open:openMore, close:closeMore,
  destroy(){ clearInterval(timer); document.removeEventListener('keydown', onKey); closeMore(); bar.remove(); css.remove(); } };
})();

});
function boot(n){
  if(!(window.__S && window.__S.ready && window.__show && document.getElementById('app-mine'))){ if((n||0)<600) setTimeout(function(){ boot((n||0)+1); }, 200); return; }
  MODS.forEach(function(m){ try{ m(); }catch(e){ try{ console.error('Team HQ upgrade failed to load', e); }catch(x){} } });
}
boot(0);
})();