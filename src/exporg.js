/* Expenses: trips that stay together, and a page that doesn't scroll forever (17 Nov 2026).
   1. Trip names. Reading a receipt could put it on a Key Date's name ("MBA Annual 2026"), a different one per
      receipt, so one trip split into several. Now a receipt whose trip was filled in by the reader joins the
      person's own trip that has an expense within 3 days of it; a receipt with no trip joins the one trip that
      does. The reader's name is kept only when the person has no trip near those dates (a new trip).
   2. The trip box in the expense editor. Its suggestion list doesn't open on iPhones, so it is a real drop-down
      now: the person's trips (newest first), then New Trip… to type one.
   3. The page. Trips start folded (only No Trip Name Yet and your newest open trip start open); trips already
      entered in DataBasics fold into one "Entered in DataBasics" line per person; Jonna and Vanessa get a row
      of people to jump to, and each person's name folds their trips away. */
(function(){
'use strict';
if(window.__expOrg && window.__expOrg.destroy) window.__expOrg.destroy();
const S=window.__S, root=document.getElementById('app-expenses');
if(!S || !root) return;
const NOTRIP='No Trip Name Yet', DAY=864e5, MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const api=()=>window.__expApi;
const h=(tag, cls, txt)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; };
const day=v=>{ const t=Date.parse(String(v||'').slice(0,10)+'T12:00:00'); return isNaN(t)?null:t; };
const fmt=t=>{ const d=new Date(t); return MON[d.getMonth()]+' '+d.getDate(); };
const money=n=>'$'+(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
const seesAll=()=>{ try{ return !!(api() && api().seesAll()); }catch(e){ return false; } };
const first=id=>{ const p=(S.people||[]).find(z=>z.id===id); return p ? String(p.name||'').split(' ')[0] : 'Someone'; };

/* a person's trips: name, days, open (anything not yet entered), newest first */
function tripsOf(who, skipId){
  const T={};
  (S.expenses||[]).forEach(x=>{ if(x.who!==who || !x.trip || x.id===skipId) return;
    const t=T[x.trip]=T[x.trip]||{n:x.trip, days:[], open:false}; const d=day(x.date); if(d) t.days.push(d); if(!x.submitted) t.open=true; });
  return Object.values(T).map(t=>Object.assign(t, {first:t.days.length?Math.min(...t.days):0, last:t.days.length?Math.max(...t.days):0}))
    .sort((a,b)=>b.last-a.last || a.n.localeCompare(b.n));
}
const span=t=>!t.days.length ? '' : t.first===t.last ? fmt(t.first) : fmt(t.first)+' – '+fmt(t.last);

/* ---------- 1. keep a person's receipts on one trip ---------- */
const fixing=new Set();
function nearTrips(e){ const d=day(e.date); if(!d) return [];
  return tripsOf(e.who, e.id).map(t=>Object.assign({}, t, {gap:Math.min(...t.days.map(x=>Math.abs(x-d)))})).filter(t=>t.days.length && t.gap<=3*DAY).sort((a,b)=>a.gap-b.gap); }
async function fixTrips(){
  const A=api(); if(!A || !Array.isArray(S.expenses) || !S.me || window.__HQ_TEST) return;
  const now=Date.now();
  for(const e of S.expenses){
    if(e.submitted || e.tripFixed || fixing.has(e.id) || (e.who!==S.me && e.by!==S.me)) continue;
    if(!e.at || now-e.at>3*DAY) continue;                 /* only receipts added in the last few days */
    if(A.expOf(e.id) && e.reading) continue;              /* still being read */
    const auto=!!(e.auto && e.auto.trip);
    let to=null;
    if(e.trip && auto){
      const mine=tripsOf(e.who, e.id);
      if(mine.some(t=>t.n===e.trip)) { to=null; }         /* already one of the person's trips */
      else { const N=nearTrips(e); if(N.length) to=N[0].n; }
    } else if(!e.trip){ const N=nearTrips(e); if(N.length===1 || (N.length>1 && N[0].gap<N[1].gap)) to=N[0].n; }
    else continue;                                        /* a trip the person picked: leave it */
    fixing.add(e.id);
    try{ const cur=Object.assign({}, A.expOf(e.id)||e, {tripFixed:1});
      if(to && to!==cur.trip){ cur.trip=to; cur.auto=Object.assign({}, cur.auto||{}, {trip:1}); }
      await A.put('expenses', cur); }
    catch(err){ console.error(err); }
    finally{ fixing.delete(e.id); }
  }
}

/* ---------- 2. the trip drop-down in the expense editor ---------- */
function ctl(p, label){ for(const f of p.querySelectorAll('.f')){ const s=f.firstElementChild; if(s && s.tagName==='SPAN' && s.textContent.trim()===label) return f.querySelector('input,select,textarea'); } return null; }
function hookEditor(){
  const p=document.getElementById('panel'); if(!p) return;
  const tf=ctl(p, 'Trip Name'), fld=tf && tf.closest('.f'); if(!fld || fld.querySelector('.eo-trip')) return;
  const inp=fld.querySelector('input'); if(!inp || inp.__eo) return; inp.__eo=1;
  const whoSel=ctl(p, 'Whose Expense');
  const sel=h('select','eo-trip'); sel.setAttribute('aria-label','Trip');
  inp.parentNode.insertBefore(sel, inp);
  const NEW='\u0000new', NONE='';
  function fill(){
    const who=(whoSel && whoSel.value) || S.me, v=inp.value.trim(); sel.textContent='';
    sel.appendChild(new Option('No trip yet', NONE));
    const L=tripsOf(who); const names=new Set(L.map(t=>t.n));
    if(L.length){ const g=document.createElement('optgroup'); g.label=(who===S.me?'Your':first(who)+'’s')+' trips';
      L.forEach(t=>g.appendChild(new Option(t.n+(span(t)?'  ·  '+span(t):'')+(t.open?'':'  ·  entered'), t.n))); sel.appendChild(g); }
    if(v && !names.has(v)) sel.appendChild(new Option(v, v));
    sel.appendChild(new Option('New Trip…', NEW));
    sel.value=v; inp.style.display=(v && !names.has(v) && sel.value===v) ? 'none' : 'none';
  }
  fill();
  sel.addEventListener('change', ()=>{
    if(sel.value===NEW){ inp.value=''; inp.style.display=''; inp.placeholder='Name the new trip, e.g. MBA Annual 2026'; inp.focus(); }
    else { inp.value=sel.value; inp.style.display='none'; }
    inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true}));
  });
  inp.addEventListener('blur', ()=>{ if(inp.style.display!=='none' && inp.value.trim()){ const v=inp.value.trim(); fill(); sel.value=v; inp.style.display='none'; } });
  if(whoSel) whoSel.addEventListener('change', fill);
  /* the reader can fill the trip in while the editor is open */
  inp.addEventListener('eo-sync', fill);
  let last=inp.value; const tick=setInterval(()=>{ if(!inp.isConnected){ clearInterval(tick); return; } if(inp.value!==last && inp.style.display==='none'){ last=inp.value; fill(); } }, 700);
}

