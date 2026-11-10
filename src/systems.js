/* Connected Systems (November 7, 2026)
   A Team HQ page that shows how MISMO's systems fit together: the system map, how the data is
   protected, what each system replaced and what runs on its own. Built to match the "MISMO Connected
   Systems" page.
   - Nothing about the systems is in this code. The content lives in Team HQ's private data
     (collection "systemsmap", record "current") and arrives only after sign-in.
   - The MISMO Connections Map (a Claude Doc) is the source of truth. When Jonna says "refresh
     Connected Systems", Team HQ's Claude reads the map and saves a new "current" record.
   - Jonna can change a system's status or details, add systems and add or change connections
     in Edit mode. Every save stamps the "as of" date. Removing something sets it aside (archived)
     so it can be brought back; nothing is deleted outright.
   - Lines copied by a person are drawn dashed with no moving dot, and aren't counted as automatic.
   - Items still to confirm are marked only in Edit mode. */
(function(){
'use strict';
if(window.__hqSystems && window.__hqSystems.destroy) window.__hqSystems.destroy();
const S=window.__S; if(!S) return;
const EDITORS=['jonna'];
const NS='http://www.w3.org/2000/svg', W=148, H=40;
const ZONES={apps:'MISMO apps', mba:'MBA & Microsoft 365', out:'Outside MISMO', eng:'Engine room'};
const ST=['Live','Launching','Building'];
const AC={'--c1':'#1f74d4','--c2':'#f2602b','--c3':'#12a86b','--c4':'#d99200','--c5':'#d6336c','--c6':'#008300','--c7':'#7048e8'};
/* systems outside the MISMO apps each get their own color (November 8, 2026) */
const SYSC={aptify:'#3b5bdb', square:'#495057', outlook:'#0f6cbd', sp:'#03787c', teams:'#5b5fc7', web:'#0d314c', informz:'#b35c1e', social:'#e03131', news:'#7950f2', docu:'#c99700', signin:'#14486e', relay:'#0b7285', aws:'#f08c00', github:'#343a40', robots:'#5c7cfa', flows:'#0b66e4'};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const M={data:null, sub:false, listeners:[], err:null};
function h(t,c,x){ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function btn(c,x,f){ const b=h('button',c,x); b.type='button'; if(f) b.addEventListener('click', f); return b; }
function sv(t,a,p){ const e=document.createElementNS(NS,t); for(const k in a) e.setAttribute(k,a[k]); if(p) p.appendChild(e); return e; }
const me=()=>S.me||'';
const canEdit=()=>EDITORS.indexOf(me())>=0;
const todayISO=()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
function longDate(iso){ if(!iso) return ''; const p=String(iso).split('-'); const d=new Date(+p[0], +p[1]-1, +p[2]); return isNaN(d) ? iso : MON[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear(); }
const clone=o=>JSON.parse(JSON.stringify(o));
function fallbackCopy(t){ const a=document.createElement('textarea'); a.value=t; a.setAttribute('readonly',''); a.style.position='fixed'; a.style.opacity='0'; document.body.appendChild(a); a.select(); try{ document.execCommand('copy'); }catch(e){} a.remove(); }
function toast(msg, undo){ const t=window.__nxToast; if(t) t(msg, undo); }

/* ---------- the data: one private record, read after sign-in ---------- */
function start(){ if(M.sub || !S.db || !S.db.collection) return; M.sub=true;
  try{ S.db.collection('systemsmap').onSnapshot(snap=>{ const rq=(snap && snap.docs ? snap.docs : []).find(x=>x.id==='requests'); if(rq){ let r=null; try{ r=JSON.parse(JSON.stringify(rq.data()||{})); }catch(e){} if(r && (!M.req || r.at!==M.req.at)){ M.req=r; if(M.data && !M.data.empty && P.rsWrap && P.rsWrap.isConnected) paintTodos(M.data); } }
      const d=(snap && snap.docs ? snap.docs : []).find(x=>x.id==='current'); let b=null; try{ b=d ? JSON.parse(JSON.stringify(d.data()||{})) : null; }catch(e){ b=null; }
      if(b && Array.isArray(b.systems)){ if(M.data && !M.data.empty && b.at && b.at===M.data.at) return; /* our own save coming back */ fix(b); M.data=b; } else if(!M.data) M.data={empty:true}; else return;
      notify(false); }, e=>{ M.err=e; if(!M.data){ M.data={empty:true}; notify(false); } }); }catch(e){ M.err=e; } }
function fix(d){ d.areas=d.areas||{}; d.connections=d.connections||[]; d.protection=d.protection||[]; d.replaced=d.replaced||[]; d.automations=d.automations||[]; d.archived=d.archived||{systems:[],connections:[]};
  d.connections.forEach((c,i)=>{ if(!c.id) c.id='c'+Date.now().toString(36)+i; if(!c.how) c.how='auto'; }); }
function save(next, msg){ const prev=M.data && !M.data.empty ? clone(M.data) : null;
  next.asOf=todayISO(); next.by=me(); next.at=Date.now(); fix(next); M.data=next; M.mine=next.at; notify(true);
  return Promise.resolve().then(()=>S.db.collection('systemsmap').doc('current').set(next)).then(()=>{ if(msg) toast(msg, prev ? ()=>save(prev, 'Put back the way it was.') : null); }, e=>{ console.error(e); toast('That didn’t save. Try again in a moment.'); if(prev){ M.data=prev; notify(true); } }); }
/* own saves redraw right away; changes from elsewhere wait while you're typing in a form */
function notify(force){ if(P.el && P.el.isConnected && (force || !document.querySelector('.cs .cs-f :focus'))) draw(); M.listeners.forEach(f=>{ try{ f(); }catch(e){ console.error(e); } }); }
/* Team HQ's Claude uses this to load a refresh from the Connections Map (it keeps the layout of systems already placed). */
function load(json, opt){ if(!canEdit()) return Promise.reject(new Error('Only an editor can load Connected Systems.'));
  const d=typeof json==='string' ? JSON.parse(json) : clone(json); if(!d || !Array.isArray(d.systems) || !Array.isArray(d.connections)) return Promise.reject(new Error('That isn’t Connected Systems data.'));
  const old=M.data && !M.data.empty ? M.data : null;
  if(old && !(opt && opt.layout)){ const pos={}; old.systems.forEach(s=>pos[s.id]={x:s.x,y:s.y}); d.systems.forEach(s=>{ if(pos[s.id] && (s.x==null || s.y==null)){ s.x=pos[s.id].x; s.y=pos[s.id].y; } }); }
  d.systems.forEach(s=>{ if(s.x==null || s.y==null){ const p=freeSpot(d, s.zone||'apps'); s.x=p.x; s.y=p.y; } });
  d.refreshedAt=todayISO(); return save(d, 'Connected Systems refreshed from the Connections Map.'); }

/* ---------- where a new box goes ---------- */
function freeSpot(d, zone){ const taken=(x,y)=>d.systems.some(s=>s.x!=null && s.y!=null && Math.abs(s.x-x)<W && Math.abs(s.y-y)<H+12);
  const cand=[];
  if(zone==='apps'){ for(let y=95;y<=495;y+=75) [365,525,685,845].forEach(x=>cand.push([x,y])); }
  else if(zone==='mba') for(let y=95;y<=495;y+=13) cand.push([110,y]);
  else if(zone==='out') for(let y=95;y<=495;y+=13) cand.push([1090,y]);
  else [120,240,360,480,600,720,840,960,1080].forEach(x=>cand.push([x,640]));
  const c=cand.find(p=>!taken(p[0],p[1])) || cand[cand.length-1]; return {x:c[0], y:c[1]}; }

/* ---------- the styles: the Connected Systems look, in Team HQ's colors (light and dark) ---------- */
const css=h('style'); css.id='hq-systems';
css.textContent=`
.cs{--cs-zone:var(--surface-2);--cs-edge:color-mix(in srgb,var(--border-strong,#adc4d6) 85%,transparent);--cs-hot:var(--navy-mid,#14486e);--cs-sky:#74bfeb;--cs-card:var(--surface);font-size:15px;line-height:1.55;color:var(--ink);max-width:1680px;margin:0 auto;padding:16px clamp(16px,2.4vw,32px) 0;box-sizing:border-box}
html[data-theme="dark"] .cs{--cs-hot:#74bfeb}
@media (prefers-color-scheme: dark){ html:not([data-theme="light"]) .cs{--cs-hot:#74bfeb} }
.cs h2,.cs h3{margin:0;letter-spacing:-.015em;text-wrap:balance}
.cs-k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--cs-hot)}
/* reveal on scroll */
.cs-rv{opacity:0;transform:translateY(14px);transition:opacity .6s ease,transform .6s cubic-bezier(.2,.7,.2,1)}
.cs-rv.in{opacity:1;transform:none}
/* hero */
.cs-hero{position:relative;overflow:hidden;border-radius:16px;color:#fff;padding:30px 30px 26px;background:radial-gradient(1200px 400px at 85% -10%,rgba(116,191,235,.28),transparent 60%),radial-gradient(800px 380px at -10% 120%,rgba(27,175,122,.18),transparent 60%),linear-gradient(135deg,#06202f 0%,#0d314c 55%,#14486e 100%);box-shadow:0 18px 50px -20px rgba(6,32,47,.6)}
.cs-hero canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.55;pointer-events:none}
.cs-hero>*:not(canvas){position:relative}
.cs-htop{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.cs-pill{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.03em;color:#cfe9f8;background:rgba(255,255,255,.08);border:1px solid rgba(116,191,235,.35);border-radius:4px;padding:5px 12px}
.cs-pill i{position:relative;width:8px;height:8px;border-radius:50%;background:#3ddc97}
.cs-pill i::after{content:'';position:absolute;inset:0;border-radius:50%;background:rgba(61,220,151,.6);animation:csPing 2s ease-out infinite;will-change:transform,opacity}
@keyframes csPing{0%{transform:scale(1);opacity:.8}70%{transform:scale(3.2);opacity:0}100%{transform:scale(3.2);opacity:0}}
.cs-hero h2{font-size:clamp(28px,4.2vw,46px);font-weight:800;line-height:1.05;color:#fff}
.cs-hero h2 span{background:linear-gradient(90deg,#74bfeb,#a9f0d1);-webkit-background-clip:text;background-clip:text;color:transparent}
.cs-hero p.lede{color:#bfe2f6;margin:12px 0 20px;font-size:16px}
.cs-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.cs-stat{background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.03));border:1px solid rgba(116,191,235,.28);border-radius:12px;padding:14px 16px}
.cs-stat{font:inherit;text-align:left;color:inherit;cursor:pointer;transition:border-color .2s,background .2s,transform .2s}.cs-stat:hover{border-color:rgba(116,191,235,.7);transform:translateY(-1px)}.cs-stat.on{border-color:#74bfeb;background:linear-gradient(180deg,rgba(116,191,235,.28),rgba(116,191,235,.10))}
.cs-stat em{display:block;font-style:normal;font-size:11.5px;font-weight:700;color:#74bfeb;margin-top:8px;letter-spacing:.02em}.cs-stat em::after{content:' ›'}.cs-stat.on em::after{content:' ⌄'}
.cs-drill{position:relative;margin-top:14px;background:rgba(6,26,42,.55);border:1px solid rgba(116,191,235,.35);border-radius:12px;padding:14px 16px 16px}
.cs-dh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.cs-dh h3{margin:0;color:#fff;font-size:17px}.cs-dh p{margin:3px 0 0;color:#a9d8f3;font-size:13px}
.cs-dx{flex:none;width:30px;height:30px;border-radius:50%;border:1px solid rgba(116,191,235,.45);background:transparent;color:#fff;font-size:18px;line-height:1;cursor:pointer}.cs-dx:hover{background:rgba(116,191,235,.2)}
.cs-dg{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:6px}
.cs-di{display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-left:3px solid var(--pc,#74bfeb);border-radius:6px;padding:8px 10px;font-size:13px;color:#e9f4fb}
.cs-di.cs-go{cursor:pointer}.cs-di.cs-go:hover,.cs-di.cs-go:focus-visible{background:rgba(116,191,235,.16);outline:none}
.cs-di b{display:block;font-weight:700;color:#fff}.cs-di b i{font-style:normal;color:#74bfeb}.cs-di b s{color:#a9d8f3;font-weight:500}.cs-di small{display:block;color:#a9d8f3;font-size:12px;margin-top:2px;line-height:1.4}
.cs-dc{flex:none;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#74bfeb;border:1px solid rgba(116,191,235,.4);border-radius:4px;padding:2px 5px;margin-top:1px;max-width:92px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-stat b{display:block;font-variant-numeric:tabular-nums;font-size:34px;font-weight:800;color:#fff;line-height:1}
.cs-stat span{display:block;font-size:12.5px;color:#a9d8f3;margin-top:6px}
.cs-sbar{margin-top:16px}
.cs-sbar .bar{display:flex;height:10px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,.1)}
.cs-sbar .bar i{display:block;height:100%;transition:width 1s cubic-bezier(.2,.7,.2,1)}
.cs-sbar .lg{display:flex;flex-wrap:wrap;gap:16px;margin-top:8px;font-size:12.5px;color:#cfe9f8}
.cs-sbar .lg span{display:inline-flex;align-items:center;gap:6px}.cs-sbar .lg em{width:9px;height:9px;border-radius:50%;display:inline-block}
@media(max-width:560px){.cs-hero{padding:22px 18px}.cs-stat b{font-size:28px}}
/* section nav */
.cs-nav{position:sticky;top:0;z-index:5;display:flex;gap:6px;overflow-x:auto;padding:10px 2px;margin:10px 0 0;background:var(--surface-2,#f6fafd);scrollbar-width:none}
.cs-nav::-webkit-scrollbar{display:none}
.cs-nav button{flex:none;font:inherit;font-size:13px;font-weight:600;color:var(--ink-2);background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px 14px;cursor:pointer;transition:all .15s}
.cs-nav button:hover{color:var(--ink);border-color:var(--cs-sky)}
.cs-nav button.on{background:var(--navy,#0d314c);color:#fff;border-color:var(--navy,#0d314c)}
.cs-nav button em{font-style:normal;font-size:11px;font-weight:800;margin-left:7px;padding:1px 6px;border-radius:4px;background:var(--surface-2);color:var(--ink-2)}.cs-nav button.on em{background:rgba(255,255,255,.18);color:#fff}
.cs-nav button.map{color:var(--cs-hot);background:transparent;border-style:dashed}
.cs-band[hidden]{display:none!important}
/* sections */
.cs-band{padding:22px 0 8px;scroll-margin-top:56px}
.cs-sh{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px}
.cs-sh>div:first-child{flex:1 1 100%;min-width:0}
.cs-sh h2{font-size:24px;font-weight:800;margin-top:2px}.cs-sh p{margin:6px 0 0;color:var(--ink-2);font-size:14px}
.cs-card{background:var(--cs-card);border:1px solid var(--border);border-radius:14px;box-shadow:0 1px 0 rgba(13,49,76,.03),0 10px 30px -18px rgba(13,49,76,.25)}
/* map toolbar */
.cs-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cs-chip{border:1px solid var(--border);background:var(--surface);color:var(--ink);border-radius:4px;padding:6px 12px;font-family:inherit;font-weight:500;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .15s}
.cs-chip i{width:9px;height:9px;border-radius:50%;display:inline-block}
.cs-chip:hover{border-color:var(--cs-sky)}
.cs-chip[aria-pressed="true"]{background:var(--navy,#0d314c);color:#fff;border-color:var(--navy,#0d314c)}
.cs-find{position:relative;margin-left:auto;display:block}
.cs .cs-find input{font:inherit;font-size:13px;color:var(--ink);background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:7px 12px 7px 34px !important;width:220px;height:34px;box-sizing:border-box;margin:0}
.cs-find input:focus{outline:none;border-color:var(--cs-sky);box-shadow:0 0 0 3px color-mix(in srgb,#74bfeb 30%,transparent)}
.cs .cs-find svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:14px;height:14px;stroke:var(--ink-3);fill:none;stroke-width:2;pointer-events:none;z-index:1}
@media(max-width:700px){.cs-find{margin-left:0;width:100%}.cs-find input{width:100%}}
/* map */
.cs-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;align-items:start}
@media(max-width:1100px){.cs-grid{grid-template-columns:minmax(0,1fr)}}
.cs-mapwrap{position:relative;scroll-margin-top:62px}.cs-panel{scroll-margin-top:62px}
.cs-mapbox{overflow-x:auto;border-radius:14px}
.cs-mapbox svg{display:block;width:100%;min-width:760px;height:auto;touch-action:pan-x pan-y}
.cs-zl{font:700 11px sans-serif;font-family:inherit;letter-spacing:.14em;text-transform:uppercase;fill:var(--ink-3)}
.cs-zone{stroke:var(--rule,var(--border));stroke-width:1}
.cs-gl{font:800 9.5px sans-serif;font-family:inherit;letter-spacing:.12em;text-transform:uppercase;fill:var(--pc,var(--ink-3))}
.cs-lanebg{fill:color-mix(in srgb,var(--pc) 6%,transparent);stroke:color-mix(in srgb,var(--pc) 22%,transparent);stroke-width:1}
.cs-dotp{fill:color-mix(in srgb,var(--ink-3) 28%,transparent)}.cs-dots{pointer-events:none}
.cs-e{fill:none;stroke:color-mix(in srgb,var(--ec,#9fb3c4) 46%,transparent);stroke-width:1.5;transition:opacity .25s,stroke .25s,stroke-width .25s}
.cs-e.hand{stroke-dasharray:4 5;stroke:color-mix(in srgb,var(--ec,#a2701a) 60%,transparent)}
.cs-e.quiet{opacity:0;pointer-events:none}.cs-e.quiet.hot{opacity:.9}
.cs-e.hot{stroke:var(--ec,var(--cs-hot));stroke-width:2.8;stroke-dasharray:8 6}
.cs-mapin.moving .cs-e.hot:not(.hand):not(.soon){stroke-opacity:.2;stroke-dasharray:none}
.cs-e.hot.hand{stroke:var(--ec,#a2701a);stroke-dasharray:3 6;animation:none}
.cs-e.soon{stroke-dasharray:1 6;stroke-linecap:round;stroke-width:2;stroke:color-mix(in srgb,#9fb3c4 80%,transparent)}
.cs-e.hot.soon{stroke:#7f98ad;stroke-dasharray:1 6;stroke-width:3;animation:none}
.cs-lb.soon rect{stroke:#9fb3c4;stroke-dasharray:2 3}
.cs-fi.soon{border-style:dotted;opacity:.85}
.cs-soonb{font-size:10.5px;font-weight:700;color:#7f98ad;border:1px dotted currentColor;border-radius:4px;padding:0 5px;white-space:nowrap}
.cs-mapin{position:relative;min-width:760px}.cs-mapin canvas,.cs-mapin .cs-top{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.cs-mapin .cs-top{min-width:0;overflow:visible}.cs-top .cs-n{pointer-events:auto}
.cs-n{cursor:pointer;outline:none;transition:opacity .25s}
.cs-n .box{fill:color-mix(in srgb,var(--pc,#9fb3c4) 10%,var(--surface));stroke:color-mix(in srgb,var(--pc,#9fb3c4) 45%,var(--border));stroke-width:1.3;transition:stroke .2s,stroke-width .2s,fill .2s}
html[data-theme="dark"] .cs-n .box{fill:color-mix(in srgb,var(--pc,#9fb3c4) 18%,var(--surface))}
@media (prefers-color-scheme: dark){ html:not([data-theme="light"]) .cs-n .box{fill:color-mix(in srgb,var(--pc,#9fb3c4) 18%,var(--surface))} }
.cs-n:hover .box,.cs-n:focus-visible .box{stroke:var(--pc,var(--cs-sky));stroke-width:2.4;fill:color-mix(in srgb,var(--pc,#9fb3c4) 18%,var(--surface))}
.cs-n .bar{stroke:none}
.cs-n text{font:600 12.5px sans-serif;font-family:inherit;fill:var(--ink);pointer-events:none}
.cs-n .sub{font:500 10px ui-monospace,Menlo,monospace;fill:var(--ink-3)}
.cs-n .sd{transform-box:fill-box;transform-origin:center}
.cs-n .sd.live{fill:#2fbf71}.cs-n .sd.soon{fill:#e0a83c}.cs-n .sd.build{fill:#9fb3c4}
.cs-e.dim,.cs-lb.dim{opacity:.1}
/* a faded box stays solid, so a line passing behind it never looks like it ends there */
.cs-n.dim .box{fill:var(--surface);stroke:color-mix(in srgb,var(--border) 60%,transparent)}.cs-n.dim text,.cs-n.dim .bar,.cs-n.dim circle{opacity:.16}
.cs-n.sel .box{stroke:var(--pc,var(--cs-hot));stroke-width:3;fill:color-mix(in srgb,var(--pc,#9fb3c4) 20%,var(--surface));filter:url(#csShadow)}
.cs-n.lit .box{stroke:var(--pc,var(--cs-sky));stroke-width:2.4}
.cs-n.eng .box{fill:color-mix(in srgb,var(--pc,#14486e) 12%,var(--surface-2))}
.cs-n .cf{fill:var(--warn,#a2701a)}
.cs-lb{pointer-events:none;opacity:0;transition:opacity .25s}
.cs-lb.on{opacity:1}.cs-lb.clash{opacity:0!important}.cs-lb.short{display:none}
.cs-lb rect{fill:var(--surface);stroke:var(--cs-hot);stroke-width:1}
.cs-lb.hand rect{stroke:var(--warn,#a2701a);stroke-dasharray:3 3}
.cs-lb text{font:600 10.5px sans-serif;font-family:inherit;fill:var(--ink)}
.cs.editing .cs-n{cursor:grab}.cs.editing .cs-n.drag{cursor:grabbing}
.cs-legend{display:flex;flex-wrap:wrap;gap:16px;font-size:12.5px;color:var(--ink-2);padding:10px 14px;border-top:1px solid var(--border)}
.cs-legend span{display:inline-flex;align-items:center;gap:6px}
/* journey player: a callout on the map beside each system, and the whole story in the panel */
.cs-bub{position:absolute;z-index:3;width:270px;box-sizing:border-box;background:var(--surface);border:1.5px solid var(--cs-hot);border-radius:10px;padding:10px 12px 10px;box-shadow:0 14px 30px -14px rgba(6,32,47,.5);transition:left .35s ease,top .35s ease,opacity .2s;pointer-events:auto}
.cs-bub::before{content:'';position:absolute;left:var(--ax,50%);width:12px;height:12px;background:var(--surface);border:1.5px solid var(--cs-hot);transform:translateX(-50%) rotate(45deg)}
.cs-bub.below::before{top:-7.5px;border-right:0;border-bottom:0}.cs-bub.above::before{bottom:-7.5px;border-left:0;border-top:0}
.cs-bub.right::before,.cs-bub.left::before{left:auto;top:var(--ay,50%);transform:translateY(-50%) rotate(45deg)}.cs-bub.right::before{left:-7.5px;border-top:0;border-right:0}.cs-bub.left::before{right:-7.5px;border-bottom:0;border-left:0}
.cs-bub .bk{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--cs-hot)}
.cs-bub .bk span{margin-left:auto;display:flex;gap:4px}
.cs-bub .bk button{width:24px;height:24px;border:1px solid var(--border);background:var(--surface-2);color:var(--ink);border-radius:5px;font:inherit;font-size:13px;line-height:1;cursor:pointer;padding:0}
.cs-bub .bk button:hover{border-color:var(--cs-sky)}.cs-bub .bk button:disabled{opacity:.35;cursor:default}
.cs-bub h4{margin:4px 0 2px;font-size:14.5px;color:var(--ink)}.cs-bub p{margin:0;font-size:13px;line-height:1.45;color:var(--ink-2)}
.cs-story{padding:16px 16px 14px;display:grid;gap:10px}
.cs-story h3{margin:0;font-size:18px}.cs-story .bl{margin:0;font-size:13px;color:var(--ink-2)}
.cs-story .ctl{display:flex;gap:6px;flex-wrap:wrap}
.cs-sl{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.cs-sl li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:9px;align-items:start;padding:6px 8px;border-radius:6px;border:1px solid transparent;cursor:pointer}
.cs-sl li:hover{background:var(--surface-2)}
.cs-sl li .sn{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11.5px;font-weight:700;background:var(--surface-2);border:1px solid var(--border);color:var(--ink-2)}
.cs-sl li b{display:block;font-size:13px}.cs-sl li small{display:block;font-size:12px;color:var(--ink-3);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cs-sl li.now small{white-space:normal}.cs-sl li>div{min-width:0}
.cs-sl li.done .sn{background:color-mix(in srgb,var(--cs-sky) 30%,var(--surface));border-color:var(--cs-sky);color:var(--ink)}
.cs-sl li.now{background:color-mix(in srgb,#74bfeb 14%,var(--surface));border-color:var(--cs-sky)}
.cs-sl li.now .sn{background:var(--cs-hot);border-color:var(--cs-hot);color:#fff}.cs-sl li.now small{color:var(--ink-2)}
@media (prefers-reduced-motion: reduce){.cs-bub{transition:none}}
.cs-tour{margin:0 12px 12px;background:linear-gradient(135deg,color-mix(in srgb,#74bfeb 14%,var(--surface)),var(--surface));border:1px solid var(--cs-sky);border-radius:14px;padding:12px 14px;box-shadow:0 18px 40px -22px rgba(6,32,47,.45);display:grid;gap:6px;animation:csUp .35s ease}
@keyframes csUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cs-tour .th{display:flex;align-items:center;gap:8px}.cs-tour .th b{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--cs-hot)}
.cs-tour .th span{margin-left:auto;font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums}
.cs-tour h4{margin:0;font-size:16px}.cs-tour p{margin:0;font-size:13.5px;color:var(--ink-2)}
.cs-tour .dots{display:flex;gap:5px}.cs-tour .dots i{flex:1;height:4px;border-radius:2px;background:var(--border);transition:background .3s}.cs-tour .dots i.on{background:var(--cs-sky)}
.cs-tour .ctl{display:flex;gap:6px;justify-content:flex-end}
.cs-ib{font:inherit;font-size:12.5px;font-weight:600;border:1px solid var(--border);background:var(--surface);color:var(--ink);border-radius:8px;padding:5px 10px;cursor:pointer}
.cs-ib.pri{background:var(--navy,#0d314c);color:#fff;border-color:var(--navy,#0d314c)}
/* side panel */
.cs-start [hidden]{display:none!important}
.cs-start.tiny>p,.cs-start.tiny .cs-jbtn small{display:none}.cs-start.tiny .cs-jbtn b{font-size:13px}
.cs-mapwrap.cs-stick{position:sticky;top:62px}.cs-panel.is-intro{overflow:hidden}
.cs-panel{min-width:0;scrollbar-width:thin}
@media(max-width:1100px){.cs-panel{height:auto!important;overflow:visible;overscroll-behavior:auto}}
.cs-ph{padding:16px 18px 14px;color:#fff;background:linear-gradient(135deg,var(--pc,#14486e),color-mix(in srgb,var(--pc,#14486e) 55%,#06202f));position:relative}
.cs-ph .cs-k{color:rgba(255,255,255,.85)}
.cs-ph h3{font-size:21px;font-weight:800;margin:4px 0 8px;color:#fff;padding-right:28px}
.cs-ph .x{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:8px;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:16px;cursor:pointer;line-height:1}
.cs-pb{padding:14px 18px 18px;display:grid;gap:12px}
.cs-pb>p{margin:0;font-size:14px}
.cs-tag{display:inline-flex;align-items:center;gap:5px;font-family:inherit;font-weight:700;font-size:10.5px;line-height:1.3;letter-spacing:.05em;text-transform:uppercase;border-radius:3px;padding:2px 6px;white-space:nowrap;vertical-align:middle}
.cs-tag:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.cs-ph .cs-tag{background:rgba(255,255,255,.95)}
.cs-live{color:#0f7b5c;background:color-mix(in srgb,#0f7b5c 14%,transparent)}
.cs-soon{color:#9a6510;background:color-mix(in srgb,#e0a83c 22%,transparent)}
.cs-build{color:#456179;background:var(--surface-3,var(--surface-2))}
html[data-theme="dark"] .cs .cs-live{color:#4fc79b}
html[data-theme="dark"] .cs .cs-soon{color:#f0b95a}
html[data-theme="dark"] .cs .cs-build{color:#a6c5d9}
html[data-theme="dark"] .cs .cs-ph .cs-live{color:#0f7b5c}
html[data-theme="dark"] .cs .cs-ph .cs-soon{color:#9a6510}
html[data-theme="dark"] .cs .cs-ph .cs-build{color:#456179}
@media (prefers-color-scheme: dark){ html:not([data-theme="light"]) .cs .cs-live{color:#4fc79b} html:not([data-theme="light"]) .cs .cs-soon{color:#f0b95a} html:not([data-theme="light"]) .cs .cs-build{color:#a6c5d9} html:not([data-theme="light"]) .cs .cs-ph .cs-live{color:#0f7b5c} html:not([data-theme="light"]) .cs .cs-ph .cs-soon{color:#9a6510} html:not([data-theme="light"]) .cs .cs-ph .cs-build{color:#456179} }
.cs-flow{display:grid;gap:6px}
.cs-fl{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);display:flex;align-items:center;gap:6px}
.cs-fl small{font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink-3)}
.cs-fc{display:grid;gap:6px}
.cs-fi{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:8px;align-items:center;text-align:left;font:inherit;color:inherit;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:7px 10px;cursor:pointer;transition:all .15s}
.cs-fi:hover,.cs-fi:focus-visible{border-color:var(--cs-sky);transform:translateX(2px)}
.cs-fi i{width:8px;height:8px;border-radius:50%}
.cs-fi b{display:block;font-size:13px}.cs-fi small{display:block;font-size:12px;color:var(--ink-2);line-height:1.35}
.cs-fi.hand{border-style:dashed}
.cs-fi em{font-style:normal;font-size:11px;font-weight:700;color:var(--ink-3)}
.cs-qt{display:flex;flex-wrap:wrap;gap:5px}
.cs-qc{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;font-weight:600;color:var(--ink);background:var(--surface-2);border:1px solid var(--border);border-radius:4px;padding:3px 8px;cursor:pointer}.cs-qc:hover{border-color:var(--cs-sky)}.cs-qc i{width:7px;height:7px;border-radius:50%}
.cs-me{display:flex;align-items:center;justify-content:center;gap:8px;margin:2px 0;font-size:13px;font-weight:700;color:var(--cs-hot)}
.cs-me:before,.cs-me:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--cs-sky),transparent)}
.cs-me span{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--cs-sky);border-radius:4px;padding:3px 12px;background:color-mix(in srgb,#74bfeb 12%,transparent)}
.cs-facts{display:grid;gap:8px;font-size:13.5px}
.cs-facts div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px}
.cs-facts dt{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);padding-top:2px}
.cs-facts dd{margin:0}
.cs-facts s{color:var(--ink-3);text-decoration-color:color-mix(in srgb,var(--bad,#b3372c) 60%,transparent)}
.cs-note{font-size:12px;color:var(--ink-3);margin-top:2px}
.cs-hand{font-size:10.5px;font-weight:700;color:var(--warn,#a2701a);border:1px dashed currentColor;border-radius:4px;padding:0 5px;white-space:nowrap}
.cs-cf{display:block;margin-top:6px;font-size:12.5px;color:var(--warn,#a2701a);background:color-mix(in srgb,var(--warn,#a2701a) 10%,transparent);border-radius:8px;padding:6px 8px}
/* start-here panel */
.cs-start{padding:18px;display:grid;gap:14px}
.cs-krow{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.cs-all{font:inherit;font-size:12.5px;font-weight:700;color:var(--cs-hot);background:none;border:0;padding:0;cursor:pointer;white-space:nowrap}.cs-all:hover{text-decoration:underline}
.cs-start h3{font-size:19px;font-weight:800}
.cs-start p{margin:0;color:var(--ink-2);font-size:13.5px}
.cs-jbtn{display:flex;align-items:center;gap:10px;width:100%;text-align:left;font:inherit;color:inherit;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:9px 12px;cursor:pointer;transition:border-color .15s,transform .15s}
.cs-jbtn:hover,.cs-jbtn:focus-visible{border-color:var(--cs-sky);transform:translateY(-1px)}
.cs-jbtn .pl{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--navy,#0d314c);color:#fff}
.cs-jbtn .pl svg{width:12px;height:12px;fill:#fff;margin-left:2px}
.cs-jbtn b{display:block;font-size:13.5px}.cs-jbtn small{display:block;font-size:12px;color:var(--ink-3)}
.cs-areas{display:grid;gap:7px}
.cs-ar{display:grid;grid-template-columns:minmax(0,1fr) 90px 22px;gap:8px;align-items:center;font:inherit;font-size:13px;color:inherit;background:none;border:0;padding:2px 0;cursor:pointer;text-align:left}
.cs-ar .t{display:flex;align-items:center;gap:7px;min-width:0}.cs-ar .t i{flex:none;width:9px;height:9px;border-radius:50%}
.cs-ar .t span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-ar .m{height:6px;border-radius:3px;background:var(--surface-3,var(--border));overflow:hidden}.cs-ar .m s{display:block;height:100%;border-radius:3px}
.cs-ar b{text-align:right;font-variant-numeric:tabular-nums}
.cs-ar:hover .t span{text-decoration:underline}
/* story browser */
.cs-sb{padding:0;overflow:hidden}
.cs-sbt{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border);background:var(--surface-2)}
.cs-sbtabs{display:flex;flex-wrap:wrap;gap:6px}
.cs-sbtab{display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:13px;font-weight:600;color:var(--ink-2);background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px 10px;cursor:pointer}
.cs-sbtab i{width:8px;height:8px;border-radius:50%}.cs-sbtab em{font-style:normal;font-size:11.5px;color:var(--ink-3);font-variant-numeric:tabular-nums}
.cs-sbtab:hover{border-color:var(--cs-sky);color:var(--ink)}.cs-sbtab[aria-selected="true"]{background:var(--cs-hot);border-color:var(--cs-hot);color:var(--surface)}.cs-sbtab[aria-selected="true"] em{color:inherit;opacity:.75}
.cs-sbfind{margin-left:auto}
.cs-sbb{display:grid;grid-template-columns:minmax(0,1fr);align-items:start}
.cs-sbl{border-bottom:1px solid var(--border);padding:8px 10px 12px;display:block;column-count:4;column-gap:10px;column-rule:1px solid color-mix(in srgb,var(--border) 60%,transparent)}.cs-sbl>*{break-inside:avoid;margin-bottom:4px}.cs-sbgw>.cs-sbi{margin-top:0}@media(max-width:1300px){.cs-sbl{column-count:3}}@media(max-width:900px){.cs-sbl{column-count:2}}@media(max-width:560px){.cs-sbl{column-count:1}}
.cs-sbl-x{}
.cs-sbg{grid-column:1/-1;display:flex;align-items:center;gap:7px;flex:none;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);padding:10px 6px 4px}.cs-sbg:first-child{padding-top:4px}.cs-sbg i{width:7px;height:7px;border-radius:50%}
.cs-sbi{display:block;width:100%;text-align:left;font:inherit;color:inherit;background:none;border:1px solid transparent;border-left:3px solid var(--pc,#74bfeb);border-radius:6px;padding:8px 10px;cursor:pointer;flex:none}
.cs-sbi:hover{background:var(--surface-2)}.cs-sbi.on{background:color-mix(in srgb,#74bfeb 14%,var(--surface));border-color:var(--cs-sky);border-left-color:var(--pc,#74bfeb)}
.cs-sbi b{display:block;font-size:13.5px;line-height:1.35}.cs-sbi small{display:flex;align-items:center;gap:8px;margin-top:3px;font-size:11.5px;color:var(--ink-3)}
.cs-sbi .dots{display:inline-flex;gap:3px}.cs-sbi .dots i{width:7px;height:7px;border-radius:50%}
.cs-sbd{padding:16px 18px 18px;min-width:0;scroll-margin-top:62px}
.cs-sbh{display:flex;align-items:flex-start;gap:14px;margin-bottom:14px}.cs-sbh>div{flex:1;min-width:0}
.cs-sbh h3{margin:2px 0 4px;font-size:19px}.cs-sbh p{margin:0;font-size:13.5px;color:var(--ink-2)}
.cs-sbplay.pri{background:var(--cs-hot);border-color:var(--cs-hot);color:var(--surface)}
.cs-sbplay{flex:none;display:inline-flex;align-items:center;gap:7px;padding:8px 14px;font-size:13px}
.cs-sbs{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.cs-sbs li{position:relative;display:grid;grid-template-columns:24px minmax(0,1fr);gap:10px;align-items:start;background:var(--surface);border:1px solid var(--border);border-top:3px solid var(--pc,#74bfeb);border-radius:6px;padding:10px 12px;cursor:pointer;transition:border-color .15s,transform .15s}
.cs-sbs li:hover,.cs-sbs li:focus-visible{border-color:var(--cs-sky);border-top-color:var(--pc,#74bfeb);transform:translateY(-1px);outline:none}
.cs-sbs .sn{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;background:var(--cs-hot);color:var(--surface)}
.cs-sbs b{display:block;font-size:13.5px}.cs-sbs p{margin:3px 0 0;font-size:12.5px;line-height:1.45;color:var(--ink-2)}
@media(max-width:900px){.cs-sbb{grid-template-columns:minmax(0,1fr)}.cs-sbl{border-right:0;border-bottom:1px solid var(--border);max-height:none!important;flex-direction:row;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;overscroll-behavior-y:auto;scroll-snap-type:x proximity;padding:10px}.cs-sbl .cs-sbg{display:none}.cs-sbi{flex:0 0 210px;scroll-snap-align:start;background:var(--surface-2)}.cs-sbfind{margin-left:0;width:100%}.cs-sbh{flex-direction:column}}
/* journeys */
.cs-jgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.cs-jc{padding:16px;display:grid;gap:10px;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s;text-align:left;font:inherit;color:inherit}
.cs-jc:hover,.cs-jc:focus-visible{transform:translateY(-3px);border-color:var(--cs-sky);box-shadow:0 18px 40px -20px rgba(13,49,76,.45)}
.cs-jc h3{font-size:16.5px;font-weight:800}
.cs-jc p{margin:0;font-size:13px;color:var(--ink-2)}
.cs-steps{display:flex;flex-wrap:wrap;align-items:center;gap:4px;font-size:12px;color:var(--ink-2)}
.cs-steps span{display:inline-flex;align-items:center;gap:5px;background:var(--surface-2);border:1px solid var(--border);border-radius:4px;padding:2px 8px}
.cs-steps span i{width:7px;height:7px;border-radius:50%}
.cs-steps em{font-style:normal;color:var(--cs-sky);font-weight:700}
.cs-jc .go{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--cs-hot)}
/* security */
.cs-sec{display:grid;gap:12px}
.cs-gauge{padding:14px 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.cs-gauge svg{width:96px;height:96px;flex:none}
.cs-gauge .gt{flex:1;min-width:200px;display:grid;gap:4px}.cs-gauge .gt b{font-size:18px;font-weight:800}
.cs-gauge .gl{display:flex;flex-wrap:wrap;gap:6px}.cs-gauge .gl .cs-tag{white-space:normal;max-width:100%}.cs-sec>*{min-width:0}@media(max-width:560px){.cs-gauge{padding:14px}.cs-gauge .gt{min-width:0;flex-basis:100%}}
.cs-gauge .tr{fill:none;stroke:var(--surface-3,var(--border));stroke-width:12}
.cs-gauge .pg{fill:none;stroke:url(#csG);stroke-width:12;stroke-linecap:round;transition:stroke-dasharray 1.2s cubic-bezier(.2,.7,.2,1)}
.cs-gauge .n{font-size:32px;font-weight:800;fill:var(--ink)}.cs-gauge .of{font-size:12px;fill:var(--ink-3);font-weight:600}
.cs-gauge p{margin:0;font-size:13px;color:var(--ink-2)}
.cs-layers{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:10px}
.cs-gauge .cs-tag{text-transform:none;letter-spacing:0;font-size:12px}
@media(max-width:560px){.cs-layers{grid-template-columns:minmax(0,1fr)}}
.cs-layer{display:grid;grid-template-columns:40px minmax(0,1fr);gap:14px;align-items:start;padding:14px 16px}
.cs-layer .lt{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.cs-layer .lt .cs-tag{flex:none;margin-top:1px}
.cs-layer .n{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,#74bfeb 16%,transparent);color:var(--cs-hot)}
.cs-layer .n svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8}
.cs-layer.prog .n{background:color-mix(in srgb,#e0a83c 18%,transparent);color:#9a6510}
.cs-layer b{display:block;font-size:15px}.cs-layer p{margin:2px 0 0;color:var(--ink-2);font-size:13.5px}

/* replaced */
.cs-swaps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.cs-swap{padding:14px 16px;display:grid;gap:6px;position:relative;overflow:hidden}
.cs-swap:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--pc,#74bfeb)}
.cs-swap .old{font-size:13px;color:var(--ink-3);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--bad,#b3372c) 60%,transparent)}
.cs-swap .new{font-weight:800;font-size:16px;display:flex;align-items:center;gap:6px}
.cs-swap .new:before{content:"→";color:#74bfeb;display:inline-block;transition:transform .2s}
.cs-swap:hover .new:before{transform:translateX(4px)}
.cs-swap p{margin:0;font-size:13.5px;color:var(--ink-2)}
/* What Changed (Nov 8, 2026) */
.cs-rp-sum{display:grid;grid-template-columns:auto minmax(0,1fr);gap:28px;align-items:center;padding:20px 24px;margin-bottom:14px;background:linear-gradient(120deg,color-mix(in srgb,#74bfeb 12%,var(--surface)),var(--surface) 60%)}
.cs-rp-sum .big{display:grid;gap:2px;padding-right:28px;border-right:1px solid var(--border)}.cs-rp-sum .big b{font-size:58px;line-height:1;font-weight:800;letter-spacing:-.03em;color:var(--cs-hot)}.cs-rp-sum .big span{font-size:13px;font-weight:600;color:var(--ink-2);max-width:170px;line-height:1.3}
.cs-rp-sum .rt{display:grid;gap:12px;min-width:0}
.cs-rp-bar{display:flex;gap:3px;height:12px;border-radius:3px;overflow:hidden}.cs-rp-bar i{display:block;min-width:6px}
.cs-rp-keys{display:flex;flex-wrap:wrap;gap:8px}
.cs-rp-k{display:inline-flex;align-items:center;gap:8px;font:inherit;color:inherit;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 12px 6px 7px;cursor:pointer;transition:border-color .15s,background .15s}
.cs-rp-k b{font-size:15px;font-weight:800}.cs-rp-k span:last-child{font-size:12.5px;color:var(--ink-2)}
.cs-rp-k .ic{width:24px;height:24px;border-radius:5px;display:grid;place-items:center;background:color-mix(in srgb,var(--sc) 16%,transparent);color:var(--sc)}.cs-rp-k .ic svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.cs-rp-k.all{padding-left:12px}
.cs-rp-k:hover{border-color:var(--sc,var(--cs-sky))}.cs-rp-k[aria-pressed="true"]{border-color:var(--sc,var(--cs-hot));background:color-mix(in srgb,var(--sc,#74bfeb) 12%,var(--surface));box-shadow:inset 0 0 0 1px var(--sc,var(--cs-hot))}
.cs-rp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.cs-rp-row{display:grid;grid-template-columns:minmax(0,.85fr) 44px minmax(0,1.25fr);align-items:stretch;padding:0;overflow:hidden;transition:transform .18s,box-shadow .18s,border-color .18s}
.cs-rp-row[hidden]{display:none}.cs-rp-row.span{grid-column:1/-1}
.cs-rp-row .was{display:flex;gap:10px;align-items:flex-start;padding:14px 4px 14px 14px;background:repeating-linear-gradient(-45deg,transparent 0 7px,color-mix(in srgb,var(--ink-3) 5%,transparent) 7px 8px)}
.cs-rp-row .was .ic{flex:none;width:32px;height:32px;border-radius:7px;display:grid;place-items:center;background:color-mix(in srgb,var(--sc) 14%,var(--surface));color:var(--sc);border:1px solid color-mix(in srgb,var(--sc) 30%,transparent)}
.cs-rp-row .was .ic svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.cs-rp-row small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:3px}
.cs-rp-row .was s{display:block;font-size:13.5px;line-height:1.4;color:var(--ink-2);text-decoration:none}
.cs-rp-row .arw{display:grid;place-items:center;color:var(--pc)}.cs-rp-row .arw svg{width:36px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;overflow:visible}
.cs-rp-row .arw .ln{stroke-dasharray:4 4;transition:stroke-dashoffset .5s}.cs-rp-row .arw .hd{transition:transform .2s}
.cs-rp-row .now{position:relative;padding:14px 16px 14px 18px;background:color-mix(in srgb,var(--pc) 8%,var(--surface));border-left:1px solid color-mix(in srgb,var(--pc) 22%,transparent)}
.cs-rp-row .now:before{content:"";position:absolute;right:0;top:0;bottom:0;width:4px;background:var(--pc)}
.cs-rp-row .now small{color:color-mix(in srgb,var(--pc) 75%,var(--ink))}
.cs-rp-row .now b{display:block;font-size:16px;line-height:1.3;font-weight:800;color:var(--ink)}
.cs-rp-row .now p{margin:4px 0 0;font-size:13px;line-height:1.45;color:var(--ink-2)}
.cs-rp-row.cs-go{cursor:pointer}.cs-rp-row.cs-go:hover,.cs-rp-row.cs-go:focus-visible{transform:translateY(-2px);box-shadow:0 10px 24px -14px color-mix(in srgb,var(--pc) 70%,transparent);border-color:color-mix(in srgb,var(--pc) 45%,var(--border))}
.cs-rp-row:hover .arw .ln{stroke-dashoffset:-16}.cs-rp-row:hover .arw .hd{transform:translateX(3px)}
@media(max-width:1100px){.cs-rp-grid{grid-template-columns:minmax(0,1fr)}.cs-rp-row.span{grid-column:auto}}
@media(max-width:640px){.cs-rp-sum{grid-template-columns:minmax(0,1fr);gap:14px;padding:16px}.cs-rp-sum .big{border-right:0;padding-right:0;display:flex;align-items:baseline;gap:10px}.cs-rp-sum .big b{font-size:44px}.cs-rp-sum .big span{max-width:none}
 .cs-rp-keys{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px}.cs-rp-keys::-webkit-scrollbar{display:none}.cs-rp-k{flex:none}
 .cs-rp-row{grid-template-columns:minmax(0,1fr)}.cs-rp-row .was{padding:12px 14px 4px}.cs-rp-row .arw{height:26px;justify-items:start;padding-left:22px}.cs-rp-row .arw svg{transform:rotate(90deg);width:22px}.cs-rp-row .now{border-left:0;border-top:1px solid color-mix(in srgb,var(--pc) 22%,transparent);padding:12px 18px 14px 14px}}
/* Coverage (Nov 8, 2026) */
.cs-cv{display:grid;gap:12px}.cs-cv .av{box-shadow:none}
.cs-cv-ros{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.cs-cv-p{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto auto;column-gap:10px;row-gap:8px;align-items:center;text-align:left;font:inherit;color:inherit;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;cursor:pointer;position:relative;transition:border-color .15s,box-shadow .15s,transform .15s}
.cs-cv-p:hover{border-color:var(--cs-sky);transform:translateY(-1px)}
.cs-cv-p .av,.cs-cv-det .who .av{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:12.5px;font-weight:800;background:var(--cs-hot);color:var(--surface)}
.cs-cv-p .tx{min-width:0}.cs-cv-p .tx b{display:block;font-size:14.5px;line-height:1.25}.cs-cv-p .tx small{display:block;font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-cv-p .mb{grid-column:1/-1;display:flex;gap:2px;height:6px;border-radius:2px;overflow:hidden;background:var(--surface-2)}.cs-cv-p .mb i{display:block}
.cs-cv-p em{grid-column:1/-1;font-style:normal;font-size:11.5px;font-weight:700;color:var(--ink-3);margin-top:-3px}
.cs-cv-p[aria-selected="true"]{border-color:var(--cs-hot);box-shadow:inset 0 0 0 1px var(--cs-hot),0 8px 20px -14px var(--cs-hot);background:color-mix(in srgb,#74bfeb 10%,var(--surface))}
.cs-cv-p[aria-selected="true"]:after{content:"";position:absolute;left:50%;bottom:-8px;width:12px;height:12px;background:inherit;border-right:1px solid var(--cs-hot);border-bottom:1px solid var(--cs-hot);transform:translateX(-50%) rotate(45deg)}
.cs-cv-det{display:grid;grid-template-columns:minmax(0,1fr);padding:0;overflow:hidden}
.cs-cv-det .side{display:grid;grid-template-columns:minmax(220px,max-content) max-content minmax(0,1fr);gap:22px;align-items:center;padding:18px 20px;background:linear-gradient(100deg,color-mix(in srgb,#74bfeb 13%,var(--surface)),var(--surface-2));border-bottom:1px solid var(--border)}
.cs-cv-det .who{display:flex;gap:12px;align-items:center}.cs-cv-det .who .av{width:52px;height:52px;font-size:17px}.cs-cv-det .who h3{margin:0;font-size:19px;line-height:1.2}.cs-cv-det .who p{margin:2px 0 0;font-size:12.5px;color:var(--ink-3)}
.cs-cv-det .st{display:flex;gap:8px}
.cs-cv-det .st .s{display:grid;grid-template-columns:26px auto;grid-template-rows:auto auto;column-gap:8px;align-items:center;padding:8px 12px 8px 9px;border-radius:7px;background:var(--surface);border:1px solid var(--border);min-width:118px}.cs-cv-det .st .s .ic{grid-row:span 2}
.cs-cv-det .st .s.zero{display:none}
.cs-cv-det .st .ic,.cs-cv-det .its .ic{width:26px;height:26px;border-radius:6px;display:grid;place-items:center;background:color-mix(in srgb,var(--kc) 16%,transparent);color:var(--kc)}
.cs-cv-det .st svg,.cs-cv-det .its svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cs-cv-det .st b{font-size:20px;font-weight:800;line-height:1}.cs-cv-det .st span:last-child{font-size:11.5px;color:var(--ink-2);white-space:nowrap}
.cs-cv-det .bk{align-self:stretch;display:flex;flex-direction:column;justify-content:center;padding:10px 14px;border-radius:8px;background:color-mix(in srgb,#1f9d63 9%,var(--surface));border:1px solid color-mix(in srgb,#1f9d63 30%,transparent)}
.cs-cv-det .bk small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#13784b;margin-bottom:3px}.cs-cv-det .bk p{margin:0;font-size:13px;line-height:1.45;color:var(--ink-2)}
.cs-cv-det .bk.sys{background:var(--surface);border-color:var(--border)}.cs-cv-det .bk.sys small{color:var(--ink-3)}.cs-cv-det .bk .sl{display:flex;flex-wrap:wrap;gap:6px 14px}.cs-cv-det .bk .sy{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--ink-2)}.cs-cv-det .bk .sy:before{content:"";width:9px;height:9px;border-radius:2px;background:var(--pc)}
html[data-theme="dark"] .cs-cv-det .bk:not(.sys) small{color:#5fd29a}
@media (prefers-color-scheme: dark){ html:not([data-theme="light"]) .cs-cv-det .bk:not(.sys) small{color:#5fd29a} }
.cs-cv-det .its{list-style:none;margin:0;padding:16px 18px 6px;column-count:2;column-gap:12px}.cs-cv-det .its.c3{column-count:3}
.cs-cv-det .its li{break-inside:avoid;margin:0 0 10px;padding:11px 13px 12px;border:1px solid var(--border);border-top:3px solid var(--kc);border-radius:8px;background:var(--surface);transition:transform .15s,box-shadow .15s,border-color .15s}
.cs-cv-det .its .tg{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px}.cs-cv-det .its .tg .ic{width:20px;height:20px;border-radius:5px}.cs-cv-det .its .tg svg{width:12px;height:12px}
.cs-cv-det .its .sy{margin-left:auto;display:inline-flex;align-items:center;gap:5px;text-transform:none;letter-spacing:0;font-size:11.5px;font-weight:600;color:var(--ink-2)}.cs-cv-det .its .sy:before{content:"";width:8px;height:8px;border-radius:2px;background:var(--pc)}
.cs-cv-det .its b{display:block;font-size:14px;line-height:1.3}.cs-cv-det .its p{margin:3px 0 0;font-size:12.5px;line-height:1.45;color:var(--ink-2)}
.cs-cv-det .its li.cs-go{cursor:pointer}.cs-cv-det .its li.cs-go:hover,.cs-cv-det .its li.cs-go:focus-visible{transform:translateY(-2px);box-shadow:0 8px 18px -12px var(--kc)}
@media(max-width:1180px){.cs-cv-det .side{grid-template-columns:minmax(0,1fr) max-content}.cs-cv-det .bk{grid-column:1/-1}.cs-cv-det .its.c3{column-count:2}}
@media(max-width:700px){.cs-cv-ros{display:flex;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px 10px}.cs-cv-ros::-webkit-scrollbar{display:none}.cs-cv-p{flex:none;width:200px}
 .cs-cv-det .side{grid-template-columns:minmax(0,1fr);gap:12px;padding:16px}.cs-cv-det .st .s{flex:1;min-width:0}.cs-cv-det .its,.cs-cv-det .its.c3{column-count:1;padding:14px 14px 4px}}
.cs-swipe{display:none}.cs-chipset{display:contents}
/* phones: one easy scroll down the page (November 8, 2026) */
@media(max-width:900px){
 .cs-panel.is-intro{display:none}
 .cs-swipe{display:block;font-size:12px;color:var(--ink-3);padding:8px 14px 0}
 .cs-chipset,.cs-sbtabs{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;scrollbar-width:none;width:100%;padding-bottom:2px}.cs-chipset::-webkit-scrollbar,.cs-sbtabs::-webkit-scrollbar{display:none}
 .cs-chipset>*,.cs-sbtabs>*{flex:none}.cs-tools .cs-find{flex:1 0 100%;margin:0}.cs-tools .cs-find input{width:100%}
 .cs-legend{gap:6px 14px;font-size:12px}
}
@media(max-width:560px){
 .cs-hero h2{font-size:26px}.cs-hero .lede{font-size:14px;line-height:1.5}.cs-stat{padding:12px}.cs-stat span{font-size:12px}
 .cs-band{margin-top:28px}.cs-sh h2{font-size:21px}.cs-sh p{font-size:13.5px}
 .cs-swaps{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.cs-swap{padding:10px 12px}.cs-swap p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px}
 .cs-wkg li small,.cs-cad li small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
 .cs-wkg li.open small,.cs-cad li.open small{display:block}
 .cs-sbs{grid-template-columns:minmax(0,1fr);gap:6px}.cs-sbs li{padding:8px 10px}
}
/* automation */
.cs-cad{display:grid;gap:10px}
.cs-cadcol{padding:12px 14px;display:grid;grid-template-columns:230px minmax(0,1fr);gap:14px;align-items:center}
@media(max-width:760px){.cs-cadcol{grid-template-columns:minmax(0,1fr)}}
.cs-cadh{display:flex;align-items:center;gap:10px}
.cs-cadh .ic{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#0d314c,#14486e);color:#74bfeb}
.cs-cadh .ic svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9}
.cs-cadh h3{font-size:13.5px;font-weight:800;line-height:1.25}
.cs-cadh em{margin-left:auto;font-style:normal;font-size:12px;font-weight:800;color:var(--cs-hot);background:color-mix(in srgb,#74bfeb 16%,transparent);border-radius:4px;padding:1px 8px}
.cs-cadcol ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}
.cs-cadcol li{font-size:13.5px;font-weight:600;line-height:1.35;padding:6px 8px 6px 10px;border-left:3px solid #74bfeb;border-radius:0 8px 8px 0;background:var(--surface-2)}
.cs-cadcol li small{display:block;color:var(--ink-3);font-size:12px;font-weight:500}
/* clickable rows */
.cs-go{cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s}
.cs-go:hover,.cs-go:focus-visible{border-color:var(--cs-sky);box-shadow:0 0 0 1px var(--cs-sky),0 14px 30px -18px rgba(13,49,76,.5)}
.cs-cadcol li.cs-go:hover,.cs-cadcol li.cs-go:focus-visible{box-shadow:none;background:color-mix(in srgb,#74bfeb 14%,var(--surface-2));transform:translateX(2px)}
.cs-gh{display:inline-block;margin-top:4px;font-size:11.5px;font-weight:700;color:var(--cs-hot);opacity:.75}
.cs-go:hover .cs-gh{opacity:1}
.cs-foot{color:var(--ink-3);font-size:12.5px;padding:16px 0 30px}
.cs-empty{background:var(--surface);border:1px dashed var(--border);border-radius:14px;padding:28px;text-align:center;color:var(--ink-2)}
/* edit mode */
.cs-ebar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;background:color-mix(in srgb,#74bfeb 14%,var(--surface));border:1px solid color-mix(in srgb,#74bfeb 45%,var(--border));border-radius:12px;padding:9px 12px;margin:12px 0 0;font-size:13px}
.cs-ebar b{margin-right:auto}
.cs-ep{padding:18px}
.cs-ep h3{font-size:19px;margin:4px 0 10px}
.cs-f{display:grid;gap:10px}.cs-f label{display:grid;gap:3px;font-size:12px;font-weight:600;color:var(--ink-3);letter-spacing:.02em}
.cs-f input,.cs-f select,.cs-f textarea{font:inherit;font-size:13.5px;color:var(--ink);background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:7px 9px;width:100%;box-sizing:border-box;resize:vertical}
.cs-f .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cs-f .acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:4px}
.cs-f .need{border-color:var(--bad,#b3372c)}
.cs-cl{display:grid;gap:6px;margin:6px 0 0}
.cs-ci{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:start;border:1px solid var(--border);border-radius:8px;padding:6px 8px;font-size:12.5px}
.cs-ci b{font-weight:600}.cs-ci small{display:block;color:var(--ink-3)}
.cs-ci .x{display:flex;gap:4px}
.cs-sbtn{font:inherit;font-size:12px;border:1px solid var(--border);background:var(--surface);color:var(--ink);border-radius:6px;padding:3px 8px;cursor:pointer}
.cs-sbtn.pri,.cs-btn.pri{background:var(--navy,#0d314c);color:#fff;border-color:var(--navy,#0d314c)}
.cs-btn{font:inherit;font-size:13px;font-weight:600;border:1px solid var(--border);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 12px;cursor:pointer}
.cs-btn.danger{color:var(--bad,#b3372c)}
@media (prefers-reduced-motion: reduce){ .cs-mapin canvas{display:none} .cs *{transition:none!important;animation:none!important} .cs-rv{opacity:1;transform:none} }

/* road to rock solid */
.cs-rs{display:grid;gap:12px}
.cs-rsum{padding:16px 18px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:center}
.cs-rsum .big{font-size:40px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.cs-rsum .big small{display:block;font-size:12px;font-weight:600;color:var(--ink-3);margin-top:4px}
.cs-rsum .bar{height:10px;border-radius:4px;background:var(--surface-3,var(--border));overflow:hidden}.cs-rsum .bar i{display:block;height:100%;background:linear-gradient(90deg,#74bfeb,#2fbf71);border-radius:4px;transition:width 1s}
.cs-rsum .meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:12.5px;color:var(--ink-2)}
.cs-who{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.cs-sys{overflow:hidden}
.cs-sysh{display:grid;grid-template-columns:10px minmax(0,1fr) 150px 64px 18px;gap:12px;align-items:center;width:100%;text-align:left;font:inherit;color:inherit;background:none;border:0;padding:12px 16px;cursor:pointer}
.cs-sysh:hover{background:var(--surface-2)}
.cs-sysh>i{width:10px;height:10px;border-radius:50%}
.cs-sysh b{font-size:15px}.cs-sysh .nm{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}.cs-sysh .nm small{font-size:12px;color:var(--ink-3)}
.cs-sysh .pg{height:7px;border-radius:4px;background:var(--surface-3,var(--border));overflow:hidden}.cs-sysh .pg s{display:block;height:100%;background:linear-gradient(90deg,#74bfeb,#2fbf71)}
.cs-sysh .lf{font-size:12.5px;font-weight:700;color:var(--cs-hot);text-align:right;font-variant-numeric:tabular-nums}
.cs-sysh .lf.done{color:#2fbf71}
.cs-sysh .cv{width:14px;height:14px;transition:transform .2s;stroke:var(--ink-3);fill:none;stroke-width:2}
.cs-sys.open .cs-sysh .cv{transform:rotate(180deg)}
@media(max-width:640px){.cs-sysh{grid-template-columns:10px minmax(0,1fr) 54px 16px}.cs-sysh .pg{display:none}}
.cs-tl2{display:grid;gap:6px;padding:0 16px 14px 38px}
.cs-ti{border:1px solid var(--border);border-radius:10px;background:var(--surface-2);overflow:hidden}
.cs-tih{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 10px}
.cs-ck{width:22px;height:22px;border-radius:6px;border:1.5px solid var(--border-strong,var(--border));background:var(--surface);display:grid;place-items:center;cursor:pointer;padding:0}
.cs-ck svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:3;opacity:0}
.cs-ck.on{background:#2fbf71;border-color:#2fbf71}.cs-ck.on svg{opacity:1}
.cs-ck[disabled]{cursor:default}
.cs-tt{font:inherit;font-size:13.5px;font-weight:600;color:inherit;background:none;border:0;padding:0;text-align:left;cursor:pointer}
.cs-ti.done .cs-tt{color:var(--ink-3);text-decoration:line-through}
.cs-tg{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.cs-wb{font-size:11px;font-weight:700;border-radius:4px;padding:2px 8px;white-space:nowrap;background:color-mix(in srgb,#74bfeb 16%,transparent);color:var(--cs-hot)}
.cs-wb.you{background:var(--navy,#0d314c);color:#fff}
.cs-wb.ext{background:color-mix(in srgb,#e0a83c 20%,transparent);color:#9a6510}
.cs-kb{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.cs-tid{padding:0 12px 12px 42px;font-size:13px;color:var(--ink-2);display:grid;gap:6px}
.cs-tid small{color:var(--ink-3)}
.cs-sysf{display:flex;justify-content:flex-end;padding:0 16px 14px}
/* Road to Rock Solid (Nov 8, 2026) */
.cs-rsum2{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:22px;align-items:center;padding:18px 22px;background:linear-gradient(110deg,color-mix(in srgb,#2fbf71 9%,var(--surface)),var(--surface) 55%)}
.cs-rsum2 .ring{position:relative;width:80px;height:80px}.cs-rsum2 .ring svg{width:80px;height:80px;transform:rotate(-90deg)}.cs-rsum2 .ring circle{fill:none;stroke-width:8}.cs-rsum2 .ring .bg{stroke:var(--surface-3,var(--border))}.cs-rsum2 .ring .fg{stroke:#2fbf71;stroke-linecap:round;transition:stroke-dasharray 1s}
.cs-rsum2 .ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:17px;font-weight:800}
.cs-rsum2 .st{padding-right:22px;border-right:1px solid var(--border)}.cs-rsum2 .big{display:flex;align-items:baseline;gap:8px}.cs-rsum2 .big b{font-size:44px;font-weight:800;line-height:1;color:var(--cs-hot);font-variant-numeric:tabular-nums}.cs-rsum2 .big span{font-size:14px;font-weight:700;color:var(--ink-2)}
.cs-rsum2 .st p{margin:4px 0 0;font-size:12.5px;color:var(--ink-3)}
.cs-rsum2 .cs-lks{display:grid;grid-template-columns:repeat(var(--n,6),minmax(0,1fr));gap:8px}@media(max-width:1400px){.cs-rsum2 .cs-lks{grid-template-columns:repeat(var(--n2,3),minmax(0,1fr))}}@media(max-width:560px){.cs-rsum2 .cs-lks{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cs-rsum2 .cs-lks .l{display:grid;gap:1px;padding:8px 12px;border-radius:8px;background:var(--surface);border:1px solid var(--border)}.cs-rsum2 .cs-lks .l b{font-size:20px;font-weight:800;line-height:1.1}.cs-rsum2 .cs-lks .l span{font-size:12px;color:var(--ink-2)}
.cs-rsum2 .cs-lks .l.you{background:var(--navy,#0d314c);border-color:var(--navy,#0d314c)}.cs-rsum2 .cs-lks .l.you b,.cs-rsum2 .cs-lks .l.you span{color:#fff}
.cs-rsec{display:grid;gap:10px;margin-top:8px}
.cs-rsh{display:flex;align-items:baseline;gap:6px 14px;flex-wrap:wrap}.cs-rsh h3{margin:0;font-size:17px}.cs-rsh span{font-size:13px;color:var(--ink-3);flex:1;min-width:200px}
.cs-mini2{font:inherit;font-size:12.5px;font-weight:700;color:var(--cs-hot);background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:5px 10px;cursor:pointer}.cs-mini2:hover{border-color:var(--cs-sky)}
.cs-cols3,.cs-cols2{column-count:3;column-gap:0;column-rule:1px solid var(--border);padding:0;overflow:hidden}.cs-cols2{column-count:2}
.cs-cols3>*,.cs-cols2>*{break-inside:avoid;-webkit-column-break-inside:avoid}
.cs-lh{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 9px;background:var(--surface-2);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.cs-grp:first-child .cs-lh{border-top:0}.cs-lh b{font-size:13.5px}.cs-lh em{font-style:normal;font-size:12px;font-weight:800;min-width:24px;text-align:center;padding:2px 7px;border-radius:5px;background:var(--surface);color:var(--ink-2)}
.cs-lh.you{background:var(--navy,#0d314c);border-color:var(--navy,#0d314c)}.cs-lh.you b{color:#fff}.cs-lh.you em{background:rgba(255,255,255,.16);color:#fff}
.cs-rsum2 .cs-lks .l{font:inherit;text-align:left;cursor:pointer;color:inherit;transition:border-color .15s,box-shadow .15s,transform .15s}.cs-rsum2 .cs-lks .l:hover{border-color:var(--cs-sky);transform:translateY(-1px)}
.cs-rsum2 .cs-lks .l.on{box-shadow:inset 0 0 0 2px var(--cs-sky);border-color:var(--cs-sky)}.cs-rsum2 .cs-lks .l.you.on{box-shadow:inset 0 0 0 2px #74bfeb}
.cs-fil{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:var(--ink-2)}.cs-none2{padding:14px 16px;font-size:13px;color:var(--ink-3)}
.cs-rqsum{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12.5px;color:var(--ink-2)}.cs-rqsum b{font-size:15px;color:var(--ink)}
.cs-rqbox{column-count:2;column-gap:0;column-rule:1px solid var(--border);padding:4px 0}
.cs-rqg{break-inside:avoid;padding:8px 14px 10px;border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent)}
.cs-rqg .gh{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}.cs-rqg .gh .cs-rtag{font-size:12.5px;font-weight:800;color:var(--ink);text-transform:uppercase;letter-spacing:.04em}
.cs-rqg .gh em{font-style:normal;font-size:11.5px;font-weight:800;min-width:22px;text-align:center;padding:1px 6px;border-radius:5px;background:var(--surface-2);color:var(--ink-2)}
.cs-rqg .rq{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:8px;align-items:center;padding:4px 0;border-radius:6px}
.cs-rqg .rq .cs-ck{width:18px;height:18px;border-radius:5px}.cs-rqg .rq .cs-ck svg{width:12px;height:12px}
.cs-rqg .rq .cs-tt{font-size:13px;font-weight:500;line-height:1.35}.cs-rqg .rq .cs-tt:hover{color:var(--cs-hot);text-decoration:underline}
.cs-rqg .rq.open .cs-tt{font-weight:700}.cs-rqg .rq.done .cs-tt{color:var(--ink-3);text-decoration:line-through}
.cs-rqg .rq .tgs{display:flex;gap:4px}.cs-rqg .rq .tgs span{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:4px;white-space:nowrap}
.cs-rqg .rq .due{background:color-mix(in srgb,#e0a83c 20%,transparent);color:#9a6510}.cs-rqg .rq .aws{background:color-mix(in srgb,#74bfeb 20%,transparent);color:var(--cs-hot)}.cs-rqg .rq .lat{background:var(--surface-2);color:var(--ink-3)}
.cs-rqg .rq .dt{grid-column:2/-1;padding:4px 0 8px;display:grid;gap:6px}.cs-rqg .rq .dt small{font-size:11.5px;color:var(--ink-3)}
.cs-rqg .rq.open{background:var(--surface-2);padding:6px 8px;margin:2px -8px}
.cs-rsum2 .cs-lks .l.ok b{color:#2b8a3e}
.cs-dsw{padding:4px 14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));column-gap:24px;margin-bottom:10px}
.cs-dsw .w{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:start;padding:10px 0;border-bottom:1px solid color-mix(in srgb,var(--border) 60%,transparent)}
.cs-dsw .w .n{font-size:22px;font-weight:800;line-height:1;min-width:34px;height:34px;display:grid;place-items:center;border-radius:8px;background:color-mix(in srgb,#2b8a3e 14%,var(--surface));color:#2b8a3e}
.cs-dsw .w p{margin:0 0 5px;font-size:13.5px;font-weight:700;line-height:1.35}.cs-dsw .w .tgs{display:flex;flex-wrap:wrap;gap:4px 12px}.cs-dsw .w .dt{font-size:11.5px;color:var(--ink-3);white-space:nowrap;padding-top:2px}
.cs-dsg{break-inside:avoid;padding:8px 14px 10px;border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent)}
.cs-dsg .gh{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}.cs-dsg .gh .cs-rtag{font-size:12.5px;font-weight:800;color:var(--ink);text-transform:uppercase;letter-spacing:.04em}
.cs-dsg .gh em{font-style:normal;font-size:11.5px;font-weight:800;min-width:22px;text-align:center;padding:1px 6px;border-radius:5px;background:color-mix(in srgb,#2b8a3e 14%,var(--surface));color:#2b8a3e}
.cs-dsg .it{display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px;padding:3px 0;font-size:12.5px;line-height:1.35}.cs-dsg .it .dt{color:var(--ink-3);font-size:11.5px;padding-top:1px;white-space:nowrap}
.cs-dsg .cs-mini2{margin-top:4px}
.cs-copyp{display:inline-flex;align-items:center;gap:6px;margin-left:auto;align-self:center}.cs-rsh .cs-copyp span{flex:none;min-width:0;color:inherit;font-size:inherit}.cs-copyp svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:900px){.cs-rqbox{column-count:1}}
.cs-ri.none{display:block;font-size:13px;color:var(--ink-3)}.cs-ri .asked{font-size:11.5px;color:var(--ink-3)}.cs-rqd{display:grid;gap:6px;margin-top:4px;font-size:12.5px;line-height:1.5;color:var(--ink-2)}.cs-rqd p{margin:0}.cs-rqd ul{margin:0;padding-left:18px;display:grid;gap:3px}.cs-rqd b{color:var(--ink);font-weight:700}
.cs-ri .due{font-size:11px;font-weight:700;padding:1px 6px;border-radius:4px;background:color-mix(in srgb,#e0a83c 20%,transparent);color:#9a6510}
.cs-rqf{display:grid;grid-template-columns:140px 200px minmax(0,1fr) minmax(0,1fr) auto;gap:10px;align-items:end;padding:12px 14px}
.cs-rqf label{display:grid;gap:4px;font-size:11.5px;font-weight:700;color:var(--ink-3)}.cs-rqf input,.cs-rqf select{font:inherit;font-size:13.5px;padding:7px 9px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);min-width:0}
@media(max-width:1100px){.cs-cols3{column-count:2}.cs-rqf{grid-template-columns:1fr 1fr}.cs-rqf label:nth-child(3),.cs-rqf label:nth-child(4){grid-column:1/-1}}
@media(max-width:700px){.cs-cols3,.cs-cols2{column-count:1}}
.cs-lane{padding:4px 0 6px;overflow:hidden}.cs-lane .lh{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;border-bottom:1px solid var(--border)}
.cs-lane .lh b{font-size:13.5px}.cs-lane .lh em{font-style:normal;font-size:12px;font-weight:800;min-width:24px;text-align:center;padding:2px 7px;border-radius:5px;background:var(--surface-2);color:var(--ink-2)}
.cs-lane.you .lh{background:var(--navy,#0d314c);border-bottom-color:var(--navy,#0d314c)}.cs-lane.you .lh b{color:#fff}.cs-lane.you .lh em{background:rgba(255,255,255,.16);color:#fff}
.cs-ri{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;align-items:start;padding:9px 14px;border-top:1px solid color-mix(in srgb,var(--border) 60%,transparent);position:relative}
.cs-ri:first-of-type{border-top:0}.cs-ri:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--pc);opacity:.85}
.cs-ri .tx{min-width:0;display:grid;gap:4px}.cs-ri .cs-tt{font-size:13.5px;line-height:1.35}.cs-ri p{margin:2px 0 0;font-size:12.5px;line-height:1.45;color:var(--ink-2)}.cs-ri small{font-size:11.5px;color:var(--ink-3)}
.cs-ri .mt{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cs-ri .mt .who{font-size:11px;font-weight:700;color:#9a6510}
.cs-ri.done .cs-tt{color:var(--ink-3);text-decoration:line-through}.cs-ri.open{background:var(--surface-2)}
.cs-rtag{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:11.5px;font-weight:600;color:var(--ink-2);background:none;border:0;padding:0;cursor:pointer;white-space:nowrap}.cs-rtag:before{content:"";width:8px;height:8px;border-radius:2px;background:var(--pc)}.cs-rtag:hover{color:var(--cs-hot);text-decoration:underline}
.cs-sn{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;padding:6px 0}
.cs-sn .tb{padding:4px 16px}.cs-sn .tb+.tb{border-left:1px solid var(--border)}
.cs-sn .hr,.cs-sn .r{display:grid;grid-template-columns:minmax(0,1fr) repeat(4,68px);align-items:center;gap:4px}
.cs-sn .hr{padding:6px 0;border-bottom:1px solid var(--border)}.cs-sn .hr span{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);text-align:center;line-height:1.2}
.cs-sn .r{padding:5px 0;border-bottom:1px solid color-mix(in srgb,var(--border) 55%,transparent)}.cs-sn .r:last-child{border-bottom:0}.cs-sn .r .cs-rtag{font-size:13px;color:var(--ink);white-space:normal;text-align:left}
.cs-sn .c{justify-self:center;width:24px;height:24px;border-radius:6px;display:grid;place-items:center;padding:0;font:inherit;border:1.5px solid transparent}
.cs-sn .c svg{width:14px;height:14px;fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.cs-sn .c.ok{background:#2fbf71}.cs-sn .c.todo{background:var(--surface);border:1.5px dashed color-mix(in srgb,#e0a83c 80%,var(--border));cursor:pointer}.cs-sn .c.todo svg{opacity:0}
.cs-sn button.c.todo:hover{background:color-mix(in srgb,#e0a83c 14%,var(--surface))}.cs-sn button.c.todo:hover svg{opacity:.35;stroke:#9a6510}.cs-sn button.c[disabled]{cursor:default}
.cs-later{padding:14px 16px}.cs-later .its{grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px 16px!important}
.cs-later .m{padding:14px 16px;border-left:1px solid var(--border)}.cs-later .m:first-child{border-left:0}
.cs-later h4{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.cs-later .its{display:grid;gap:8px}.cs-later .it{display:grid;grid-template-columns:40px minmax(0,1fr);gap:10px;align-items:center}
.cs-later .dt{display:grid;place-items:center;height:40px;border-radius:7px;background:color-mix(in srgb,var(--pc) 12%,var(--surface));border:1px solid color-mix(in srgb,var(--pc) 35%,transparent);line-height:1}.cs-later .dt b{font-size:15px}.cs-later .dt small{font-size:9.5px;font-weight:700;text-transform:uppercase;color:var(--ink-3)}
.cs-later .it .cs-rtag{font-size:12.5px;color:var(--ink)}.cs-later .it .t{display:block;font-size:12px;color:var(--ink-3);margin-top:1px}
@media(max-width:1100px){.cs-sn{grid-template-columns:minmax(0,1fr)}.cs-sn .tb+.tb{border-left:0;border-top:1px solid var(--border)}.cs-rsum2{grid-template-columns:auto minmax(0,1fr)}.cs-rsum2 .cs-lks{grid-column:1/-1}.cs-rsum2 .st{border-right:0}}
@media(max-width:700px){.cs-sn .hr,.cs-sn .r{grid-template-columns:minmax(0,1fr) repeat(4,46px)}.cs-sn .hr span{font-size:9px}.cs-sn .tb{padding:4px 12px}.cs-rsum2{padding:16px}.cs-rsum2 .big b{font-size:36px}}


/* what depends on one person */
.cs-wk-sum{display:flex;flex-wrap:wrap;gap:6px;padding:10px;margin-bottom:12px}
.cs-wk-p{display:inline-flex;align-items:center;gap:9px;font:inherit;color:inherit;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:6px 12px 6px 6px;cursor:pointer;text-align:left}
.cs-wk-p:hover{border-color:var(--cs-sky)}.cs-wk-p b{display:block;font-size:13px}.cs-wk-p small{display:block;font-size:11.5px;color:var(--ink-3)}
.cs-wk-p .av,.cs-wkh .av{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:11.5px;font-weight:800;background:var(--cs-hot);color:var(--surface)}
.cs-wks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}
.cs-wk.wide{grid-column:span 2;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px;align-items:start}.cs-wk.wide>.cs-wkh,.cs-wk.wide>.cs-wkb{grid-column:1/-1}
@media(max-width:1180px){.cs-wks{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.cs-wks{grid-template-columns:minmax(0,1fr)}.cs-wk.wide{grid-column:auto;grid-template-columns:minmax(0,1fr)}}
.cs-wk{padding:14px;display:grid;gap:10px;scroll-margin-top:70px}
.cs-wkh{display:flex;align-items:center;gap:10px}.cs-wkh .av{width:38px;height:38px;font-size:13px}.cs-wkh h3{margin:0;font-size:16px}.cs-wkh p{margin:1px 0 0;font-size:12.5px;color:var(--ink-3)}
.cs-wkgh{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-2);margin-bottom:5px}
.cs-wkgh .ic{width:20px;height:20px;border-radius:5px;display:grid;place-items:center}.cs-wkgh .ic svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2}
.cs-wkgh em{font-style:normal;color:var(--ink-3);font-weight:600}
.cs-wkg.acct .ic{background:color-mix(in srgb,#e0a83c 20%,transparent);color:#9a6510}.cs-wkg.hands .ic{background:color-mix(in srgb,#74bfeb 22%,transparent);color:var(--cs-hot)}.cs-wkg.cover .ic{background:color-mix(in srgb,#2fbf71 16%,transparent);color:#0f7b5c}
.cs-wkg ul{list-style:none;margin:0;padding:0;display:grid;gap:5px}
.cs-wkg li{font-size:13px;line-height:1.35;padding:6px 10px;border-radius:0 6px 6px 0;background:var(--surface-2);border-left:3px solid #74bfeb}
.cs-wkg.acct li{border-left-color:#e0a83c}.cs-wkg.cover li{border-left-color:#2fbf71}
.cs-wkg li b{display:block;font-weight:600}.cs-wkg li small{display:block;color:var(--ink-3);font-size:12px;margin-top:1px}
.cs-wkg li.cs-go:hover,.cs-wkg li.cs-go:focus-visible{background:color-mix(in srgb,#74bfeb 14%,var(--surface-2));transform:translateX(2px)}
.cs-wkb{font-size:12.5px;color:var(--ink-2);border-top:1px solid var(--border);padding-top:8px}.cs-wkb b{color:#0f7b5c}
.cs-kp-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0;margin-bottom:12px;overflow:hidden}
.cs-kp-sum .k{padding:14px 18px;border-left:4px solid #74bfeb}
.cs-kp-sum .k+.k{border-top:0}
.cs-kp-sum .k.risk{border-left-color:#d9534f}.cs-kp-sum .k.wait{border-left-color:#e0a83c}.cs-kp-sum .k.backup{border-left-color:#2fbf71}
.cs-kp-sum b{display:block;font-size:30px;font-weight:800;line-height:1}.cs-kp-sum span{font-size:12.5px;color:var(--ink-2)}
.cs-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;align-items:start}
.cs-kpc{padding:14px}
.cs-kph{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}
.cs-kph .ic{flex:none;width:34px;height:34px;border-radius:8px;display:grid;place-items:center}
.cs-kph .ic svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9}
.cs-kpc.risk .ic{background:color-mix(in srgb,#d9534f 14%,transparent);color:#b3372c}
.cs-kpc.wait .ic{background:color-mix(in srgb,#e0a83c 20%,transparent);color:#9a6510}
.cs-kpc.backup .ic{background:color-mix(in srgb,#2fbf71 16%,transparent);color:#0f7b5c}
.cs-kph h3{font-size:15px;font-weight:800}.cs-kph p{margin:2px 0 0;font-size:12.5px;color:var(--ink-3)}
.cs-kpc ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.cs-kpc li{font-size:13.5px;line-height:1.35;padding:7px 10px;border-radius:0 6px 6px 0;background:var(--surface-2);border-left:3px solid #74bfeb}
.cs-kpc.risk li{border-left-color:#d9534f}.cs-kpc.wait li{border-left-color:#e0a83c}.cs-kpc.backup li{border-left-color:#2fbf71}
.cs-kpc li b{display:block;font-weight:600}.cs-kpc li small{display:block;color:var(--ink-3);font-size:12px;margin-top:1px}
.cs-kpc li.cs-go:hover,.cs-kpc li.cs-go:focus-visible{box-shadow:none;background:color-mix(in srgb,#74bfeb 14%,var(--surface-2));transform:translateX(2px)}
/* the dashboard tile */
.cs-tile .cs-tn{display:flex;gap:14px;flex-wrap:wrap;margin-top:4px}
.cs-tile .cs-tn div b{display:block;font-size:24px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.cs-tile .cs-tn div small{font-size:11.5px;opacity:.75}
.cs-tile .cs-tl{display:grid;gap:4px;margin-top:8px;font-size:12.5px}
.cs-tile .cs-tl span{display:flex;justify-content:space-between;gap:8px}.cs-tile .cs-tl em{font-style:normal;opacity:.75;white-space:nowrap}
.cs-tile svg.cs-mini{display:block;width:100%;height:auto;margin-top:6px}
`;
document.head.appendChild(css);

/* ---------- small pictures ---------- */
const ICO={
  shield:'<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  grid:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
  chart:'<path d="M3 20h18M6 20v-6M11 20V6M16 20v-9M21 20V9"/>',
  tool:'<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
  db:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  doc:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  fast:'<circle cx="12" cy="13" r="8"/><path d="M12 13l4-3M12 2v3M9 2h6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  day:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
  week:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  rocket:'<path d="M12 3c3 2 5 5.5 5 9.5L15 17H9l-2-4.5C7 8.5 9 5 12 3z"/><circle cx="12" cy="10" r="1.8"/><path d="M9 17l-2 4 3-1.5M15 17l2 4-3-1.5"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  play:'<path d="M6 4l14 8-14 8z"/>', search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
};
const svgI=(k)=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICO[k]||'')+'</svg>';
function layerIcon(t){ t=(t||'').toLowerCase(); return /sign-in|role/.test(t)?'users':/key|password/.test(t)?'key':/email/.test(t)?'mail':/history|private/.test(t)?'db':/record/.test(t)?'lock':/source of truth|aptify/.test(t)?'doc':'shield'; }
function cadIcon(t){ t=(t||'').toLowerCase(); return /launch|website/.test(t)?'rocket':/moment/.test(t)?'bolt':/minute/.test(t)?'fast':/hour/.test(t)?'clock':/daily|day/.test(t)?'day':/week/.test(t)?'week':'clock'; }
const reduce=()=>!!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- the page ---------- */
const P={el:null, filter:null, sel:null, hover:null, edit:false, form:null, q:'', jr:null, counted:false};
function areaName(d,s){ return s.area && d.areas[s.area] ? d.areas[s.area].name : (ZONES[s.zone]||''); }
function colorOf(d,s){ return s.area && d.areas[s.area] ? (AC[d.areas[s.area].c]||'#74bfeb') : (SYSC[s.id] || (s.zone==='eng' ? '#14486e' : '#7f98ad')); }
function stKey(s){ return s.status==='Live'?'live':s.status==='Launching'?'soon':'build'; }
function stTag(s){ return h('span','cs-tag cs-'+stKey(s), s.status==='Live' ? 'Live' : (s.statusNote||s.status||'Building')); }
function counts(d){ const apps=d.systems.filter(s=>s.zone==='apps').length; const auto=d.connections.filter(c=>c.how!=='hand' && c.how!=='soon' && !c.quiet).length, soonN=d.connections.filter(c=>c.how==='soon').length;
  const jobs=d.automations.reduce((n,g)=>n+(g.items||[]).length,0); const A=d.systems.filter(s=>s.zone==='apps');
  return {apps, auto, hand:d.connections.filter(c=>c.how==='hand').length, soonN, jobs, swaps:swaps(d).length,
  live:A.filter(s=>s.status==='Live').length, launching:A.filter(s=>s.status==='Launching').length, building:A.filter(s=>s.status!=='Live' && s.status!=='Launching').length, soon:A.filter(s=>s.status!=='Live')}; }
function appRank(d){ const r={}; let i=0; (d.appGroups||[]).forEach(g=>(g.ids||[]).forEach(id=>{ if(r[id]==null) r[id]=i++; })); return id=>r[id]==null ? 999 : r[id]; }
function swaps(d){ const L=d.replaced.slice(), have=new Set(L.map(r=>r.sys).filter(Boolean));
  d.systems.filter(x=>x.zone==='apps' && x.replaced && !have.has(x.id)).forEach(x=>L.push({before:x.replaced, after:x.name, detail:x.what||'', sys:x.id}));
  return L; }
function confirms(d){ return d.systems.filter(s=>s.confirm).length + d.connections.filter(c=>c.confirm).length; }
function journeys(d){ return (Array.isArray(d.journeys)?d.journeys:[]).map(j=>Object.assign({}, j, {steps:(j.steps||[]).filter(st=>d.systems.some(s=>s.id===st.sys))})).filter(j=>j.steps.length>1); }

function page(){ start(); const root=h('div','cs'+(P.edit?' editing':'')); P.el=root; draw(); return root; }
/* a redraw (a save from anywhere) keeps the reader exactly where they were: the section at the top of the screen stays put (November 8, 2026) */
function scroller(el){ for(let n=el && el.parentElement; n && n!==document.body; n=n.parentElement){ const o=getComputedStyle(n).overflowY; if((o==='auto'||o==='scroll') && n.scrollHeight>n.clientHeight+1) return n; } return document.scrollingElement || document.documentElement; }
function draw(){ const root=P.el; if(!root) return; if(!root.isConnected || !root.firstChild) return draw0();
  const sc=scroller(root), vt=sc===document.scrollingElement||sc===document.documentElement ? 0 : sc.getBoundingClientRect().top;
  const marks=[...root.querySelectorAll('.cs-hero, .cs-grid, section.cs-band')]; let ai=-1, at=0; for(let i=0;i<marks.length;i++){ const r=marks[i].getBoundingClientRect(); if(r.bottom>vt+1){ ai=i; at=r.top; break; } }
  const st0=sc.scrollTop; root.style.minHeight=root.offsetHeight+'px'; draw0();
  if(ai>=0){ const m2=[...root.querySelectorAll('.cs-hero, .cs-grid, section.cs-band')][ai]; if(m2){ const dt=m2.getBoundingClientRect().top-at; if(Math.abs(dt)>.5) sc.scrollTop+=dt; } } else sc.scrollTop=st0;
  requestAnimationFrame(()=>{ const m3=ai>=0 && [...root.querySelectorAll('.cs-hero, .cs-grid, section.cs-band')][ai]; const before=m3 ? m3.getBoundingClientRect().top : 0; root.style.minHeight=''; if(m3){ const dt=m3.getBoundingClientRect().top-before; if(Math.abs(dt)>.5) sc.scrollTop+=dt; } }); }
/* the page stops its animations while you scroll, so scrolling stays smooth */
let SCROLLED=0; try{ document.addEventListener('scroll', ()=>{ SCROLLED=performance.now(); }, {capture:true, passive:true}); window.addEventListener('wheel', ()=>{ SCROLLED=performance.now(); }, {passive:true}); window.addEventListener('touchmove', ()=>{ SCROLLED=performance.now(); }, {passive:true}); }catch(e){}
const scrolling=now=>(now||performance.now())-SCROLLED<220;
function draw0(){ const root=P.el; if(!root) return; root.textContent=''; root.className='cs'+(P.edit?' editing':'');
  const d=M.data;
  if(!d){ root.appendChild(h('div','cs-empty','Getting Connected Systems…')); return; }
  if(d.empty){ const e=h('div','cs-empty'); e.appendChild(h('b',null,'Connected Systems hasn’t been loaded yet.')); e.appendChild(h('p',null, canEdit() ? 'Ask Team HQ’s Claude to “refresh Connected Systems” and it will bring everything in from the MISMO Connections Map.' : 'Jonna will bring it in from the MISMO Connections Map.')); root.appendChild(e); return; }
  const c=counts(d), J=journeys(d);
  root.appendChild(hero(d, c));
  /* section nav */
  const nav=h('nav','cs-nav'); nav.setAttribute('aria-label','Sections'); root.appendChild(nav); const secs=[];
  const addSec=(label, el)=>{ secs.push([label, el]); };
  if(P.edit) root.appendChild(editBar(d));
  /* map */
  const b1=band('How it fits together','The System Map', P.edit ? 'Edit mode: select a box to change it, drag a box to move it, or use Add a System and Add a Connection above.' : 'MBA and Microsoft 365 on the left, MISMO’s own apps in the middle, the outside world on the right, and the shared engine underneath. Point at a box to see what it touches; select it for the full story.');
  const tl=h('div','cs-tools'); const cset=h('div','cs-chipset'); chips(d, cset); tl.appendChild(cset); tl.appendChild(finder(d)); b1.appendChild(tl);
  const g=h('div','cs-grid'); g.style.marginTop='12px';
  const left=h('div','cs-card cs-mapwrap'); const mb=h('div','cs-mapbox'); const sw0=h('p','cs-swipe','Swipe the map sideways to see all of it; tap a box for its details.'); left.appendChild(sw0); const mi=h('div','cs-mapin'); mi.appendChild(map(d)); if(pulseOn){ mi.classList.add('moving'); mi.appendChild(pulses()); } mi.appendChild(P.svgTop); P.mapin=mi; if('ResizeObserver' in window){ const ro=new ResizeObserver(()=>{ if(!mi.isConnected){ ro.disconnect(); return; } placeBub(); }); ro.observe(mi); } mb.appendChild(mi); left.appendChild(mb);
  const lg=h('div','cs-legend'); lg.innerHTML='<span><svg width="30" height="8" aria-hidden="true"><line x1="0" y1="4" x2="30" y2="4" stroke="var(--ink-3)" stroke-width="2"/><circle cx="20" cy="4" r="3" fill="var(--cs-hot)"/></svg>Work moving automatically (in the color of the system it leaves)</span><span><svg width="30" height="8" aria-hidden="true"><line x1="0" y1="4" x2="30" y2="4" stroke="var(--ink-3)" stroke-width="1.8" stroke-dasharray="4 4"/></svg>Copied by a person</span><span><svg width="30" height="8" aria-hidden="true"><line x1="1" y1="4" x2="29" y2="4" stroke="#9fb3c4" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 6"/></svg>Not live yet</span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#2fbf71"/></svg>Live</span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#e0a83c"/></svg>Launching</span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#9fb3c4"/></svg>Building</span>'+(P.edit?'<span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill="#a2701a"/></svg>To confirm</span>':'');
  left.appendChild(lg); P.tourHost=left; g.appendChild(left);
  const panel=h('aside','cs-card cs-panel'); panel.setAttribute('aria-live','polite'); g.appendChild(panel); P.panel=panel; balance(left, panel); b1.appendChild(g); root.appendChild(b1); addSec('System Map', b1);
  /* journeys */
  if(J.length && !P.edit){ const nSys=new Set(); J.forEach(x=>x.steps.forEach(z=>nSys.add(z.sys)));
    const bj=band('Follow the work','How Work Moves, Step by Step', J.length+' stories across '+nSys.size+' systems. Pick an area, then a story; play it to watch it travel across the map.');
    const sb=h('div','cs-card cs-sb'); bj.appendChild(sb); stories(d, sb); root.appendChild(bj); addSec('Follow the Work', bj); }
  /* the road to rock solid */
  if(Array.isArray(d.todos) && d.todos.length){ const br=todoBand(d); root.appendChild(br); addSec('To Rock Solid', br); }
  if(d.keyperson && Array.isArray(d.keyperson.people) && d.keyperson.people.length){ const bk=peopleBand(d); root.appendChild(bk); addSec(d.keyperson.nav||'Coverage', bk); }
  else if(d.keyperson && Array.isArray(d.keyperson.groups) && d.keyperson.groups.length){ const bk=keyBand(d); root.appendChild(bk); addSec('Depends on Jonna', bk); }
  /* protection */
  const inPlace=d.protection.filter(l=>/in place/i.test(l.status||'')).length;
  const b2=band('Security','How the Data Is Protected','Each layer stands on its own, so a problem in one doesn’t expose the rest. Select a layer to see where it lives on the map.');
  const sec=h('div','cs-sec'); const ga=h('div','cs-card cs-gauge cs-rv'); const C=2*Math.PI*58, f=d.protection.length ? inPlace/d.protection.length : 0;
  ga.innerHTML='<svg viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="csG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#74bfeb"/><stop offset="1" stop-color="#2fbf71"/></linearGradient></defs><circle class="tr" cx="75" cy="75" r="58"/><circle class="pg" cx="75" cy="75" r="58" transform="rotate(-90 75 75)" stroke-dasharray="0 '+C.toFixed(1)+'"/><text class="n" x="75" y="88" text-anchor="middle">'+inPlace+'/'+d.protection.length+'</text></svg>';
  { const gt=h('div','gt'); gt.appendChild(h('b',null, inPlace+' of '+d.protection.length+' layers in place')); gt.appendChild(h('p',null, d.protection.length-inPlace ? 'Underway with MBA IT:' : 'Every layer is in place.')); const gl=h('div','gl'); d.protection.filter(l=>!/in place/i.test(l.status||'')).forEach(l=>gl.appendChild(h('span','cs-tag cs-soon',l.title))); if(gl.children.length) gt.appendChild(gl); ga.appendChild(gt); }
  setTimeout(()=>{ const pg=ga.querySelector('.pg'); if(pg) pg.setAttribute('stroke-dasharray', (C*f).toFixed(1)+' '+C.toFixed(1)); }, reduce()?0:250);
  sec.appendChild(ga); const ly=h('div','cs-layers');
  d.protection.forEach((l,i)=>{ const ok=/in place/i.test(l.status||''); const r=h('div','cs-card cs-layer cs-rv'+(ok?'':' prog')); const n=h('div','n'); n.innerHTML=svgI(layerIcon(l.title)); r.appendChild(n); const tx=h('div'); const lt=h('div','lt'); lt.appendChild(h('b',null,l.title)); lt.appendChild(h('span','cs-tag '+(ok?'cs-live':'cs-soon'), l.status||'')); tx.appendChild(lt); tx.appendChild(h('p',null,l.detail)); r.appendChild(tx); goTo(r, l.sys, d, tx); ly.appendChild(r); });
  sec.appendChild(ly); b2.appendChild(sec); root.appendChild(b2); addSec('Security', b2);
  /* replaced */
  const b3=swapBand(d); root.appendChild(b3); addSec('What Changed', b3);
  /* automation */
  const b4=band('Automation','What Runs on Its Own','Work that used to wait for someone to remember it now happens on a schedule or the moment something changes. Select any job to see where it runs.'); const cd=h('div','cs-cad');
  d.automations.forEach(gp=>{ const col=h('div','cs-card cs-cadcol cs-rv'); const hd=h('div','cs-cadh'); const ic=h('span','ic'); ic.innerHTML=svgI(cadIcon(gp.cadence)); hd.appendChild(ic); hd.appendChild(h('h3',null,gp.cadence)); hd.appendChild(h('em',null,String((gp.items||[]).length))); col.appendChild(hd);
    const ul=h('ul'); (gp.items||[]).forEach(it=>{ const li=h('li',null,it.name); li.appendChild(h('small',null,it.detail)); goTo(li, it.sys, d, null); ul.appendChild(li); }); col.appendChild(ul); cd.appendChild(col); }); b4.appendChild(cd); root.appendChild(b4); addSec('On Its Own', b4);
  const ft=h('p','cs-foot'); ft.textContent='As of '+longDate(d.asOf)+'. Brought in from the MISMO Connections Map'+(d.refreshedAt?' on '+longDate(d.refreshedAt):'')+(c.hand?'; '+c.hand+' connection'+(c.hand>1?'s are':' is')+' copied by a person and shown dashed':'')+(c.soonN?'; '+c.soonN+' '+(c.soonN>1?'aren’t':'isn’t')+' live yet and '+(c.soonN>1?'are':'is')+' dotted':'')+'.'; root.appendChild(ft);
  /* nav buttons */
  /* everything below the map is one section at a time: the nav is a row of tabs, so the page never becomes an endless scroll (November 8, 2026) */
  const tabs=secs.slice(1); if(!tabs.some(x=>x[0]===P.secTab)) P.secTab=tabs.length ? tabs[0][0] : null;
  const cnt={'Follow the Work':journeys(d).length, 'What Changed':swaps(d).length, 'On Its Own':c.jobs, 'Security':d.protection.filter(l=>/in place/i.test(l.status||'')).length+'/'+d.protection.length};
  { const T=(d.todos||[]).reduce((n,g)=>n+(g.items||[]).filter(it=>!it.done && !(dueOf(it) && (dueOf(it)-new Date())/864e5>LATER_DAYS)).length,0)+((M.req&&M.req.items)||[]).filter(x=>!x.done).length; cnt['To Rock Solid']=T; }
  if(d.keyperson && d.keyperson.people) cnt[d.keyperson.nav||'Coverage']=d.keyperson.people.filter(x=>(x.items||[]).length).length;
  const show=(label, scroll)=>{ P.secTab=label; tabs.forEach(([l, el])=>{ el.hidden= l!==label; }); [...nav.children].forEach(b=>{ const on=b.dataset.tab===label; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    if(scroll){ const el=(tabs.find(x=>x[0]===label)||[])[1]; if(el) requestAnimationFrame(()=>el.scrollIntoView({block:'start', behavior:reduce()?'auto':'smooth'})); } };
  P.showTab=show; nav.setAttribute('role','tablist');
  secs.forEach(([label, el], i)=>{ const b=btn(i===0?'map':'', null, ()=> i===0 ? el.scrollIntoView({block:'start', behavior:reduce()?'auto':'smooth'}) : show(label, true)); b.dataset.tab=i===0?'':label; if(i){ b.setAttribute('role','tab'); }
    if(i===0){ b.innerHTML='<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;margin-right:6px;vertical-align:-2px"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'; b.append(label); } else { b.append(label); if(cnt[label]!=null) b.appendChild(h('em',null,String(cnt[label]))); } nav.appendChild(b); });
  show(P.secTab, false);
  if(P.sel && !d.systems.some(s=>s.id===P.sel)) P.sel=null;
  paintState(); side(); reveal(root); if(P.jr) tourCard(); }
/* ---------- the road to rock solid: what's left on each system ---------- */
const FIRST=['m360','team','orders','cms'];
function whoLabel(w, sy){ return w==='claude' ? (sy ? sy.name+'’s Claude' : 'Its Claude') : w; }
function whoCls(w){ return w==='You' ? 'you' : (w==='claude' || /claude/i.test(w)) ? '' : 'ext'; }
function todoBand(d){ const b=band('Road to rock solid','What’s Left to Make Each System Rock Solid','What’s open now, who it’s waiting on, and the four safety nets every system gets. Things that aren’t due for months, like key renewals, wait in Coming Up Later and don’t count until they’re close.');
  const wrap=h('div','cs-rs'); b.appendChild(wrap); P.rsWrap=wrap; paintTodos(d); return b; }
/* Road to Rock Solid, redesigned November 8, 2026: open now by who it waits on, a safety-net grid, and a timeline for later */
const SAFE=[['guide','Guide',/how-it-works guide/i],['tests','Auto tests',/automatic tests/i],['pub','Auto publishing',/automatic publishing/i],['log','Change log',/change log/i]];
const LATER_DAYS=60;
function dueOf(it){ if(it.due){ const x=new Date(it.due); if(!isNaN(x)) return x; } const m=/before ([A-Z][a-z]{2,8} \d{1,2}, \d{4})/.exec(it.t||''); if(m){ const x=new Date(m[1]); if(!isNaN(x)) return x; } return null; }
function laneOf(w){ return w==='You' ? 'You' : w==='claude' ? 'claude' : /^(MBA IT|Higher Logic)$/.test(w) ? 'MBA IT and Higher Logic' : w; }
function paintTodos(d){ const wrap=P.rsWrap; if(!wrap) return; wrap.textContent=''; const by={}; d.systems.forEach(s=>by[s.id]=s); const R=appRank(d), ed=canEdit(), now=new Date();
  const T=d.todos.filter(g=>by[g.sys] && (g.items||[]).length); const all=[]; T.forEach(g=>g.items.forEach(it=>all.push({g, it, sys:g.sys})));
  const safeK=it=>{ if(it.who!=='claude') return null; const k=SAFE.find(z=>z[2].test(it.t) && !/:/.test(it.t)); return k ? k[0] : null; };
  const later=all.filter(x=>{ const due=dueOf(x.it); return due && !x.it.done && (due-now)/864e5>LATER_DAYS; });
  const isLater=new Set(later.map(x=>x.it.id)); const safe=all.filter(x=>safeK(x.it)); const isSafe=new Set(safe.map(x=>x.it.id));
  const rest=all.filter(x=>!isLater.has(x.it.id) && !isSafe.has(x.it.id));
  const openNow=all.filter(x=>!x.it.done && !isLater.has(x.it.id)), doneN=all.filter(x=>x.it.done).length, countable=all.length-later.length;
  /* summary */
  const sm=h('div','cs-card cs-rsum2'); const ring=h('div','ring'); const pct=countable ? Math.round(doneN/countable*100) : 0; const C=2*Math.PI*34;
  ring.innerHTML='<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" class="bg"/><circle cx="40" cy="40" r="34" class="fg" stroke-dasharray="'+(C*pct/100).toFixed(1)+' '+C.toFixed(1)+'"/></svg>'; ring.appendChild(h('b',null,pct+'%')); sm.appendChild(ring);
  const st=h('div','st'); const big=h('div','big'); big.appendChild(h('b',null,String(openNow.length))); big.appendChild(h('span',null,'open now')); st.appendChild(big);
  st.appendChild(h('p',null, doneN+' done · '+later.length+' scheduled for later, not counted yet')); sm.appendChild(st);
  const lanesAll=[...new Set(rest.filter(x=>!x.it.done).map(x=>laneOf(x.it.who)))]; const LORD=['You','Perry','MBA IT and Higher Logic','claude','Website Claude']; lanesAll.sort((a,b)=>((LORD.indexOf(a)+1)||9)-((LORD.indexOf(b)+1)||9));
  const lk=h('div','cs-lks'); const lname=l=>l==='claude' ? 'Each system’s Claude' : l==='You' ? 'Waiting on you' : l;
  /* each tile filters Open Now to that lane; select it again for everyone. Perry's tile also counts his relay and AWS requests */
  const rqOpen=(M.req && Array.isArray(M.req.items)) ? M.req.items.filter(x=>!x.done).length : 0; if(rqOpen && lanesAll.indexOf('Perry')<0) lanesAll.splice(Math.min(1,lanesAll.length),0,'Perry');
  const jump=sel=>{ requestAnimationFrame(()=>{ const t=wrap.querySelector(sel); if(t) t.scrollIntoView({block:'start', behavior:reduce()?'auto':'smooth'}); }); };
  lanesAll.forEach(l=>{ const n=rest.filter(x=>!x.it.done && laneOf(x.it.who)===l).length+(l==='Perry'?rqOpen:0); const r=btn('l'+(l==='You'?' you':'')+(P.rsLane===l?' on':''),null,()=>{ P.rsLane=P.rsLane===l?null:l; paintTodos(M.data); jump(P.rsLane==='Perry' && rqOpen ? '.cs-rqsec' : '.cs-opennow'); }); r.setAttribute('aria-pressed',String(P.rsLane===l)); r.title=P.rsLane===l?'Show everyone':'Show only '+lname(l); r.appendChild(h('b',null,String(n))); r.appendChild(h('span',null,lname(l))); lk.appendChild(r); });
  const sn=safe.filter(x=>!x.it.done).length; if(sn){ const r=btn('l',null,()=>jump('.cs-snsec')); r.title='Go to Safety Nets'; r.appendChild(h('b',null,String(sn))); r.appendChild(h('span',null,'Safety nets to build')); lk.appendChild(r); }
  const DS=doneSoFar(d, all, by); if(DS.length){ const r=btn('l ok',null,()=>jump('.cs-dssec')); r.title='Go to Done So Far'; r.appendChild(h('b',null,String(DS.length))); r.appendChild(h('span',null,'Done so far')); lk.appendChild(r); }
  lk.style.setProperty('--n', lk.children.length); lk.style.setProperty('--n2', Math.ceil(lk.children.length/2)); sm.appendChild(lk); wrap.appendChild(sm);
  const tag=sy=>{ const t=btn('cs-rtag',null,()=>select(sy.id,true)); t.style.setProperty('--pc',colorOf(d,sy)); t.textContent=sy.name; t.title='Show '+sy.name+' on the map'; return t; };
  const check=(x)=>{ const ck=btn('cs-ck'+(x.it.done?' on':'')); ck.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; ck.setAttribute('aria-label',(x.it.done?'Mark not done: ':'Mark done: ')+x.it.t); ck.setAttribute('aria-pressed', String(!!x.it.done)); if(ed) ck.addEventListener('click', ()=>toggleTodo(x.sys, x.it.id)); else { ck.disabled=true; ck.title='Jonna checks these off'; } return ck; };
  /* open now, by who it waits on, packed into three even columns */
  const showDone=!!P.rsDone; const sec=h('div','cs-rsec cs-opennow'); const sh=h('div','cs-rsh'); sh.appendChild(h('h3',null,'Open Now')); sh.appendChild(h('span',null,'By who it’s waiting on. Select an item for the details.'));
  const tg=btn('cs-mini2', showDone ? 'Hide finished' : 'Show finished ('+rest.filter(x=>x.it.done).length+')', ()=>{ P.rsDone=!P.rsDone; paintTodos(M.data); }); sh.appendChild(tg); sec.appendChild(sh);
  if(P.rsLane){ const f=h('div','cs-fil'); f.append('Showing only '+lname(P.rsLane)+' '); f.appendChild(btn('cs-mini2','Show everyone', ()=>{ P.rsLane=null; paintTodos(M.data); })); sec.appendChild(f); }
  const lanes=[...new Set(rest.filter(x=>showDone || !x.it.done).map(x=>laneOf(x.it.who)))].filter(l=>!P.rsLane || l===P.rsLane).sort((a,b)=>((LORD.indexOf(a)+1)||9)-((LORD.indexOf(b)+1)||9));
  /* one card, three newspaper columns: the browser balances them, so the columns always end level */
  const box=h('div','cs-card cs-cols3');
  lanes.forEach(l=>{ const L=rest.filter(x=>(showDone||!x.it.done) && laneOf(x.it.who)===l).sort((a,b)=>(a.it.done?1:0)-(b.it.done?1:0) || R(a.sys)-R(b.sys));
    const lh=h('div','cs-lh'+(l==='You'?' you':'')); lh.appendChild(h('b',null,lname(l))); lh.appendChild(h('em',null,String(L.filter(x=>!x.it.done).length)));
    L.forEach((x,k)=>{ const sy=by[x.sys]; const it=x.it; const row=h('div','cs-ri'+(it.done?' done':'')+(P.rsItem===it.id?' open':'')); row.style.setProperty('--pc',colorOf(d,sy)); row.appendChild(check(x));
      const tx=h('div','tx'); const tt=btn('cs-tt', it.t); tt.setAttribute('aria-expanded', String(P.rsItem===it.id)); tt.addEventListener('click', ()=>{ P.rsItem=P.rsItem===it.id?null:it.id; paintTodos(M.data); }); tx.appendChild(tt);
      const mt=h('div','mt'); mt.appendChild(tag(sy)); if(!/claude/i.test(l) && laneOf(it.who)!==it.who) mt.appendChild(h('span','who',it.who)); tx.appendChild(mt);
      if(P.rsItem===it.id){ if(it.d) tx.appendChild(h('p',null,it.d)); if(it.src) tx.appendChild(h('small',null,'From: '+it.src)); if(it.done && it.at) tx.appendChild(h('small',null,'Done '+new Date(it.at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+(it.by?' by '+it.by.replace(/^./,c=>c.toUpperCase()):''))); }
      row.appendChild(tx);
      if(k===0){ const g=h('div','cs-grp'); g.appendChild(lh); g.appendChild(row); box.appendChild(g); } else box.appendChild(row); }); });
  if(box.children.length) sec.appendChild(box); else sec.appendChild(h('div','cs-card cs-none2','Nothing open here.')); wrap.appendChild(sec);
  reqSection(d, wrap, by, tag);
  /* the four safety nets, one row per system */
  const ss=[...new Set(safe.map(x=>x.sys))].sort((a,b)=>R(a)-R(b)); if(ss.length){ const sf=h('div','cs-rsec cs-snsec'); const sh2=h('div','cs-rsh'); sh2.appendChild(h('h3',null,'Safety Nets')); sh2.appendChild(h('span',null,'Every system gets a how-it-works guide, automatic tests, automatic publishing and a change log, built by its Claude. A filled square is done.'));
    /* the standards prompt lives in the private record, so it can be updated without a release */
    if(d.standardsPrompt){ const cp=btn('cs-mini2 cs-copyp',null,()=>{ const txt=d.standardsPrompt; const done=()=>toast('Copied the standards prompt. Paste it into the new system’s Claude conversation.'); try{ navigator.clipboard.writeText(txt).then(done, ()=>{ fallbackCopy(txt); done(); }); }catch(e){ fallbackCopy(txt); done(); } });
      cp.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg><span>Copy the Standards Prompt</span>'; cp.title='Copies the prompt any new Claude building a MISMO system needs, so it meets these standards from day one'; sh2.appendChild(cp); }
    sf.appendChild(sh2);
    const mx=h('div','cs-card cs-sn'); const half=Math.ceil(ss.length/2); [ss.slice(0,half), ss.slice(half)].forEach(part=>{ if(!part.length) return; const tb=h('div','tb'); const hr=h('div','hr'); hr.appendChild(h('span',null,'')); SAFE.forEach(z=>hr.appendChild(h('span',null,z[1]))); tb.appendChild(hr);
      part.forEach(id=>{ const sy=by[id]; const r=h('div','r'); r.appendChild(tag(sy)); SAFE.forEach(z=>{ const x=safe.find(q=>q.sys===id && safeK(q.it)===z[0]); let c;
          if(!x){ c=h('span','c ok'); c.title=z[1]+': in place'; c.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; }
          else { c=btn('c'+(x.it.done?' ok':' todo')); c.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; c.title=x.it.t+(x.it.done?' (done)':'')+(ed?' — select to '+(x.it.done?'reopen':'check off'):''); c.setAttribute('aria-label', sy.name+': '+x.it.t+(x.it.done?', done':', open')); if(ed) c.addEventListener('click', ()=>toggleTodo(x.sys, x.it.id)); else c.disabled=true; }
          r.appendChild(c); }); tb.appendChild(r); }); mx.appendChild(tb); }); sf.appendChild(mx); wrap.appendChild(sf); }
  doneSection(d, wrap, by, tag, DS, R);
  /* coming up later: a timeline, not counted until it's close */
  if(later.length){ const lt=h('div','cs-rsec'); const sh3=h('div','cs-rsh'); sh3.appendChild(h('h3',null,'Coming Up Later')); const ds=later.map(x=>dueOf(x.it)).sort((a,b)=>a-b); const fmt=x=>x.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    sh3.appendChild(h('span',null, later.length+' items between '+fmt(ds[0])+' and '+fmt(ds[ds.length-1])+'. Each one moves into Open Now '+LATER_DAYS+' days before its date.')); lt.appendChild(sh3);
    const tlc=h('div','cs-card cs-later'); const ul=h('div','its'); later.map(x=>Object.assign({due:dueOf(x.it)},x)).sort((a,b)=>a.due-b.due).forEach(x=>{ const sy=by[x.sys]; const it=h('div','it'); it.style.setProperty('--pc',colorOf(d,sy)); const dt=h('span','dt'); dt.appendChild(h('b',null,String(x.due.getDate()))); dt.appendChild(h('small',null,x.due.toLocaleDateString('en-US',{month:'short'}))); it.appendChild(dt);
        const tx=h('div'); tx.appendChild(tag(sy)); tx.appendChild(h('span','t', x.it.t.replace(/ before [A-Z][a-z]+ \d{1,2}, \d{4}/,''))); it.appendChild(tx); it.title=x.it.d||x.it.t; ul.appendChild(it); });
    tlc.appendChild(ul); lt.appendChild(tlc); wrap.appendChild(lt); }
}
/* Done So Far: what each system has already finished on its way to rock solid. Three sources, newest first:
   the record's progress list (from each system's GitHub history), items checked off here, and Perry's finished requests. */
function doneSoFar(d, all, by){ const out=[]; const day=x=>{ const t=new Date(x); return isNaN(t) ? null : t; };
  (Array.isArray(d.progress) ? d.progress : []).forEach(p=>{ if(by[p.sys] && p.t) out.push({sys:p.sys, t:p.t, on:day(p.on+'T12:00:00'), src:p.src||'', id:p.id}); });
  const past=t=>t.replace(/^(Add|Start|Write|Turn on|Confirm|Move|Correct|Fill out|Check|Set up|Build|Switch|Update|Remove|Ask|Make|Send|Get|Put|Give|Fix)\b/, w=>({Add:'Added',Start:'Started',Write:'Wrote','Turn on':'Turned on',Confirm:'Confirmed',Move:'Moved',Correct:'Corrected','Fill out':'Filled out',Check:'Checked','Set up':'Set up',Build:'Built',Switch:'Switched',Update:'Updated',Remove:'Removed',Ask:'Asked',Make:'Made',Send:'Sent',Get:'Got',Put:'Put',Give:'Gave',Fix:'Fixed'})[w]);
  all.filter(x=>x.it.done).forEach(x=>out.push({sys:x.sys, t:past(x.it.t), on:x.it.at?day(x.it.at):null, src:'Checked off here', id:x.it.id}));
  ((M.req && M.req.items) || []).filter(x=>x.done && by[x.sys]).forEach(x=>out.push({sys:x.sys, t:x.t, on:x.doneOn?day(x.doneOn+'T12:00:00'):null, src:'Request for Perry', id:x.id}));
  return out.sort((a,b)=>(b.on||0)-(a.on||0)); }
function doneSection(d, wrap, by, tag, DS, R){ if(!DS.length) return; const fmt=x=>x ? x.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
  const sec=h('div','cs-rsec cs-dssec'); const sh=h('div','cs-rsh'); sh.appendChild(h('h3',null,'Done So Far'));
  const sys=[...new Set(DS.map(x=>x.sys))]; const first=DS.map(x=>x.on).filter(Boolean).sort((a,b)=>a-b)[0];
  sh.appendChild(h('span',null, DS.length+' finished across '+sys.length+' systems'+(first?' since '+first.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'')+', from each system’s GitHub history and what’s been checked off here.')); sec.appendChild(sh);
  /* the same fix made in several systems shows once, across the top */
  const byT={}; DS.forEach(x=>{ (byT[x.t]=byT[x.t]||[]).push(x); }); const shared=Object.keys(byT).filter(t=>new Set(byT[t].map(x=>x.sys)).size>=3); const isShared=new Set(shared);
  if(shared.length){ const sw=h('div','cs-card cs-dsw'); shared.forEach(t=>{ const L=byT[t]; const r=h('div','w'); const n=h('b','n',String(new Set(L.map(x=>x.sys)).size)); r.appendChild(n); const tx=h('div','tx'); tx.appendChild(h('p',null,t)); const tg=h('div','tgs'); [...new Set(L.map(x=>x.sys))].sort((a,b)=>R(a)-R(b)).forEach(s=>tg.appendChild(tag(by[s]))); tx.appendChild(tg); r.appendChild(tx); const ds=L.map(x=>x.on).filter(Boolean).sort((a,b)=>a-b); if(ds.length) r.appendChild(h('span','dt',fmt(ds[0])+(fmt(ds[ds.length-1])!==fmt(ds[0])?' – '+fmt(ds[ds.length-1]):''))); sw.appendChild(r); }); sec.appendChild(sw); }
  /* then each system's own list, the systems with the most done first, newest first inside */
  const G={}; DS.filter(x=>!isShared.has(x.t)).forEach(x=>{ (G[x.sys]=G[x.sys]||[]).push(x); }); const P0=P.dsOpen=P.dsOpen||{}; const CAP=5;
  const box=h('div','cs-card cs-cols3 cs-dsl'); Object.keys(G).sort((a,b)=>G[b].length-G[a].length || R(a)-R(b)).forEach(sid=>{ const sy=by[sid], L=G[sid]; const g=h('div','cs-dsg'); g.style.setProperty('--pc',colorOf(d,sy));
    const gh=h('div','gh'); gh.appendChild(tag(sy)); gh.appendChild(h('em',null,String(L.length))); g.appendChild(gh);
    (P0[sid] ? L : L.slice(0,CAP)).forEach(x=>{ const r=h('div','it'); r.appendChild(h('span','dt',fmt(x.on))); const t=h('span','t',x.t); if(x.src) t.title=x.src; r.appendChild(t); g.appendChild(r); });
    if(L.length>CAP) g.appendChild(btn('cs-mini2', P0[sid] ? 'Show fewer' : '+'+(L.length-CAP)+' more', ()=>{ P0[sid]=!P0[sid]; paintTodos(M.data); }));
    box.appendChild(g); });
  if(box.children.length) sec.appendChild(box); wrap.appendChild(sec); }
/* Requests for Perry: the save relay and AWS. Kept in their own record (systemsmap / requests) so Perry can check them off;
   systems ask for them in the MISMO Connections Map's "Requests for Perry" table, and a refresh brings new rows in. */
const RQA={relay:'Save relay', aws:'AWS'};
const canReq=()=>canEdit() || me()==='perry';
function saveReq(next, msg){ const prev=M.req ? clone(M.req) : null; next.at=Date.now(); next.by=me(); M.req=next; if(M.data && !M.data.empty) paintTodos(M.data);
  return Promise.resolve().then(()=>S.db.collection('systemsmap').doc('requests').set(next)).then(()=>{ if(msg) toast(msg, prev ? ()=>saveReq(prev, 'Put back the way it was.') : null); }, e=>{ console.error(e); toast('That didn’t save. Try again in a moment.'); if(prev){ M.req=prev; if(M.data) paintTodos(M.data); } }); }
/* request details: plain lines become paragraphs, lines starting "- " become a list, "Label:" at the start of a line is bolded */
function rqDetail(t){ const w=h('div','cs-rqd'); let ul=null; String(t).split(/\n/).forEach(line=>{ const L=line.trim(); if(!L){ ul=null; return; }
    const put=(el,txt)=>{ const m=/^([A-Z][A-Za-z ’'/&-]{1,28}):\s(.*)$/.exec(txt); if(m){ el.appendChild(h('b',null,m[1]+': ')); el.append(m[2]); } else el.textContent=txt; return el; };
    if(/^- /.test(L)){ if(!ul){ ul=h('ul'); w.appendChild(ul); } const li=h('li'); li.textContent=L.slice(2); ul.appendChild(li); } else { ul=null; w.appendChild(put(h('p'), L)); } }); return w; }
function reqSection(d, wrap, by, tag){ const Q=(M.req && Array.isArray(M.req.items)) ? M.req.items : []; const can=canReq(); if(!Q.length && !can) return;
  const sec=h('div','cs-rsec cs-rqsec'); const sh=h('div','cs-rsh'); sh.appendChild(h('h3',null,'Requests for Perry: Save Relay and AWS'));
  sh.appendChild(h('span',null,'What each system needs from the save relay or MISMO’s AWS account. Perry checks them off here; a system asks for one in the MISMO Connections Map.'));
  const showDone=!!P.rqDone, nd=Q.filter(x=>x.done).length; if(nd) sh.appendChild(btn('cs-mini2', showDone ? 'Hide finished' : 'Show finished ('+nd+')', ()=>{ P.rqDone=!P.rqDone; paintTodos(M.data); }));
  if(can) sh.appendChild(btn('cs-mini2', P.rqAdd ? 'Cancel' : '+ Add a Request', ()=>{ P.rqAdd=!P.rqAdd; paintTodos(M.data); })); sec.appendChild(sh);
  if(P.rqAdd && can){ const f=h('div','cs-card cs-rqf'); const ar=h('select'); Object.keys(RQA).forEach(k=>ar.appendChild(new Option(RQA[k],k))); const sy=h('select'); d.systems.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(x=>sy.appendChild(new Option(x.name,x.id)));
    const t=h('input'); t.placeholder='What’s needed'; t.maxLength=140; const dd=h('input'); dd.placeholder='Why, or any details (optional)'; dd.maxLength=400;
    const lab=(l,el)=>{ const w=h('label'); w.appendChild(h('span',null,l)); w.appendChild(el); return w; }; f.appendChild(lab('For',ar)); f.appendChild(lab('System',sy)); f.appendChild(lab('Request',t)); f.appendChild(lab('Details',dd));
    f.appendChild(btn('cs-btn pri','Add', ()=>{ const tt=t.value.trim(); if(!tt){ t.focus(); return; } const nx=clone(M.req||{items:[]}); nx.items=nx.items||[]; nx.items.push({id:'rq'+Date.now().toString(36), area:ar.value, sys:sy.value, t:tt, d:dd.value.trim(), by:me(), on:todayISO()}); P.rqAdd=false; saveReq(nx,'Request added for Perry'); })); sec.appendChild(f); setTimeout(()=>t.focus(),0); }
  const fmt=iso=>iso ? longDate(iso) : '', sfmt=iso=>{ const x=new Date(iso+'T12:00'); return isNaN(x) ? iso : x.toLocaleDateString('en-US',{month:'short',day:'numeric'}); };
  const L0=Q.filter(x=>showDone || !x.done); const open=Q.filter(x=>!x.done), dated=open.filter(x=>x.due).sort((a,b)=>a.due.localeCompare(b.due));
  const sum=h('div','cs-rqsum'); [[open.length,'open'],[open.filter(x=>x.area==='relay').length,'save relay'],[open.filter(x=>x.area==='aws').length,'AWS'],[dated.length,'with a date'+(dated.length?', first '+sfmt(dated[0].due):'')]].forEach(([n,t])=>{ const k=h('span'); k.appendChild(h('b',null,String(n))); k.append(' '+t); sum.appendChild(k); }); sec.appendChild(sum);
  /* one group per system, the most urgent first; each request is one line, details on click */
  const G={}; L0.forEach(x=>{ (G[x.sys]=G[x.sys]||[]).push(x); }); const key=L=>{ const o=L.filter(x=>!x.done); const dd=o.filter(x=>x.due).map(x=>x.due).sort()[0]; return (dd||'9999')+'|'+String(100-o.length).padStart(3,'0'); };
  const box=h('div','cs-card cs-rqbox');
  Object.keys(G).sort((a,b)=>key(G[a]).localeCompare(key(G[b]))).forEach(sid=>{ const sy=by[sid]; const L=G[sid].sort((a,b)=>(a.done?1:0)-(b.done?1:0) || (a.later?1:0)-(b.later?1:0) || String(a.due||'9').localeCompare(String(b.due||'9')));
    const g=h('div','cs-rqg'); g.style.setProperty('--pc', sy ? colorOf(d,sy) : '#7f98ad'); const gh=h('div','gh'); gh.appendChild(sy ? tag(sy) : h('b',null,sid)); gh.appendChild(h('em',null,String(L.filter(x=>!x.done).length))); g.appendChild(gh);
    L.forEach(x=>{ const row=h('div','rq'+(x.done?' done':'')+(P.rsItem===x.id?' open':''));
      const ck=btn('cs-ck'+(x.done?' on':'')); ck.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; ck.setAttribute('aria-label',(x.done?'Mark not done: ':'Mark done: ')+x.t); ck.setAttribute('aria-pressed', String(!!x.done));
      if(can) ck.addEventListener('click', ()=>{ const nx=clone(M.req); const it=nx.items.find(z=>z.id===x.id); it.done=!it.done; if(it.done){ it.doneOn=todayISO(); it.doneBy=me(); } else { delete it.doneOn; delete it.doneBy; } saveReq(nx, (it.done?'Done: ':'Back on the list: ')+it.t); }); else { ck.disabled=true; ck.title='Perry or Jonna checks these off'; }
      row.appendChild(ck); const tt=btn('cs-tt', x.t); tt.setAttribute('aria-expanded', String(P.rsItem===x.id)); tt.addEventListener('click', ()=>{ P.rsItem=P.rsItem===x.id?null:x.id; paintTodos(M.data); }); row.appendChild(tt);
      const tg=h('span','tgs'); if(x.area==='aws') tg.appendChild(h('span','aws','AWS')); if(x.due && !x.done) tg.appendChild(h('span','due','By '+sfmt(x.due))); else if(x.later && !x.done) tg.appendChild(h('span','lat','Later')); row.appendChild(tg);
      if(P.rsItem===x.id){ const dt=h('div','dt'); if(x.d) dt.appendChild(rqDetail(x.d)); dt.appendChild(h('small',null,(x.on?'Asked '+fmt(x.on)+(x.from?' by '+x.from:''):'')+(x.done && x.doneOn ? ' · Done '+fmt(x.doneOn)+(x.doneBy?' by '+x.doneBy.replace(/^./,c=>c.toUpperCase()):''):''))); row.appendChild(dt); }
      g.appendChild(row); }); box.appendChild(g); });
  sec.appendChild(box); wrap.appendChild(sec); }
function toggleTodo(sys, id){ const d=M.data; const nd=clone(d); const g=nd.todos.find(x=>x.sys===sys); const it=g && g.items.find(x=>x.id===id); if(!it) return;
  it.done=!it.done; if(it.done){ it.at=Date.now(); it.by=me(); } else { delete it.at; delete it.by; }
  P.rsItem=null; save(nd, (it.done?'Checked off: ':'Back on the list: ')+it.t); }
function balance(left, panel){ const fit=()=>{ if(!left.isConnected) return; const lh=Math.max(320, left.offsetHeight), one=getComputedStyle(left.parentNode).gridTemplateColumns.split(' ').filter(Boolean).length<2;
    if(panel.classList.contains('is-intro')){ panel.style.height=lh+'px'; panel.style.minHeight=''; } else { panel.style.height=''; panel.style.minHeight=one?'':lh+'px'; }
    left.classList.toggle('cs-stick', !one && lh < window.innerHeight-90); }; P.fitPanel=fit; if('ResizeObserver' in window){ const ro2=new ResizeObserver(()=>{ if(!panel.isConnected){ ro2.disconnect(); return; } fit(); }); ro2.observe(panel); }
  if('ResizeObserver' in window){ const ro=new ResizeObserver(fit); ro.observe(left); } requestAnimationFrame(fit); }
/* ---------- what depends on one person ---------- */
/* who keeps it running: each person the work leans on, what runs on their accounts, what waits on them, and who covers */
const KK={acct:['On their accounts','key'], hands:['Waits on them','clock'], cover:['Already covered','shield']};
/* What Changed: each manual process and the system that took it over (redesigned November 8, 2026) */
const SRC={ss:['Smartsheet','grid','#1f9d63'], mail:['Email and inboxes','mail','#e0782f'], file:['Spreadsheets and files','doc','#2f80c8'], bi:['Reports','chart','#8a5cc7'], tool:['Other tools','tool','#7f98ad']};
function srcOf(t){ t=(t||'').toLowerCase(); return /smartsheet|macts/.test(t)?'ss':/power bi|\breport/.test(t)?'bi':/email|inbox|status meeting/.test(t)?'mail':/spreadsheet|grid|pdf|word|by hand|export|\blists?\b/.test(t)?'file':'tool'; }
function swapBand(d){ const b=band('What changed','What Each System Replaced','Each one was a multi-step manual workflow of copying, emailing, uploading and chasing by hand. The system shown now does that work. Select one to see it on the map.');
  const by={}; d.systems.forEach(x=>by[x.id]=x); const rank=appRank(d), grpOf={}; (d.appGroups||[]).forEach(g=>(g.ids||[]).forEach(id=>{ if(!grpOf[id]) grpOf[id]=g.name; }));
  const L=swaps(d).map(s=>Object.assign({}, s, {t:srcOf(s.before)})).sort((a,c)=>rank(a.sys)-rank(c.sys));
  const cnt={}; L.forEach(s=>cnt[s.t]=(cnt[s.t]||0)+1); const types=Object.keys(SRC).filter(k=>cnt[k]);
  const top=h('div','cs-card cs-rp-sum cs-rv'); const big=h('div','big'); big.appendChild(h('b',null,String(L.length))); big.appendChild(h('span',null,'multi-step manual workflows retired')); top.appendChild(big);
  const rt=h('div','rt'); const bar=h('div','cs-rp-bar'); types.forEach(k=>{ const sg=h('i'); sg.style.flex=String(cnt[k]); sg.style.background=SRC[k][2]; sg.title=SRC[k][0]+': '+cnt[k]; bar.appendChild(sg); }); rt.appendChild(bar);
  const keys=h('div','cs-rp-keys'); let F=null; const grid=h('div','cs-rp-grid'); const rows=[];
  const apply=()=>{ let vis=[]; rows.forEach(r=>{ const on=!F || r.dataset.t===F; r.hidden=!on; r.classList.remove('span'); if(on) vis.push(r); }); if(vis.length%2) vis[vis.length-1].classList.add('span'); keys.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed', String((x.dataset.t||null)===F))); };
  const all=btn('cs-rp-k all',null,()=>{ F=null; apply(); }); all.appendChild(h('b',null,String(L.length))); all.appendChild(h('span',null,'All')); keys.appendChild(all);
  types.forEach(k=>{ const kb=btn('cs-rp-k',null,()=>{ F= F===k ? null : k; apply(); }); kb.dataset.t=k; kb.style.setProperty('--sc', SRC[k][2]); const ic=h('span','ic'); ic.innerHTML=svgI(SRC[k][1]); kb.appendChild(ic); kb.appendChild(h('b',null,String(cnt[k]))); kb.appendChild(h('span',null,SRC[k][0])); keys.appendChild(kb); });
  rt.appendChild(keys); top.appendChild(rt); b.appendChild(top);
  L.forEach(s=>{ const sy=s.sys && by[s.sys]; const r=h('div','cs-card cs-rp-row cs-rv'); r.dataset.t=s.t; r.style.setProperty('--pc', sy ? colorOf(d,sy) : '#74bfeb'); r.style.setProperty('--sc', SRC[s.t][2]);
    const was=h('div','was'); const ic=h('span','ic'); ic.innerHTML=svgI(SRC[s.t][1]); was.appendChild(ic); const wt=h('div'); wt.appendChild(h('small',null,'Before · '+SRC[s.t][0])); wt.appendChild(h('s',null,s.before)); was.appendChild(wt); r.appendChild(was);
    const ar=h('div','arw'); ar.innerHTML='<svg viewBox="0 0 40 16" aria-hidden="true"><path class="ln" d="M2 8H34"/><path class="hd" d="M28 3l6 5-6 5"/></svg>'; r.appendChild(ar);
    const nw=h('div','now'); nw.appendChild(h('small',null, sy && grpOf[sy.id] ? grpOf[sy.id] : 'Across MISMO')); nw.appendChild(h('b',null,s.after)); if(s.detail) nw.appendChild(h('p',null,s.detail)); r.appendChild(nw);
    if(sy) goTo(r, s.sys, d, null); rows.push(r); grid.appendChild(r); });
  b.appendChild(grid); apply(); return b; }
/* Coverage: pick a person to see what leans on them (redesigned November 8, 2026) */
function peopleBand(d){ const K=d.keyperson; const b=band(K.kicker||'Coverage', K.title||'Who Keeps It Running', K.lede||''); const by={}; d.systems.forEach(s=>by[s.id]=s);
  const P0=K.people.filter(x=>(x.items||[]).length); const ini=n=>n.split(/\s+/).filter(w=>/^[A-Za-z]/.test(w) && !/^(and|of)$/i.test(w)).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const KC={acct:'#d39a2c', hands:'#2f80c8', cover:'#1f9d63'}; const n=(x,k)=>(x.items||[]).filter(it=>(it.k||'hands')===k).length;
  const wrap=h('div','cs-cv'); const ros=h('div','cs-cv-ros'); ros.setAttribute('role','tablist'); ros.setAttribute('aria-label','People'); const det=h('div','cs-card cs-cv-det'); det.setAttribute('role','tabpanel');
  const show=i=>{ const x=P0[i]; ros.querySelectorAll('.cs-cv-p').forEach((t,k)=>{ t.setAttribute('aria-selected', String(k===i)); t.tabIndex=k===i?0:-1; }); det.textContent='';
    const side=h('div','side'); const hd=h('div','who'); hd.appendChild(h('span','av',ini(x.name))); const tx=h('div'); tx.appendChild(h('h3',null,x.name)); if(x.role) tx.appendChild(h('p',null,x.role)); hd.appendChild(tx); side.appendChild(hd);
    const st=h('div','st'); Object.keys(KK).forEach(k=>{ const c=n(x,k); const r=h('div','s'+(c?'':' zero')); r.style.setProperty('--kc',KC[k]); const ic=h('span','ic'); ic.innerHTML=svgI(KK[k][1]); r.appendChild(ic); r.appendChild(h('b',null,String(c))); r.appendChild(h('span',null,KK[k][0])); st.appendChild(r); }); side.appendChild(st);
    if(x.backup){ const bk=h('div','bk'); bk.appendChild(h('small',null,'Who steps in')); bk.appendChild(h('p',null, x.backup)); side.appendChild(bk); }
    else { const ss=[...new Set((x.items||[]).map(it=>it.sys).filter(id=>by[id]))]; const bk=h('div','bk sys'); bk.appendChild(h('small',null,'Systems involved')); const sl=h('div','sl'); ss.forEach(id=>{ const t=h('span','sy'); t.style.setProperty('--pc',colorOf(d,by[id])); t.textContent=by[id].name; sl.appendChild(t); }); bk.appendChild(sl); side.appendChild(bk); }
    det.appendChild(side);
    const ul=h('ul','its'+((x.items||[]).length>=9?' c3':'')); ['acct','hands','cover'].forEach(k=>(x.items||[]).filter(it=>(it.k||'hands')===k).forEach(it=>{ const li=h('li'); li.style.setProperty('--kc',KC[k]); const tg=h('div','tg'); const ic=h('span','ic'); ic.innerHTML=svgI(KK[k][1]); tg.appendChild(ic); tg.append(KK[k][0]); const sy=it.sys && by[it.sys]; if(sy){ const sn=h('span','sy'); sn.style.setProperty('--pc',colorOf(d,sy)); sn.textContent=sy.name; tg.appendChild(sn); } li.appendChild(tg); li.appendChild(h('b',null,it.t)); if(it.d) li.appendChild(h('p',null,it.d)); if(sy) goTo(li, it.sys, d, null); ul.appendChild(li); }));
    det.appendChild(ul); };
  P0.forEach((x,i)=>{ const t=btn('cs-cv-p',null,()=>show(i)); t.setAttribute('role','tab'); t.appendChild(h('span','av',ini(x.name))); const tx=h('span','tx'); tx.appendChild(h('b',null,x.name)); tx.appendChild(h('small',null,x.role||'')); t.appendChild(tx);
    const tot=(x.items||[]).length; const m=h('span','mb'); ['acct','hands','cover'].forEach(k=>{ const c=n(x,k); if(!c) return; const sg=h('i'); sg.style.flex=String(c); sg.style.background=KC[k]; m.appendChild(sg); }); t.appendChild(m); t.appendChild(h('em',null,tot+' item'+(tot>1?'s':'')));
    t.addEventListener('keydown',e=>{ const k=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0; if(!k) return; e.preventDefault(); const j=(i+k+P0.length)%P0.length; show(j); ros.children[j].focus(); }); ros.appendChild(t); });
  wrap.appendChild(ros); wrap.appendChild(det); b.appendChild(wrap); if(P0.length) show(0); return b; }
function keyBand(d){ const K=d.keyperson; const b=band('Key-person risk', K.title||'What Depends on One Person', K.lede||''); const by={}; d.systems.forEach(s=>by[s.id]=s);
  const all=[].concat(...K.groups.map(g=>g.items)); const sum=h('div','cs-card cs-kp-sum'); 
  K.groups.forEach(g=>{ const x=h('div','k '+(g.tone||'')); x.appendChild(h('b',null,String(g.items.length))); x.appendChild(h('span',null,g.short||g.title)); sum.appendChild(x); }); b.appendChild(sum);
  const grid=h('div','cs-kp'); K.groups.forEach(g=>{ const col=h('div','cs-card cs-kpc cs-rv '+(g.tone||'')); const hd=h('div','cs-kph'); const ic=h('span','ic'); ic.innerHTML=svgI(g.tone==='backup'?'shield':g.tone==='wait'?'clock':'key'); hd.appendChild(ic); const tx=h('div'); tx.appendChild(h('h3',null,g.title)); if(g.sub) tx.appendChild(h('p',null,g.sub)); hd.appendChild(tx); col.appendChild(hd);
    const ul=h('ul'); g.items.forEach(it=>{ const li=h('li'); li.appendChild(h('b',null,it.t)); if(it.d) li.appendChild(h('small',null,it.d)); if(it.sys && by[it.sys]){ goTo(li, it.sys, d, null); } ul.appendChild(li); }); col.appendChild(ul); grid.appendChild(col); });
  b.appendChild(grid); return b; }
function band(k,title,p){ const b=h('section','cs-band'); const sh=h('div','cs-sh'); const x=h('div'); x.appendChild(h('div','cs-k',k)); x.appendChild(h('h2',null,title)); if(p) x.appendChild(h('p',null,p)); sh.appendChild(x); b.appendChild(sh); return b; }

/* the hero: a living network behind the headline numbers */
function hero(d, c){ const hs=h('section','cs-hero'); const cv=h('canvas'); hs.appendChild(cv);
  const top=h('div','cs-htop'); top.appendChild(h('div','cs-k','MISMO Connected Systems')).style.color='#a9d8f3'; const pl=h('span','cs-pill'); pl.appendChild(h('i')); pl.append('As of '+longDate(d.asOf)); top.appendChild(pl); hs.appendChild(top);
  const t=h('h2'); t.append('One connected operation, '); t.appendChild(h('span',null,'built in-house')); hs.appendChild(t);
  if(d.lede) hs.appendChild(h('p','lede',d.lede));
  const st=h('div','cs-stats'); const nums=[];
  const dr=h('div','cs-drill'); dr.hidden=true;
  [['apps',c.apps,'MISMO systems on resources.mismo.org'],['auto',c.auto,'automatic hand-offs between systems'],['jobs',c.jobs,'jobs that run on their own'],['swaps',c.swaps,'multi-step manual workflows replaced']].forEach(x=>{ const s=btn('cs-stat'); s.dataset.k=x[0]; const b=h('b',null, P.counted||reduce() ? String(x[1]) : '0'); s.appendChild(b); s.appendChild(h('span',null,x[2])); s.appendChild(h('em',null,'See the list')); s.setAttribute('aria-expanded','false');
    s.addEventListener('click', ()=>{ P.drill = P.drill===x[0] ? null : x[0]; drill(d, st, dr); }); st.appendChild(s); nums.push([b,x[1]]); }); hs.appendChild(st); hs.appendChild(dr); if(P.drill) drill(d, st, dr);
  const sb=h('div','cs-sbar'); const bar=h('div','bar'); const segs=[[c.live,'#2fbf71','Live'],[c.launching,'#e0a83c','Launching'],[c.building,'#9fb3c4','Building']];
  segs.forEach(z=>{ const i=h('i'); i.style.background=z[1]; i.style.width=P.counted||reduce() ? (c.apps?z[0]/c.apps*100:0)+'%' : '0%'; i.title=z[0]+' '+z[2]; bar.appendChild(i); }); sb.appendChild(bar);
  const lg=h('div','lg'); segs.forEach(z=>{ const s=h('span'); const e=h('em'); e.style.background=z[1]; s.appendChild(e); s.append(z[0]+' '+z[2]); lg.appendChild(s); }); sb.appendChild(lg); hs.appendChild(sb);
  if(!P.counted && !reduce()){ P.counted=true; const t0=performance.now(); const step=now=>{ const k=Math.min(1,(now-t0)/1100), e=1-Math.pow(1-k,3); nums.forEach(([b,n])=>b.textContent=String(Math.round(n*e))); if(k<1) requestAnimationFrame(step); }; requestAnimationFrame(step);
    setTimeout(()=>{ [...bar.children].forEach((i,k)=>i.style.width=(c.apps?segs[k][0]/c.apps*100:0)+'%'); }, 120); }
  network(cv); return hs; }
/* the list behind each hero number */
function drill(d, st, dr){ const k=P.drill; st.querySelectorAll('.cs-stat').forEach(b=>{ const on=b.dataset.k===k; b.classList.toggle('on', on); b.setAttribute('aria-expanded', String(on)); });
  dr.textContent=''; dr.hidden=!k; if(!k) return; const by={}; d.systems.forEach(x=>by[x.id]=x);
  const it=(sys, top, sub, pre)=>{ const r=h('div','cs-di'); const sy=by[sys]; if(sy) r.style.setProperty('--pc', colorOf(d,sy)); if(pre) r.appendChild(pre); const tx=h('div'); tx.appendChild(top); if(sub) tx.appendChild(h('small',null,sub)); r.appendChild(tx); if(sy) goTo(r, sys, d, null); return r; };
  let title='', note='', L=[];
  if(k==='apps'){ const R=appRank(d); const A=d.systems.filter(x=>x.zone==='apps').sort((a,b)=>R(a.id)-R(b.id)); title=A.length+' MISMO Systems'; note='Every system built for MISMO on resources.mismo.org, most important first.'; const gOf={}; (d.appGroups||[]).forEach(g=>(g.ids||[]).forEach(id=>gOf[id]=g.name));
    L=A.map(x=>{ const t=h('b',null,x.name); return it(x.id, t, (gOf[x.id] ? gOf[x.id]+' · ' : '')+(x.status==='Live' ? 'Live' : (x.statusNote||x.status||'Building'))); }); }
  if(k==='auto'){ const A=d.connections.filter(c=>c.how!=='hand' && c.how!=='soon' && !c.quiet && by[c.from] && by[c.to]); title=A.length+' Automatic Hand-Offs'; note='Work that moves from one system to another with no one copying it.';
    L=A.map(c=>{ const t=h('b'); t.append(by[c.from].name); t.appendChild(h('i',null,' → ')); t.append(by[c.to].name); return it(c.from, t, c.what); }); }
  if(k==='jobs'){ const n=d.automations.reduce((a,g)=>a+(g.items||[]).length,0); title=n+' Jobs That Run on Their Own'; note='On a schedule or the moment something changes.';
    d.automations.forEach(g=>(g.items||[]).forEach(j=>{ const t=h('b',null,j.name); L.push(it(j.sys, t, j.detail, h('span','cs-dc',g.cadence))); })); }
  if(k==='swaps'){ const S=swaps(d); title=S.length+' Multi-Step Manual Workflows Replaced'; note='Each was a run of hand steps (copying, emailing, uploading, chasing) that a system now does. What each one took off a spreadsheet, out of an inbox or out of a meeting.';
    L=S.map(r=>{ const t=h('b'); t.appendChild(h('s',null,r.before)); t.appendChild(h('i',null,' → ')); t.append(r.after); return it(r.sys, t, r.detail); }); }
  const hd=h('div','cs-dh'); const tx=h('div'); tx.appendChild(h('h3',null,title)); tx.appendChild(h('p',null,note+' Select any one to see it on the map.')); hd.appendChild(tx);
  const x=btn('cs-dx','×', ()=>{ P.drill=null; drill(d, st, dr); }); x.setAttribute('aria-label','Close the list'); hd.appendChild(x); dr.appendChild(hd);
  const g=h('div','cs-dg'); L.forEach(r=>g.appendChild(r)); dr.appendChild(g); }
function network(cv){ const ctx=cv.getContext && cv.getContext('2d'); if(!ctx) return; let w=0,hh=0,dpr=Math.min(2,window.devicePixelRatio||1); const pts=[];
  const size=()=>{ const r=cv.getBoundingClientRect(); w=r.width; hh=r.height; cv.width=Math.max(1,w*dpr); cv.height=Math.max(1,hh*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); };
  const seed=()=>{ pts.length=0; const n=Math.round(Math.min(60, Math.max(24, w*hh/9000))); for(let i=0;i<n;i++) pts.push({x:Math.random()*w, y:Math.random()*hh, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25, r:Math.random()*1.6+.8}); };
  const frame=()=>{ ctx.clearRect(0,0,w,hh); for(let i=0;i<pts.length;i++){ const a=pts[i]; for(let j=i+1;j<pts.length;j++){ const b=pts[j], dx=a.x-b.x, dy=a.y-b.y, dd=dx*dx+dy*dy; if(dd<16000){ ctx.strokeStyle='rgba(116,191,235,'+(0.35*(1-dd/16000)).toFixed(3)+')'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); } } }
    pts.forEach(p=>{ ctx.fillStyle='rgba(169,216,243,.9)'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); }); };
  let seen=true; if('IntersectionObserver' in window){ const io=new IntersectionObserver(es=>{ seen=es[0].isIntersecting; }); io.observe(cv); }
  const tick=now=>{ if(!cv.isConnected) return; if(!document.hidden && seen && !scrolling(now)){ pts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>w) p.vx*=-1; if(p.y<0||p.y>hh) p.vy*=-1; }); frame(); } requestAnimationFrame(tick); };
  requestAnimationFrame(()=>{ size(); seed(); if(reduce()) frame(); else tick(); }); }
function chips(d, box){ box.setAttribute('aria-label','Filter by area or find a system');
  const add=(k,label,col)=>{ const b=btn('cs-chip', null, ()=>{ P.filter=k; box.querySelectorAll('.cs-chip').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); paintState(); }); if(col){ const i=h('i'); i.style.background=col; b.appendChild(i); } b.append(label); b.setAttribute('aria-pressed', String(P.filter===k)); box.appendChild(b); };
  add(null,'All'); Object.keys(d.areas).forEach(k=>add(k, d.areas[k].name, AC[d.areas[k].c])); }
function finder(d){ const w=h('label','cs-find'); w.innerHTML=svgI('search'); const i=h('input'); i.type='search'; i.placeholder='Find a system…'; i.setAttribute('aria-label','Find a system'); i.value=P.q||''; w.appendChild(i);
  const match=()=>{ const q=i.value.trim().toLowerCase(); P.q=q; return q ? d.systems.filter(s=>(s.name+' '+(s.what||'')).toLowerCase().indexOf(q)>=0) : []; };
  i.addEventListener('input', ()=>{ match(); paintState(); });
  i.addEventListener('keydown', e=>{ if(e.key==='Enter'){ const m=match(); if(m[0]){ P.q=''; i.value=''; select(m[0].id, true); } } if(e.key==='Escape'){ i.value=''; P.q=''; paintState(); } });
  return w; }
/* the section buttons follow you down the page */
function watchSections(root, nav, els){ if(!('IntersectionObserver' in window)) return; const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting){ const k=els.indexOf(e.target); [...nav.children].forEach((b,i)=>b.classList.toggle('on', i===k)); } }); }, {rootMargin:'-30% 0px -60% 0px'}); els.forEach(el=>io.observe(el)); }
function reveal(root){ const L=[...root.querySelectorAll('.cs-rv')]; if(P.revealed || reduce() || !('IntersectionObserver' in window)){ L.forEach(e=>e.classList.add('in')); return; } P.revealed=true;
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ const el=e.target; const sib=[...el.parentNode.children].indexOf(el); setTimeout(()=>el.classList.add('in'), Math.min(sib,8)*60); io.unobserve(el); } }), {rootMargin:'0px 0px -8% 0px'}); L.forEach(e=>io.observe(e));
  setTimeout(()=>L.forEach(e=>e.classList.add('in')), 2500); /* never leave anything hidden */ }

