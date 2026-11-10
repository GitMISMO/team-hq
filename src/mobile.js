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
  /* room under the page for the bar fixed at the bottom, so the last thing on the page can be scrolled into view (November 6, 2026) */
  main{padding:14px 12px calc(90px + env(safe-area-inset-bottom,0px))!important}
  html.app-exp main{padding-bottom:calc(110px + env(safe-area-inset-bottom,0px))!important}
  /* the top bar fits on a phone: no bell in the Expenses app, tighter buttons on Team HQ (November 7, 2026) */
  html.app-exp #hq-bell{display:none!important}
  header.hqtop .hqtop-r{gap:4px!important}
  header.hqtop .hqtop-r .mastbtn{width:30px!important;height:30px!important;min-width:30px!important;padding:0!important;justify-content:center!important;gap:0!important}
  html.app-exp header.hqtop .exp-hq{padding-left:8px!important;padding-right:8px!important}
  @media (max-width:380px){header.hqtop .logoplate{padding:4px 6px!important}header.hqtop .mastrule{margin:0 5px!important}}
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