/* ---------- 3. the page ---------- */
const seen=new Set(), foldP=new Set(), showEntered=new Set();
/* trips start folded, except No Trip Name Yet and each person's newest open trip from the last two weeks */
function defaults(){
  if(!Array.isArray(S.expenses)) return false; S.openTrips=S.openTrips||{}; let changed=false;
  const keep=new Set(); const people=[...new Set(S.expenses.map(x=>x.who))];
  people.forEach(w=>{ const t=tripsOf(w).find(t=>t.open); if(t && Date.now()-t.last<14*DAY) keep.add(w+'|'+t.n); });
  S.expenses.forEach(x=>{ const n=x.trip||NOTRIP;
    [[x.who+'|'+n, x.who+'|'+n], [n, x.who+'|'+n]].forEach(([key, k2])=>{ if(seen.has(key)) return; seen.add(key);
      if(S.openTrips[key]!==undefined) return;
      const open=n===NOTRIP || keep.has(k2); if(!open){ S.openTrips[key]=false; changed=true; } }); });
  return changed;
}
function isEntered(box){ const hd=box.querySelector(':scope > .triph'); return !!(hd && hd.querySelector('.chip.ch-dn')); }
function organize(){
  const firstTrip=root.querySelector('.trip'); if(!firstTrip) return;
  const list=firstTrip.parentNode;
  /* groups: each person (Jonna's and Vanessa's view) or the whole list */
  const kids=[...list.children]; const groups=[]; let g=null;
  kids.forEach(k=>{ if(k.classList.contains('exppers')){ g={head:k, items:[]}; groups.push(g); }
    else if(k.classList.contains('trip')){ if(!g){ g={head:null, items:[]}; groups.push(g); } g.items.push(k); }
    else if(k.classList.contains('eo-ent')){ if(g) g.fold=k; } });
  groups.forEach(G=>{
    const who=G.head ? whoOf(G.head) : (S.me||''), key=who||'me';
    /* entered trips → one folded line */
    const done=G.items.filter(isEntered);
    if(done.length>=1){
      let f=G.fold || h('div','eo-ent');
      const open=showEntered.has(key);
      if(!f.firstChild){ const b=h('button','eo-enth'); b.type='button'; f.appendChild(b); const body=h('div','eo-entb'); f.appendChild(body);
        b.onclick=()=>{ if(showEntered.has(key)) showEntered.delete(key); else showEntered.add(key); organize(); }; }
      const b=f.firstChild, body=f.lastChild;
      done.forEach(d=>{ if(d.parentNode!==body) body.appendChild(d); });
      const all=[...body.querySelectorAll(':scope > .trip')], tot=all.reduce((a,x)=>a+parseMoney(x), 0);
      b.innerHTML=''; b.appendChild(h('span','eo-chev', open?'▾':'▸')); b.appendChild(h('b',null,'Entered in DataBasics'));
      b.appendChild(h('small',null, all.length+(all.length===1?' trip':' trips'))); b.appendChild(h('span','amt money', money(tot)));
      b.setAttribute('aria-expanded', open?'true':'false');
      body.style.display=open?'':'none';
      const lastLive=[...G.items].filter(x=>!isEntered(x)).pop();
      const anchor=lastLive || G.head; if(anchor && anchor.nextElementSibling!==f) anchor.after(f);
      else if(!anchor && f.parentNode!==list) list.insertBefore(f, list.firstChild);
    }
    /* a person's name folds their trips */
    if(G.head){
      if(!G.head.dataset.eo){ G.head.dataset.eo='1'; G.head.setAttribute('role','button'); G.head.tabIndex=0; G.head.title='Fold or unfold '+first(who)+'’s trips';
        const t=()=>{ if(foldP.has(who)) foldP.delete(who); else foldP.add(who); organize(); };
        G.head.addEventListener('click', t); G.head.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); t(); } });
        G.head.insertBefore(h('span','eo-chev'), G.head.firstChild); }
      const hid=foldP.has(who); G.head.classList.toggle('eo-folded', hid); G.head.firstChild.textContent=hid?'▸':'▾';
      let n=G.head.nextElementSibling; while(n && !n.classList.contains('exppers') && !n.classList.contains('callout')){ if(n.classList.contains('trip')||n.classList.contains('eo-ent')) n.style.display=hid?'none':''; n=n.nextElementSibling; }
      if(!hid){ const f=G.head.parentNode && [...list.children].find(x=>x.classList.contains('eo-ent') && prevHead(x)===G.head); if(f) f.style.display=''; }
    }
  });
  jumpBar(list, groups);
}
function prevHead(x){ let e=x.previousElementSibling; while(e && !e.classList.contains('exppers')) e=e.previousElementSibling; return e; }
function whoOf(head){ const b=head.querySelector('b'), nm=b ? b.textContent.trim() : ''; const p=(S.people||[]).find(z=>z.name===nm); return p ? p.id : nm; }
function parseMoney(box){ const a=box.querySelector(':scope > .triph .amt'); return a ? Number(String(a.textContent).replace(/[^0-9.\-]/g,''))||0 : 0; }
/* Jonna and Vanessa: a row of people to jump to */
function jumpBar(list, groups){
  let bar=root.querySelector('.eo-jump');
  const heads=groups.filter(g=>g.head);
  if(!seesAll() || heads.length<2){ bar && bar.remove(); return; }
  const sig=heads.map(g=>whoOf(g.head)+':'+toSubmit(whoOf(g.head))).join('|');
  if(!bar || bar.dataset.sig!==sig){ bar && bar.remove(); bar=h('div','eo-jump'); bar.dataset.sig=sig;
    bar.appendChild(h('span','eo-jl','Jump to'));
    heads.forEach(g=>{ const w=whoOf(g.head), n=toSubmit(w); const b=h('button','eo-jb'); b.type='button';
      b.appendChild(document.createTextNode(first(w))); if(n) b.appendChild(h('small',null, n+' to submit'));
      b.onclick=()=>{ const hd=[...root.querySelectorAll('.exppers')].find(x=>whoOf(x)===w); if(!hd) return; if(foldP.has(w)){ foldP.delete(w); organize(); } hd.scrollIntoView({block:'start', behavior:'smooth'}); };
      bar.appendChild(b); });
  }
  const ready=root.querySelector('.ed-ready'), before=(ready && ready.parentNode===list) ? ready : heads[0].head;
  if(bar.nextElementSibling!==before || bar.parentNode!==list) list.insertBefore(bar, before);
}
const toSubmit=w=>(S.expenses||[]).filter(x=>x.who===w && !x.submitted).length;