/* ---------- the map ---------- */
let pulseOn=!reduce();
function anchor(n,m){ const dx=m.x-n.x, dy=m.y-n.y; if(Math.abs(dx)*H>Math.abs(dy)*W) return {x:n.x+(dx>0?W/2:-W/2), y:n.y}; return {x:n.x, y:n.y+(dy>0?H/2:-H/2)}; }
function edgeGeo(a,b,i){ const p=anchor(a,b), q=anchor(b,a); const mx=(p.x+q.x)/2, my=(p.y+q.y)/2, off=(i%2?1:-1)*Math.min(40,Math.hypot(q.x-p.x,q.y-p.y)/6);
  const nx=-(q.y-p.y), ny=(q.x-p.x), L=Math.hypot(nx,ny)||1; const cx=mx+nx/L*off, cy=my+ny/L*off; return {d:'M'+p.x+' '+p.y+' Q'+cx+' '+cy+' '+q.x+' '+q.y, mx:(p.x+2*cx+q.x)/4, my:(p.y+2*cy+q.y)/4, len:Math.hypot(q.x-p.x,q.y-p.y)}; }
function edgePath(a,b,i){ return edgeGeo(a,b,i).d; }
/* lines find a path that doesn't run under other boxes: try each way out of the two boxes and a range of curves, keep the one that crosses the fewest boxes */
function anchorM(n,m,mode){ const dx=m.x-n.x, dy=m.y-n.y; const h= mode==='h' ? true : mode==='v' ? false : Math.abs(dx)*H>Math.abs(dy)*W; return h ? {x:n.x+(dx>0?W/2:-W/2), y:n.y} : {x:n.x, y:n.y+(dy>0?H/2:-H/2)}; }
function geoM(a,b,mode,off){ const m1=mode==='hv'?'h':mode==='vh'?'v':mode, m2=mode==='hv'?'v':mode==='vh'?'h':mode; const p=anchorM(a,b,m1), q=anchorM(b,a,m2); const mx=(p.x+q.x)/2, my=(p.y+q.y)/2; const nx=-(q.y-p.y), ny=(q.x-p.x), L=Math.hypot(nx,ny)||1; const cx=mx+nx/L*off, cy=my+ny/L*off;
  return {p, q, cx, cy, d:'M'+p.x+' '+p.y+' Q'+cx+' '+cy+' '+q.x+' '+q.y, mx:(p.x+2*cx+q.x)/4, my:(p.y+2*cy+q.y)/4, len:Math.hypot(q.x-p.x,q.y-p.y)}; }
