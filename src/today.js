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
#app-today > .headline{display:none!important}
.td-team .rowflex{flex-wrap:wrap;gap:8px}
.td-seg{display:inline-flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:var(--surface)}
.td-seg button{height:32px;padding:0 12px;border:0;background:transparent;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-2);cursor:pointer}
.td-seg button+button{border-left:1px solid var(--border)}.td-seg button.on{background:var(--navy,#0d314c);color:#fff}
.td-team .pcard.td-off{display:none}
.td-pn{display:flex;gap:12px;margin-top:6px;font-size:11.5px;color:var(--ink-3)}.td-pn b{font-size:13px;color:var(--ink);margin-right:3px}.td-pn .bad b{color:var(--bad)}
.td-pa{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.td-pa span{display:inline-flex;align-items:center;height:26px;padding:0 9px;border:1px solid var(--border);border-radius:5px;background:var(--surface);font-size:11.5px;font-weight:700;color:var(--c1);cursor:pointer;white-space:nowrap}
.td-pa span:hover,.td-pa span:focus-visible{border-color:var(--c1);background:var(--sky-wash);outline:none}
.td-mp{display:inline-block;margin-left:6px;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--c1)}
@media(max-width:640px){.td-card{flex-basis:72%}.td-row{grid-template-columns:110px 1fr}}
`;
document.head.appendChild(css);

/* ---------- People, folded into Where My Team Is Today ----------
   Each card also carries what the People page showed — open, late and lead counts, a way into the
   person's own page and Find a Time — and the section can show everyone or just My People. */
const doersOf=t=>(t.d && t.d.length) ? t.d : (t.o ? [t.o] : []);
const isOpenT=t=>!/^done$/i.test(String(t.s||''));
function blendPeople(){
  const hd=[...root.querySelectorAll('h2,h3')].find(x=>/^Where My Team Is Today$/i.test((x.textContent||'').trim())); if(!hd) return;
  const sec=hd.closest('.rowflex') ? hd.closest('.rowflex').parentElement : hd.parentElement; if(!sec) return; sec.classList.add('td-team');
  const x=window.__hqx, mine=x && x.myPeople ? x.myPeople() : [];
  const bar=hd.closest('.rowflex');
  if(bar && !bar.querySelector('.td-seg')){ const seg=h('div','td-seg');
    [['all','Everyone'],['mine','My People']].forEach(([k,l])=>{ const b=btn((ui.who||'all')===k?'on':'', l+(k==='mine'&&mine.length?' ('+mine.length+')':''), ()=>{ if(k==='mine' && !mine.length && x && x.pickPeople){ x.pickPeople(); return; } ui.who=k; save(); blendPeople(); }); b.dataset.k=k; seg.appendChild(b); });
    if(x && x.pickPeople){ const ch=btn('', 'Choose', ()=>x.pickPeople()); ch.title='Choose My People — your direct reports, or anyone you keep an eye on'; seg.appendChild(ch); }
    bar.insertBefore(seg, bar.children[1]||null); }
  if(bar) bar.querySelectorAll('.td-seg button[data-k]').forEach(b=>{ b.classList.toggle('on', (ui.who||'all')===b.dataset.k); if(b.dataset.k==='mine') b.textContent='My People'+(mine.length?' ('+mine.length+')':''); });
  const t0=today(); const late=t=>{ const d=pd(t.due); return d && d<t0; };
  sec.querySelectorAll('.pcard').forEach(c=>{
    const nm=((c.querySelector('.pm b')||{}).textContent||'').trim(); const p=S.people.find(z=>z.name===nm); if(!p) return;
    c.classList.toggle('td-off', ui.who==='mine' && mine.length>0 && mine.indexOf(p.id)<0);
    const pm=c.querySelector('.pm'); if(!pm) return;
    const open=S.tasks.filter(t=>isOpenT(t) && doersOf(t).indexOf(p.id)>=0), lt=open.filter(late).length, leads=(S.rocks||[]).filter(r=>(r.status||'Active')==='Active' && r.lead===p.id).length;
    const sig=open.length+':'+lt+':'+leads; if(c.dataset.blend===sig) return; c.dataset.blend=sig;
    c.querySelectorAll('.td-pn,.td-pa').forEach(z=>z.remove());
    const nb=pm.querySelector('b'); if(nb && mine.indexOf(p.id)>=0 && !nb.querySelector('.td-mp')){ nb.appendChild(h('span','td-mp','My People')); }
    const n=h('div','td-pn'); [[open.length,'open',''],[lt,'late',lt?'bad':''],[leads, leads===1?'project':'projects','']].forEach(([v,l,cl])=>{ const sp=h('span',cl); sp.appendChild(h('b',null,String(v))); sp.append(l); n.appendChild(sp); }); pm.appendChild(n);
    const a=h('div','td-pa'); const act=(label, fn, tip)=>{ const sp=h('span',null,label); sp.setAttribute('role','button'); sp.tabIndex=0; sp.title=tip; sp.addEventListener('click', e=>{ e.stopPropagation(); e.preventDefault(); fn(); }); sp.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.stopPropagation(); e.preventDefault(); fn(); } }); a.appendChild(sp); };
    act('Their Work', ()=>{ if(window.__nx && window.__nx.open) window.__nx.open('u:'+p.id); }, 'Everything '+first(p.id)+' has on, by project and due date');
    if(p.id!==S.me) act('Find a Time', ()=>{ try{ const k2='tools:team-hq:mismo.teamhq.ft'; const cur=JSON.parse(localStorage.getItem(k2)||'{}'); cur.who=[S.me, p.id]; localStorage.setItem(k2, JSON.stringify(cur)); }catch(e){} window.__show && window.__show('findtime'); }, 'See when you and '+first(p.id)+' are both free');
    pm.appendChild(a); });
}
let blendT=null; const moB=new MutationObserver(()=>{ clearTimeout(blendT); blendT=setTimeout(()=>{ if(!root.hidden) blendPeople(); }, 60); });
moB.observe(root, {childList:true, subtree:true});
window.addEventListener('hq:people', ()=>{ root.querySelectorAll('.pcard').forEach(c=>{ delete c.dataset.blend; }); blendPeople(); });

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
paint(); blendPeople();
window.__td={ paint, version:'1.1', destroy(){ if(mo) mo.disconnect(); mo=null; moB.disconnect(); mo3 && mo3.disconnect(); clearInterval(calTimer); css.remove(); const n=root.querySelector(':scope > .td-wrap'); n && n.remove(); [...root.querySelectorAll('.td-hidden')].forEach(c=>c.classList.remove('td-hidden')); } };
})();