let raf=0, busy=false;
function pass(){ raf=0; if(busy) return; busy=true;
  try{
    if(defaults() && root.offsetParent && window.__show && S.tab==='expenses'){ busy=false; window.__show('expenses'); return; }
    organize(); hookEditor();
  }catch(e){ console.error(e); }
  busy=false; }
const mo=new MutationObserver(()=>{ if(!raf) raf=requestAnimationFrame(pass); });
mo.observe(root, {childList:true, subtree:true});
const mo2=new MutationObserver(()=>{ try{ hookEditor(); }catch(e){} });
const pnl=document.getElementById('panel'); if(pnl) mo2.observe(pnl, {childList:true, subtree:true});
const timer=setInterval(()=>{ fixTrips(); }, 15000); setTimeout(fixTrips, 6000);
pass();

const css=h('style'); css.id='eo-style'; css.textContent=
  '.eo-trip{width:100%;box-sizing:border-box;font:inherit;font-size:15px;min-height:40px;border:1px solid var(--line,#c9d6e2);border-radius:6px;padding:6px 8px;background:var(--surface,#fff);color:var(--ink,#0d314c);margin-bottom:6px}'+
  '.eo-ent{margin:0 0 14px;border:1px solid var(--line,#dfe6ee);border-radius:6px;background:var(--surface,#fff);overflow:hidden}'+
  '.eo-enth{display:flex;align-items:center;gap:10px;width:100%;font:inherit;font-size:14px;text-align:left;padding:11px 14px;border:0;background:var(--surface-2,#f5f8fb);color:var(--ink,#0d314c);cursor:pointer}'+
  '.eo-enth small{color:var(--ink-3,#5b6b7a);font-size:12.5px}.eo-enth .amt{margin-left:auto;font-weight:700}.eo-entb{padding:10px 10px 0}'+
  '.eo-chev{display:inline-block;width:14px;color:var(--ink-3,#5b6b7a);font-size:12px}'+
  '.exppers[data-eo]{cursor:pointer}.exppers.eo-folded{opacity:.85}'+
  '.eo-jump{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 -12px}.eo-jump + .exppers,.eo-jump + .ed-ready{margin-top:0}.eo-jl{font-size:12.5px;font-weight:700;color:var(--ink-3,#5b6b7a);margin-right:4px}'+
  '.eo-jb{font:inherit;font-size:13.5px;font-weight:600;border:1px solid var(--line,#c9d6e2);background:var(--surface,#fff);color:var(--ink,#0d314c);border-radius:6px;padding:6px 10px;cursor:pointer;display:inline-flex;align-items:baseline;gap:6px}'+
  '.eo-jb small{font-weight:600;font-size:11.5px;color:#a15c00}.eo-jb:hover{border-color:var(--navy,#0d314c)}';
document.head.appendChild(css);

window.__expOrg={ version:'1.0', tripsOf, fixTrips, organize,
  destroy(){ mo.disconnect(); mo2.disconnect(); clearInterval(timer); css.remove(); root.querySelectorAll('.eo-jump').forEach(e=>e.remove()); } };
})();