function crossings(g, a, b, obs){ let n=0; const hit=new Set(); for(let k=1;k<40;k++){ const t=k/40, u=1-t; const x=u*u*g.p.x+2*u*t*g.cx+t*t*g.q.x, y=u*u*g.p.y+2*u*t*g.cy+t*t*g.q.y;
    for(const o of obs){ if(o===a || o===b || hit.has(o)) continue; if(Math.abs(x-o.x)<W/2+5 && Math.abs(y-o.y)<H/2+5){ hit.add(o); n++; } } } return n; }
function routeGeo(a, b, i, obs, used){ const len=Math.hypot(b.x-a.x,b.y-a.y), base=Math.min(40,len/6), sgn=(i%2?1:-1); let best=null;
  ['auto','h','v','hv','vh'].forEach(mode=>{ [base, base*0.5, 70, 110, 160, 220, 300, 380].forEach(o=>[sgn, -sgn].forEach(sg=>{ const off=o*sg; const g=geoM(a,b,mode,off); const key=mode+':'+Math.round(off);
    const score=crossings(g,a,b,obs)*1000 + Math.abs(off) + (mode==='auto'?0:25) + (sg===sgn?0:5) + (used && used.indexOf(key)>=0 ? 5000 : 0);
    if(!best || score<best.score){ g.score=score; g.key=key; best=g; } })); }); return best; }
