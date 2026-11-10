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
const put=(c,o,b)=>window.__put ? window.__put(c,o,b) : Promise.resolve();

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

/* minutes read as hours once a meeting runs past 59 (Jonna, November 7, 2026) */
const hrs=n=>n>59 ? Math.floor(n/60)+' hr'+(n%60?' '+n%60+' min':'') : n+' min';

/* ---------- the planning page ---------- */
function runOfShow(){
  const m=sel(), I=items(m), mins=I.reduce((n,x)=>n+(+x.mins||0),0);
  const box=h('div','box mt-ros');
  const hd=h('div','mt-h'); hd.appendChild(h('h3','sect-t','Run of Show · '+longD(m)));
  const go=btn('btn mt-go', null, ()=>present(0)); go.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 4h18v12H3zM8 20h8M12 16v4"/></svg><span>Start the Meeting</span>'; hd.appendChild(go);
  box.appendChild(hd);
  const g=h('div','mt-steps');
  const room=people().length;
  const counts={bnb: I.length ? I.length+(I.length===1?' item':' items')+(mins?' · '+hrs(mins):'') : 'nothing yet — put something on',
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
  slideHead(body, 1, x.t, (s.i+1)+' of '+s.n+' · '+(x.kind||'Discuss')+(x.mins ? ' · '+hrs(+x.mins) : ''));
  const card=h('div','mt-item');
  const who=h('div','mt-by'); if(x.who){ who.appendChild(av(x.who,36)); who.appendChild(h('span',null,'Raised by '+(person(x.who)||{}).name)); } card.appendChild(who);
  if(x.info) card.appendChild(h('div','mt-info', txt(x.info)));
  const g=h('div','mt-fields');
  const f1=h('label','mt-f'); f1.appendChild(h('span',null,'Outcome')); const i1=h('input'); i1.value=txt(x.outcome); i1.placeholder='What we decided'; f1.appendChild(i1); g.appendChild(f1);
  const f2=h('label','mt-f'); f2.appendChild(h('span',null,'Notes')); const i2=h('input'); i2.value=txt(x.notes); i2.placeholder='Anything worth keeping'; f2.appendChild(i2); g.appendChild(f2);
  card.appendChild(g);
  const acts=h('div','mt-acts');
  const cov=h('label','mt-cov'); const cb=h('input'); cb.type='checkbox'; cb.checked=!!x.done; cov.appendChild(cb); cov.append('Covered'); acts.appendChild(cov);
  const sv=btn('btn','Save', async()=>{ sv.disabled=true; await put('agenda', Object.assign({}, x, {outcome:i1.value.trim(), notes:i2.value.trim(), done:cb.checked?1:0}), x); sv.textContent='Saved'; setTimeout(()=>{ sv.textContent='Save'; sv.disabled=false; }, 1400); });
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
    await put('agenda', rec, u); sv.textContent='Saved'; setTimeout(()=>{ sv.textContent='Save Update'; sv.disabled=false; }, 1400); });
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
    await put('agenda', rec, g); sv.textContent='Saved'; setTimeout(()=>{ sv.textContent='Save'; sv.disabled=false; }, 1400); });
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
