/* Change History (21 Nov 2026).
   The Team HQ Change History job in the private data repository reads every save and keeps, for 90 days, who changed
   what on the team's shared lists (tasks, Team Projects, key dates, plans and plan items, Team Meeting agenda items).
   This shows it in two places: a History section at the foot of an item's panel, and Recent Changes in System Health.
   Expenses, Sync Ups and notes are never recorded. Nothing here saves anything. */
(function(){
'use strict';
if(window.__hqHist && window.__hqHist.destroy) window.__hqHist.destroy();
const S=()=>window.__S||{};
function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function when(ms){ const d=new Date(ms), now=new Date(); const t=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  if(d.toDateString()===now.toDateString()) return 'Today '+t; const y=new Date(now); y.setDate(y.getDate()-1);
  if(d.toDateString()===y.toDateString()) return 'Yesterday '+t; return MON[d.getMonth()]+' '+d.getDate(); }
const first=n=>String(n||'Someone').trim().split(/\s+/)[0];
const KIND={tasks:'Task', rocks:'Team Project', dates:'Key Date', plans:'Plan', planitems:'Plan Item', agenda:'Agenda Item'};
const LAB={
  tasks:{t:'Name', s:'Status', due:'Due', o:'Accountable', d:'Hands-On', p:'Priority', r:'Team Project', w:'Workstream', notes:'Notes', rail:'Running Rail', start:'Start'},
  rocks:{name:'Name', status:'Status', lead:'Lead', desc:'Description', ws:'Workstreams', due:'Due', start:'Start', health:'Health', color:'Color'},
  dates:{t:'What', d:'Date', e:'End', k:'Kind', who:'Who', note:'Notes', rec:'Repeats', pin:'Pinned', loc:'Where', time:'Time', approx:'Approximate'},
  plans:{title:'Title', t:'Title', who:'Who', s:'Status', start:'Start', end:'End', note:'Notes'},
  planitems:{t:'Item', s:'Status', who:'Who', day:'Day', note:'Notes', sec:'Section', grp:'Group', crit:'Critical', x:'Done', doneAt:'Done On', doneBy:'Done By'},
  agenda:{t:'Item', who:'Who', mtg:'Meeting', kind:'Kind', notes:'Notes', d:'Details'}};
const PEOPLE_FIELDS=/^(o|d|lead|who|doneBy)$/;
function label(col, f){ const L=LAB[col]||{}; return L[f] || (f.charAt(0).toUpperCase()+f.slice(1)); }
function names(v){ const P=S().people||[]; return String(v).split(/,\s*/).map(x=>{ const p=P.find(z=>z.id===x); return p ? first(p.name) : x; }).join(', '); }
function val(col, f, v){ if(v==='') return 'blank'; if(v==='(changed)') return ''; return PEOPLE_FIELDS.test(f) ? names(v) : v; }
function line(x){ if(x.act==='added') return 'Added'; if(x.act==='deleted') return 'Deleted';
  const parts=(x.ch||[]).map(c=>{ const a=val(x.col,c[0],c[1]), b=val(x.col,c[0],c[2]); return label(x.col,c[0])+(a||b ? ': '+(a||'blank')+' → '+(b||'blank') : ' changed'); });
  if(x.more) parts.push(x.more+' more'); return parts.join(' · ') || 'Changed'; }

let cache=null, cacheAt=0, busy=null;
function read(){ const R=window.__hqRelay; if(!R || !R.readOther) return Promise.resolve([]);
  if(cache && Date.now()-cacheAt<60000) return Promise.resolve(cache); if(busy) return busy;
  busy=R.readOther('team-hq','history').then(d=>{ const o=(d&&d.docs)||{}; cache=Object.keys(o).map(k=>o[k]).filter(x=>x && x.col && x.id).sort((a,b)=>(b.at||0)-(a.at||0)); cacheAt=Date.now(); busy=null; return cache; }, ()=>{ busy=null; return cache||[]; });
  return busy; }

/* ---------- on an item's panel ---------- */
let CUR=null;
function wrap(name, fn){ const f=window[name]; if(typeof f!=='function' || f.__hx) return; const w=function(){ try{ CUR=fn.apply(null, arguments); if(CUR) CUR.ts=Date.now(); }catch(e){} return f.apply(this, arguments); }; w.__hx=1; w.__orig=f; window[name]=w; }
function hookOpeners(){
  wrap('__edit', t=>t && t.id ? {col:'tasks', id:t.id, t:t.t} : null);
  wrap('__editRock', r=>r && r.id ? {col:'rocks', id:r.id, t:r.name} : null);
  wrap('__editDate', d=>d && d.id ? {col:'dates', id:d.id, t:d.t} : null);
  wrap('__itemPanel', (pid, iid)=>{ const it=(S().planitems||[]).find(x=>x.id===iid); return it ? {col:'planitems', id:iid, t:it.t} : null; });
}
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
function paintPanel(){ const p=document.getElementById('panel'), b=document.getElementById('panel-b'); if(!p || !b || p.getAttribute('aria-hidden')==='true' || !CUR) return;
  if(b.querySelector('.hx-hist')) return;
  const tt=norm((document.getElementById('panel-t')||{}).textContent), ss=norm((document.getElementById('panel-s')||{}).textContent), want=norm(CUR.t);
  if(!want || (tt!==want && ss!==want)) return;
  const cur=CUR, box=h('div','hx-hist'); box.appendChild(h('h3','sect-t','History')); const list=h('div','hx-list'); list.appendChild(h('p','hx-q','Loading…')); box.appendChild(list); b.appendChild(box);
  read().then(L=>{ const mine=L.filter(x=>x.col===cur.col && x.id===cur.id).slice(0,15); list.textContent='';
    if(!mine.length){ list.appendChild(h('p','hx-q','No changes recorded in the last 90 days. Changes show here within the hour of being saved.')); return; }
    mine.forEach(x=>{ const r=h('div','hx-r'); r.appendChild(h('span','w', when(x.at))); r.appendChild(h('span','n', first(x.by))); r.appendChild(h('span','c', line(x))); list.appendChild(r); }); });
}

/* ---------- Recent Changes in System Health ---------- */
function opener(x){ const s=S(); const find=(arr)=>(arr||[]).find(z=>z.id===x.id);
  if(x.col==='tasks'){ const t=find(s.tasks); return t && window.__edit ? ()=>window.__edit(t) : null; }
  if(x.col==='rocks'){ const r=find(s.rocks); return r && window.__editRock ? ()=>window.__editRock(r) : null; }
  if(x.col==='dates'){ const d=find(s.dates); return d && window.__editDate ? ()=>window.__editDate(d) : null; }
  if(x.col==='planitems'){ const it=find(s.planitems); return it && window.__itemPanel ? ()=>window.__itemPanel(it.plan, it.id) : null; }
  return null; }
function paintHealth(){ const body=document.querySelector('.hq-prob .hh-in'); if(!body || body.querySelector('.hx-recent')) return;
  const del=[...body.querySelectorAll('h4')].find(x=>/Recently Deleted/.test(x.textContent)); if(!del) return;
  const hd=h('h4',null,'Recent Changes (Last 7 Days)'), box=h('div','hh-log hx-recent'); box.appendChild(h('p','hh-quiet','Loading…')).style.cssText='padding:8px 10px;margin:0';
  del.parentNode.insertBefore(hd, del); del.parentNode.insertBefore(box, del);
  read().then(L=>{ const cut=Date.now()-7*864e5, R=L.filter(x=>(x.at||0)>cut).slice(0,60); box.textContent='';
    if(!R.length){ box.appendChild(h('p','hh-quiet','No changes to the team’s tasks, projects, key dates, plans or agenda in the last 7 days.')).style.cssText='padding:8px 10px;margin:0'; return; }
    R.forEach(x=>{ const r=h('div','hh-lr hx-lr'); r.appendChild(h('span','w', when(x.at))); r.appendChild(h('span','m', (KIND[x.col]||x.col)+': '+(x.t||'(no name)')));
      const go=x.act!=='deleted' && opener(x); if(go){ const b=h('button',null,'Open'); b.type='button'; b.onclick=()=>{ const c=document.querySelector('.hq-prob .ph button'); if(c) c.click(); go(); }; r.appendChild(b); }
      r.appendChild(h('span','d', first(x.by)+' · '+line(x))); box.appendChild(r); }); });
}

let raf=0;
const mo=new MutationObserver(()=>{ if(raf) return; raf=requestAnimationFrame(()=>{ raf=0; hookOpeners(); paintPanel(); paintHealth(); }); });
mo.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['aria-hidden']});
hookOpeners();
const st=document.createElement('style'); st.id='hx-style';
st.textContent='.hx-hist{margin-top:18px}.hx-list{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:6px;overflow:hidden}'
 +'.hx-r{display:grid;grid-template-columns:110px 70px 1fr;gap:8px;padding:7px 10px;border-bottom:1px solid var(--rule,var(--border));font-size:12.5px;line-height:1.4}.hx-r:last-child{border-bottom:0}'
 +'.hx-r .w{color:var(--ink-3)}.hx-r .n{font-weight:600}.hx-r .c{overflow-wrap:anywhere}.hx-q{margin:0;padding:8px 10px;font-size:12.5px;color:var(--ink-3)}'
 +'@media(max-width:620px){.hx-r{grid-template-columns:1fr 1fr}.hx-r .c{grid-column:1/-1}}';
document.head.appendChild(st);
window.__hqHist={read, destroy(){ mo.disconnect(); st.remove(); ['__edit','__editRock','__editDate','__itemPanel'].forEach(n=>{ if(window[n] && window[n].__orig) window[n]=window[n].__orig; }); }};
})();