let uid=0;
function frame(d){ const ys=d.systems.filter(s=>s.zone!=='eng' && s.y!=null).map(s=>s.y); const zb=Math.max(300, (ys.length?Math.max(...ys):400)+H/2+20), et=zb+14; return {zb, et, ey:et+56, vb:et+90+10}; }
function map(d){ const F=frame(d); P.vb=F.vb; P.ey=F.ey; const svg=sv('svg',{viewBox:'0 0 1200 '+F.vb, role:'img', 'aria-label':'Map of MISMO’s systems and the connections between them'}); P.svg=svg; const pre='cse'+(++uid)+'-';
  const defs=sv('defs',{},svg);
  defs.innerHTML='<filter id="csGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="csShadow" x="-20%" y="-40%" width="140%" height="190%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#14486e" flood-opacity=".35"/></filter><linearGradient id="csZ" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--surface-2)"/><stop offset="1" stop-color="var(--surface)"/></linearGradient>';
  [[12,22,196,F.zb-22],[288,22,634,F.zb-22],[992,22,196,F.zb-22],[12,F.et,1176,90]].forEach(z=>sv('rect',{class:'cs-zone',x:z[0],y:z[1],width:z[2],height:z[3],rx:12,fill:'url(#csZ)'},svg));
  /* each app group sits on its own tinted lane, in its color */
  (d.appGroups||[]).forEach(g=>{ const M0=(g.ids||[]).map(id=>d.systems.find(x=>x.id===id)).filter(x=>x && x.zone==='apps' && x.y!=null); if(!M0.length) return; const c0=colorOf(d, M0.find(x=>x.area)||M0[0]);
    void c0; });
  [['MBA & Microsoft 365',110,44],['MISMO apps · resources.mismo.org',605,44],['Outside MISMO',1090,44],['Engine room · every app runs on these',600,F.et+22]].forEach(z=>{ const t=sv('text',{class:'cs-zl',x:z[1],y:z[2],'text-anchor':'middle'},svg); t.textContent=z[0]; });
  (d.appGroups||[]).forEach(g=>{ const M0=(g.ids||[]).map(id=>d.systems.find(x=>x.id===id)).filter(x=>x && x.zone==='apps' && x.y!=null); if(!M0.length) return; const y0=Math.min(...M0.map(x=>x.y)), x0=Math.min(...M0.filter(x=>x.y===y0).map(x=>x.x)); const t=sv('text',{class:'cs-gl',x:x0-W/2+2,y:y0-H/2-7},svg); t.textContent=g.name; t.style.setProperty('--pc', colorOf(d, M0.find(x=>x.area)||M0[0])); });
  const top=sv('svg',{viewBox:'0 0 1200 '+F.vb, class:'cs-top', role:'group', 'aria-label':'MISMO’s systems'}); P.svgTop=top; const gE=sv('g',{},svg), gN=sv('g',{},top), gL=sv('g',{},top); const by={}; d.systems.forEach(s=>by[s.id]= s.zone==='eng' ? Object.assign({}, s, {y:F.ey}) : s);
  P.edges=[]; P.nodes={}; const pairs={}; const OBS=Object.values(by), USED={};
  /* lines that go the same way between the same two boxes, the same way (automatic or by hand), are drawn as one line that lists them all */
  const GRP={}, LINES=[]; d.connections.forEach((c,i0)=>{ const gk=c.from+'>'+c.to+'|'+(c.how||'')+'|'+(c.quiet?1:0); if(GRP[gk]){ GRP[gk].cs.push(c); return; } GRP[gk]={c, i0, cs:[c]}; LINES.push(GRP[gk]); });
  LINES.forEach(G=>{ const c=G.c, i0=G.i0, cs=G.cs; const a=by[c.from], b=by[c.to]; if(!a || !b) return;
    const pk=[c.from,c.to].sort().join('|'), f0=pairs[pk]; if(!f0) pairs[pk]={i:i0, from:c.from}; const i=!f0 ? i0 : (f0.from===c.from ? f0.i+1 : f0.i); /* a second line between the same two boxes curves the other way */
    const geo=routeGeo(a,b,i,OBS,USED[pk]); (USED[pk]=USED[pk]||[]).push(geo.key); const path=sv('path',{class:'cs-e'+(c.how==='hand'?' hand':c.how==='soon'?' soon':'')+(c.quiet?' quiet':''), d:geo.d, id:pre+i0},gE); const tt=sv('title',{},path); tt.textContent=a.name+' → '+b.name+': '+cs.map(x=>x.what).join('; ')+(c.how==='hand'?' (copied by a person)':c.how==='soon'?' (not live yet)':'');
    const col=colorOf(d,a); path.style.setProperty('--ec', col); const e={c, cs, el:path, i, col}; if(c.how!=='hand' && c.how!=='soon' && !c.quiet) e.p={dur:(3.6+(i%5)*.7)*1000, off:(i*0.37%4)*1000, dim:false, pts:null};
    /* the label that appears on the line when its system is selected */
    const more=cs.length>1 ? ' +'+(cs.length-1) : '', lbMax=30-more.length; const lbTxt=(c.what.length>lbMax ? c.what.slice(0,lbMax-1)+'…' : c.what)+more; const lw=Math.round(lbTxt.length*5.9+14);
    const lb=sv('g',{class:'cs-lb'+(c.how==='hand'?' hand':c.how==='soon'?' soon':'')+(geo.len<lw+40 || c.quiet?' short':''), transform:'translate('+Math.round(geo.mx-lw/2)+','+Math.round(geo.my-10)+')'},gL); sv('rect',{x:0,y:0,width:lw,height:20,rx:10},lb); const lt=sv('text',{x:lw/2,y:13.5,'text-anchor':'middle'},lb); lt.textContent=lbTxt; e.lb=lb; e.box={x:Math.round(geo.mx-lw/2), y:Math.round(geo.my-10), w:lw, h:20};
    P.edges.push(e); });
  d.systems.forEach(s=>{ const g=sv('g',{class:'cs-n'+(s.zone==='eng'?' eng':''), tabindex:0, role:'button', 'aria-label':s.name+', '+(s.status||''), transform:'translate('+(s.x-W/2)+','+(by[s.id].y-H/2)+')'},gN);
    g.style.setProperty('--pc', colorOf(d,s)); sv('rect',{class:'box',x:0,y:0,width:W,height:H,rx:9},g); sv('rect',{class:'bar',x:0,y:0,width:6,height:H,rx:3,fill:colorOf(d,s)},g);
    const two=!!(s.statusNote || s.zone==='eng' || s.sub); const t=sv('text',{x:13,y:two?17:25},g); t.textContent=s.name.length>19 ? s.name.slice(0,18)+'…' : s.name;
    if(two){ const t2=sv('text',{class:'sub',x:13,y:31},g); t2.textContent=s.statusNote || s.sub || (s.id==='robots'?'run on schedules':s.id==='flows'?'inside Microsoft 365':'used by every app'); }
    const k=stKey(s); sv('circle',{class:'sd '+k,cx:W-11,cy:11,r:4},g);
    if(P.edit && (s.confirm || d.connections.some(c=>c.confirm && (c.from===s.id || c.to===s.id)))){ sv('circle',{class:'cf',cx:W-11,cy:H-10,r:4},g); }
    P.nodes[s.id]=g;
    g.addEventListener('click', ()=>{ if(g._moved){ g._moved=false; return; } select(s.id); });
    g.addEventListener('keydown', ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); select(s.id); } });
    g.addEventListener('mouseenter', ()=>{ P.hover=s.id; paintState(); }); g.addEventListener('mouseleave', ()=>{ P.hover=null; paintState(); });
    if(P.edit) dragable(g, s, d); });
  return svg; }
