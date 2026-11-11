/* Team HQ skin — the MISMO Media look across every tab, the restyled My Board,
   and Expenses as a phone app (save to home screen, opens straight to Expenses). */
(function(){
'use strict';
if(window.__skin && window.__skin.destroy) window.__skin.destroy();
const added=[];
function add(el){ document.head.appendChild(el); added.push(el); return el; }
const qs=new URLSearchParams(location.search);
const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
/* Two home-screen apps: Team HQ itself, and Expenses (opened with ?app=expenses). Saving Team HQ to the home
   screen gives a Team HQ icon; saving from the Expenses page gives an Expenses icon. */
const appExp = qs.get('app')==='expenses';

/* ---------- phone app: manifest + home-screen tags ---------- */
function meta(name, content){ const m=document.createElement('meta'); m.name=name; m.content=content; return add(m); }
function link(rel, href, extra){ const l=document.createElement('link'); l.rel=rel; l.href=href; if(extra) Object.assign(l, extra); return add(l); }
{ const mf=appExp ? '/team-hq/expenses.webmanifest' : '/team-hq/team-hq.webmanifest';
  const cur=document.querySelector('link[rel="manifest"]'); if(cur) cur.href=mf; else link('manifest', mf);
  document.querySelectorAll('link[rel="apple-touch-icon"],meta[name="apple-mobile-web-app-title"]').forEach(e=>e.remove()); }
link('apple-touch-icon', appExp ? '/team-hq/expenses-icon-180.png' : '/team-hq/hq-icon-180.png');
meta('apple-mobile-web-app-capable','yes');
meta('mobile-web-app-capable','yes');
meta('apple-mobile-web-app-title', appExp ? 'Expenses' : 'Team HQ');
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
/* Expenses: everyone's, one heading per person with their trips under it */
.tripname{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 12px;border-top:1px solid var(--border)}
.tripname input{flex:1 1 220px;min-width:0;min-height:40px;font:inherit;font-size:16px;padding:6px 10px;border:1px solid var(--border-strong,var(--border));border-radius:6px;background:var(--surface);color:var(--ink)}
.tripname .btn{min-height:40px;white-space:nowrap}.tripname small{flex-basis:100%;font-size:12px;color:var(--ink-3)}
.exppers{display:flex;align-items:baseline;gap:10px;margin:20px 0 8px;padding:0 2px 6px;border-bottom:2px solid var(--navy,#0d314c)}
.exppers b{font-size:16px;color:var(--ink)}.exppers small{font-size:12.5px;color:var(--ink-3)}.exppers .amt{margin-left:auto;font-weight:700;color:var(--ink)}
:root[data-theme="dark"] .exppers{border-bottom-color:var(--sky)}
.exp-install{display:none}
@media (max-width:820px){ .exp-install{display:flex} }
.exp-install{align-items:center;gap:12px;padding:12px 14px;margin:0 0 14px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--sky);border-radius:8px;font-size:13.5px;color:var(--ink)}
.exp-install img{width:40px;height:40px;border-radius:9px;flex:0 0 auto}
.exp-install b{display:block}
.exp-install small{display:block;color:var(--ink-2);font-size:12.5px;line-height:1.4}
.exp-install .x{margin-left:auto;border:0;background:transparent;color:var(--ink-3);font-size:20px;line-height:1;cursor:pointer;padding:6px}

/* app mode: launched from the home screen */
html.app-exp body{padding-left:0!important}
html.app-exp .hq.rail,html.app-exp .railscrim,html.app-exp #newtask,html.app-exp #jot{display:none!important}
html.app-exp .hqtop{margin-left:0!important;width:100%!important;padding-top:env(safe-area-inset-top,0px)}
html.app-exp .hqname{font-size:0!important;letter-spacing:0!important}
html.app-exp .hqname::after{content:"Expenses";font-size:17px!important;letter-spacing:normal}
html.app-exp main{padding:16px 14px calc(100px + env(safe-area-inset-bottom,0px))}
html.app-exp #app-expenses > .vhead{display:none}
html.app-exp #app-expenses .snapzone{min-height:180px}
.exp-dock{display:none}
.exp-hq{display:none}
html.app-exp .exp-hq{display:inline-flex;align-items:center;min-height:34px;padding:0 12px;border:1px solid rgba(255,255,255,.35);border-radius:6px;color:#fff;font-size:13.5px;font-weight:700;text-decoration:none;white-space:nowrap}
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
function dismissed(){ try{ return localStorage.getItem('tools:team-hq:exp.install.x2')==='1'; }catch(e){ return false; } }
function paintExp(){
  if(!exp) return;
  mo && mo.disconnect();
  if(!standalone && !dismissed() && !exp.querySelector(':scope > .exp-install')){
    const tip=document.createElement('div'); tip.className='exp-install';
    const img=document.createElement('img'); img.src='/team-hq/expenses-icon-180.png'; img.alt=''; img.onerror=()=>img.remove(); tip.appendChild(img);
    const tx=document.createElement('div');
    const b=document.createElement('b'); b.textContent='Put Expenses on your phone'; tx.appendChild(b);
    const s=document.createElement('small');
    /* while Expenses is open, this page is the Expenses app (see setApp below), so saving it now gives an Expenses icon */
    s.textContent = isiOS ? 'Tap Share, then Add to Home Screen. You get an Expenses icon that opens straight to Expenses. Team HQ stays its own icon.'
                  : deferred ? 'Install it and you get an Expenses icon that opens straight to Expenses. Team HQ stays its own icon.'
                  : 'Open the browser menu and tap Add to Home screen (or Install). You get an Expenses icon that opens straight to Expenses.';
    tx.appendChild(s); tip.appendChild(tx);
    if(deferred && !isiOS){ const ib=document.createElement('button'); ib.className='btn'; ib.type='button'; ib.textContent='Install'; ib.onclick=async()=>{ const d=deferred; deferred=null; tip.remove(); try{ d.prompt(); await d.userChoice; }catch(e){} }; tip.appendChild(ib); }
    const x=document.createElement('button'); x.className='x'; x.type='button'; x.setAttribute('aria-label','Hide this tip'); x.textContent='×';
    x.onclick=()=>{ try{ localStorage.setItem('tools:team-hq:exp.install.x2','1'); }catch(e){} tip.remove(); }; tip.appendChild(x);
    const vh=exp.querySelector(':scope > .vhead'); vh ? vh.after(tip) : exp.prepend(tip);
  }
  mo && mo.observe(exp, {childList:true});
}
/* Picking Expenses in Team HQ turns this page into the Expenses app while it's open: its name, icon and address
   switch to Expenses, so Add to Home Screen (or Install) right there gives an Expenses icon. Leaving Expenses
   switches everything back to Team HQ. */
let expOnNow=false;
function setApp(on){
  if(on===expOnNow) return; expOnNow=on;
  const mf=document.querySelector('link[rel="manifest"]'); if(mf) mf.href=on ? '/team-hq/expenses.webmanifest' : '/team-hq/team-hq.webmanifest';
  const ti=document.querySelector('link[rel="apple-touch-icon"]'); if(ti) ti.href=on ? '/team-hq/expenses-icon-180.png' : '/team-hq/hq-icon-180.png';
  const tm=document.querySelector('meta[name="apple-mobile-web-app-title"]'); if(tm) tm.content=on ? 'Expenses' : 'Team HQ';
  try{ const u=new URL(location.href); if(on) u.searchParams.set('app','expenses'); else u.searchParams.delete('app'); history.replaceState(history.state, '', u.pathname+u.search+u.hash); }catch(e){}
  deferred=null; const t=exp && exp.querySelector(':scope > .exp-install'); if(t){ t.remove(); paintExp(); } }
function watchExp(){
  if(appExp || standalone || !exp) return;
  const H=document.documentElement;
  /* On a phone, Safari keeps the app details it read when the page first opened, so swapping them later still saves a
     Team HQ icon. Opening Expenses on a phone therefore loads the Expenses page itself, ready for Add to Home Screen. */
  const phone=isiOS || (window.matchMedia && matchMedia('(max-width:820px)').matches);
  const check=()=>{ const on=!exp.hidden && !H.classList.contains('nx-show') && exp.offsetParent!==null;
    if(on && phone){ try{ const t=new URLSearchParams(location.search).get('try'); location.replace('/team-hq/?app=expenses'+(t ? '&try='+encodeURIComponent(t) : '')); }catch(e){} return; }
    setApp(on); };
  const o=new MutationObserver(check); o.observe(exp, {attributes:true, attributeFilter:['hidden','style','class']}); o.observe(H, {attributes:true, attributeFilter:['class']});
  window.addEventListener('pagehide', ()=>setApp(false)); check(); }
/* the Expenses app always has a way back to Team HQ */
function backLink(){ const r=document.querySelector('.hqtop-r'); if(!r){ setTimeout(backLink, 300); return; } if(r.querySelector('.exp-hq')) return;
  const a=document.createElement('a'); a.className='exp-hq'; a.href='/team-hq/'; a.textContent='Team HQ'; a.title='Go to Team HQ'; r.insertBefore(a, r.firstChild); }
if(appExp) backLink();
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
watchExp();

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

/* ---------- Expenses: put an expense with no trip into a trip you already have (November 11, 2026) ----------
   Amy, on her iPhone: a receipt snapped or emailed in without a trip lands in "No Trip Name Yet", and the only
   choice there read like starting a new report. Now that group offers one-tap buttons for the person's own
   trips that are still open (not submitted), closest in date first, and typing a new name is the second choice. */
(function(){
  const root=document.getElementById('app-expenses'); if(!root) return;
  const DAY=864e5, MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const css=document.createElement('style'); css.textContent=
    '.trippick{display:grid;gap:6px;margin:0 0 10px}.trippick .tp-l{font-size:13px;font-weight:600;color:var(--ink,#0d314c)}'+
    '.trippick .tp-b{display:flex;flex-wrap:wrap;gap:6px}.trippick button{font:inherit;font-size:14px;font-weight:600;text-align:left;border:1px solid var(--line,#c9d6e2);background:var(--surface,#fff);color:var(--ink,#0d314c);border-radius:6px;padding:8px 12px;cursor:pointer;min-height:44px}'+
    '.trippick button small{display:block;font-weight:500;font-size:12px;color:var(--ink-3,#71777F)}.trippick button.best{border-color:#0d314c;box-shadow:inset 0 0 0 1px #0d314c}'+
    '.trippick button:disabled{opacity:.6}.tripname .tp-or{display:block;font-size:13px;font-weight:600;margin:4px 0 6px;color:var(--ink,#0d314c)}';
  document.head.appendChild(css);
  const day=v=>{ const t=Date.parse(String(v||'').slice(0,10)+'T12:00:00'); return isNaN(t)?null:t; };
  const fmt=t=>{ const d=new Date(t); return MON[d.getMonth()]+' '+d.getDate(); };
  function enhance(tn){
    if(tn.dataset.tp) return; const S=window.__S; if(!S || !Array.isArray(S.expenses)) return;
    const box=tn.closest('.trip'), head=box && box.querySelector('.triph'); const ht=head ? head.textContent : '';
    let who=(S.people||[]).filter(p=>p && p.name && ht.indexOf(p.name)>=0).map(p=>p.id); if(!who.length) who=[S.me];
    const loose=S.expenses.filter(x=>!x.trip && !x.submitted && who.indexOf(x.who)>=0).map(x=>day(x.date)).filter(Boolean);
    const trips={}; S.expenses.forEach(x=>{ if(!x.trip || who.indexOf(x.who)<0) return; const T=trips[x.trip]=trips[x.trip]||{n:x.trip, days:[], open:false}; const d=day(x.date); if(d) T.days.push(d); if(!x.submitted) T.open=true; });
    const L=Object.values(trips).filter(T=>T.open).map(T=>{ const gap=loose.length && T.days.length ? Math.min(...loose.map(a=>Math.min(...T.days.map(b=>Math.abs(a-b))))) : 9e15; return Object.assign(T,{gap, first:Math.min(...T.days), last:Math.max(...T.days)}); })
      .sort((a,b)=>a.gap-b.gap || b.last-a.last).slice(0,3);
    tn.dataset.tp='1'; if(!L.length) return;
    const inp=tn.querySelector('input'), go=[...tn.querySelectorAll('button')].find(b=>/Name This Trip/.test(b.textContent)); if(!inp || !go) return;
    const n=loose.length, it=n===1?'it':'them';
    const pk=document.createElement('div'); pk.className='trippick';
    const lb=document.createElement('div'); lb.className='tp-l'; lb.textContent='Add '+it+' to a trip you already have:'; pk.appendChild(lb);
    const bs=document.createElement('div'); bs.className='tp-b'; pk.appendChild(bs);
    L.forEach((T,i)=>{ const b=document.createElement('button'); b.type='button'; if(i===0 && T.gap<=4*DAY) b.className='best';
      b.appendChild(document.createTextNode(T.n)); const sm=document.createElement('small'); sm.textContent=(T.days.length ? (T.first===T.last ? fmt(T.first) : fmt(T.first)+' – '+fmt(T.last)) : '')+(i===0 && T.gap<=4*DAY ? ' · same dates' : ''); b.appendChild(sm);
      b.onclick=()=>{ inp.value=T.n; [...bs.querySelectorAll('button')].forEach(z=>z.disabled=true); b.querySelector('small').textContent='Adding…'; go.click(); };
      bs.appendChild(b); });
    tn.insertBefore(pk, tn.firstChild);
    const or=document.createElement('span'); or.className='tp-or'; or.textContent='Or start a new trip:'; tn.insertBefore(or, inp);
    go.textContent='Start This Trip';
    const sm=tn.querySelector('small:last-of-type'); if(sm && /^Names /.test(sm.textContent)) sm.remove();
  }
  const scan=()=>root.querySelectorAll('.tripname').forEach(enhance);
  new MutationObserver(scan).observe(root, {childList:true, subtree:true}); scan();
})();