/* the moving dots on each automatic line and the ring on each live system, drawn on one canvas.
   Runs only while the map is on screen and the tab is showing. */
function pulses(){ const cv=h('canvas'); cv.setAttribute('aria-hidden','true'); const ctx=cv.getContext && cv.getContext('2d'); if(!ctx) return cv;
  let seen=true, w=0, hh=0, k=1, dpr=1, hot='#14486e', hotAt=-1e9; const t0=performance.now();
  const size=()=>{ const r=cv.getBoundingClientRect(); if(!r.width) return false; dpr=Math.min(2, window.devicePixelRatio||1); if(Math.abs(r.width-w)>.5 || Math.abs(r.height-hh)>.5){ w=r.width; hh=r.height; cv.width=Math.round(w*dpr); cv.height=Math.round(hh*dpr); } k=w/1200; return true; };
  const sample=e=>{ const L=e.el.getTotalLength(), n=Math.max(12, Math.min(90, Math.round(L/8))), a=[]; for(let j=0;j<=n;j++){ const q=e.el.getPointAtLength(L*j/n); a.push(q.x, q.y); } e.p.pts=a; };
  if('IntersectionObserver' in window){ const io=new IntersectionObserver(es=>{ seen=es[0].isIntersecting; }); io.observe(cv); }
  let dirty=true; if('ResizeObserver' in window){ const ro=new ResizeObserver(()=>{ dirty=true; if(!cv.isConnected) ro.disconnect(); }); ro.observe(cv); }
  const frame=now=>{ if(!cv.isConnected) return; requestAnimationFrame(frame); if(!seen || document.hidden || scrolling(now)) return; if(dirty || !('ResizeObserver' in window)){ if(!size()) return; dirty=false; } if(!w) return;
    ctx.setTransform(dpr*k,0,0,dpr*k,0,0); ctx.clearRect(0,0,1200,hh/k+2);
    const d=M.data; const t=now-t0; if(now-hotAt>1000){ hotAt=now; hot=getComputedStyle(cv).getPropertyValue('--cs-hot').trim()||'#14486e'; }
    /* the selected system's automatic lines, drawn solid and bolder (dashes are only for work a person copies, so moving dashes here read as "by hand"); the dots already show the flow */
    ctx.setLineDash([]); ctx.lineWidth=2.6; ctx.strokeStyle=hot;
    (P.edges||[]).forEach(e=>{ const c=e.el.classList; if(!c.contains('hot') || c.contains('hand') || c.contains('soon')) return; const dd=e.el.getAttribute('d'); if(e.pd!==dd){ e.pd=dd; e.p2=new Path2D(dd); } ctx.globalAlpha=e.c.quiet?.9:1; ctx.strokeStyle=e.col||hot; ctx.stroke(e.p2); });
    ctx.setLineDash([]);
    /* engine room: solid rails up to every system it holds up. They draw in from the engine box when you point at it,
       then one soft light rides each rail slowly, so you can see what it holds up without the map buzzing */
    { const fo=P.hover||P.sel, es=fo && d && d.systems.find(x=>x.id===fo); if(es && es.zone==='eng' && P.ey){ if(P.engFo!==fo){ P.engFo=fo; P.engT=now; }
        const col=colorOf(d,es), L=engServes(d,es), g0=Math.min(1,(now-P.engT)/520), grow=1-Math.pow(1-g0,3), still=reduce();
        const bz=(f,a,b,c,e)=>{ const q=1-f; return q*q*q*a+3*q*q*f*b+3*q*f*f*c+f*f*f*e; };
        ctx.lineCap='round'; L.forEach((id,ix)=>{ const n=d.systems.find(x=>x.id===id); if(!n || n.x==null) return; const ny=n.zone==='eng' ? P.ey : n.y; const y0=P.ey-H/2, y1=ny+(n.zone==='eng'?0:H/2);
          const X=f=>bz(f,es.x,es.x,n.x,n.x), Y=f=>bz(f,y0,y0-60,y1+60,y1); const end=Math.min(1, Math.max(0, grow*1.15-ix*.012));
          if(end<=0) return; ctx.globalAlpha=.42; ctx.strokeStyle=col; ctx.lineWidth=1.8; ctx.beginPath(); ctx.moveTo(X(0),Y(0)); for(let k2=1;k2<=28;k2++){ const f=end*k2/28; ctx.lineTo(X(f),Y(f)); } ctx.stroke();
          if(end<1) return; ctx.globalAlpha=.9; ctx.fillStyle=col; ctx.beginPath(); ctx.arc(n.x,y1,2.6,0,Math.PI*2); ctx.fill();
          if(still) return; const f=(((now-P.engT)/4200)+ix*.29)%1, x=X(f), y=Y(f), a=Math.sin(Math.PI*f);
          ctx.globalAlpha=.18*a; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=.75*a; ctx.beginPath(); ctx.arc(x,y,2.4,0,Math.PI*2); ctx.fill(); });
        ctx.globalAlpha=1; } else P.engFo=null; }
    /* live rings */
    if(d && P.nodes) d.systems.forEach(s=>{ if(s.zone!=='apps' || stKey(s)!=='live') return; const n=P.nodes[s.id]; if(!n || n.classList.contains('dim')) return; const f=(t%2400)/2400, ease=1-Math.pow(1-f,2);
      ctx.globalAlpha=.8*(1-f); ctx.strokeStyle='#2fbf71'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(s.x+W/2-11, s.y-H/2+11, 4*(1+1.4*ease), 0, Math.PI*2); ctx.stroke(); });
    /* dots */
    (P.edges||[]).forEach(e=>{ const p=e.p; if(!p) return; if(!p.pts) sample(e); const a=p.pts, n=a.length/2-1; const f=(((t-p.off)%p.dur)+p.dur)%p.dur/p.dur*n, j=Math.min(n-1, Math.floor(f)), r=f-j;
      const x=a[2*j]+(a[2*j+2]-a[2*j])*r, y=a[2*j+1]+(a[2*j+3]-a[2*j+1])*r; const al=p.dim?.1:1;
      ctx.globalAlpha=.26*al; ctx.fillStyle=e.col||'#74bfeb'; ctx.beginPath(); ctx.arc(x,y,6.5,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=al; ctx.beginPath(); ctx.arc(x,y,3.2,0,Math.PI*2); ctx.fill(); });
    ctx.globalAlpha=1; };
  requestAnimationFrame(frame); return cv; }
/* in Edit mode, drag a box to move it; the new spot saves when you let go */
function dragable(g, s, d){ g.addEventListener('pointerdown', ev=>{ if(ev.button!==0) return; const svg=P.svg; const pt=svg.createSVGPoint();
  const loc=e=>{ pt.x=e.clientX; pt.y=e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const st=loc(ev), ox=s.x, oy=s.y; let moved=false; g.setPointerCapture(ev.pointerId);
  const mv=e=>{ const p=loc(e); const nx=Math.round(Math.max(W/2+8, Math.min(1200-W/2-8, ox+p.x-st.x))), ny=s.zone==='eng' ? oy : Math.round(Math.max(H/2+8, Math.min((P.vb||720)-H/2-8, oy+p.y-st.y)));
    if(!moved && Math.hypot(nx-ox, ny-oy)<4) return; moved=true; g.classList.add('drag'); s.x=nx; s.y=ny; g.setAttribute('transform','translate('+(nx-W/2)+','+((s.zone==='eng' ? frame(d).ey : ny)-H/2)+')');
    const by={}; d.systems.forEach(z=>by[z.id]=z); P.edges.forEach(e2=>{ if(e2.c.from===s.id || e2.c.to===s.id){ const a=by[e2.c.from], b=by[e2.c.to]; e2.el.setAttribute('d', routeGeo(a,b,e2.i,d.systems.filter(z=>z.zone!=='eng'),null).d); if(e2.p) e2.p.pts=null; } }); };
  const up=()=>{ g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); g.classList.remove('drag');
    if(moved){ g._moved=true; const nd=clone(d); const t=nd.systems.find(z=>z.id===s.id); t.x=s.x; t.y=s.y; s.x=ox; s.y=oy; save(nd, 'Moved '+s.name+'.'); } };
  g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up); }); }
/* the engine room: what each piece holds up. A system's own "serves" list wins; otherwise these defaults (November 8, 2026) */
const ENGD={robots:['spon','mms','web','media','social','news','m360','money','cms','elect','tracker','summit','iif'], flows:['aptify','spon','pros','mms','m360','money','sched','orders','media','summit','tracker','cms','team','elect','outlook','sp','teams','web','docu']};
function engServes(d, s){ if(!s || s.zone!=='eng') return []; const ids=new Set(d.systems.map(x=>x.id)), apps=d.systems.filter(x=>x.zone==='apps').map(x=>x.id);
  const L=Array.isArray(s.serves) ? s.serves : ENGD[s.id] ? ENGD[s.id] : s.id==='aws' ? ['relay'].concat(apps) : apps; return L.filter(x=>ids.has(x) && x!==s.id); }
function linked(id){ const s={}; s[id]=1; const d=M.data, me0=d.systems.find(x=>x.id===id); if(me0 && me0.zone==='eng'){ engServes(d, me0).forEach(x=>s[x]=1); return s; }
  (d.connections||[]).forEach(c=>{ if(c.from===id) s[c.to]=1; if(c.to===id) s[c.from]=1; }); return s; }
function declutter(){ const shown=[]; (P.edges||[]).forEach(e=>{ e.lb.classList.remove('clash'); if(!e.lb.classList.contains('on') || e.lb.classList.contains('short')) return; const b=e.box; if(shown.some(o=>b.x<o.x+o.w+4 && o.x<b.x+b.w+4 && b.y<o.y+o.h+2 && o.y<b.y+b.h+2)) e.lb.classList.add('clash'); else shown.push(b); }); }
function paintState(){ paintState0(); declutter(); }
function paintState0(){ const d=M.data; if(!d || d.empty || !P.nodes) return; const by={}; d.systems.forEach(s=>by[s.id]=s);
  /* a journey being played lights up its path */
  if(P.jr){ const j=journeys(d).find(x=>x.id===P.jr.id); if(j){ const upto=j.steps.slice(0, P.jr.i+1).map(z=>z.sys), cur=j.steps[P.jr.i].sys, on={}; upto.forEach(x=>on[x]=1); j.steps.slice(0, P.jr.i+1).forEach(z=>{ if(z.from) on[z.from]=1; if(z.to) on[z.to]=1; }); /* the system the work came from, or goes to, lights up too */
      const hotE=new Set(); for(let k=0;k<=P.jr.i;k++){ const z=j.steps[k], a=z.to ? z.sys : z.from, b=z.to || z.sys; if(!a || a===b) continue; /* a step lights a line only when it names where the work comes from or goes to */ const fw=P.edges.filter(e=>e.c.from===a && e.c.to===b); (fw.length ? fw : P.edges.filter(e=>e.c.from===b && e.c.to===a)).forEach(e=>hotE.add(e)); } /* only the line the work travels on lights up */
      d.systems.forEach(s=>{ const n=P.nodes[s.id]; if(!n) return; n.classList.toggle('dim', !on[s.id]); n.classList.toggle('sel', s.id===cur); n.classList.toggle('lit', !!on[s.id] && s.id!==cur); });
      P.edges.forEach(e=>{ const hot=hotE.has(e); e.el.classList.toggle('dim', !hot); e.el.classList.toggle('hot', hot); if(e.p) e.p.dim=!hot; e.lb.classList.toggle('on', hot && (e.c.from===cur || e.c.to===cur)); e.lb.classList.toggle('dim', false); });
      return; } }
  const q=P.q, Q=q ? d.systems.filter(s=>(s.name+' '+(s.what||'')).toLowerCase().indexOf(q)>=0).map(s=>s.id) : null;
  const focus=P.hover||P.sel, L=focus ? linked(focus) : null, f=P.filter;
  d.systems.forEach(s=>{ const n=P.nodes[s.id]; if(!n) return;
    const on= Q ? Q.indexOf(s.id)>=0 : L ? !!L[s.id] : (!f || s.area===f || s.zone==='eng' || d.connections.some(c=>!c.quiet && ((c.from===s.id && by[c.to] && by[c.to].area===f) || (c.to===s.id && by[c.from] && by[c.from].area===f)))); /* a box at the other end of an area's line stays lit */
    n.classList.toggle('dim', !on); n.classList.toggle('sel', s.id===P.sel); n.classList.toggle('lit', !!(Q && on)); });
  P.edges.forEach(e=>{ const a=by[e.c.from], b=by[e.c.to]; const on= Q ? false : focus ? (e.c.from===focus || e.c.to===focus) : (!f || a.area===f || b.area===f);
    e.el.classList.toggle('dim', !on); e.el.classList.toggle('hot', !!focus && on); if(e.p) e.p.dim=!on; e.lb.classList.toggle('on', !!P.sel && !P.hover && on && !Q); }); }
/* any row or card tied to a system: select it to light that system up on the map and open its details */
function goTo(el, id, d, hintHost){ if(!id || !d.systems.some(x=>x.id===id)) return; const nm=d.systems.find(x=>x.id===id).name;
  el.classList.add('cs-go'); el.tabIndex=0; el.setAttribute('role','button'); el.setAttribute('aria-label', (el.textContent||'').trim().slice(0,80)+' — show '+nm+' on the map');
  if(hintHost) hintHost.appendChild(h('span','cs-gh','Show '+nm+' on the map →'));
  const go=()=>select(id, true);
  el.addEventListener('click', go); el.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }); }
function select(id, scroll){ stopJourney(true); P.sel=(P.sel===id && !P.edit && !scroll) ? null : id; P.form=null; if(scroll){ P.hover=null; P.filter=null; if(P.el) P.el.querySelectorAll('.cs-chip').forEach((c,i)=>c.setAttribute('aria-pressed', String(i===0))); }
  paintState(); side();
  if(scroll && P.el){ const g=P.el.querySelector('.cs-grid'); const one=g && getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length<2; const tgt=one ? P.panel : P.el.querySelector('.cs-mapwrap'); if(tgt) tgt.scrollIntoView({block:'start', behavior:reduce()?'auto':'smooth'}); const n=P.nodes && P.nodes[id]; if(n) setTimeout(()=>{ try{ n.focus({preventScroll:true}); }catch(e){} }, 450); } }

/* ---------- the story browser: areas, a list of stories, and the chosen story's steps ---------- */
function jArea(d, j){ if(j.area && d.areas[j.area]) return j.area; const n={}; j.steps.forEach(z=>{ const sy=d.systems.find(x=>x.id===z.sys); if(sy && sy.area) n[sy.area]=(n[sy.area]||0)+1; }); return Object.keys(n).sort((a,b)=>n[b]-n[a])[0]||'ops'; }
function stories(d, box){ const J=journeys(d), by={}; d.systems.forEach(x=>by[x.id]=x); box.textContent='';
  if(!P.sa || (P.sa!=='all' && !d.areas[P.sa])) P.sa='all'; if(!J.some(j=>j.id===P.sj)) P.sj=null;
  const q=(P.sq||'').trim().toLowerCase();
  const match=j=>(P.sa==='all' || jArea(d,j)===P.sa) && (!q || (j.title+' '+(j.blurb||'')+' '+j.steps.map(z=>(by[z.sys]||{}).name+' '+z.text).join(' ')).toLowerCase().indexOf(q)>=0);
  const AO=Object.keys(d.areas); const L=J.filter(match).map((j,i)=>[j,i]).sort((a,b)=>(AO.indexOf(jArea(d,a[0]))-AO.indexOf(jArea(d,b[0])))||(a[1]-b[1])).map(x=>x[0]); if(!P.sj || !L.some(j=>j.id===P.sj)) P.sj=L.length ? L[0].id : null;
  const top=h('div','cs-sbt'); const tabs=h('div','cs-sbtabs'); tabs.setAttribute('role','tablist');
  const tab=(k,label,col)=>{ const n=J.filter(j=>k==='all' || jArea(d,j)===k).length; if(!n && k!=='all') return; const b=btn('cs-sbtab'); b.setAttribute('role','tab'); b.setAttribute('aria-selected', String(P.sa===k)); if(col){ const i=h('i'); i.style.background=col; b.appendChild(i); } b.append(label); b.appendChild(h('em',null,String(n))); b.addEventListener('click', ()=>{ P.sa=k; P.sj=null; stories(d, box); }); tabs.appendChild(b); };
  tab('all','All',null); Object.keys(d.areas).forEach(k=>tab(k, d.areas[k].name, AC[d.areas[k].c])); top.appendChild(tabs);
  const fd=h('label','cs-find cs-sbfind'); fd.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>'; const fi=h('input'); fi.type='search'; fi.placeholder='Find a story or system'; fi.value=P.sq||''; fi.setAttribute('aria-label','Find a story or system');
  let ft=0; fi.addEventListener('input', ()=>{ clearTimeout(ft); ft=setTimeout(()=>{ P.sq=fi.value; stories(d, box); const n=box.querySelector('.cs-sbfind input'); if(n){ n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 180); }); fd.appendChild(fi); top.appendChild(fd); box.appendChild(top);
  const body=h('div','cs-sbb'); box.appendChild(body);
  const ls=h('div','cs-sbl'); ls.setAttribute('role','listbox'); ls.setAttribute('aria-label','Stories');
  if(!L.length) ls.appendChild(h('p','cs-note','No stories match.'));
  let lastA=null; L.forEach(j=>{ const ja=jArea(d,j); if(P.sa==='all' && ja!==lastA){ lastA=ja; const g=h('div','cs-sbg'); const i=h('i'); i.style.background=d.areas[ja]?AC[d.areas[ja].c]:'#74bfeb'; g.appendChild(i); g.append(d.areas[ja]?d.areas[ja].name:''); ls.appendChild(g); } const b=btn('cs-sbi'+(j.id===P.sj?' on':'')); b.setAttribute('role','option'); b.setAttribute('aria-selected', String(j.id===P.sj)); const ar=d.areas[jArea(d,j)]; b.style.setProperty('--pc', ar ? AC[ar.c] : '#74bfeb');
    b.appendChild(h('b',null,j.title)); const m=h('small'); const dots=h('span','dots'); [...new Set(j.steps.map(z=>z.sys))].slice(0,7).forEach(id=>{ const sy=by[id]; if(!sy) return; const i=h('i'); i.style.background=colorOf(d,sy); i.title=sy.name; dots.appendChild(i); }); m.appendChild(dots); m.append(j.steps.length+' steps'); b.appendChild(m);
    b.addEventListener('click', ()=>{ P.sj=j.id; stories(d, box); requestAnimationFrame(()=>{ const dt=box.querySelector('.cs-sbd'); if(dt){ const r=dt.getBoundingClientRect(); if(r.top>window.innerHeight-160 || r.top<60) dt.scrollIntoView({block:'start', behavior:reduce()?'auto':'smooth'}); } }); }); ls.appendChild(b); });
  body.appendChild(ls);
  [...ls.querySelectorAll(':scope > .cs-sbg')].forEach(g=>{ const nx=g.nextElementSibling; const w=h('div','cs-sbgw'); g.parentNode.insertBefore(w,g); w.appendChild(g); if(nx && nx.classList.contains('cs-sbi')) w.appendChild(nx); }); /* a group's name always sits with its first story */
  const det=h('div','cs-sbd'); body.appendChild(det); const j=J.find(x=>x.id===P.sj);
  if(j){ const hd=h('div','cs-sbh'); const tx=h('div'); const ar=d.areas[jArea(d,j)]; tx.appendChild(h('div','cs-k',(ar?ar.name:'')+' · '+j.steps.length+' steps')); tx.appendChild(h('h3',null,j.title)); if(j.blurb) tx.appendChild(h('p',null,j.blurb)); hd.appendChild(tx);
    const pl=btn('cs-ib pri cs-sbplay',null, ()=>startJourney(j.id)); pl.innerHTML=svgI('play').replace('<svg','<svg width="11" height="11" style="fill:currentColor"')+' Play on the Map'; hd.appendChild(pl); det.appendChild(hd);
    const ol=h('ol','cs-sbs'); j.steps.forEach((z,i)=>{ const sy=by[z.sys]; if(!sy) return; const li=h('li'); li.style.setProperty('--pc', colorOf(d,sy)); li.appendChild(h('span','sn',String(i+1))); const t=h('div'); t.appendChild(h('b',null,sy.name)); t.appendChild(h('p',null,z.text||sy.what||'')); li.appendChild(t);
      li.tabIndex=0; li.setAttribute('role','button'); li.title='Play from this step'; const go=()=>{ startJourney(j.id); jrGo(i); }; li.addEventListener('click', go); li.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }); ol.appendChild(li); });
    det.appendChild(ol); }
  requestAnimationFrame(()=>{ if(!det.isConnected) return; const one=getComputedStyle(body).gridTemplateColumns.split(' ').filter(Boolean).length<2; ls.style.maxHeight=''; const on=ls.querySelector('.on'); if(on && !one){ const r=on.offsetTop-ls.offsetTop; if(r<ls.scrollTop || r>ls.scrollTop+ls.clientHeight-40) ls.scrollTop=r-8; } }); }

/* ---------- journeys: play a story across the map ---------- */
let jTimer=0;
function startJourney(id){ P.sel=null; P.hover=null; P.filter=null; P.q=''; P.form=null; P.jr={id, i:0, playing:!reduce()}; if(P.el){ P.el.querySelectorAll('.cs-chip').forEach((c,i)=>c.setAttribute('aria-pressed', String(i===0))); const f=P.el.querySelector('.cs-find input'); if(f) f.value=''; }
  paintState(); side(); tourCard(); const mw=P.el && P.el.querySelector('.cs-mapwrap'); if(mw) mw.scrollIntoView({block:'start', behavior:reduce()?'auto':'smooth'}); tickJourney(); }
function stopJourney(quiet){ clearTimeout(jTimer); if(!P.jr) return; P.jr=null; const t=P.el && P.el.querySelector('.cs-bub'); if(t) t.remove(); if(!quiet){ paintState(); side(); } }
function stepJourney(k){ const d=M.data; const j=d && journeys(d).find(x=>x.id===(P.jr||{}).id); if(!j) return; P.jr.i=Math.max(0, Math.min(j.steps.length-1, P.jr.i+k)); paintState(); side(); tourCard(); }
function tickJourney(){ clearTimeout(jTimer); if(!P.jr || !P.jr.playing) return; jTimer=setTimeout(()=>{ if(!P.jr || !P.el || !P.el.isConnected) return; const d=M.data; const j=journeys(d).find(x=>x.id===P.jr.id); if(!j) return; if(P.jr.i>=j.steps.length-1){ P.jr.playing=false; side(); tourCard(); return; } stepJourney(1); tickJourney(); }, 3200); }
function jrPlay(){ const d=M.data; const j=d && P.jr && journeys(d).find(x=>x.id===P.jr.id); if(!j) return; const last=P.jr.i>=j.steps.length-1;
  if(last && !P.jr.playing){ P.jr.i=0; P.jr.playing=true; paintState(); side(); tourCard(); tickJourney(); return; } P.jr.playing=!P.jr.playing; side(); tourCard(); tickJourney(); }
function jrGo(i){ if(!P.jr) return; P.jr.playing=false; P.jr.i=i; paintState(); side(); tourCard(); }
/* the whole story, step by step, in the panel */
function storyPanel(p, d, j){ const by={}; d.systems.forEach(x=>by[x.id]=x); const w=h('div','cs-story'); p.appendChild(w);
  const kr=h('div','cs-krow'); kr.appendChild(h('div','cs-k','Follow the work · '+j.steps.length+' steps')); const x=btn('cs-all','Close ×', ()=>stopJourney()); kr.appendChild(x); w.appendChild(kr);
  w.appendChild(h('h3',null,j.title)); if(j.blurb) w.appendChild(h('p','bl',j.blurb));
  const last=P.jr.i>=j.steps.length-1, ctl=h('div','ctl');
  const bk=btn('cs-ib','← Back', ()=>{ P.jr.playing=false; stepJourney(-1); }); bk.disabled=P.jr.i===0; ctl.appendChild(bk);
  ctl.appendChild(btn('cs-ib', P.jr.playing ? 'Pause' : (last ? 'Play Again' : 'Play'), jrPlay));
  ctl.appendChild(btn('cs-ib pri', last ? 'Done' : 'Next →', ()=>{ if(last){ stopJourney(); return; } P.jr.playing=false; stepJourney(1); })); w.appendChild(ctl);
  const ol=h('ol','cs-sl'); let cur=null;
  j.steps.forEach((st,i)=>{ const sy=by[st.sys]; if(!sy) return; const li=h('li', i<P.jr.i?'done':i===P.jr.i?'now':''); li.appendChild(h('span','sn',String(i+1))); const tx=h('div'); tx.appendChild(h('b',null,sy.name)); tx.appendChild(h('small',null,st.text||sy.what||'')); li.appendChild(tx);
    li.tabIndex=0; li.setAttribute('role','button'); li.setAttribute('aria-current', i===P.jr.i?'step':'false'); li.addEventListener('click', ()=>jrGo(i)); li.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); jrGo(i); } });
    if(i===P.jr.i) cur=li; ol.appendChild(li); }); w.appendChild(ol);
  /* keep the current step in view inside the panel, without moving the page */
  /* spread the steps a little when there's room, so the panel ends level with the map */
  requestAnimationFrame(()=>{ const left=p.clientHeight-p.scrollHeight, L=[...ol.children]; if(left>4 && L.length){ const per=Math.min(8, left/L.length/2); L.forEach(li=>{ li.style.paddingTop=li.style.paddingBottom=(6+per)+'px'; }); } });
  if(cur) requestAnimationFrame(()=>{ const pr=p.getBoundingClientRect(), cr=cur.getBoundingClientRect(); if(cr.bottom>pr.bottom-8) p.scrollTop+=cr.bottom-pr.bottom+16; else if(cr.top<pr.top+8) p.scrollTop-=pr.top-cr.top+16; }); }
/* the callout on the map, beside the system the work has reached */
function tourCard(){ const d=M.data, mi=P.mapin; const old=mi && mi.querySelector('.cs-bub'); if(!mi || !P.jr){ if(old) old.remove(); return; }
  const j=journeys(d).find(x=>x.id===P.jr.id); if(!j) return; const st=j.steps[P.jr.i], sy=d.systems.find(x=>x.id===st.sys); if(!sy) return;
  const b=old || h('div','cs-bub'); b.setAttribute('role','status'); b.textContent='';
  const bk=h('div','bk'); bk.append('Step '+(P.jr.i+1)+' of '+j.steps.length); const nav=h('span'); const pv=btn(null,'←', ()=>{ P.jr.playing=false; stepJourney(-1); }); pv.disabled=P.jr.i===0; pv.setAttribute('aria-label','Back');
  const nx=btn(null,'→', ()=>{ P.jr.playing=false; stepJourney(1); }); nx.disabled=P.jr.i>=j.steps.length-1; nx.setAttribute('aria-label','Next'); nav.appendChild(pv); nav.appendChild(nx); bk.appendChild(nav); b.appendChild(bk);
  b.appendChild(h('h4',null,sy.name)); b.appendChild(h('p',null,st.text||sy.what||'')); if(!old) mi.appendChild(b); placeBub(); }
function placeBub(){ const d=M.data, mi=P.mapin, b=mi && mi.querySelector('.cs-bub'); if(!b || !P.jr) return; const j=journeys(d).find(x=>x.id===P.jr.id); if(!j) return; const st=j.steps[P.jr.i];
  const F=frame(d), Y=x=>x.zone==='eng'?F.ey:x.y; const s=d.systems.find(x=>x.id===st.sys); if(!s) return; const mw=mi.clientWidth, mh=mi.clientHeight, k=mw/1200, bw=Math.min(270, mw-16); b.style.width=bw+'px'; const bh=b.offsetHeight;
  const px=s.x*k, py=Y(s)*k, hw=W/2*k, hh=H/2*k, g=12;
  /* the boxes in this story: the callout tries not to cover them */
  const R=j.steps.map(z=>d.systems.find(x=>x.id===z.sys)).filter(Boolean).map(x=>({l:(x.x-W/2)*k-4, t:(Y(x)-H/2)*k-4, r:(x.x+W/2)*k+4, b:(Y(x)+H/2)*k+4, w:x.id===s.id?40:1}));
  (P.edges||[]).forEach(e=>{ const c=e.lb && e.lb.classList; if(!c || !c.contains('on') || c.contains('clash') || c.contains('short') || !e.box) return; const bx=e.box; R.push({l:bx.x*k-4, t:bx.y*k-4, r:(bx.x+bx.w)*k+4, b:(bx.y+bx.h)*k+4, w:3}); });
  const clampX=x=>Math.max(8, Math.min(mw-bw-8, x)), clampY=y=>Math.max(4, Math.min(mh-bh-4, y));
  const C=[]; [['below', py+hh+g], ['above', py-hh-g-bh]].forEach(([w,t])=>[px-bw/2, px-bw+28, px-28].forEach(l=>C.push([w, clampX(l), t]))); C.push(['right', px+hw+g, clampY(py-bh/2)], ['left', px-hw-g-bw, clampY(py-bh/2)], ['right', px+hw+g, clampY(py-28)], ['left', px-hw-g-bw, clampY(py-28)], ['right', px+hw+g, clampY(py-bh+28)], ['left', px-hw-g-bw, clampY(py-bh+28)]);
  const cost=c=>{ const [w,l,t]=c; if(l<4 || t<2 || l+bw>mw-4 || t+bh>mh-2) return 1e9; let a=0; R.forEach(r=>{ const ox=Math.max(0, Math.min(l+bw, r.r)-Math.max(l, r.l)), oy=Math.max(0, Math.min(t+bh, r.b)-Math.max(t, r.t)); a+=ox*oy*r.w; }); return a; };
  let best=C[0], bc=cost(C[0]); C.slice(1).forEach(c=>{ const v=cost(c); if(v<bc-1){ best=c; bc=v; } });
  const [w,l,t]=best; b.classList.remove('below','above','right','left'); b.classList.add(w); b.style.left=l+'px'; b.style.top=t+'px';
  if(w==='below' || w==='above') b.style.setProperty('--ax', Math.max(14, Math.min(bw-14, px-l))+'px'); else b.style.setProperty('--ay', Math.max(14, Math.min(bh-14, py-t))+'px'); }

/* ---------- the side panel: what a system does (or, in Edit mode, the form) ---------- */
function side(){ const p=P.panel, d=M.data; if(!p || !d || d.empty) return; p.textContent=''; p.classList.remove('is-intro'); if(P.fitPanel) P.fitPanel();
  if(P.form){ const w=h('div','cs-ep'); p.appendChild(w); P.form(w); return; }
  let id=P.sel; if(P.jr){ const j=journeys(d).find(x=>x.id===P.jr.id); if(j){ storyPanel(p, d, j); return; } }
  if(!id){ intro(p, d); return; }
  const s=d.systems.find(x=>x.id===id); if(!s){ intro(p,d); return; }
  if(P.edit){ const w=h('div','cs-ep'); p.appendChild(w); sysForm(w, d, s); return; }
  const by={}; d.systems.forEach(x=>by[x.id]=x);
  const ph=h('div','cs-ph'); ph.style.setProperty('--pc', colorOf(d,s)); ph.appendChild(h('div','cs-k',areaName(d,s))); ph.appendChild(h('h3',null,s.name)); ph.appendChild(stTag(s));
  if(!P.jr){ const x=btn('x','×', ()=>{ P.sel=null; paintState(); side(); }); x.setAttribute('aria-label','Close'); ph.appendChild(x); } p.appendChild(ph);
  const pb=h('div','cs-pb'); p.appendChild(pb); if(s.what) pb.appendChild(h('p',null,s.what));
  /* the flow: what comes in, this system, what goes out — select any to walk the map */
  const Q=d.connections.filter(c=>c.quiet && (c.to===s.id || c.from===s.id)); const IN=d.connections.filter(c=>!c.quiet && c.to===s.id && by[c.from]), OUT=d.connections.filter(c=>!c.quiet && c.from===s.id && by[c.to]);
  const fl=h('div','cs-flow');
  const list=(L, other, title)=>{ const hd=h('div','cs-fl'); hd.append(title); hd.appendChild(h('small',null,'· '+L.length)); fl.appendChild(hd); const box=h('div','cs-fc');
    L.forEach(c=>{ const o=by[c[other]]; const b=btn('cs-fi'+(c.how==='hand'?' hand':c.how==='soon'?' soon':'')); const i=h('i'); i.style.background=colorOf(d,o); b.appendChild(i); const tx=h('span'); tx.appendChild(h('b',null,o.name)); tx.appendChild(h('small',null,c.what)); if(c.note) tx.appendChild(h('small','cs-note',c.note)); b.appendChild(tx); b.appendChild(c.how==='hand' ? h('span','cs-hand','by hand') : c.how==='soon' ? h('span','cs-soonb','not live yet') : h('em',null,'→')); b.title='Go to '+o.name; b.addEventListener('click', ()=>select(o.id)); box.appendChild(b); });
    fl.appendChild(box); };
  if(IN.length) list(IN,'from','Comes in from');
  const meE=h('div','cs-me'); const sp=h('span'); sp.textContent=s.name; meE.appendChild(sp); fl.appendChild(meE);
  if(OUT.length) list(OUT,'to','Goes out to');
  if(s.zone==='eng'){ const L=engServes(d,s); if(L.length){ const hd=h('div','cs-fl'); hd.append('Holds up'); hd.appendChild(h('small',null,'· '+L.length+(L.length>=d.systems.filter(x=>x.zone==='apps').length?' (every app)':''))); fl.appendChild(hd); const box=h('div','cs-qt'); L.forEach(id=>{ const o=by[id]; if(!o) return; const b=btn('cs-qc', o.name, ()=>select(o.id)); const i=h('i'); i.style.background=colorOf(d,o); b.prepend(i); box.appendChild(b); }); fl.appendChild(box); fl.appendChild(h('p','cs-note','Lit on the map. If this stopped, these are the systems that would feel it.')); } }
  else if(s.zone==='apps'){ const E=d.systems.filter(x=>x.zone==='eng' && engServes(d,x).indexOf(s.id)>=0); if(E.length){ const hd=h('div','cs-fl'); hd.append('Runs on'); hd.appendChild(h('small',null,'· '+E.length)); fl.appendChild(hd); const box=h('div','cs-qt'); E.forEach(o=>{ const b=btn('cs-qc', o.name, ()=>select(o.id)); const i=h('i'); i.style.background=colorOf(d,o); b.prepend(i); box.appendChild(b); }); fl.appendChild(box); } }
  if(Q.length){ const hd=h('div','cs-fl'); hd.append(s.id==='team' ? 'Opens as dashboard tiles' : 'Team HQ tile'); hd.appendChild(h('small',null,'· '+Q.length)); fl.appendChild(hd); const box=h('div','cs-qt'); Q.forEach(c=>{ const o=by[c.from===s.id?c.to:c.from]; if(!o) return; const b=btn('cs-qc', o.name, ()=>select(o.id)); const i=h('i'); i.style.background=colorOf(d,o); b.prepend(i); box.appendChild(b); }); fl.appendChild(box); if(s.id!=='team') fl.appendChild(h('p','cs-note','Its headline numbers show on a Team HQ dashboard tile, and the tile opens it.')); }
  pb.appendChild(fl);
  const facts=h('dl','cs-facts'); const row=(k,v)=>{ if(!v) return; const w=h('div'); w.appendChild(h('dt',null,k)); const dd=h('dd'); if(typeof v==='string') dd.textContent=v; else dd.appendChild(v); w.appendChild(dd); facts.appendChild(w); };
  row('Where it lives', s.where); if(s.replaced) row('Replaced', h('span',null,s.replaced)); if(facts.children.length) pb.appendChild(facts); }
function intro(p, d){ p.classList.add('is-intro'); if(P.fitPanel) P.fitPanel(); const w=h('div','cs-start'); p.appendChild(w);
  if(P.edit){ w.appendChild(h('div','cs-k','Edit mode')); w.appendChild(h('h3',null,'Change the Map')); w.appendChild(h('p',null,'Select a system to change its status or details, or to add, change or set aside its connections. Drag a box to move it. Every save updates the “as of” date.'));
    const n=confirms(d); if(n) w.appendChild(h('span','cs-cf', n+' item'+(n>1?'s':'')+' still to confirm, marked with an amber dot. They’re only marked here, not for everyone else.'));
    return; }
  const kr=h('div','cs-krow'); kr.appendChild(h('div','cs-k','Start here')); w.appendChild(kr); w.appendChild(h('h3',null,'Pick a System, or Follow the Work'));
  w.appendChild(h('p',null,'Every line is a hand-off between two systems. Moving dots show work flowing automatically; dashed lines are copied by a person.'));
  /* as many stories as fit beside the map (the area filters already sit above it) */
  /* the longest story for each app group comes first, in the groups' order of importance, then the rest by number of steps */
  const AO=[]; (d.appGroups||[]).forEach(g=>{ const s0=(g.ids||[]).map(id=>d.systems.find(x=>x.id===id)).find(x=>x && x.area); if(s0 && AO.indexOf(s0.area)<0) AO.push(s0.area); }); Object.keys(d.areas).forEach(k=>{ if(AO.indexOf(k)<0) AO.push(k); });
  const byLen=journeys(d).map((j,i)=>[j,i]).sort((a,b)=>(b[0].steps.length-a[0].steps.length)||(a[1]-b[1])).map(x=>x[0]);
  const lead=AO.map(k=>byLen.find(j=>jArea(d,j)===k)).filter(Boolean); const J=lead.concat(byLen.filter(j=>lead.indexOf(j)<0)); const B=J.map(j=>{ const b=btn('cs-jbtn'); const pl=h('span','pl'); pl.innerHTML=svgI('play'); b.appendChild(pl); const tx=h('span'); tx.appendChild(h('b',null,j.title)); tx.appendChild(h('small',null,j.steps.length+' steps across the map')); b.appendChild(tx); b.addEventListener('click', ()=>startJourney(j.id)); w.appendChild(b); return b; });
  const more=btn('cs-all','', ()=>{ if(P.showTab) P.showTab('Follow the Work', true); }); kr.appendChild(more);
  /* fill the panel: as many stories as fit; if spacing them a little closer lets one more in, do that */
  const fit=()=>{ if(!w.isConnected) return; const g=p.parentNode, one=!g || getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length<2, cap=one ? 0 : p.clientHeight;
    const run=tight=>{ w.style.gap=tight?'9px':''; B.forEach(b=>{ b.hidden=false; b.style.paddingTop=b.style.paddingBottom=tight?'6px':''; }); more.hidden=false;
      let n=B.length; if(!cap){ n=Math.min(Math.max(6, lead.length),B.length); B.forEach((b,i)=>b.hidden=i>=n); } else { const MIN=Math.max(3, lead.length); more.hidden=B.length<=MIN; while(n>MIN && p.scrollHeight>cap+1){ n--; B[n].hidden=true; more.hidden=false; } }
      more.hidden = n>=B.length; return n; };
    w.classList.remove('tiny'); let n=run(false), tight=false; if(cap && n<B.length){ const n2=run(true); if(n2>n){ n=n2; tight=true; } else n=run(false); }
    /* the six group stories must always fit: if they don't, drop the small print; as a last resort let the panel grow rather than cut a story off */
    if(cap && p.scrollHeight>cap+1){ w.classList.add('tiny'); n=run(true); tight=true; } if(cap && p.scrollHeight>cap+1){ p.style.height='auto'; }
    more.textContent='See all '+B.length+' stories →';
    /* share any space left over among the stories shown, so the panel ends level with the map */
    if(cap){ const left=cap-p.scrollHeight, base=tight?6:9; if(left>2){ const per=Math.min(14, left/n/2); B.slice(0,n).forEach(b=>{ b.style.paddingTop=b.style.paddingBottom=(base+per)+'px'; }); } } };
  requestAnimationFrame(fit); if('ResizeObserver' in window){ const ro=new ResizeObserver(()=>{ if(!w.isConnected){ ro.disconnect(); return; } fit(); }); ro.observe(p); } }

/* ---------- Edit mode ---------- */
function editBar(d){ const b=h('div','cs-ebar'); b.appendChild(h('b',null,'Edit mode — changes save as you make them'));
  b.appendChild(btn('cs-btn','Add a System', ()=>{ P.sel=null; P.form=p=>sysForm(p, d, null); paintState(); side(); P.panel.scrollIntoView({block:'nearest', behavior:'smooth'}); }));
  b.appendChild(btn('cs-btn','Add a Connection', ()=>{ P.form=p=>conForm(p, d, null, P.sel); side(); P.panel.scrollIntoView({block:'nearest', behavior:'smooth'}); }));
  const ar=(d.archived.systems||[]).length+(d.archived.connections||[]).length; if(ar) b.appendChild(btn('cs-btn','Set Aside ('+ar+')', ()=>{ P.form=p=>archForm(p, d); side(); }));
  return b; }
function field(f, label, el){ const l=h('label',null,label); l.appendChild(el); f.appendChild(l); return el; }
function inp(v, ph, max){ const i=h('input'); i.value=v||''; if(ph) i.placeholder=ph; i.maxLength=max||160; return i; }
function ta(v, rows){ const t=h('textarea'); t.value=v||''; t.rows=rows||3; t.maxLength=1200; return t; }
function sel(opts, v){ const s=h('select'); opts.forEach(([k,l])=>{ const o=h('option',null,l); o.value=k; if(k===v) o.selected=true; s.appendChild(o); }); return s; }
function sysForm(p, d, s){ const isNew=!s; const by={}; d.systems.forEach(x=>by[x.id]=x);
  p.appendChild(h('div','cs-k', isNew ? 'New system' : areaName(d,s))); p.appendChild(h('h3',null, isNew ? 'Add a System' : s.name));
  const f=h('div','cs-f'); p.appendChild(f);
  const nm=field(f,'Name', inp(s&&s.name,'e.g., Speaker Portal',40));
  const r1=h('div','row'); f.appendChild(r1);
  const place=field(r1,'Where on the map', sel([['apps','MISMO apps (center)'],['mba','MBA & Microsoft 365 (left)'],['out','Outside MISMO (right)'],['eng','Engine room (bottom)']], s?s.zone:'apps'));
  const area=field(r1,'Area (MISMO apps)', sel([['','—']].concat(Object.keys(d.areas).map(k=>[k,d.areas[k].name])), s?(s.area||''):'ops'));
  const r2=h('div','row'); f.appendChild(r2);
  const stt=field(r2,'Status', sel(ST.map(x=>[x,x]), s?s.status:'Building'));
  const note=field(r2,'Status note (optional)', inp(s&&s.statusNote,'e.g., Goes live Nov 20',30));
  const what=field(f,'What it does', ta(s&&s.what,4));
  const where=field(f,'Where it lives', inp(s&&s.where,'e.g., resources.mismo.org, behind MISMO sign-in',200));
  const rep=field(f,'What it replaced', inp(s&&s.replaced,'e.g., A spreadsheet and email',200));
  const cf=field(f,'Still to confirm (only shows in Edit mode)', inp(s&&s.confirm,'Leave empty when it’s confirmed',300));
  const acts=h('div','acts'); f.appendChild(acts);
  if(!isNew) acts.appendChild(btn('cs-btn danger','Set Aside', ()=>{ const nd=clone(d); const i=nd.systems.findIndex(x=>x.id===s.id); const [gone]=nd.systems.splice(i,1); const cons=nd.connections.filter(c=>c.from===s.id||c.to===s.id); nd.connections=nd.connections.filter(c=>!(c.from===s.id||c.to===s.id)); gone.at=Date.now(); gone.by=me(); gone.cons=cons; nd.archived.systems.push(gone); P.sel=null; save(nd, s.name+' set aside, with its '+cons.length+' connection'+(cons.length===1?'':'s')+'. Bring it back from Set Aside.'); }));
  acts.appendChild(btn('cs-btn', isNew?'Cancel':'Close', ()=>{ P.form=null; P.sel=null; paintState(); side(); }));
  acts.appendChild(btn('cs-btn pri', isNew?'Add System':'Save', ()=>{ const name=nm.value.trim(); if(!name){ nm.classList.add('need'); nm.focus(); return; }
    const nd=clone(d); let t; if(isNew){ let id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'sys'; while(nd.systems.some(x=>x.id===id)) id+='-2'; const pos=freeSpot(nd, place.value); t={id, x:pos.x, y:pos.y}; nd.systems.push(t); } else t=nd.systems.find(x=>x.id===s.id);
    if(!isNew && t.zone!==place.value){ const pos=freeSpot(nd, place.value); t.x=pos.x; t.y=pos.y; }
    Object.assign(t,{name, zone:place.value, area:place.value==='apps' ? (area.value||null) : null, status:stt.value, statusNote:note.value.trim()||null, what:what.value.trim(), where:where.value.trim(), replaced:rep.value.trim()||null, confirm:cf.value.trim()||null});
    P.form=null; P.sel=t.id; save(nd, isNew ? name+' added to the map.' : 'Saved '+name+'.'); }));
  if(!isNew){ const cs=d.connections.filter(c=>c.from===s.id||c.to===s.id); const hd=h('div','cs-k','Connections ('+cs.length+')'); hd.style.marginTop='16px'; p.appendChild(hd);
    const cl=h('div','cs-cl'); cs.forEach(c=>{ const it=h('div','cs-ci'); const tx=h('div'); const out=c.from===s.id; tx.appendChild(h('b',null,(out?'Sends to ':'Receives from ')+((by[out?c.to:c.from]||{}).name||'?'))); tx.append(': '+c.what); if(c.how==='hand') tx.appendChild(h('span','cs-hand','by hand')); if(c.confirm) tx.appendChild(h('span','cs-cf','To confirm: '+c.confirm)); it.appendChild(tx);
      const x=h('div','x'); x.appendChild(btn('cs-sbtn','Change', ()=>{ P.form=pp=>conForm(pp, d, c, s.id); side(); })); it.appendChild(x); cl.appendChild(it); });
    p.appendChild(cl); const add=btn('cs-btn','Add a Connection', ()=>{ P.form=pp=>conForm(pp, d, null, s.id); side(); }); add.style.marginTop='8px'; p.appendChild(add); }
  setTimeout(()=>nm.focus(), 0); }
function conForm(p, d, c, ctx){ const isNew=!c; const opts=d.systems.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>[s.id,s.name]);
  p.appendChild(h('div','cs-k','Connection')); p.appendChild(h('h3',null, isNew ? 'Add a Connection' : 'Change a Connection'));
  const f=h('div','cs-f'); p.appendChild(f);
  const fr=field(f,'From', sel(opts, c?c.from:(ctx||opts[0][0]))); const to=field(f,'To', sel(opts, c?c.to:''));
  if(isNew && ctx){ const o=h('option',null,'Pick a system'); o.value=''; o.selected=true; to.insertBefore(o, to.firstChild); }
  const what=field(f,'What is sent', inp(c&&c.what,'e.g., Booked sponsors',120));
  const how=field(f,'How it moves', sel([['auto','Automatically'],['hand','Copied by a person'],['soon','Not live yet']], c?c.how:'auto'));
  const note=field(f,'Note (optional, shown in the panel)', inp(c&&c.note,'e.g., Every weekday morning',200));
  const cf=field(f,'Still to confirm (only shows in Edit mode)', inp(c&&c.confirm,'Leave empty when it’s confirmed',300));
  const back=()=>{ P.form=null; side(); };
  const acts=h('div','acts'); f.appendChild(acts);
  if(!isNew) acts.appendChild(btn('cs-btn danger','Set Aside', ()=>{ const nd=clone(d); const i=nd.connections.findIndex(x=>x.id===c.id); const [gone]=nd.connections.splice(i,1); gone.at=Date.now(); gone.by=me(); nd.archived.connections.push(gone); P.form=null; save(nd, 'Connection set aside. Bring it back from Set Aside.'); }));
  acts.appendChild(btn('cs-btn','Cancel', back));
  acts.appendChild(btn('cs-btn pri', isNew?'Add Connection':'Save', ()=>{ const w=what.value.trim(); if(!to.value || to.value===fr.value){ to.classList.add('need'); to.focus(); return; } if(!w){ what.classList.add('need'); what.focus(); return; }
    const nd=clone(d); let t; if(isNew){ t={id:'c'+Date.now().toString(36)}; nd.connections.push(t); } else t=nd.connections.find(x=>x.id===c.id);
    Object.assign(t,{from:fr.value, to:to.value, what:w, how:how.value, note:note.value.trim()||null, confirm:cf.value.trim()||null}); P.form=null; save(nd, isNew?'Connection added.':'Connection saved.'); }));
  setTimeout(()=>(isNew?to:what).focus(), 0); }
function archForm(p, d){ p.appendChild(h('div','cs-k','Set aside')); p.appendChild(h('h3',null,'Bring Something Back'));
  const by={}; d.systems.forEach(x=>by[x.id]=x); const cl=h('div','cs-cl');
  d.archived.systems.forEach((s,i)=>{ const it=h('div','cs-ci'); const tx=h('div'); tx.appendChild(h('b',null,s.name)); tx.appendChild(h('small',null,'System'+((s.cons||[]).length?' with '+s.cons.length+' connection'+(s.cons.length>1?'s':''):''))); it.appendChild(tx);
    it.appendChild(btn('cs-sbtn','Bring Back', ()=>{ const nd=clone(d); const [b]=nd.archived.systems.splice(i,1); const cons=b.cons||[]; delete b.cons; delete b.at; delete b.by; if(nd.systems.some(x=>Math.abs(x.x-b.x)<W && Math.abs(x.y-b.y)<H+12)){ const pos=freeSpot(nd,b.zone); b.x=pos.x; b.y=pos.y; } nd.systems.push(b); cons.forEach(c=>{ if(!nd.connections.some(x=>x.id===c.id)) nd.connections.push(c); }); P.form=null; save(nd, b.name+' is back on the map.'); })); cl.appendChild(it); });
  d.archived.connections.forEach((c,i)=>{ const it=h('div','cs-ci'); const tx=h('div'); tx.appendChild(h('b',null,((by[c.from]||{}).name||c.from)+' → '+((by[c.to]||{}).name||c.to))); tx.appendChild(h('small',null,c.what)); it.appendChild(tx);
    const ok=by[c.from] && by[c.to]; const b0=btn('cs-sbtn','Bring Back', ()=>{ const nd=clone(d); const [b]=nd.archived.connections.splice(i,1); delete b.at; delete b.by; nd.connections.push(b); P.form=null; save(nd, 'Connection is back.'); }); if(!ok){ b0.disabled=true; b0.title='Bring back the system first'; } it.appendChild(b0); cl.appendChild(it); });
  if(!cl.children.length) cl.appendChild(h('p','hint','Nothing is set aside.')); p.appendChild(cl);
  const c0=btn('cs-btn','Close', ()=>{ P.form=null; side(); }); c0.style.marginTop='10px'; p.appendChild(c0); }

/* ---------- the dashboard tile ---------- */
function tile(el, size){ start(); const d=M.data; const box=h('div','cs-tile'); el.appendChild(box); el.classList.add('cs-tilewrap');
  if(!d){ box.appendChild(h('div','st-sub','Getting Connected Systems…')); return; }
  if(d.empty){ box.appendChild(h('div','st-sub','Not loaded yet. Open it to see how.')); return; }
  const c=counts(d); const nums=h('div','cs-tn'); [[c.apps,'systems'],[c.live,'live'],[c.auto,'automatic hand-offs']].forEach(x=>{ const w=h('div'); w.appendChild(h('b',null,String(x[0]))); w.appendChild(h('small',null,x[1])); nums.appendChild(w); }); box.appendChild(nums);
  const tall=size==='t'||size==='b', wide=size==='w'||size==='b';
  if(tall || wide){ const L=h('div','cs-tl'); c.soon.slice(0, size==='b'?6:tall?5:2).forEach(s=>{ const r=h('span'); r.appendChild(h('b',null,s.name)); r.appendChild(h('em',null,s.statusNote||s.status)); L.appendChild(r); }); if(c.soon.length) box.appendChild(L); }
  if(wide && size==='b'){ const svg=sv('svg',{class:'cs-mini',viewBox:'0 0 1200 720','aria-hidden':'true'}); const by={}; d.systems.forEach(s=>by[s.id]=s);
    d.connections.forEach((cn,i)=>{ const a=by[cn.from], b=by[cn.to]; if(a&&b) sv('path',{d:edgePath(a,b,i),fill:'none',stroke:'var(--border-strong,#adc4d6)','stroke-width':3,'stroke-dasharray':cn.how==='hand'?'10 8':''},svg); });
    d.systems.forEach(s=>sv('rect',{x:s.x-W/2,y:s.y-H/2,width:W,height:H,rx:6,fill:colorOf(d,s)},svg)); box.appendChild(svg); }
  box.appendChild(h('div','st-next','As of '+longDate(d.asOf)+' · open the map')); }

window.__hqSystems={ version:'2.0', page, tile, load, start, canEdit,
  get data(){ return M.data; },
  setEdit(on){ P.edit=!!on && canEdit(); P.form=null; draw(); },
  get editing(){ return P.edit; },
  onChange(f){ M.listeners.push(f); return ()=>{ M.listeners=M.listeners.filter(x=>x!==f); }; },
  redraw: draw,
  destroy(){ css.remove(); M.listeners=[]; } };
start();
})();
