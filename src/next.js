/* Team HQ, reimagined (take two) — modeled on Linear for the structure and Sunsama for the day.
   - The MISMO rail on the left IS the app's sidebar: My Day, Inbox, My Tasks, Calendar, All Tasks,
     then every Team Project and every person listed right there. Nothing hides behind "More".
   - Lists are dense rows (status circle, title, project, due, people) you can drag between groups,
     with a Board view one click away.
   - My Day puts your list and your calendar side by side, so the whole screen is working space.
   It uses the same data and editors as the classic page. Turned on with the New Team HQ switch. */
(function(){
'use strict';
if(window.__nx && window.__nx.destroy) window.__nx.destroy();
const S=window.__S; if(!S) return;
const KEY='tools:team-hq:mismo.teamhq.nx';
const ui={on:undefined, view:'day', modes:{}, groups:{}, who:'', proj:'', ws:'', q:'', showDone:false, dd:0, tw:0, tpeople:[], fold:{}};
try{ Object.assign(ui, JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){}
if(!ui.modes || typeof ui.modes!=='object') ui.modes={}; if(!ui.groups || typeof ui.groups!=='object') ui.groups={}; if(!ui.fold || typeof ui.fold!=='object') ui.fold={};
if(!Array.isArray(ui.tpeople)) ui.tpeople=[];
if(['home','work','team','time'].indexOf(ui.view)>=0 || !ui.view) ui.view='day';
/* a link straight to a page: resources.mismo.org/team-hq/?page=systems */
let DEEP=''; try{ const pg=new URLSearchParams(location.search).get('page'); if(pg && ['systems'].indexOf(pg)>=0) DEEP=pg; }catch(e){}
/* the new Team HQ is the only Team HQ now — no classic switch */
ui.on=true;
const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify({on:ui.on, view:ui.view, modes:ui.modes, groups:ui.groups, who:ui.who, proj:ui.proj, showDone:ui.showDone, tpeople:ui.tpeople, fold:ui.fold, ibf:ui.ibf})); }catch(e){} };

/* ---------- helpers ---------- */
function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function btn(cls, txt, fn){ const b=h('button', cls, txt); b.type='button'; if(fn) b.addEventListener('click', fn); return b; }
const I={
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  week:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8.5 10v10M14 10v10M8 3v4M16 3v4"/>',
  ppl:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
  day:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
  inbox:'<path d="M3 13l2.5-8h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>',
  mine:'<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16.2 9.5"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  all:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>', search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  left:'<path d="M15 6l-6 6 6 6"/>', right:'<path d="M9 6l6 6-6 6"/>', down:'<path d="M6 9l6 6 6-6"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  board:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/>',
  sun:'<path d="M5 12h10M11 8l4 4-4 4"/><path d="M19 5v14"/>', menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', unflag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/><path d="M3 3l18 18"/>',
  read:'<path d="M3 10l9-6 9 6v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3.5 10.5L12 16l8.5-5.5"/>', unread:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/><circle cx="19" cy="5" r="3" fill="currentColor"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5L12 16l2.5-2.5"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  net:'<rect x="2.5" y="3.5" width="7" height="5" rx="1.2"/><rect x="14.5" y="3.5" width="7" height="5" rx="1.2"/><rect x="8.5" y="15.5" width="7" height="5" rx="1.2"/><path d="M9.5 6h5M6 8.5c0 4 6 3 6 7M18 8.5c0 4-6 3-6 7"/>' };
const ic=(k,c)=>'<svg class="'+(c||'')+'" viewBox="0 0 24 24" aria-hidden="true">'+I[k]+'</svg>';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], WDL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const today=()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const pd=s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); return m ? new Date(+m[1], m[2]-1, +m[3]) : null; };
const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const days=s=>{ const d=pd(s); return d ? Math.round((d-today())/864e5) : null; };
const fmt=s=>{ const d=pd(s); return d ? MON[d.getMonth()]+' '+d.getDate() : ''; };
const tm=ms=>{ const d=new Date(ms); let hh=d.getHours(), mm=d.getMinutes(); const ap=hh<12?'a':'p'; hh=hh%12||12; return hh+(mm?':'+String(mm).padStart(2,'0'):'')+ap; };
const tmL=ms=>new Date(ms).toLocaleTimeString('en-US',{hour:'numeric', minute:'2-digit'}).replace(':00','');
const st=t=>/^waiting/i.test(t.s||'') ? 'Waiting on Someone' : (t.s||'Not Started');
const isOpen=t=>st(t)!=='Done';
const doers=t=>(t.d && t.d.length) ? t.d.slice() : (t.o ? [t.o] : []);
const me=()=>S.me;
const person=id=>S.people.find(p=>p.id===id);
const first=id=>{ const p=person(id); return p ? p.name.split(' ')[0] : ''; };
const people=()=>S.people.slice().sort((a,b)=>(a.ord||0)-(b.ord||0));
const rock=id=>S.rocks.find(r=>r.id===id);
const activeRocks=()=>S.rocks.filter(r=>(r.status||'Active')==='Active').sort((a,b)=>(a.order||0)-(b.order||0) || a.name.localeCompare(b.name));
const pcol=p=>'var(--c'+(((p&&p.color||0)%7)+1)+')';
const rcol=r=>'var(--c'+(((r&&r.color||0)%7)+1)+')';
function av(id, size){ const p=person(id), a=h('span','av'); if(!p) return a; a.textContent=p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join(''); a.style.background=pcol(p); a.title=p.name; if(size){ a.style.width=a.style.height=size+'px'; a.style.fontSize=Math.round(size*.42)+'px'; } return a; }
const byDue=(a,b)=>{ const x=a.due||'9999', y=b.due||'9999'; return x<y?-1:x>y?1:(a.ord||0)-(b.ord||0); };
const editTask=t=>window.__edit && window.__edit(t);
const newTask=o=>editTask(Object.assign({t:'', o:me()||'', d:[], r:'', w:'', s:'Not Started', p:'Normal', due:'', notes:'', rail:0, ord:(S.tasks.length+1)*10, at:Date.now()}, o||{}));
const put=(c,o,b)=>window.__put ? window.__put(c,o,b) : Promise.resolve();
const cal=id=>{ const by=(window.__cal && window.__cal.CAL && window.__cal.CAL.by)||{}; return Array.isArray(by[id]) ? by[id] : null; };
function etAt(day, hour){ let t=Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hour+5, 0); const e=+new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York', hour:'numeric', hourCycle:'h23'}).format(t); return t+(hour-e)*3600e3; }
function holiday(d){ try{ const r=window.__t && window.__t.holidayOn(d); return r ? (typeof r==='string'?r:(r.n||r.t||r.name||'Holiday')) : ''; }catch(e){ return ''; } }
/* a date that stands in for a repeating one on its day ("Team Meeting — In Person in DC" lists nodupe:['teammtg']) shows instead of it, not beside it */
function keyDatesOn(d){ try{ const L=(window.__dOn ? window.__dOn(d) : []) || []; const skip=new Set(); L.forEach(z=>(z.nodupe||[]).forEach(id=>skip.add(id))); return L.filter(z=>!skip.has(z.id) && !skip.has(z._base)); }catch(e){ return []; } }
const workday=d=>d.getDay()%6!==0 && !holiday(d);
function nextWorkday(d){ let x=new Date(d); for(let i=0;i<10 && !workday(x);i++) x=addD(x,1); return x; }
const phone=()=>window.matchMedia('(max-width:640px)').matches;

/* ---------- toast with undo, the little burst ---------- */
let toastEl=null, toastTimer=null;
function toast(msg, undo){ if(toastEl) toastEl.remove(); clearTimeout(toastTimer);
  toastEl=h('div','nx-toast'); toastEl.appendChild(h('span',null,msg));
  if(undo){ toastEl.appendChild(btn('nx-undo','Undo', ()=>{ undo(); toastEl.remove(); toastEl=null; })); }
  document.body.appendChild(toastEl); const t2=toastEl; toastTimer=setTimeout(()=>{ t2.remove(); if(toastEl===t2) toastEl=null; }, 6000); }
function burst(x, y){ const n=14, w=h('div','nx-burst'); w.style.left=x+'px'; w.style.top=y+'px';
  for(let i=0;i<n;i++){ const p=h('i'); const a=i/n*Math.PI*2, r=30+Math.random()*20; p.style.setProperty('--x', Math.cos(a)*r+'px'); p.style.setProperty('--y', Math.sin(a)*r+'px'); p.style.background='var(--c'+((i%7)+1)+')'; w.appendChild(p); }
  document.body.appendChild(w); setTimeout(()=>w.remove(), 700); }
/* each change, and its Undo, writes only the fields it touched, so a teammate's change in between stays (November 5, 2026) */
function undoOf(before, after, patch){ const back=Object.assign({}, after); Object.keys(patch).forEach(k=>{ if(before[k]===undefined) delete back[k]; else back[k]=before[k]; }); return put('tasks', back, after); }
/* ---------- comments, @mentions and the bell (November 7, 2026) ----------
   Every task has a comment thread in its side panel. Typing @ and a name brings that person in. The bell at
   the top shows what needs you: mentions, comments on tasks you're on, tasks someone handed you, and
   what's due today or tomorrow. Comments live in their own file (comments), one record each. */
I.chat='<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>';
I.bell='<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>';
const CM={list:null, sub:false, box:null};
function startComments(){ if(CM.sub || !S.db || !S.db.collection) return; CM.sub=true;
  try{ S.db.collection('comments').onSnapshot(snap=>{
      CM.list=(snap && snap.docs ? snap.docs : []).map(d=>{ let b; try{ b=JSON.parse(JSON.stringify(d.data()||{})); }catch(e){ b={}; } b.id=d.id; return b; });
      if(CM.box && CM.box.isConnected && CM.box._paint) CM.box._paint();
      document.querySelectorAll('.nx-row[data-id]').forEach(r=>markRowCount(r.dataset.id));
      paintBell(); }, ()=>{ if(CM.list===null) CM.list=[]; }); }catch(e){ CM.sub=false; } }
function commentsOf(id){ return (CM.list||[]).filter(c=>c.task===id && !c.gone).sort((a,b)=>(a.at||0)-(b.at||0)); }
function cmAgo(t){ const m=Math.round((Date.now()-t)/60000); if(m<1) return 'just now'; if(m<60) return m+' min ago'; const hh=Math.round(m/60); if(hh<24) return hh+' hr ago';
  const d=new Date(t); return MON[d.getMonth()]+' '+d.getDate(); }
function mentionOf(word){ const w=String(word||'').toLowerCase(); return people().find(p=>p.id===w || p.name.toLowerCase().split(/\s+/)[0]===w) || null; }
function cmText(text){ const f=document.createDocumentFragment();
  String(text||'').split(/(@[A-Za-z][\w-]*)/).forEach(part=>{ const p=/^@/.test(part) ? mentionOf(part.slice(1)) : null;
    if(p){ const s=h('b','nx-cm-at', '@'+p.name.split(' ')[0]); s.title=p.name; f.appendChild(s); }
    else part.split('\n').forEach((ln,i)=>{ if(i) f.appendChild(h('br')); f.appendChild(document.createTextNode(ln)); }); });
  return f; }
function cmRow(c){ const r=h('div','nx-cm-row'); r.appendChild(av(c.by,24));
  const b=h('div','nx-cm-b'); const top=h('div','nx-cm-top'); top.appendChild(h('b',null, (person(c.by)||{}).name || c.by || 'Someone')); top.appendChild(h('span','nx-cm-ago', cmAgo(c.at||0)));
  if(c.by===me()){ const x=btn('nx-cm-x', 'Delete', ()=>{ const was=Object.assign({}, c); c.gone=1; if(CM.box && CM.box._paint) CM.box._paint();
      const body=Object.assign({}, was); delete body.id;
      Promise.resolve().then(()=>S.db.collection('comments').doc(c.id).delete()).catch(()=>{});
      toast('Comment deleted', ()=>{ delete c.gone; if(CM.box && CM.box._paint) CM.box._paint(); S.db.collection('comments').doc(c.id).set(body); }); });
    x.setAttribute('aria-label','Delete this comment'); top.appendChild(x); }
  b.appendChild(top); const tx=h('div','nx-cm-tx'); tx.appendChild(cmText(c.text)); b.appendChild(tx); r.appendChild(b); return r; }
function commentsBlock(t){ startComments();
  const box=h('div','nx-cm'), list=h('div','nx-cm-list'); box.setAttribute('aria-label','Comments');
  const paintList=()=>{ list.textContent=''; if(CM.list===null){ list.appendChild(h('div','nx-cm-none','Loading comments…')); return; }
    const L=commentsOf(t.id); if(!L.length) list.appendChild(h('div','nx-cm-none','No comments yet. Type @ and a name to bring someone in.'));
    L.forEach(c=>list.appendChild(cmRow(c))); };
  box._paint=paintList; CM.box=box; paintList(); box.appendChild(list);
  const form=h('form','nx-cm-new'); const ta=h('textarea','nx-cm-in'); ta.rows=2; ta.placeholder='Add a comment — type @ to mention someone'; ta.setAttribute('aria-label','Add a comment');
  const send=btn('nx-mini pri','Comment'); send.type='submit'; form.appendChild(ta); form.appendChild(send);
  const atWord=()=>{ const v=ta.value.slice(0, ta.selectionStart); const m=/(^|\s)@([A-Za-z]*)$/.exec(v); return m ? m[2] : null; };
  ta.addEventListener('input', ()=>{ const w=atWord(); if(w===null){ if(menuEl && menuEl._cm) closeMenus(); return; }
    const L=people().filter(p=>p.id!==me() && (!w || p.name.toLowerCase().split(/\s+/).some(n=>n.startsWith(w.toLowerCase()))));
    if(!L.length){ closeMenus(); return; }
    popMenu(ta, L.slice(0,7).map(p=>({label:p.name, icon:av(p.id,20).outerHTML, fn:()=>{ const pos=ta.selectionStart, v=ta.value, start=v.slice(0,pos).lastIndexOf('@');
      const ins='@'+p.name.split(' ')[0]+' '; ta.value=v.slice(0,start)+ins+v.slice(pos); ta.focus(); const c=start+ins.length; ta.setSelectionRange(c,c); }})), 'Mention');
    if(menuEl) menuEl._cm=true; ta.focus(); });
  ta.addEventListener('keydown', e=>{ if(e.key==='Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
    if(e.key==='Escape' && menuEl && menuEl._cm){ e.stopPropagation(); closeMenus(); } });
  form.addEventListener('submit', e=>{ e.preventDefault(); const text=ta.value.trim(); if(!text) return; closeMenus();
    const mentions=[...new Set((text.match(/@[A-Za-z][\w-]*/g)||[]).map(w=>mentionOf(w.slice(1))).filter(Boolean).map(p=>p.id))].filter(id=>id!==me());
    const id='cm'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), body={task:t.id, by:me(), at:Date.now(), text:text.slice(0,4000), mentions};
    if(!CM.list) CM.list=[]; CM.list.push(Object.assign({id}, body)); ta.value=''; paintList(); markRowCount(t.id);
    Promise.resolve().then(()=>S.db.collection('comments').doc(id).set(body)).then(()=>{ if(mentions.length) toast('Comment added — '+mentions.map(first).join(' and ')+' will see it in their bell.'); },
      ()=>toast('That comment didn’t save. It’s still here — try again in a moment.')); });
  box.appendChild(form);
  box.appendChild(h('div','nx-cm-tip','Ctrl+Enter to post'));
  return box; }
function markRowCount(id){ document.querySelectorAll('.nx-row[data-id="'+id+'"]').forEach(r=>{ const n=commentsOf(id).length; let c=r.querySelector('.nx-cmc'); if(!n){ c && c.remove(); return; }
  if(!c){ c=h('span','nx-cmc'); const tt=r.querySelector('.nx-tt'); tt && tt.after(c); } c.innerHTML=ic('chat')+'<span>'+n+'</span>'; c.title=n+' comment'+(n>1?'s':''); }); }
function rowCount(t){ const n=commentsOf(t.id).length; if(!n) return null; const c=h('span','nx-cmc'); c.innerHTML=ic('chat')+'<span>'+n+'</span>'; c.title=n+' comment'+(n>1?'s':''); return c; }

/* the bell */
const BK='hq.bell', bell={btn:null, panel:null};
function bellState(){ let s; try{ s=JSON.parse(localStorage.getItem(BK)||'{}'); }catch(e){ s={}; } s.who=s.who||''; if(s.who!==me()) s={who:me(), seen:0, known:{}, seeded:false, day:''}; s.known=s.known||{}; return s; }
function bellSave(s){ try{ localStorage.setItem(BK, JSON.stringify(s)); }catch(e){} }
function bellItems(){ const m=me(); if(!m || !S.tasks) return []; const s=bellState(), out=[], L=CM.list||[], cut=Date.now()-14*864e5;
  const on=t=>doers(t).indexOf(m)>=0 || t.o===m || (t.fol||[]).indexOf(m)>=0;
  /* tasks handed to you: anything you're newly doing that someone else set up */
  let changed=false; const mineNow=S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(m)>=0);
  mineNow.forEach(t=>{ if(!s.known[t.id]){ s.known[t.id]= s.seeded ? Date.now() : 1; changed=true; } });
  if(!s.seeded){ s.seeded=true; changed=true; }
  if(changed) bellSave(s);
  mineNow.forEach(t=>{ const at=s.known[t.id]; if(at>1 && at>cut && t.by && t.by!==m) out.push({k:'assigned', at, who:t.by, t}); });
  L.forEach(c=>{ if(c.gone || c.by===m || (c.at||0)<cut) return; const t=S.tasks.find(x=>x.id===c.task); if(!t) return;
    const ment=(c.mentions||[]).indexOf(m)>=0, follows=on(t) || L.some(z=>z.task===c.task && z.by===m && (z.at||0)<(c.at||0));
    if(ment || follows) out.push({k:ment?'mention':'comment', at:c.at||0, who:c.by, t, text:c.text}); });
  const t0=today().getTime();
  mineNow.forEach(t=>{ if(!t.due) return; const n=days(t.due); if(n===0 || n===1) out.push({k:n===0?'today':'tomorrow', at:t0+(n===0?2:1), t}); });
  S.tasks.forEach(t=>{ if(!isOpen(t) || !(t.wait||[]).length || !on(t)) return; const B=blockers(t); if(!B.length || B.some(isOpen)) return;
    const at=Math.max.apply(null, B.map(b=>b.at||0)); if(at>cut) out.push({k:'ready', at, t, text:B.map(b=>b.t).join(', ')+(B.length>1?' are':' is')+' done'}); });
  (S.nudges||[]).forEach(n=>{ if(n.to!==m || n.done || (n.at||0)<cut) return; out.push({k:'nudge', at:n.at||0, who:n.k==='Rule'?null:n.by, t:S.tasks.find(x=>x.id===n.task)||null, label:n.m||n.k||'A reminder'}); });
  return out.sort((a,b)=>b.at-a.at).slice(0,40); }
function bellNew(L){ const s=bellState(), d=iso(today()); return L.some(x=>(x.k==='today'||x.k==='tomorrow') ? s.day!==d : x.at>(s.seen||0)); }
function paintBell(){ if(!bell.btn) return; let L=[]; try{ L=bellItems(); }catch(e){} bell.btn.classList.toggle('has', bellNew(L)); if(bell.panel && bell.panel.isConnected) drawBellPanel(L); }
function goTask(t){ closeBell(); ui.peek=t.id; if(doers(t).indexOf(me())>=0 || t.o===me()) open('mine'); else if(t.r && rock(t.r)) open('p:'+t.r); else { editTask(t); return; }
  setTimeout(()=>{ try{ selectPeek(t.id); }catch(e){} const r=document.querySelector('.nx-row[data-id="'+t.id+'"]'); if(r) r.scrollIntoView({block:'center'}); }, 150); }
function drawBellPanel(L){ const p=bell.panel; p.textContent=''; const hd=h('div','nx-bl-h'); hd.appendChild(h('b',null,'Notifications')); p.appendChild(hd);
  if(!L.length){ p.appendChild(h('div','nx-bl-none','You’re all caught up. Mentions, comments on your tasks, tasks handed to you, and what’s due soon show up here.')); return; }
  const s=bellState();
  L.forEach(x=>{ const r=btn('nx-bl-row'+((x.k==='today'||x.k==='tomorrow') ? (s.day!==iso(today())?' new':'') : (x.at>(s.seen||0)?' new':'')), null, ()=>{ if(x.t) goTask(x.t); else { closeBell(); open('mine'); } });
    if(x.who) r.appendChild(av(x.who,26)); else { const i=h('span','nx-bl-ic'); i.innerHTML=ic('cal'); r.appendChild(i); }
    const b=h('span','nx-bl-b'), line=h('span','nx-bl-l'); const nm=x.who ? first(x.who) : '';
    const what={mention:nm+' mentioned you on ', comment:nm+' commented on ', assigned:nm+' handed you ', today:'Due today: ', tomorrow:'Due tomorrow: ', ready:'Ready to start: ', nudge:(nm ? nm+' nudged you: ' : 'Reminder: ')}[x.k];
    line.appendChild(document.createTextNode(what)); line.appendChild(h('b',null, x.label || (x.t && x.t.t) || '')); b.appendChild(line);
    if(x.text){ const q=h('span','nx-bl-q'); q.textContent=String(x.text).replace(/\s+/g,' ').slice(0,140); b.appendChild(q); }
    if(x.k!=='today' && x.k!=='tomorrow') b.appendChild(h('span','nx-bl-ago', cmAgo(x.at)));
    r.appendChild(b); p.appendChild(r); }); }
function closeBell(){ if(bell.panel){ bell.panel.remove(); bell.panel=null; } document.removeEventListener('mousedown', bellOff, true); }
function bellOff(e){ if(bell.panel && !bell.panel.contains(e.target) && !bell.btn.contains(e.target)) closeBell(); }
function openBell(){ if(bell.panel){ closeBell(); return; } startComments(); const L=bellItems();
  bell.panel=h('div','nx-bl'); bell.panel.setAttribute('role','dialog'); bell.panel.setAttribute('aria-label','Notifications'); document.body.appendChild(bell.panel); drawBellPanel(L);
  const r=bell.btn.getBoundingClientRect(); bell.panel.style.top=(r.bottom+6)+'px'; bell.panel.style.right=Math.max(8, innerWidth-r.right)+'px';
  const s=bellState(); s.seen=Date.now(); s.day=iso(today()); bellSave(s); bell.btn.classList.remove('has');
  setTimeout(()=>document.addEventListener('mousedown', bellOff, true), 0); }
function addBell(){ if(bell.btn && bell.btn.isConnected) return true; const box=document.querySelector('header.hqtop .hqtop-r'); if(!box || !me()) return false;
  const b=document.createElement('button'); b.type='button'; b.className='mastbtn nx-bell'; b.id='hq-bell'; b.title='Notifications'; b.setAttribute('aria-label','Notifications');
  b.innerHTML=ic('bell')+'<i class="dot" aria-hidden="true"></i>'; b.addEventListener('click', e=>{ e.stopPropagation(); openBell(); });
  box.insertBefore(b, document.getElementById('newtask') || box.firstChild); bell.btn=b; startComments(); paintBell(); return true; }
/* ---------- subtasks, waiting on, repeating and followers (November 7, 2026) ----------
   Kept on the task itself: sub [{id,t,done}], wait [task ids it can't start without], rep (week, 2weeks,
   month, quarter, year) and fol [people following it]. A repeating task, once done, adds the next one. */
I.rep='<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15"/><path d="M4 20v-5h5"/>';
I.wait='<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>';
I.sub='<path d="M5 5h3v3H5zM5 11h3v3H5zM11 6.5h8M11 12.5h8M5 17h3v3H5zM11 18.5h8"/>';
const fmtY=s=>fmt(s)+(pd(s) && pd(s).getFullYear()!==today().getFullYear() ? ', '+pd(s).getFullYear() : '');
const REPS=[['','Doesn’t repeat'],['week','Every week'],['2weeks','Every 2 weeks'],['month','Every month'],['quarter','Every 3 months'],['year','Every year']];
function repNextDue(t){ const x=pd(t.due)||today(); const r=t.rep;
  if(r==='week') x.setDate(x.getDate()+7); else if(r==='2weeks') x.setDate(x.getDate()+14); else if(r==='month') x.setMonth(x.getMonth()+1);
  else if(r==='quarter') x.setMonth(x.getMonth()+3); else if(r==='year') x.setFullYear(x.getFullYear()+1); else x.setDate(x.getDate()+7);
  return iso(x); }
function repSweep(){ if(!S.tasks || !me()) return;
  S.tasks.slice().forEach(t=>{ if(!t.rep || isOpen(t) || t.repNext) return; if(!(t.o===me() || doers(t)[0]===me())) return;
    const due=repNextDue(t), id=(t.repRoot||t.id)+'-'+due.replace(/-/g,'');
    if(!S.tasks.some(x=>x.id===id)){ const nx={id, due, s:'Not Started', by:t.by||me(), repRoot:t.repRoot||t.id, at:Date.now(), ord:t.ord||0};
      ['t','o','d','p','r','w','notes','rep','fol','wait'].forEach(k=>{ if(t[k]!==undefined && t[k]!=='') nx[k]=Array.isArray(t[k]) ? t[k].slice() : t[k]; });
      if(t.sub && t.sub.length) nx.sub=t.sub.map(s=>({id:s.id, t:s.t}));
      put('tasks', nx); toast('Repeats '+(REPS.find(r=>r[0]===t.rep)||['',''])[1].toLowerCase()+' — the next one is due '+fmtY(due)+': '+t.t); }
    put('tasks', Object.assign({}, t, {repNext:id}), t); }); }
setInterval(()=>{ if(!document.hidden) try{ repSweep(); }catch(e){} }, 10000);
setTimeout(()=>{ try{ repSweep(); }catch(e){} }, 6000);
const blockers=t=>(t.wait||[]).map(id=>S.tasks.find(x=>x.id===id)).filter(Boolean);
const openBlockers=t=>blockers(t).filter(isOpen);
const holding=t=>S.tasks.filter(x=>(x.wait||[]).indexOf(t.id)>=0 && isOpen(x));
function rowMore(t, r){ const sp=r.querySelector('.nx-sp'); if(!sp) return;
  const tag=(k, txt, title)=>{ const s=h('span','nx-tm'); s.innerHTML=ic(k)+(txt?'<span>'+txt+'</span>':''); s.title=title; sp.before(s); };
  if(t.sub && t.sub.length){ const n=t.sub.filter(s=>s.done).length; tag('sub', n+'/'+t.sub.length, n+' of '+t.sub.length+' subtasks done'); }
  if(isOpen(t) && openBlockers(t).length) tag('wait', '', 'Waiting on '+openBlockers(t).map(x=>x.t).join(', '));
  if(t.rep) tag('rep', '', (REPS.find(x=>x[0]===t.rep)||['','Repeats'])[1]); }
function pickTask(anchor, t, cb){ const wrap=h('div','nx-pt'), inp=h('input','nx-pt-in'), list=h('div','nx-pt-list');
  inp.placeholder='Find a task…'; inp.setAttribute('aria-label','Find a task'); wrap.appendChild(inp); wrap.appendChild(list);
  popMenu(anchor, [{node:wrap}], 'Can’t start until');
  const draw=()=>{ list.textContent=''; const q=inp.value.toLowerCase().trim();
    const L=S.tasks.filter(x=>x.id!==t.id && isOpen(x) && (t.wait||[]).indexOf(x.id)<0 && (x.wait||[]).indexOf(t.id)<0 && (!q || x.t.toLowerCase().indexOf(q)>=0))
      .sort((a,b)=>((b.r===t.r && !!t.r)-(a.r===t.r && !!t.r)) || byDue(a,b)).slice(0,10);
    if(!L.length) list.appendChild(h('div','nx-ml','No matching open tasks'));
    L.forEach(x=>{ const b=btn('nx-mi', null, ()=>{ closeMenus(); cb(x); }); const i=h('span'); i.innerHTML=sIcon(st(x)); b.appendChild(i.firstChild||i);
      b.appendChild(h('span',null,x.t)); b.appendChild(h('small',null, doers(x).map(first).join(', '))); list.appendChild(b); }); };
  inp.addEventListener('input', draw); inp.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); const b=list.querySelector('.nx-mi'); b && b.click(); } }); draw(); setTimeout(()=>inp.focus(), 0); }
function moreBlock(t0){ const box=h('div','nx-more');
  const live=()=>S.tasks.find(x=>x.id===t0.id) || t0;
  const set=(patch, msg)=>{ const t=live(); change(t, patch, msg); setTimeout(paintMore, 30); };
  function paintMore(){ const t=live(); box.textContent='';
    const sec=(title, extra)=>{ const s=h('section','nx-mo-s'); const hd=h('div','nx-mo-h'); hd.appendChild(h('b',null,title)); if(extra) hd.appendChild(extra); s.appendChild(hd); box.appendChild(s); return s; };
    /* subtasks */
    const subs=(t.sub||[]).slice(), nd=subs.filter(s=>s.done).length;
    const ss=sec('Subtasks', subs.length ? h('span','nx-mo-n', nd+' of '+subs.length+' done') : null);
    if(subs.length){ const bar=h('div','nx-mo-bar'); const f=h('i'); f.style.width=Math.round(nd/subs.length*100)+'%'; bar.appendChild(f); ss.appendChild(bar); }
    subs.forEach(s=>{ const r=h('div','nx-mo-sub'+(s.done?' done':''));
      const cb=h('input'); cb.type='checkbox'; cb.checked=!!s.done; cb.setAttribute('aria-label', s.t);
      cb.addEventListener('change', ()=>set({sub:(live().sub||[]).map(x=>x.id===s.id ? Object.assign({}, x, {done:cb.checked}) : x)}, (cb.checked?'Subtask done: ':'Subtask reopened: ')+s.t));
      const tx=h('input','nx-mo-st'); tx.value=s.t; tx.setAttribute('aria-label','Subtask');
      tx.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); tx.blur(); } if(e.key==='Escape'){ tx.value=s.t; tx.blur(); } });
      tx.addEventListener('blur', ()=>{ const v=tx.value.trim(); if(v && v!==s.t) set({sub:(live().sub||[]).map(x=>x.id===s.id ? Object.assign({}, x, {t:v}) : x)}, 'Subtask renamed: '+v); });
      const x=btn('nx-mo-x','×', ()=>set({sub:(live().sub||[]).filter(z=>z.id!==s.id)}, 'Subtask removed: '+s.t)); x.setAttribute('aria-label','Remove subtask '+s.t);
      r.appendChild(cb); r.appendChild(tx); r.appendChild(x); ss.appendChild(r); });
    const add=h('input','nx-mo-add'); add.placeholder='+ Add a subtask, then press Enter'; add.setAttribute('aria-label','Add a subtask');
    add.addEventListener('keydown', e=>{ if(e.key!=='Enter') return; e.preventDefault(); const v=add.value.trim(); if(!v) return;
      const id='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); set({sub:(live().sub||[]).concat([{id, t:v}])}, 'Subtask added: '+v);
      setTimeout(()=>{ const n=box.querySelector('.nx-mo-add'); n && n.focus(); }, 80); });
    ss.appendChild(add);
    /* waiting on */
    const ws=sec('Can’t Start Until');
    blockers(t).forEach(x=>{ const c=h('div','nx-mo-dep'+(isOpen(x)?'':' ok')); const i=h('span','nx-mo-di'); i.innerHTML=sIcon(st(x)); c.appendChild(i);
      const l=btn('nx-mo-dl', x.t, ()=>goTask(x)); c.appendChild(l); c.appendChild(h('span','nx-mo-dw', isOpen(x) ? (doers(x).map(first).join(', ')||'')+(x.due?' · '+fmt(x.due):'') : 'Done'));
      const rm=btn('nx-mo-x','×', ()=>set({wait:(live().wait||[]).filter(z=>z!==x.id)}, 'No longer waiting on: '+x.t)); rm.setAttribute('aria-label','Stop waiting on '+x.t); c.appendChild(rm); ws.appendChild(c); });
    const pk=btn('nx-chip','+ Add a task it’s waiting on', ()=>pickTask(pk, live(), x=>set({wait:(live().wait||[]).concat([x.id])}, 'Waiting on: '+x.t))); ws.appendChild(pk);
    const hold=holding(t); if(hold.length){ const hl=h('div','nx-mo-hold'); hl.appendChild(h('span',null,'Holding up: ')); hold.forEach((x,i)=>{ if(i) hl.appendChild(document.createTextNode(', ')); hl.appendChild(btn('nx-mo-dl', x.t, ()=>goTask(x))); }); ws.appendChild(hl); }
    /* repeats */
    const rs=sec('Repeats'); const sel=h('select','nx-sel'); sel.setAttribute('aria-label','Repeats'); REPS.forEach(([k,l])=>sel.appendChild(new Option(l,k))); sel.value=t.rep||'';
    sel.addEventListener('change', ()=>set({rep:sel.value}, sel.value ? (REPS.find(r=>r[0]===sel.value)[1])+': '+t.t : 'Stopped repeating: '+t.t)); rs.appendChild(sel);
    if(t.rep) rs.appendChild(h('span','nx-mo-note', 'When it’s marked done, the next one is added'+(t.due?', due '+fmtY(repNextDue(t)):'')+'.'));
    /* followers */
    const fol=(t.fol||[]).filter(id=>person(id)), mine=fol.indexOf(me())>=0;
    const tg=btn('nx-chip'+(mine?' on':''), mine?'Following':'Follow', ()=>set({fol: mine ? fol.filter(x=>x!==me()) : fol.concat([me()])}, mine?'Stopped following: '+t.t:'Following: '+t.t));
    tg.title='Followers see comments and updates in their bell';
    const fs=sec('Followers', tg); const fl=h('div','nx-mo-fl');
    fol.forEach(id=>{ const c=h('span','nx-pk-p'); c.appendChild(av(id,22)); c.appendChild(h('span',null,first(id))); const x=btn('x','×', ()=>set({fol:(live().fol||[]).filter(z=>z!==id)}, first(id)+' stopped following '+t.t)); x.title='Remove '+first(id); c.appendChild(x); fl.appendChild(c); });
    const ad=btn('nx-chip','+ Add', ()=>popMenu(ad, people().filter(p=>fol.indexOf(p.id)<0).map(p=>({label:p.name, icon:av(p.id,20).outerHTML, fn:()=>set({fol:(live().fol||[]).concat([p.id])}, first(p.id)+' is following '+t.t)})), 'Add a follower'));
    fl.appendChild(ad); fs.appendChild(fl);
    if(!fol.length) fs.appendChild(h('span','nx-mo-note','Doers and the accountable person already get updates. Add anyone else who should.'));
  }
  paintMore(); return box; }
{ const cs=document.createElement('style'); cs.textContent=
  '.nx-more{margin-top:14px;border-top:1px solid var(--border);padding-top:10px;display:flex;flex-direction:column;gap:12px}'+
  '.nx-mo-h{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3)}.nx-mo-h b{font-weight:700}.nx-mo-h .nx-chip{margin-left:auto;text-transform:none;letter-spacing:0}'+
  '.nx-mo-n{margin-left:auto;text-transform:none;letter-spacing:0;font-size:12px}'+
  '.nx-mo-bar{height:4px;border-radius:2px;background:var(--surface-3);overflow:hidden;margin-bottom:6px}.nx-mo-bar i{display:block;height:100%;background:var(--good,#12a150)}'+
  '.nx-mo-sub{display:flex;align-items:center;gap:8px;padding:2px 0}.nx-mo-sub input[type=checkbox]{width:16px;height:16px;flex:none;accent-color:var(--navy)}'+
  '.nx-mo-st{flex:1;min-width:0;border:1px solid transparent;border-radius:4px;background:none;font:inherit;font-size:13px;color:var(--ink);padding:3px 5px}.nx-mo-st:hover{border-color:var(--border)}.nx-mo-st:focus-visible{border-color:var(--sky);outline:none;background:var(--surface-2)}'+
  '.nx-mo-sub.done .nx-mo-st{text-decoration:line-through;color:var(--ink-3)}'+
  '.nx-mo-x{border:0;background:none;color:var(--ink-3);font-size:16px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}.nx-mo-x:hover,.nx-mo-x:focus-visible{color:var(--bad);background:var(--surface-2)}'+
  '.nx-mo-add{width:100%;border:1px dashed var(--border);border-radius:6px;background:none;font:inherit;font-size:13px;color:var(--ink);padding:6px 8px;margin-top:4px}.nx-mo-add:focus-visible{outline:2px solid var(--sky);border-style:solid}'+
  '.nx-mo-dep{display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0}.nx-mo-di svg{width:15px;height:15px}.nx-mo-dep.ok .nx-mo-dl{text-decoration:line-through;color:var(--ink-3)}'+
  '.nx-mo-dl{border:0;background:none;padding:0;font:inherit;color:var(--navy);cursor:pointer;text-align:left;font-weight:600}.nx-mo-dl:hover{text-decoration:underline}'+
  '.nx-mo-dw{margin-left:auto;color:var(--ink-3);font-size:12px;white-space:nowrap}.nx-mo-hold{font-size:12.5px;color:var(--ink-2);margin-top:6px}'+
  '.nx-mo-note{display:block;font-size:12px;color:var(--ink-3);margin-top:5px}.nx-mo-fl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}'+
  '.nx-tm{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;color:var(--ink-3);margin-left:6px;flex:none}.nx-tm svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8}'+
  '.nx-pt{display:flex;flex-direction:column;gap:4px;min-width:280px}.nx-pt-in{border:1px solid var(--border);border-radius:6px;padding:6px 8px;font:inherit;font-size:13px;margin:2px 4px 4px;background:var(--surface-2);color:var(--ink)}.nx-pt-list{max-height:260px;overflow:auto}';
  document.head.appendChild(cs); }
/* ---------- templates and rules (November 7, 2026) ----------
   Templates: a Team Project's tasks saved with their dates as days from the start, so the next
   Summit, reconciliation or election starts with everything in place. Rules: "when this, then that"
   on a Team Project (or any): marked Done → tell someone; due soon and not started → nudge the person
   doing it; past due → nudge the accountable person. Nudges land on My Tasks and in the bell. Rules
   run in whichever Team HQ is open; each nudge has a fixed id, so two open copies never send it twice. */
const TR={tpl:null, rules:null, sub:false};
function startTR(){ if(TR.sub || !S.db || !S.db.collection) return; TR.sub=true;
  const take=k=>snap=>{ TR[k]=(snap && snap.docs ? snap.docs : []).map(d=>{ let b; try{ b=JSON.parse(JSON.stringify(d.data()||{})); }catch(e){ b={}; } b.id=d.id; return b; }); };
  try{ S.db.collection('templates').onSnapshot(take('tpl'), ()=>{ if(!TR.tpl) TR.tpl=[]; }); }catch(e){}
  try{ S.db.collection('rules').onSnapshot(take('rules'), ()=>{ if(!TR.rules) TR.rules=[]; }); }catch(e){} }
const dayDiff=(a,b)=>Math.round((pd(a)-pd(b))/864e5);
function dlg(title, build, okLabel, onOk){ const ov=h('div','nx-dlg-ov'), bx=h('div','nx-dlg'); bx.setAttribute('role','dialog'); bx.setAttribute('aria-modal','true'); bx.setAttribute('aria-label',title);
  bx.appendChild(h('h2',null,title)); const body=h('div','nx-dlg-b'); bx.appendChild(body); build(body);
  const ft=h('div','nx-dlg-f'); const close=()=>{ ov.remove(); document.removeEventListener('keydown', esc); }; const esc=e=>{ if(e.key==='Escape') close(); };
  ft.appendChild(btn('nx-mini', okLabel ? 'Cancel' : 'Close', close)); if(okLabel){ const ok=btn('nx-mini pri', okLabel, ()=>{ if(onOk(body)!==false) close(); }); ft.appendChild(ok); }
  bx.appendChild(ft); ov.appendChild(bx); ov.addEventListener('click', e=>{ if(e.target===ov) close(); }); document.addEventListener('keydown', esc); document.body.appendChild(ov);
  setTimeout(()=>{ const f=bx.querySelector('input,select,textarea'); f && f.focus(); }, 0); return {close, body}; }
function fieldIn(body, label, node){ const f=h('label','nx-dlg-fld'); f.appendChild(h('span',null,label)); f.appendChild(node); body.appendChild(f); return node; }
function saveTemplate(r){ startTR(); const L=S.tasks.filter(t=>t.r===r.id); if(!L.length){ toast('This Team Project has no tasks to save yet.'); return; }
  const dues=L.map(t=>t.due).filter(Boolean).sort(), anchor=dues[0]||iso(today());
  dlg('Save as a Template', b=>{ const nm=fieldIn(b,'Template name', h('input','nx-dlg-in')); nm.value=r.name.replace(/\b(19|20)\d\d\b/g,'').replace(/\s{2,}/g,' ').trim()+' Template'; nm.id='tpl-nm';
      b.appendChild(h('p','nx-dlg-note', L.length+' task'+(L.length>1?'s':'')+(r.ws&&r.ws.length?', '+r.ws.length+' workstream'+(r.ws.length>1?'s':''):'')+'. Due dates are kept as days from the first one ('+fmtY(anchor)+'), so they move with whatever start date you pick later. Owners, priorities, notes, subtasks and repeats come along.')); },
    'Save Template', b=>{ const name=b.querySelector('#tpl-nm').value.trim(); if(!name) return false;
      const tasks=L.slice().sort(byDue).map(t=>{ const o={t:t.t}; ['o','d','p','w','notes','rep'].forEach(k=>{ if(t[k]!==undefined && t[k]!=='' && !(Array.isArray(t[k]) && !t[k].length)) o[k]=Array.isArray(t[k])?t[k].slice():t[k]; });
        if(t.sub && t.sub.length) o.sub=t.sub.map(s=>({id:s.id, t:s.t})); if(t.due) o.off=dayDiff(t.due, anchor); return o; });
      const id='tp'+Date.now().toString(36), body={name, from:r.id, desc:r.desc||'', ws:(r.ws||[]).slice(), lead:r.lead||'', color:r.color||0, tasks, by:me(), at:Date.now()};
      if(!TR.tpl) TR.tpl=[]; TR.tpl.push(Object.assign({id}, body));
      Promise.resolve().then(()=>S.db.collection('templates').doc(id).set(body)).then(()=>toast('Saved the template “'+name+'”. Start it from Team Projects → Start From a Template.'), ()=>toast('That template didn’t save. Try again in a moment.')); }); }
function startTemplate(tp){ const t0=iso(today());
  dlg('Start From “'+tp.name+'”', b=>{ const nm=fieldIn(b,'New Team Project name', h('input','nx-dlg-in')); nm.value=tp.name.replace(/\s*Template$/i,''); nm.id='tps-nm';
      const dt=fieldIn(b,'First due date (the rest follow from it)', h('input','nx-dlg-in')); dt.type='date'; dt.value=t0; dt.id='tps-dt';
      const ld=fieldIn(b,'Led by', h('select','nx-dlg-in')); people().forEach(p=>ld.appendChild(new Option(p.name, p.id))); ld.value=tp.lead || me(); ld.id='tps-ld';
      const n=(tp.tasks||[]).length, span=(tp.tasks||[]).reduce((m,x)=>Math.max(m, x.off||0), 0);
      b.appendChild(h('p','nx-dlg-note', n+' task'+(n>1?'s':'')+((tp.tasks||[]).some(x=>x.off!==undefined) ? ' over '+(span+1)+' day'+(span?'s':'') : ', none with due dates')+'. Everyone keeps the tasks they had in the template; change anyone after.'));
      if(tp.by===me() || me()==='jonna'){ const del=btn('nx-dlg-del','Delete this template', ()=>{ if(!del.dataset.sure){ del.dataset.sure='1'; del.textContent='Click again to delete it'; return; }
          TR.tpl=(TR.tpl||[]).filter(x=>x.id!==tp.id); S.db.collection('templates').doc(tp.id).delete(); toast('Deleted the template “'+tp.name+'”.'); document.querySelector('.nx-dlg-ov')?.remove(); }); b.appendChild(del); } },
    'Start It', b=>{ const name=b.querySelector('#tps-nm').value.trim(), start=b.querySelector('#tps-dt').value||t0, lead=b.querySelector('#tps-ld').value; if(!name) return false;
      const rid='rk'+Date.now().toString(36); const rk={id:rid, name, desc:tp.desc||'', status:'Active', lead, color:(tp.color||S.rocks.length)%7, order:S.rocks.length+1, ws:(tp.ws||[]).slice(), tpl:tp.id};
      put('rocks', rk);
      (tp.tasks||[]).forEach((x,i)=>{ const o=Object.assign({}, x); delete o.off; o.id='ta-'+rid+'-'+i; o.r=rid; o.s='Not Started'; o.by=me(); o.at=Date.now(); o.ord=i;
        if(x.off!==undefined && x.off!==null){ const d=pd(start); d.setDate(d.getDate()+x.off); o.due=iso(d); }
        if(!o.o) o.o=lead; if(o.sub) o.sub=o.sub.map(s=>({id:s.id, t:s.t})); put('tasks', o); });
      toast('Started “'+name+'” with '+(tp.tasks||[]).length+' tasks.'); setTimeout(()=>open('p:'+rid), 300); }); }
function pickTemplate(anchor){ startTR(); const go=()=>{ const L=(TR.tpl||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
    if(!L.length){ popMenu(anchor, [{node:h('div','nx-ml','No templates yet. Open a Team Project and choose Save as Template.')}], 'Templates'); return; }
    popMenu(anchor, L.map(tp=>({label:tp.name, hint:(tp.tasks||[]).length+' tasks', fn:()=>startTemplate(tp)})), 'Start From a Template'); };
  if(TR.tpl===null) setTimeout(go, 1200); else go(); }
window.__tpl={pick:pickTemplate, save:id=>{ const r=rock(id); r && saveTemplate(r); }};

/* rules */
const WHEN={done:'A task is marked Done', due:'A task is due soon and hasn’t started', late:'A task is past due'};
function ruleText(u){ const w=u.when==='done' ? 'When a task is marked Done' : u.when==='due' ? 'When a task is due in '+(u.days||2)+' day'+((u.days||2)>1?'s':'')+' and hasn’t started' : 'When a task is past due';
  const t=u.when==='done' ? 'tell '+(first(u.to)||'someone') : u.when==='due' ? 'nudge the person doing it' : 'nudge the accountable person';
  return w+', '+t+'.'; }
function rulesDialog(r){ startTR();
  dlg('Rules for '+r.name, b=>{ const list=h('div','nx-ru-list'); b.appendChild(list);
    const paintL=()=>{ list.textContent=''; const L=(TR.rules||[]).filter(u=>u.proj===r.id);
      if(!L.length) list.appendChild(h('p','nx-dlg-note','No rules yet. Add one below; it applies to every task on this Team Project.'));
      L.forEach(u=>{ const rw=h('div','nx-ru'); rw.appendChild(h('span',null, ruleText(u))); const x=btn('nx-mo-x','×', ()=>{ TR.rules=TR.rules.filter(z=>z.id!==u.id); S.db.collection('rules').doc(u.id).delete(); paintL(); toast('Rule removed.'); }); x.setAttribute('aria-label','Remove this rule'); rw.appendChild(x); list.appendChild(rw); }); };
    paintL();
    const add=h('div','nx-ru-add'); add.appendChild(h('b',null,'Add a Rule'));
    const w=h('select','nx-dlg-in'); Object.keys(WHEN).forEach(k=>w.appendChild(new Option(WHEN[k],k)));
    const dd=h('select','nx-dlg-in'); [1,2,3,5,7].forEach(n=>dd.appendChild(new Option(n+' day'+(n>1?'s':'')+' before', n))); dd.value='2';
    const to=h('select','nx-dlg-in'); people().forEach(p=>to.appendChild(new Option('Tell '+p.name, p.id))); to.value=me();
    const then=h('span','nx-dlg-note');
    const sync=()=>{ dd.hidden=w.value!=='due'; to.hidden=w.value!=='done'; then.textContent= w.value==='due' ? 'Then nudge the person doing it.' : w.value==='late' ? 'Then nudge the accountable person (once per due date).' : ''; };
    w.addEventListener('change', sync); sync();
    [w, dd, to, then].forEach(x=>add.appendChild(x));
    add.appendChild(btn('nx-mini pri','Add Rule', ()=>{ const id='ru'+Date.now().toString(36), body={proj:r.id, when:w.value, days:+dd.value, to:w.value==='done'?to.value:'', by:me(), at:Date.now()};
      if(!TR.rules) TR.rules=[]; TR.rules.push(Object.assign({id}, body)); S.db.collection('rules').doc(id).set(body).then(()=>{}, ()=>toast('That rule didn’t save. Try again.')); paintL(); toast('Rule added: '+ruleText(body)); }));
    b.appendChild(add);
    b.appendChild(h('p','nx-dlg-note','Rules run whenever anyone has Team HQ open, and each reminder is sent once. Reminders land on the person’s My Tasks and in their bell.')); }, null); }
function ruleSweep(){ if(!TR.rules || !TR.rules.length || !S.tasks || !me()) return; const N=S.nudges||[], have=new Set(N.map(n=>n.id)); let sent=0;
  TR.rules.forEach(u=>{ const L=S.tasks.filter(t=>!u.proj || t.r===u.proj); L.forEach(t=>{ if(sent>=20) return; let id='', to='', m='';
      const rk=rock(t.r), on=rk ? ' ('+rk.name+')' : '';
      if(u.when==='done'){ if(isOpen(t) || (t.at||0)<(u.at||0) || (t.at||0)<Date.now()-3*864e5) return; id='ru-'+u.id+'-'+t.id; to=u.to; m='Done: '+t.t+on; }
      else if(u.when==='due'){ if(!isOpen(t) || st(t)!=='Not Started' || !t.due) return; const n=days(t.due); if(n<0 || n>(u.days||2)) return; id='ru-'+u.id+'-'+t.id+'-'+t.due; to=doers(t)[0]; m=t.t+' is due '+(n===0?'today':n===1?'tomorrow':fmt(t.due))+' and hasn’t started'+on+'.'; }
      else if(u.when==='late'){ if(!isOpen(t) || !t.due || days(t.due)>=0) return; id='ru-'+u.id+'-'+t.id+'-'+t.due; to=t.o || doers(t)[0]; m=t.t+' is past due ('+fmt(t.due)+')'+on+'.'; }
      if(!id || !to || have.has(id)) return; have.add(id); sent++;
      put('nudges', {id, to, by:u.by||me(), m, k:'Rule', rule:u.id, task:t.id, at:Date.now()}); }); }); }
setInterval(()=>{ if(!document.hidden) try{ startTR(); ruleSweep(); }catch(e){} }, 60000);
setTimeout(()=>{ try{ startTR(); }catch(e){} }, 4000);
{ const cs=document.createElement('style'); cs.textContent=
  '.nx-pstat{font-size:13px;margin:4px 0 6px;line-height:1.45}.nx-pstat b{margin-right:4px}.nx-pstat.good b{color:var(--good,#0F7B5C)}.nx-pstat.risk b{color:var(--warn,#A2701A)}.nx-pstat.off b{color:var(--bad)}'+
  '.nx-dlg-ov{position:fixed;inset:0;z-index:9995;background:rgba(6,32,47,.45);display:flex;align-items:flex-start;justify-content:center;padding:10vh 16px}'+
  '.nx-dlg{background:var(--surface);color:var(--ink);border-radius:12px;width:min(520px,100%);max-height:80vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:18px 20px}'+
  '.nx-dlg h2{margin:0 0 12px;font-size:18px}.nx-dlg-b{display:flex;flex-direction:column;gap:10px}.nx-dlg-fld{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--ink-2)}'+
  '.nx-dlg-in{border:1px solid var(--border);border-radius:6px;padding:7px 9px;font:inherit;font-size:13.5px;background:var(--surface-2);color:var(--ink)}.nx-dlg-in:focus-visible{outline:2px solid var(--sky);outline-offset:1px}'+
  '.nx-dlg-note{font-size:12.5px;color:var(--ink-3);margin:0;line-height:1.5}.nx-dlg-f{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}'+
  '.nx-dlg-del{align-self:flex-start;border:0;background:none;color:var(--bad);font:inherit;font-size:12.5px;cursor:pointer;padding:0;text-decoration:underline}'+
  '.nx-ru-list{display:flex;flex-direction:column;gap:6px}.nx-ru{display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px}.nx-ru span{flex:1}'+
  '.nx-ru-add{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--border);padding-top:12px;margin-top:4px}.nx-ru-add .nx-mini{align-self:flex-start}';
  document.head.appendChild(cs); }
/* ---------- the month calendar view of tasks, and team workload (November 7, 2026) ----------
   Any task list (My Tasks, a Team Project, a person) can show as a month: tasks sit on their due
   date and can be dragged to another day; tasks with no date wait in a tray underneath. Workload on
   the People page counts each person's open hands-on tasks by week for the next four weeks. */
const MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
function monthView(L, ctx){ if(!ui.mo) ui.mo={}; const key=String(ctx||ui.view), off=ui.mo[key]||0, t0=today();
  const m0=new Date(t0.getFullYear(), t0.getMonth()+off, 1), m1=new Date(m0.getFullYear(), m0.getMonth()+1, 0);
  const wrap=h('div','nx-month'); const bar=h('div','nx-mo-bar2');
  const go=n=>{ ui.mo[key]=n; save(); paint(); };
  const pv=btn('nx-sg', null, ()=>go(off-1)); pv.innerHTML=ic('left'); pv.setAttribute('aria-label','Previous month');
  const nx=btn('nx-sg', null, ()=>go(off+1)); nx.innerHTML=ic('right'); nx.setAttribute('aria-label','Next month');
  const sg=h('div','nx-seg'); sg.appendChild(pv); sg.appendChild(btn('nx-sg'+(off?'':' on'),'This Month', ()=>go(0))); sg.appendChild(nx);
  bar.appendChild(h('b',null, MONL[m0.getMonth()]+' '+m0.getFullYear())); bar.appendChild(sg); wrap.appendChild(bar);
  const grid=h('div','nx-mg'); ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((d,i)=>grid.appendChild(h('div','nx-mh'+(i>4?' we':''), d)));
  let d=addD(m0, -((m0.getDay()+6)%7)); const end=addD(m1, (7-((m1.getDay()+6)%7)-1));
  const byDay={}; L.forEach(t=>{ if(t.due) (byDay[t.due]=byDay[t.due]||[]).push(t); });
  while(d<=end){ const k=iso(d), dow=(d.getDay()+6)%7, cell=h('div','nx-md'+(dow>4?' we':'')+(d.getMonth()!==m0.getMonth()?' out':'')+(+d===+t0?' today':'')+(d<t0?' past':''));
    const num=h('span','n', String(d.getDate())); cell.appendChild(num);
    const day=new Date(d);
    (byDay[k]||[]).sort((a,b)=>(a.ord||0)-(b.ord||0)).forEach(t=>cell.appendChild(monthChip(t)));
    const a=btn('nx-md-add', null, ()=>{ const o=ctxDefaults(); o.due=iso(day); newTask(o); }); a.innerHTML=ic('plus'); a.title='Add a task due '+WD[day.getDay()]+' '+fmt(iso(day)); a.setAttribute('aria-label', a.title); cell.appendChild(a);
    cell.addEventListener('dragover', e=>{ if(!drag) return; e.preventDefault(); cell.classList.add('nx-over'); });
    cell.addEventListener('dragleave', e=>{ if(!cell.contains(e.relatedTarget)) cell.classList.remove('nx-over'); });
    cell.addEventListener('drop', e=>{ e.preventDefault(); cell.classList.remove('nx-over'); if(!drag) return; const t=drag; drag=null; if(t.due!==iso(day)) change(t, {due:iso(day)}, 'Due '+WD[day.getDay()]+' '+fmt(iso(day))+': '+t.t); });
    grid.appendChild(cell); d=addD(d,1); }
  wrap.appendChild(grid);
  const nd=L.filter(t=>!t.due && isOpen(t)), gs=addD(m0, -((m0.getDay()+6)%7)), od=L.filter(t=>isOpen(t) && t.due && pd(t.due)<gs && pd(t.due)<t0);
  const tray=h('div','nx-mo-tray');
  if(od.length){ tray.appendChild(h('b','bad', 'Past Due From Earlier · drag onto a day to reschedule')); const ol=h('div','nx-mo-tl'); od.sort(byDue).slice(0,40).forEach(t=>ol.appendChild(monthChip(t))); tray.appendChild(ol); }
  tray.appendChild(h('b',null, nd.length ? 'No Due Date · drag onto a day' : 'Every open task here has a date.'));
  const tl=h('div','nx-mo-tl'); nd.slice(0,40).forEach(t=>tl.appendChild(monthChip(t))); tray.appendChild(tl);
  tray.addEventListener('dragover', e=>{ if(!drag) return; e.preventDefault(); tray.classList.add('nx-over'); });
  tray.addEventListener('dragleave', e=>{ if(!tray.contains(e.relatedTarget)) tray.classList.remove('nx-over'); });
  tray.addEventListener('drop', e=>{ e.preventDefault(); tray.classList.remove('nx-over'); if(!drag) return; const t=drag; drag=null; if(t.due) change(t, {due:''}, 'Cleared the date: '+t.t); });
  wrap.appendChild(tray);
  return wrap; }
function monthChip(t){ const late=isOpen(t) && t.due && days(t.due)<0;
  const c=btn('nx-mc'+(isOpen(t)?'':' isdone')+(late?' late':'')+(t.p==='High'?' hi':''), null, ()=>editTask(t)); c.draggable=!phone();
  const i=h('span','si'); i.innerHTML=sIcon(st(t)); c.appendChild(i); c.appendChild(h('span','tt', t.t)); const a=doers(t)[0]; if(a && a!==me()) c.appendChild(av(a,16));
  c.title=t.t+' — '+st(t)+(t.due?' · due '+fmt(t.due):'')+(doers(t).length?' · '+doers(t).map(first).join(', '):'');
  c.addEventListener('dragstart', e=>{ drag=t; c.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed='move'; }catch(x){} });
  c.addEventListener('dragend', ()=>{ c.classList.remove('dragging'); drag=null; document.querySelectorAll('.nx-over').forEach(x=>x.classList.remove('nx-over')); });
  return c; }
window.__workload=()=>workloadBlock(people().map(p=>p.id));
function workloadBlock(order){ const t0=today(); let mon=addD(t0, -((t0.getDay()+6)%7)); if(t0.getDay()===6 || t0.getDay()===0) mon=addD(mon,7);
  const W=[0,1,2,3].map(i=>addD(mon, 7*i)), box=h('div','nx-wl');
  const hd=h('div','nx-wl-r hd'); hd.appendChild(h('span','nm'));
  W.forEach((w,i)=>hd.appendChild(h('span','wk', i===0 ? 'This Week' : i===1 ? 'Next Week' : 'Week of '+fmt(iso(w)))));
  hd.appendChild(h('span','wk','Past Due')); hd.appendChild(h('span','wk','No Date')); box.appendChild(hd);
  order.forEach(id=>{ const p=person(id); if(!p) return; const T=S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(id)>=0);
    const r=h('div','nx-wl-r'); const nm=btn('nm', null, ()=>open('u:'+id)); nm.appendChild(av(id,22)); nm.appendChild(h('span',null, first(id))); r.appendChild(nm);
    W.forEach(w=>{ const e=addD(w,7), n=T.filter(t=>t.due && pd(t.due)>=w && pd(t.due)<e).length; const c=h('span','c'+(n>=8?' heavy':n>=5?' busy':n?' some':''));
      c.textContent=n||'–'; c.title=p.name+': '+n+' task'+(n===1?'':'s')+' due the week of '+fmt(iso(w)); r.appendChild(c); });
    const late=T.filter(t=>t.due && days(t.due)<0).length, nd=T.filter(t=>!t.due).length;
    const lc=h('span','c'+(late?' late':'')); lc.textContent=late||'–'; lc.title=late+' past due'; r.appendChild(lc);
    const dc=h('span','c nd'); dc.textContent=nd||'–'; dc.title=nd+' with no due date'; r.appendChild(dc);
    box.appendChild(r); });
  box.appendChild(h('p','nx-wl-note','Open tasks each person is doing (hands-on), by the week they’re due. Darker means a fuller week; 8 or more is marked heavy. Click a name to see their tasks.'));
  return box; }
{ const cs=document.createElement('style'); cs.textContent=
  '.nx-month{display:flex;flex-direction:column;gap:10px}.nx-mo-bar2{display:flex;align-items:center;gap:12px}.nx-mo-bar2 b{font-size:16px}'+
  '.nx-mg{display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) repeat(2,minmax(0,.55fr));border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--border);gap:1px}'+
  '.nx-mh{background:var(--surface-2);font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3);padding:6px 8px}'+
  '.nx-md{background:var(--surface);min-height:84px;padding:4px 5px 22px;position:relative;display:flex;flex-direction:column;gap:3px;min-width:0}'+
  '.nx-md.we{background:var(--surface-2)}.nx-md.out{opacity:.55}.nx-md .n{font-size:12px;font-weight:600;color:var(--ink-3);padding:1px 3px;align-self:flex-start;border-radius:10px}'+
  '.nx-md.today .n{background:var(--navy);color:#fff;padding:1px 7px}.nx-md.nx-over,.nx-mo-tray.nx-over{outline:2px dashed var(--sky);outline-offset:-3px;background:var(--sky-wash)}'+
  '.nx-md-add{position:absolute;right:4px;bottom:3px;border:0;background:none;color:var(--ink-3);opacity:0;cursor:pointer;padding:2px;border-radius:4px}.nx-md:hover .nx-md-add,.nx-md-add:focus-visible{opacity:1}.nx-md-add svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2}'+
  '.nx-mc{display:flex;align-items:center;gap:4px;width:100%;min-width:0;border:1px solid var(--border);border-left:3px solid var(--sky);border-radius:5px;background:var(--surface);padding:2px 5px;font:inherit;font-size:12px;color:var(--ink);cursor:pointer;text-align:left}'+
  '.nx-mc:hover,.nx-mc:focus-visible{border-color:var(--sky)}.nx-mc .si{display:inline-flex;flex:none}.nx-mc .si svg{width:12px;height:12px}.nx-mc .tt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nx-mc .av{flex:none}'+
  '.nx-mc.late{border-left-color:var(--bad);background:color-mix(in srgb, var(--bad) 7%, var(--surface))}.nx-mc.hi{font-weight:600}.nx-mc.isdone{opacity:.55}.nx-mc.isdone .tt{text-decoration:line-through}.nx-mc.dragging{opacity:.4}'+
  '.nx-mo-tray{border:1px dashed var(--border);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}.nx-mo-tray b{font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em}.nx-mo-tray b.bad{color:var(--bad)}'+
  '.nx-mo-tl{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px}'+
  '@media (max-width:700px){.nx-mg{grid-template-columns:repeat(7,minmax(0,1fr))}.nx-md{min-height:64px}.nx-mc .tt{font-size:11px}.nx-mc .av,.nx-mc .si{display:none}}'+
  '.nx-wl{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:8px}'+
  '.nx-wl-r{display:grid;grid-template-columns:minmax(120px,1.4fr) repeat(6,minmax(0,1fr));align-items:center;border-top:1px solid var(--border)}.nx-wl-r.hd{border-top:0;background:var(--surface-2)}'+
  '.nx-wl-r .wk{font-size:11.5px;font-weight:700;color:var(--ink-3);text-align:center;padding:7px 4px;text-transform:uppercase;letter-spacing:.03em}'+
  '.nx-wl-r .nm{display:flex;align-items:center;gap:8px;border:0;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--ink);padding:7px 10px;cursor:pointer;text-align:left}.nx-wl-r .nm:hover span{text-decoration:underline}'+
  '.nx-wl-r .c{text-align:center;font-size:13px;font-weight:600;padding:9px 4px;color:var(--ink-3);border-left:1px solid var(--border)}'+
  '.nx-wl-r .c.some{background:color-mix(in srgb, var(--sky) 18%, var(--surface));color:var(--ink)}.nx-wl-r .c.busy{background:color-mix(in srgb, var(--sky) 45%, var(--surface));color:var(--ink)}'+
  '.nx-wl-r .c.heavy{background:color-mix(in srgb, var(--warn) 30%, var(--surface));color:var(--ink)}.nx-wl-r .c.late{color:var(--bad)}'+
  '.nx-wl-note{font-size:12px;color:var(--ink-3);margin:0;padding:8px 10px;border-top:1px solid var(--border)}';
  document.head.appendChild(cs); }
/* the full task editor (used on smaller screens and from every other page) gets the same comment thread */
(function hookEditor(n){ const oe=window.__edit; if(!oe){ if(n<60) setTimeout(()=>hookEditor(n+1), 1000); return; } if(oe.__cm) return;
  const w=function(t){ const r=oe.apply(this, arguments);
    if(t && t.id) setTimeout(()=>{ const b=document.getElementById('panel-b'); if(!b) return; b.querySelectorAll(':scope > .nx-cm, :scope > .nx-more').forEach(x=>x.remove());
      const live=S.tasks.find(x=>x.id===t.id); if(!live) return; const box=commentsBlock(live); box.classList.add('in-ed');
      const acts=b.querySelector(':scope > .rowacts'); const mb=moreBlock(live); mb.classList.add('in-ed'); b.insertBefore(mb, acts||null); b.insertBefore(box, acts||null); }, 60);
    return r; };
  w.__cm=true; window.__edit=w; })(0);
(function bellWait(n){ if(addBell() || n>90) return; setTimeout(()=>bellWait(n+1), 1000); })(0);
setInterval(()=>{ if(!document.hidden){ addBell(); paintBell(); } }, 60e3);
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && bell.panel) closeBell(); });
{ const cs=document.createElement('style'); cs.textContent=
  '.nx-cm{margin-top:14px;border-top:1px solid var(--border);padding-top:12px}.nx-cm.in-ed{margin:16px 0 12px}'+
  '.nx-cm-list{display:flex;flex-direction:column;gap:10px;margin-bottom:10px}'+
  '.nx-cm-none{font-size:12.5px;color:var(--ink-3)}'+
  '.nx-cm-row{display:flex;gap:8px;align-items:flex-start}.nx-cm-b{flex:1;min-width:0}'+
  '.nx-cm-top{display:flex;gap:8px;align-items:baseline;font-size:12.5px}.nx-cm-top b{color:var(--ink)}.nx-cm-ago{color:var(--ink-3);font-size:11.5px}'+
  '.nx-cm-x{margin-left:auto;border:0;background:none;color:var(--ink-3);font:inherit;font-size:11.5px;cursor:pointer;padding:0 2px}.nx-cm-x:hover,.nx-cm-x:focus-visible{color:var(--bad);text-decoration:underline}'+
  '.nx-cm-tx{font-size:13px;line-height:1.5;color:var(--ink);word-wrap:break-word;margin-top:2px}.nx-cm-at{color:var(--navy);background:var(--sky-wash);border-radius:4px;padding:0 3px;font-weight:600}'+
  '.nx-cm-new{display:flex;gap:8px;align-items:flex-end}.nx-cm-in{flex:1;resize:vertical;min-height:42px;border:1px solid var(--border);border-radius:6px;padding:8px 10px;background:var(--surface-2);font:inherit;font-size:13px;line-height:1.45;color:var(--ink)}'+
  '.nx-cm-in:focus-visible{outline:2px solid var(--sky);outline-offset:1px}.nx-cm-tip{font-size:11px;color:var(--ink-3);margin-top:4px}'+
  '.nx-cmc{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;color:var(--ink-3);margin-left:6px;flex:none}.nx-cmc svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8}'+
  '.nx-bell{position:relative}.nx-bell svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round}'+
  '.nx-bell .dot{position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:#e5484d;box-shadow:0 0 0 2px var(--navy,#0d314c);display:none}.nx-bell.has .dot{display:block}'+
  '.nx-bl{position:fixed;z-index:9990;width:min(380px,calc(100vw - 16px));max-height:70vh;overflow:auto;background:var(--surface);color:var(--ink);border:1px solid var(--border);border-radius:10px;box-shadow:0 16px 40px rgba(6,32,47,.22)}'+
  '.nx-bl-h{padding:12px 14px 8px;font-size:14px;border-bottom:1px solid var(--border);position:sticky;top:0;background:inherit}'+
  '.nx-bl-none{padding:18px 14px;font-size:13px;color:var(--ink-3);line-height:1.5}'+
  '.nx-bl-row{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;border:0;border-bottom:1px solid var(--border);background:none;padding:10px 14px;font:inherit;color:inherit;cursor:pointer}'+
  '.nx-bl-row:hover,.nx-bl-row:focus-visible{background:var(--surface-2)}.nx-bl-row.new{background:var(--sky-wash)}.nx-bl-row.new:hover{filter:brightness(.98)}'+
  '.nx-bl-ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--surface-3);flex:none}.nx-bl-ic svg{width:15px;height:15px;fill:none;stroke:var(--ink-2);stroke-width:1.8}'+
  '.nx-bl-b{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:13px;line-height:1.4}.nx-bl-q{color:var(--ink-2);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.nx-bl-ago{color:var(--ink-3);font-size:11.5px}';
  document.head.appendChild(cs); }
function change(t, patch, msg){ const before=Object.assign({}, t), after=Object.assign({}, t, patch); put('tasks', after, t); toast(msg, ()=>undoOf(before, after, patch)); }
function complete(t, el, ev){ if(ev && ev.clientX) burst(ev.clientX, ev.clientY); if(el) el.classList.add('done');
  const before=Object.assign({}, t), after=Object.assign({}, t, {s:'Done'}); setTimeout(()=>put('tasks', after, t), el ? 320 : 0); toast('Done: '+t.t, ()=>undoOf(before, after, {s:'Done'})); }

/* ---------- quick add: "Call Amy about sponsors fri @amy #summit !" ---------- */
function parseQuick(text){
  let t=' '+text+' ', o={};
  const who=[]; t=t.replace(/@([a-z]+)/gi, (m,n)=>{ const p=S.people.find(x=>x.name.toLowerCase().startsWith(n.toLowerCase()) || x.id===n.toLowerCase()); if(p){ who.push(p.id); return ' '; } return m; });
  if(who.length){ o.o=who[0]; o.d=who; }
  t=t.replace(/#([\w-]+)/g, (m,n)=>{ const q=n.toLowerCase(); const r=S.rocks.find(x=>x.name.toLowerCase().replace(/[^a-z0-9]/g,'').startsWith(q.replace(/[^a-z0-9]/g,'')) || x.name.toLowerCase().split(/\s+/).some(w=>w.startsWith(q))); if(r){ o.r=r.id; return ' '; } return m; });
  if(/\s!+(high)?\s/i.test(t)){ o.p='High'; t=t.replace(/\s!+(high)?\s/i,' '); }
  const t0=today(); let due=null;
  t=t.replace(/\s(today|tonight)\s/i, ()=>{ due=t0; return ' '; });
  t=t.replace(/\s(tomorrow|tmrw)\s/i, ()=>{ due=addD(t0,1); return ' '; });
  t=t.replace(/\snext week\s/i, ()=>{ due=addD(t0, ((8-t0.getDay())%7)||7); return ' '; });
  t=t.replace(/\s(?:on |by |due )?(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s/i, (m,dn)=>{ const k=['sun','mon','tue','wed','thu','fri','sat'].indexOf(dn.toLowerCase()); let n=(k-t0.getDay()+7)%7; if(n===0) n=7; due=addD(t0,n); return ' '; });
  t=t.replace(/\s(?:on |by |due )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/, (m,a,b,c)=>{ let y=c? +c : t0.getFullYear(); if(y<100) y+=2000; due=new Date(y, +a-1, +b); if(!c && due<t0) due=new Date(y+1, +a-1, +b); return ' '; });
  if(due) o.due=iso(due);
  o.t=t.replace(/\s+/g,' ').trim();
  return o;
}
function quickHint(o){ const bits=[]; if(o.o) bits.push(o.d.map(first).join(', ')); if(o.r) bits.push((rock(o.r)||{}).name); if(o.due) bits.push('due '+fmt(o.due)); if(o.p==='High') bits.push('high priority'); return bits.join(' · '); }

/* ---------- status icons, Linear style ---------- */
const STATUSES=['Not Started','In Progress','Waiting on Someone','Done'];
function sIcon(s){
  const k={'Not Started':'ns','In Progress':'ip','Waiting on Someone':'wt','Done':'dn'}[s]||'ns';
  const inner = k==='ip' ? '<circle cx="8" cy="8" r="6.2" class="o"/><path d="M8 3.6a4.4 4.4 0 0 1 0 8.8z" class="f"/>'
    : k==='wt' ? '<circle cx="8" cy="8" r="6.2" class="o"/><path d="M6.4 5.8v4.4M9.6 5.8v4.4" class="p"/>'
    : k==='dn' ? '<circle cx="8" cy="8" r="7" class="f"/><path d="M5 8.2l2 2 4-4.2" class="k"/>'
    : '<circle cx="8" cy="8" r="6.2" class="o"/>';
  return '<svg class="si '+k+'" viewBox="0 0 16 16" aria-hidden="true">'+inner+'</svg>';
}

/* ---------- people, right now ---------- */
function statusOf(p){
  if(window.__hqx && window.__hqx.statusOf) return window.__hqx.statusOf(p);
  const now=Date.now(), ev=cal(p.id), d=today();
  const kd=keyDatesOn(d).filter(x=>/travel|out of office|pto|vacation/i.test((x.k||'')+' '+(x.t||'')) && (x.who||[]).indexOf(p.id)>=0);
  if(d.getDay()%6===0){ const nw=nextWorkday(d), n=(ev||[]).filter(e=>e.s>=+nw && e.s<+nw+864e5 && e.show!=='free' && !e.all).length; return {k:'off', t:WD[nw.getDay()]+': '+(ev ? n+(n===1?' meeting':' meetings') : 'back'), s:''}; }
  const hol=holiday(d); if(hol) return {k:'off', t:hol, s:''};
  if(kd.length) return {k:'away', t:/travel/i.test(kd[0].k||'')?'Traveling':'Out', s:kd[0].t};
  if(!ev) return {k:'unk', t:'No calendar', s:''};
  const oof=ev.find(e=>e.show==='oof' && e.s<=now && e.e>now); if(oof) return {k:'away', t:'Out', s:'until '+tmL(oof.e)};
  const ws=etAt(d,9), we=etAt(d,17); if(now<ws) return {k:'off', t:'Not in yet', s:'starts '+tmL(ws)}; if(now>we) return {k:'off', t:'Done for the day', s:''};
  const cur=ev.find(e=>e.s<=now && e.e>now && e.show!=='free' && !e.all);
  if(cur) return {k:'busy', t:'In a meeting', s:'until '+tm(cur.e)};
  const nx=ev.filter(e=>e.s>now && e.show!=='free' && !e.all).sort((a,b)=>a.s-b.s)[0];
  return {k:'free', t:'Free', s: nx && nx.s<we ? 'until '+tm(nx.s) : 'rest of day'};
}

/* ---------- the views ---------- */
const VIEWS={
  day:{t:'My Dashboard', i:'home'}, inbox:{t:'Inbox', i:'inbox'}, mine:{t:'My Tasks', i:'mine'}, cal:{t:'Calendar', i:'cal'}, systems:{t:'Connected Systems', i:'net', team:true} };
function viewKind(v){ v=v||ui.view; if(v.indexOf('p:')===0) return 'project'; if(v.indexOf('u:')===0) return 'person'; if(v.indexOf('c:')===0) return 'classic'; return v; }
function myOpen(){ return S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(me())>=0); }
function myAsks(){ return (S.asks||[]).filter(a=>a.state!=='Built' && a.state!=='Not Doing' && (me()==='jonna' || a.by===me())); }
function myNudges(){ return (S.nudges||[]).filter(n=>n.to===me() && !n.done && !(me()==='jonna' && n.k==='Asked For')); }

/* ---------- the shell: the main area beside the MISMO rail ---------- */
let shell=null, head=null, body=null, tabbar=null;
function build(){
  shell=h('div','nx'); shell.setAttribute('role','main'); shell.hidden=true;
  head=h('div','nx-head'); body=h('div','nx-body');
  shell.appendChild(head); shell.appendChild(body);
  document.body.appendChild(shell);
  tabbar=h('nav','nx-tabbar'); tabbar.setAttribute('aria-label','Team HQ');
  document.body.appendChild(tabbar);
}

/* ---------- the rail: our items live inside the MISMO rail ---------- */
let railNodes=[];
const navEl=()=>document.querySelector('.hq.rail nav');
function railBtn(key, label, icon, extra){ const b=btn('nx-rb'); b.dataset.nx=key; b.title=label;
  b.innerHTML=(icon||'')+'<span>'+label+'</span>'+(extra||''); b.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); open(key); closeRailOnPhone(); }); return b; }
function closeRailOnPhone(){ if(window.matchMedia('(max-width:900px)').matches && window.__rail && window.__rail.hide) window.__rail.hide(); }
function railLbl(txt, foldKey){ const l=h('div','nx-rl'); if(foldKey){ const b=btn('nx-rlb', null, ()=>{ ui.fold[foldKey]=!ui.fold[foldKey]; save(); drawRail(); }); b.innerHTML='<span>'+txt+'</span>'+ic('down', ui.fold[foldKey]?'shut':''); l.appendChild(b); } else l.appendChild(h('span',null,txt)); return l; }
let mineHome=null;
function placeBoardBtn(after){ const nav=navEl(), mb=nav && nav.querySelector('button[data-hq="mine"]'); if(!mb || !after) return;
  if(!mineHome) mineHome={next:mb.nextElementSibling};
  if(after.nextSibling!==mb) nav.insertBefore(mb, after.nextSibling); }
function restoreBoardBtn(){ const nav=navEl(), mb=nav && nav.querySelector('button[data-hq="mine"]'); if(mb && mineHome && mineHome.next && mineHome.next.parentNode===nav) nav.insertBefore(mb, mineHome.next); mineHome=null; }
function drawRail(){
  const nav=navEl(); if(!nav) return;
  railNodes.forEach(n=>n.remove()); railNodes=[];
  const firstClassic=[...nav.querySelectorAll('button[data-hq]')].find(b=>b.dataset.hq!=='mine');
  const add=(n, before)=>{ railNodes.push(n); if(before) nav.insertBefore(n, before); else nav.appendChild(n); return n; };
  add(railLbl('You'), firstClassic);
  add(railBtn('day','My Dashboard', ic('home')), firstClassic);
  add(railBtn('inbox','Inbox', ic('inbox')), firstClassic);
  /* no counts in the left menu: it's for getting around (Jonna's call) */
  add(railBtn('mine','My Tasks', ic('mine')), firstClassic);
  const calB=add(railBtn('cal','Calendar', ic('cal')), firstClassic);
  placeBoardBtn(calB);
  add(railLbl('Team'), firstClassic);
  /* Connected Systems sits at the end of the Team list, just above System Health (Jonna's call) */
  if(window.__hqSystems) add(railBtn('systems','Connected Systems', ic('net')));
  markRail();
}
function markRail(){
  const nav=navEl(); if(!nav) return;
  const inApp=viewKind()!=='classic';
  nav.querySelectorAll('button[data-nx]').forEach(b=>{ if(inApp && b.dataset.nx===ui.view) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  if(inApp) nav.querySelectorAll('button[data-hq]').forEach(b=>b.removeAttribute('aria-current'));
  if(tabbar) [...tabbar.querySelectorAll('button')].forEach(b=>b.classList.toggle('on', b.dataset.k===ui.view));
}

/* ---------- moving between views ---------- */
function open(key){
  if(key==='all') key='mine'; /* All Tasks is gone; My Tasks is the list */
  if(key==='people'){ openClassic('today'); setTimeout(()=>{ const t=document.querySelector('#app-today .td-team'); if(t) t.scrollIntoView({block:'start', behavior:'smooth'}); }, 150); return; } /* People now lives in Today's Where My Team Is Today */
  if(key.indexOf('c:')===0){ openClassic(key.slice(2)); return; }
  ui.view=key; ui.ws=''; ui.q=''; sel=-1; save(); pushView(key);
  document.documentElement.classList.add('nx-show'); shell.hidden=false;
  paint(); body.scrollTop=0; markRail();
}
function openClassic(k){
  ui.view='c:'+k; save(); pushView(ui.view); hideApp();
  const b=document.querySelector('.hq.rail nav button[data-hq="'+k+'"]');
  if(b) b.click(); else if(window.__show) window.__show(k);
  markRail(); window.scrollTo(0,0);
}
function hideApp(){ document.documentElement.classList.remove('nx-show'); if(shell) shell.hidden=true; closeMenus(); }
/* a click on a classic tab in the rail leaves the app area for that page */
function onRailClick(e){ if(!ui.on) return; const b=e.target.closest && e.target.closest('.hq.rail nav button[data-hq], #help-btn'); if(!b) return;
  ui.view='c:'+(b.dataset.hq||'help'); save(); pushView(ui.view); hideApp(); setTimeout(markRail, 0); }

/* ---------- the phone's Back button ----------
   Back closes whatever is open on top (a menu, a system, a dialog, a task), then steps back
   through the pages you went to, and only leaves Team HQ from My Dashboard. */
let navPop=false, navOn=false;
function pushView(v){ if(navPop || !navOn) return; try{ const st=history.state; if(st && st.nx===v) return; history.pushState({nx:v}, ''); }catch(e){} }
const seen=e=>e && e.isConnected && e.getClientRects().length>0 && getComputedStyle(e).visibility!=='hidden';
function closeTop(){
  const x=X();
  if(menuEl){ closeMenus(); return true; }
  const ov=[...document.querySelectorAll('.hqx-ov')].filter(seen).pop();
  if(ov){ document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})); if(ov.isConnected && seen(ov)){ const c=[...ov.querySelectorAll('button')].find(b=>/^(cancel|close|done|×|✕)$/i.test((b.textContent||'').trim()) || /close/i.test(b.getAttribute('aria-label')||'')); if(c) c.click(); else ov.remove(); } return true; }
  if(document.querySelector('.hqx-sys') && x && x.closeSys){ x.closeSys(); return true; }
  const dlg=[...document.querySelectorAll('dialog[open], [role=dialog], [aria-modal=true], .modal.open, .modal.show, .sheet.open, .drawer.open, .mt-cover')].filter(e=>!e.closest('.nx-tabbar') && seen(e)).pop();
  if(dlg){ const c=[...dlg.querySelectorAll('button')].find(b=>/^(cancel|close|done|×|✕)$/i.test((b.textContent||'').trim()) || /close/i.test(b.getAttribute('aria-label')||''));
    if(c) c.click(); else { dlg.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})); document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})); if(dlg.tagName==='DIALOG' && dlg.open) try{ dlg.close(); }catch(e){} return !seen(dlg); } return true; }
  const rail=document.querySelector('.hq.rail.open, html.rail-open .hq.rail'); if(rail){ const sc=document.querySelector('.railscrim'); if(sc) sc.click(); return true; }
  return false; }
function onPop(e){ if(!ui.on) return; const st=e.state||{};
  /* something is open on top: close it and stay on this page */
  if(closeTop()){ try{ history.pushState({nx:ui.view}, ''); }catch(x){} return; }
  if(st.nx==='root'){ /* the bottom of the stack: back to My Dashboard first, then out */
    if(ui.view!=='day' && !document.documentElement.classList.contains('app-exp')){ navPop=true; try{ open('day'); }finally{ navPop=false; } try{ history.pushState({nx:'day'}, ''); }catch(x){} }
    else history.back();
    return; }
  if(st.nx && st.nx!==ui.view){ navPop=true; try{ open(st.nx); }finally{ navPop=false; } } }
function navInit(){ if(navOn) return; navOn=true; try{ history.replaceState({nx:'root'}, ''); history.pushState({nx:ui.view}, ''); }catch(e){} window.addEventListener('popstate', onPop); }


/* ---------- painting ---------- */
let sel=-1;
function paint(){
  if(!shell || shell.hidden) return;
  const k=viewKind(); const sy=body.scrollTop; const sl=body.querySelector('.nx-sl, .nx-dl'); const sly=sl?sl.scrollTop:0; peekEl=null;
  head.textContent=''; body.textContent=''; body.className='nx-body nx-v-'+k;
  try{
    if(k==='day') vDash();
    else if(k==='inbox') vInbox();
    else if(k==='mine') vList('mine');
    else if(k==='all') vList('mine');
    else if(k==='project') vProject(ui.view.slice(2));
    else if(k==='person') vPerson(ui.view.slice(2));
    else if(k==='cal') vCal();
    else if(k==='week') vWeek();
    else if(k==='people') vPeople();
    else if(k==='systems') vSystems();
    else vDash();
  }catch(e){ console.error(e); body.appendChild(h('p','nx-empty','Something went wrong drawing this view.')); }
  body.scrollTop=sy; const sl2=body.querySelector('.nx-sl, .nx-dl'); if(sl2) sl2.scrollTop=sly;
  if(k==='systems' && sy){ const back=()=>{ if(body.scrollTop<sy-2 && body.scrollHeight-body.clientHeight>body.scrollTop+2) body.scrollTop=sy; }; requestAnimationFrame(back); setTimeout(back, 250); } /* parts of that page size themselves a moment later */
  drawTabbar();
}
window.__nxToast=toast;
/* ---------- Connected Systems (systems.js draws the page; its content comes from Team HQ's private data) ---------- */
function vSystems(){ const CS=window.__hqSystems; if(!CS){ header('Connected Systems', ic('net')); body.appendChild(h('p','nx-empty','Connected Systems didn’t load. Refresh the page.')); return; }
  const ctl=[]; if(CS.canEdit()){ const eb=btn('nx-mini'+(CS.editing?' pri':''), CS.editing?'Done Editing':'Edit', ()=>{ CS.setEdit(!CS.editing); paint(); }); eb.innerHTML=ic('gear')+'<span>'+(CS.editing?'Done Editing':'Edit')+'</span>'; ctl.push(eb); }
  header('Connected Systems', ic('net'), 'How MISMO’s systems fit together', ctl);
  const pg=h('div','nx-cs'); pg.appendChild(CS.page()); body.appendChild(pg); }
function header(title, icon, sub, controls){
  const l=h('div','nx-hl');
  if(icon){ const i=h('span','nx-hi'); i.innerHTML=icon; l.appendChild(i); }
  const tt=h('div','nx-ht'); tt.appendChild(h('h1',null,title)); if(sub) tt.appendChild(h('span','nx-hs',sub)); l.appendChild(tt);
  head.appendChild(l);
  if(controls){ const r=h('div','nx-hr'); controls.forEach(c=>c && r.appendChild(c)); head.appendChild(r); }
}
function quickAdd(){
  const qa=h('form','nx-qa'); qa.setAttribute('autocomplete','off'); qa.innerHTML=ic('plus','pi');
  const inp=h('input'); inp.placeholder= phone() ? 'Add a task…' : 'Add a task — “Send deck to Amy fri @amy #summit !”'; inp.setAttribute('aria-label','Add a task'); qa.appendChild(inp);
  const hint=h('span','nx-hint'); qa.appendChild(hint);
  qa.appendChild(h('kbd','nx-k','C'));
  inp.addEventListener('input', ()=>{ hint.textContent = inp.value.trim() ? quickHint(parseQuick(inp.value)) : ''; qa.classList.toggle('typing', !!inp.value.trim()); });
  qa.addEventListener('submit', e=>{ e.preventDefault(); const v=inp.value.trim(); if(!v) return; const o=Object.assign(ctxDefaults(), parseQuick(v)); inp.value=''; hint.textContent=''; qa.classList.remove('typing'); newTask(o); });
  return qa;
}
/* what a new task should already know, from the page you're on: the project (and workstream) or the person */
function ctxAdd(){ const k=viewKind(), o={}; if(k==='project'){ o.r=ui.view.slice(2); if(ui.ws) o.w=ui.ws; } if(k==='person'){ const id=ui.view.slice(2); o.o=id; o.d=[id]; } return o; }
document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('#newtask'); if(!b || !ui.on || !document.documentElement.classList.contains('nx-show')) return; const k=viewKind(); if(k!=='project' && k!=='person') return; e.preventDefault(); e.stopPropagation(); newTask(ctxAdd()); }, true);
function ctxDefaults(){ const k=viewKind(), o={};
  if(k==='project') o.r=ui.view.slice(2); if(k==='project' && ui.ws) o.w=ui.ws;
  if(k==='person'){ const id=ui.view.slice(2); o.o=id; o.d=[id]; }
  if(k==='day') o.due=iso(today());
  return o; }

/* ---------- a task row (dense, like Linear) ---------- */
function row(t, opt){ opt=opt||{};
  const r=h('div','nx-row'+(t.due && isOpen(t) && days(t.due)<0 ? ' late':'')+(isOpen(t)?'':' isdone')); r.dataset.id=t.id; r.tabIndex=-1;
  r.draggable=!phone();
  const sb=btn('nx-sb', null, e=>{ e.stopPropagation(); statusMenu(t, sb, r); }); sb.innerHTML=sIcon(st(t)); sb.title=st(t)+' — click to change'; sb.setAttribute('aria-label','Status: '+st(t)); r.appendChild(sb);
  if(t.p==='High') r.appendChild(h('span','nx-hi-p','!'));
  const tt=h('span','nx-tt', t.t); r.appendChild(tt);
  { const cc=rowCount(t); if(cc) r.appendChild(cc); }
  if(t.w && !opt.noWs) r.appendChild(h('span','nx-ws', t.w));
  r.appendChild(h('span','nx-sp'));
  if(opt.pull && isOpen(t)){ const p=btn('nx-pull', null, e=>{ e.stopPropagation(); change(t, {due:iso(today())}, 'Planned for today: '+t.t); }); p.innerHTML=ic('sun')+'<span>Today</span>'; p.title='Plan it for today'; r.appendChild(p); }
  const rk=rock(t.r); if(rk && !opt.noProj){ const c=h('span','nx-pj', rk.name); c.style.setProperty('--rc', rcol(rk)); r.appendChild(c); }
  const dz=btn('nx-due'+(t.due?'':' none'), null, e=>{ e.stopPropagation(); dueMenu(t, dz); });
  if(t.due){ const n=days(t.due); dz.textContent = isOpen(t) && n<0 ? (-n)+'d late' : n===0 ? 'Today' : n===1 ? 'Tomorrow' : n>1 && n<7 ? WD[pd(t.due).getDay()] : fmt(t.due); if(isOpen(t)) dz.classList.add(n<0?'bad':n<=1?'warn':'ok'); }
  else dz.innerHTML=ic('cal');
  dz.title=t.due ? 'Due '+fmt(t.due)+' — click to move' : 'Set a due date'; r.appendChild(dz);
  const a=h('span','nx-avs'); doers(t).slice(0,3).forEach(i=>a.appendChild(av(i,20))); r.appendChild(a);
  r.addEventListener('click', ()=>{ if(peekEl && peekEl.isConnected && !r.classList.contains('nx-ask')) selectPeek(t.id); else editTask(t); });
  r.addEventListener('dblclick', ()=>editTask(t));
  r.addEventListener('dragstart', e=>{ drag=t; r.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed='move'; }catch(x){} document.documentElement.classList.add('nx-dragging'); });
  r.addEventListener('dragend', ()=>{ r.classList.remove('dragging'); drag=null; document.documentElement.classList.remove('nx-dragging'); document.querySelectorAll('.nx-over').forEach(x=>x.classList.remove('nx-over')); });
  rowMore(t, r);
  return r;
}
let drag=null;

/* ---------- little menus ---------- */
let menuEl=null;
function closeMenus(){ if(menuEl){ const m=menuEl; menuEl=null; m.remove(); if(m._onClose) try{ m._onClose(); }catch(e){} } }
function popMenu(anchor, items, title){
  closeMenus(); menuEl=h('div','nx-menu'+(phone()?' sheet':'')); if(title) menuEl.appendChild(h('div','nx-ml', title));
  items.forEach(it=>{ if(it.node){ menuEl.appendChild(it.node); return; } const b=btn('nx-mi'+(it.on?' on':'')+(it.keep?' ck':''), null, ()=>{ if(it.keep){ it.fn(); b.classList.toggle('on', !!(it.isOn && it.isOn())); return; } closeMenus(); it.fn(); }); b.innerHTML=(it.icon||'')+'<span>'+it.label+'</span>'+(it.hint?'<small>'+it.hint+'</small>':''); menuEl.appendChild(b); });
  document.body.appendChild(menuEl);
  if(!phone()){ const r=anchor.getBoundingClientRect(), mh=menuEl.offsetHeight; let top=r.bottom+4; if(top+mh>innerHeight-8) top=Math.max(8, r.top-mh-4);
    menuEl.style.top=top+'px'; menuEl.style.left=Math.max(8, Math.min(innerWidth-menuEl.offsetWidth-8, r.left))+'px'; }
  { const mine=menuEl; setTimeout(()=>document.addEventListener('click', function off(e){ if(menuEl!==mine){ document.removeEventListener('click', off); return; } if(mine && !mine.contains(e.target) && !e.target.closest('.nx-tbm')){ closeMenus(); document.removeEventListener('click', off); } }), 0); }
}
function statusMenu(t, anchor, rowEl){
  popMenu(anchor, STATUSES.map(s=>({label:s, icon:sIcon(s), on:st(t)===s, fn:()=>{ if(s===st(t)) return; if(s==='Done') complete(t, rowEl, anchor.getBoundingClientRect ? {clientX:anchor.getBoundingClientRect().left+8, clientY:anchor.getBoundingClientRect().top+8} : null); else change(t, {s}, 'Moved to '+s+': '+t.t); }})), 'Status');
}
function dueMenu(t, anchor){
  const t0=today(), fri=addD(t0,(5-t0.getDay()+7)%7||7), mon=addD(t0, ((8-t0.getDay())%7)||7);
  const opts=[['Today',t0],['Tomorrow',addD(t0,1)],['Friday',fri],['Next Monday',mon],['In Two Weeks',addD(t0,14)]];
  const items=opts.map(([l,d])=>({label:l, hint:WD[d.getDay()]+' '+MON[d.getMonth()]+' '+d.getDate(), on:t.due===iso(d), fn:()=>change(t, {due:iso(d)}, 'Due '+l.toLowerCase()+': '+t.t)}));
  const pick=h('label','nx-mpick'); pick.appendChild(h('span',null,'Pick a date')); const di=h('input'); di.type='date'; di.value=t.due||''; di.addEventListener('change', ()=>{ if(di.value){ closeMenus(); change(t, {due:di.value}, 'Due '+fmt(di.value)+': '+t.t); } }); pick.appendChild(di);
  items.push({node:pick});
  if(t.due) items.push({label:'No Due Date', fn:()=>change(t, {due:''}, 'Cleared the date: '+t.t)});
  popMenu(anchor, items, 'Due');
}

/* ---------- grouping and drag-to-change ---------- */
const GROUPS={status:'Status', due:'Due Date', project:'Team Project', person:'Person', ws:'Workstream'};
function dueBucket(t){ if(!t.due) return 'No Date'; const n=days(t.due), t0=today(), dow=t0.getDay(), toFri=(5-dow+7)%7;
  if(n<0) return 'Overdue'; if(n===0) return 'Today'; if(n===1) return 'Tomorrow'; if(n<=toFri) return 'This Week'; if(n<=toFri+7) return 'Next Week'; return 'Later'; }
const DUE_ORDER=['Overdue','Today','Tomorrow','This Week','Next Week','Later','No Date'];
function dueFor(bucket){ const t0=today(), toFri=(5-t0.getDay()+7)%7; return {Today:iso(t0), Tomorrow:iso(addD(t0,1)), 'This Week':iso(addD(t0, Math.max(toFri,0))), 'Next Week':iso(addD(t0, ((8-t0.getDay())%7)||7)), Later:iso(addD(t0,21)), 'No Date':''}[bucket]; }
function groupsOf(L, g, ctx){
  if(g==='status') return STATUSES.map(s=>({k:s, n:s==='Done'?'Done':s, icon:sIcon(s), items:L.filter(t=>st(t)===s)}));
  if(g==='due') return DUE_ORDER.map(b=>({k:b, n:b, items:L.filter(t=>dueBucket(t)===b), tone:b==='Overdue'?'bad':b==='Today'?'warn':''}));
  if(g==='project'){ const ids=[...new Set(L.map(t=>t.r||''))]; const R=activeRocks().map(r=>r.id); return ids.sort((a,b)=>(a===''?1:0)-(b===''?1:0) || R.indexOf(a)-R.indexOf(b)).map(id=>({k:id, n:id?(rock(id)||{}).name||'Other':'No Team Project', sq:id?rcol(rock(id)):'var(--border-strong)', items:L.filter(t=>(t.r||'')===id)})); }
  if(g==='person') return people().map(p=>({k:p.id, n:p.name, av:p.id, items:L.filter(t=>doers(t)[0]===p.id)})).concat([{k:'', n:'Nobody Yet', items:L.filter(t=>!doers(t).length)}]);
  if(g==='ws'){ const r=ctx && rock(ctx); const order=(r && r.ws)||[]; const names=[...new Set(order.concat(L.map(t=>t.w||'')))].filter((x,i,a)=>a.indexOf(x)===i);
    return names.sort((a,b)=>(a===''?1:0)-(b===''?1:0)).map(w=>({k:w, n:w||'No Workstream', items:L.filter(t=>(t.w||'')===w)})); }
  return [{k:'', n:'Tasks', items:L}];
}
function dropTo(g, key, t, ev){
  if(g==='status'){ if(st(t)===key) return; if(key==='Done') complete(t, null, ev); else change(t, {s:key}, 'Moved to '+key+': '+t.t); }
  else if(g==='due'){ if(key==='Overdue' || dueBucket(t)===key) return; change(t, {due:dueFor(key)}, (key==='No Date'?'Cleared the date: ':'Due '+key.toLowerCase()+': ')+t.t); }
  else if(g==='project'){ if((t.r||'')===key) return; const r=rock(key); const w=r && r.ws && r.ws.indexOf(t.w)>=0 ? t.w : ''; change(t, {r:key, w}, 'Moved to '+(r?r.name:'No Team Project')+': '+t.t); }
  else if(g==='ws'){ if((t.w||'')===key) return; change(t, {w:key}, 'Moved to '+(key||'No Workstream')+': '+t.t); }
  else if(g==='person'){ if(!key || doers(t)[0]===key) return; const old=doers(t)[0]; const d=[key].concat(doers(t).filter(x=>x!==key && x!==old)); const patch={d}; if(!t.o || t.o===old) patch.o=key; change(t, patch, 'Handed to '+first(key)+': '+t.t); }
}
function dropZone(el, g, key){
  el.addEventListener('dragover', e=>{ if(!drag) return; e.preventDefault(); el.classList.add('nx-over'); });
  el.addEventListener('dragleave', e=>{ if(!el.contains(e.relatedTarget)) el.classList.remove('nx-over'); });
  el.addEventListener('drop', e=>{ e.preventDefault(); el.classList.remove('nx-over'); if(drag){ const t=drag; drag=null; dropTo(g, key, t, e); } });
}

/* the list body: groups of rows, or a board of columns */
function taskView(L, g, mode, ctx, opt){ opt=opt||{};
  if(mode==='cal') return monthView(L, ctx);
  const wrap=h('div', mode==='board' ? 'nx-board' : 'nx-list');
  const G=groupsOf(L, g, ctx).filter(x=>x.items.length || (g==='status' && x.k!=='Done') || (mode==='board' && g!=='person' && g!=='project'));
  if(!L.length && !opt.keepEmpty){ const e=h('p','nx-empty', opt.empty || 'Nothing here.'); if(!ui.q){ e.appendChild(h('span','nx-empty-sub',' Tasks you add here show up for everyone doing them, with their dates, comments and subtasks.')); const go=btn('nx-mini pri nx-empty-go','Add a Task', ()=>newTask(ctxDefaults())); e.appendChild(go); } wrap.appendChild(e); return wrap; }
  G.forEach(grp=>{
    const fk=(ctx||ui.view)+'|'+g+'|'+grp.k;
    const sec=h('section', mode==='board' ? 'nx-col' : 'nx-grp'+(ui.fold[fk]?' shut':''));
    const gh=h('div','nx-gh'+(grp.tone?' '+grp.tone:''));
    if(mode!=='board'){ const f=btn('nx-fold', null, ()=>{ ui.fold[fk]=!sec.classList.contains('shut'); save(); sec.classList.toggle('shut'); }); f.innerHTML=ic('down'); f.setAttribute('aria-label','Show or hide '+grp.n); gh.appendChild(f); }
    if(grp.icon){ const i=h('span','gi'); i.innerHTML=grp.icon; gh.appendChild(i); }
    if(grp.sq){ const q=h('i','nx-sq'); q.style.background=grp.sq; gh.appendChild(q); }
    if(grp.av) gh.appendChild(av(grp.av,20));
    gh.appendChild(h('b',null,grp.n)); gh.appendChild(h('span','nx-cnt', String(grp.items.length)));
    if(grp.k!=='Done' && grp.k!=='Overdue'){ const a=btn('nx-add', null, ()=>{ const o=ctxDefaults(); if(g==='status') o.s=grp.k; if(g==='due'){ o.due=dueFor(grp.k); } if(g==='project') o.r=grp.k; if(g==='ws') o.w=grp.k; if(g==='person' && grp.k){ o.o=grp.k; o.d=[grp.k]; } newTask(o); }); a.innerHTML=ic('plus'); a.title='Add a task here'; gh.appendChild(a); }
    sec.appendChild(gh);
    const items=h('div','nx-items');
    const show=grp.k==='Done' ? grp.items.slice().sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,25) : grp.items;
    show.forEach(t=>items.appendChild(mode==='board' ? card(t, opt) : row(t, opt)));
    if(!grp.items.length) items.appendChild(h('div','nx-drope', mode==='board' ? 'Drop here' : 'Nothing here — drag a task in'));
    sec.appendChild(items);
    dropZone(sec, g, grp.k);
    wrap.appendChild(sec);
  });
  return wrap;
}
function card(t, opt){
  const c=row(t, Object.assign({}, opt, {noWs:true})); c.classList.add('nx-card');
  return c;
}


/* ---------- the peek: click a task, work on it right here (Linear's split view) ---------- */
let peekEl=null, peekList=[];
function withPeek(view, L, mode){
  if(mode==='board' || mode==='cal' || window.matchMedia('(max-width:1000px)').matches){ body.appendChild(view); return; }
  body.classList.add('has-split');
  const sp=h('div','nx-split'), left=h('div','nx-sl'); left.appendChild(view); sp.appendChild(left);
  peekEl=h('aside','nx-peek'); peekEl.setAttribute('aria-label','Task details'); sp.appendChild(peekEl); body.appendChild(sp);
  peekList=L; drawPeek();
}
function selectPeek(id){ ui.peek=id; drawPeek(); }
function drawPeek(){
  if(!peekEl) return; peekEl.textContent='';
  const vis=[...body.querySelectorAll('.nx-sl .nx-row[data-id]')].map(r=>r.dataset.id);
  let t=S.tasks.find(x=>x.id===ui.peek && vis.indexOf(x.id)>=0) || S.tasks.find(x=>x.id===vis[0]);
  body.querySelectorAll('.nx-sl .nx-row').forEach(r=>r.classList.toggle('sel', !!t && r.dataset.id===t.id));
  if(!t){ const e=h('div','nx-pk-empty'); e.innerHTML=ic('mine'); e.appendChild(h('b',null,'Nothing to show')); e.appendChild(h('span',null,'Pick a task on the left and it opens here.')); peekEl.appendChild(e); return; }
  ui.peek=t.id;
  const rk=rock(t.r);
  const top=h('div','nx-pk-top');
  if(rk){ const c=btn('nx-pj', rk.name, ()=>open('p:'+rk.id)); c.style.setProperty('--rc', rcol(rk)); top.appendChild(c); } else top.appendChild(h('span','nx-pk-none','No Team Project'));
  if(t.w) top.appendChild(h('span','nx-ws', '› '+t.w));
  const ed=btn('nx-ib', null, ()=>editTask(t)); ed.innerHTML=ic('ext'); ed.title='Open the full editor'; ed.setAttribute('aria-label','Open the full editor'); ed.style.marginLeft='auto'; top.appendChild(ed);
  peekEl.appendChild(top);
  /* title, edited in place */
  const ti=h('textarea','nx-pk-title'); ti.value=t.t; ti.rows=1; ti.setAttribute('aria-label','Task name');
  const fit=()=>{ ti.style.height='auto'; ti.style.height=ti.scrollHeight+'px'; }; setTimeout(fit,0); ti.addEventListener('input', fit);
  ti.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); ti.blur(); } if(e.key==='Escape'){ ti.value=t.t; ti.blur(); } });
  ti.addEventListener('blur', ()=>{ const v=ti.value.trim(); if(v && v!==t.t) change(t, {t:v}, 'Renamed: '+v); });
  peekEl.appendChild(ti);
  const fld=(label, node)=>{ const f=h('div','nx-pk-f'); f.appendChild(h('label',null,label)); f.appendChild(node); peekEl.appendChild(f); return f; };
  /* status */
  const ss=h('div','nx-pk-st'); STATUSES.forEach(s=>{ const b=btn('nx-pk-s'+(st(t)===s?' on':''), null, e=>{ if(st(t)===s) return; if(s==='Done') complete(t, null, e); else change(t, {s}, 'Moved to '+s+': '+t.t); }); b.innerHTML=sIcon(s)+'<span>'+(s==='Waiting on Someone'?'Waiting':s)+'</span>'; ss.appendChild(b); });
  fld('Status', ss);
  /* due */
  const dd=h('div','nx-pk-due'); const t0=today();
  const n=t.due ? days(t.due) : null;
  dd.appendChild(h('b','cur'+(isOpen(t)&&n!=null&&n<0?' bad':''), t.due ? WDL[pd(t.due).getDay()]+', '+fmt(t.due)+(isOpen(t)&&n<0?' · '+(-n)+'d late':n===0?' · today':'') : 'No due date'));
  const qd=h('div','q'); [['Today',t0],['Tomorrow',addD(t0,1)],['Fri',addD(t0,(5-t0.getDay()+7)%7||7)],['Next Mon',addD(t0,((8-t0.getDay())%7)||7)]].forEach(([l,d])=>{ qd.appendChild(btn('nx-chip'+(t.due===iso(d)?' on':''), l, ()=>change(t, {due:iso(d)}, 'Due '+l.toLowerCase()+': '+t.t))); });
  const di=h('input','nx-pk-date'); di.type='date'; di.value=t.due||''; di.setAttribute('aria-label','Due date'); di.addEventListener('change', ()=>change(t, {due:di.value}, di.value?'Due '+fmt(di.value)+': '+t.t:'Cleared the date: '+t.t)); qd.appendChild(di);
  dd.appendChild(qd); fld('Due', dd);
  /* people */
  const pp=h('div','nx-pk-ppl');
  doers(t).forEach(id=>{ const c=h('span','nx-pk-p'); c.appendChild(av(id,22)); c.appendChild(h('span',null,first(id))); const x=btn('x','×', ()=>{ const d=doers(t).filter(z=>z!==id); if(!d.length) return; change(t, {d, o: t.o===id ? d[0] : t.o}, first(id)+' is off '+t.t); }); x.title='Take '+first(id)+' off this'; if(doers(t).length>1) c.appendChild(x); pp.appendChild(c); });
  const addP=btn('nx-chip', '+ Add', ()=>popMenu(addP, people().filter(p=>doers(t).indexOf(p.id)<0).map(p=>({label:p.name, icon:av(p.id,20).outerHTML, fn:()=>change(t, {d:doers(t).concat([p.id])}, first(p.id)+' is on '+t.t)})), 'Add someone')); pp.appendChild(addP);
  fld('Doing It', pp);
  const ow=h('div','nx-pk-ppl'); if(t.o){ const c=h('span','nx-pk-p'); c.appendChild(av(t.o,22)); c.appendChild(h('span',null,first(t.o))); ow.appendChild(c); }
  const chO=btn('nx-chip', t.o?'Change':'Set', ()=>popMenu(chO, people().map(p=>({label:p.name, icon:av(p.id,20).outerHTML, on:t.o===p.id, fn:()=>change(t, {o:p.id}, first(p.id)+' is accountable for '+t.t)})), 'Accountable')); ow.appendChild(chO);
  fld('Accountable', ow);
  /* project and workstream */
  const pr=h('div','nx-pk-row');
  const ps=h('select','nx-sel'); ps.setAttribute('aria-label','Team Project'); ps.appendChild(new Option('No Team Project','')); activeRocks().forEach(r=>ps.appendChild(new Option(r.name, r.id))); if(t.r && !activeRocks().some(r=>r.id===t.r) && rk) ps.appendChild(new Option(rk.name, rk.id)); ps.value=t.r||'';
  ps.addEventListener('change', ()=>{ const r=rock(ps.value); change(t, {r:ps.value, w: r && r.ws && r.ws.indexOf(t.w)>=0 ? t.w : ''}, 'Moved to '+(r?r.name:'No Team Project')+': '+t.t); }); pr.appendChild(ps);
  if(rk && rk.ws && rk.ws.length){ const ws=h('select','nx-sel'); ws.setAttribute('aria-label','Workstream'); ws.appendChild(new Option('No Workstream','')); rk.ws.forEach(w=>ws.appendChild(new Option(w,w))); ws.value=t.w||''; ws.addEventListener('change', ()=>change(t, {w:ws.value}, 'Workstream: '+(ws.value||'none'))); pr.appendChild(ws); }
  fld('Team Project', pr);
  /* priority */
  const pri=h('div','nx-pk-row'); [['Normal','Normal'],['High','High Priority']].forEach(([k,l])=>pri.appendChild(btn('nx-chip'+((t.p||'Normal')===k?' on':''), l, ()=>{ if((t.p||'Normal')!==k) change(t, {p:k}, (k==='High'?'High priority: ':'Normal priority: ')+t.t); })));
  fld('Priority', pri);
  /* notes */
  const usesBr=/<br\s*\/?>/i.test(t.notes||''); const shown=(t.notes||'').replace(/<br\s*\/?>/gi,'\n');
  const no=h('textarea','nx-pk-notes'); no.value=shown; no.placeholder='Add notes, links, next steps…'; no.setAttribute('aria-label','Notes');
  no.addEventListener('blur', ()=>{ if(no.value!==shown) change(t, {notes: usesBr ? no.value.replace(/\n/g,'<br>') : no.value}, 'Saved the notes'); });
  fld('Notes', no);
  peekEl.appendChild(moreBlock(t));
  peekEl.appendChild(commentsBlock(t));
  const ft=h('div','nx-pk-ft');
  if(isOpen(t)){ const d=btn('nx-mini pri', null, e=>complete(t, null, e)); d.innerHTML=ic('check')+'<span>Mark Done</span>'; ft.appendChild(d); }
  const o=btn('nx-mini', null, ()=>editTask(t)); o.innerHTML='<span>Full Editor</span>'+ic('ext'); ft.appendChild(o);
  ft.appendChild(h('span','tip','J / K to move · X done · Enter opens'));
  peekEl.appendChild(ft);
}

/* ---------- toolbar bits ---------- */
function seg(items, cur, fn, cls){ const s=h('div','nx-seg'+(cls?' '+cls:'')); items.forEach(([k,l,icon])=>{ const b=btn('nx-sg'+(cur===k?' on':''), null, ()=>fn(k)); b.innerHTML=(icon?ic(icon):'')+(l?'<span>'+l+'</span>':''); if(!l){ b.title=({list:'List',board:'Board',cal:'Calendar'})[k]||k; b.setAttribute('aria-label', b.title); } s.appendChild(b); }); return s; }
function modeSeg(key, def){ const m=ui.modes[key]||def; return seg([['list','','list'],['board','','board'],['cal','','cal']], m, k=>{ ui.modes[key]=k; save(); paint(); }, 'ico'); }
function groupSel(key, def, opts){ const s=h('select','nx-sel'); s.setAttribute('aria-label','Group by'); opts.forEach(k=>s.appendChild(new Option('Group: '+GROUPS[k], k))); s.value=ui.groups[key]||def; s.addEventListener('change', ()=>{ ui.groups[key]=s.value; save(); paint(); }); return s; }
function filterBox(){ const f=h('input','nx-find'); f.placeholder='Filter…'; f.value=ui.q||''; f.setAttribute('aria-label','Filter tasks'); f.addEventListener('input', ()=>{ ui.q=f.value; const k=viewKind(); clearTimeout(f._t); f._t=setTimeout(()=>{ paint(); const x=head.querySelector('.nx-find'); if(x){ x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }, 160); }); return f; }
function doneToggle(){ const b=btn('nx-sg'+(ui.showDone?' on':''), 'Done', ()=>{ ui.showDone=!ui.showDone; save(); paint(); }); b.title='Show finished tasks'; return b; }
function matchQ(t){ const q=(ui.q||'').toLowerCase().trim(); if(!q) return true; return (t.t+' '+(t.w||'')+' '+((rock(t.r)||{}).name||'')+' '+doers(t).map(first).join(' ')).toLowerCase().indexOf(q)>=0; }
function recentDone(t){ return !isOpen(t) && (t.at||0) > Date.now()-14*864e5; }

/* ---------- MY DAY: your list beside your calendar (Sunsama-style) ---------- */
function vDay(){
  const now=new Date(), hr=now.getHours();
  const M=myOpen().sort(byDue);
  const late=M.filter(t=>t.due && days(t.due)<0), tod=M.filter(t=>t.due && days(t.due)===0);
  header(WDL[now.getDay()]+', '+MON[now.getMonth()]+' '+now.getDate(), ic('day'), (hr<12?'Good morning':hr<17?'Good afternoon':'Good evening')+', '+first(me()));
  const grid=h('div','nx-day'); body.appendChild(grid);
  const L=h('div','nx-dl'), R=h('div','nx-dr'); grid.appendChild(L); grid.appendChild(R);
  /* the strip: numbers that click through */
  const strip=h('div','nx-strip');
  const stat=(n,l,cls,fn)=>{ const b=btn('nx-stat'+(cls?' '+cls:''), null, fn); b.appendChild(h('b',null,String(n))); b.appendChild(h('span',null,l)); strip.appendChild(b); };
  const wk=M.filter(t=>t.due && days(t.due)>=0 && days(t.due)<=7);
  stat(M.length,'open','',()=>open('mine')); stat(late.length,'late', late.length?'bad':'', ()=>{ ui.groups.mine='due'; open('mine'); }); stat(tod.length,'due today', tod.length?'warn':'', ()=>{ ui.groups.mine='due'; open('mine'); }); stat(wk.length,'next 7 days','',()=>{ ui.groups.mine='due'; open('mine'); });
  const nIn=myAsks().length+myNudges().length; if(nIn) stat(nIn, me()==='jonna'?'asks for you':'your asks','hot',()=>open('mine'));
  L.appendChild(strip);
  /* the team, right now */
  const team=h('div','nx-teamstrip');
  people().filter(p=>p.id!==me()).forEach(p=>{ const s=statusOf(p); const b=btn('nx-tp '+s.k, null, ()=>open('u:'+p.id)); const w=h('span','nx-avw'); w.appendChild(av(p.id,26)); w.appendChild(h('i','nx-dot '+s.k)); b.appendChild(w); const tx=h('span','tx'); tx.appendChild(h('b',null,first(p.id))); tx.appendChild(h('small',null, s.t+(s.s?' · '+s.s:''))); b.appendChild(tx); b.title=p.name+' — '+s.t+(s.s?' '+s.s:''); team.appendChild(b); });
  L.appendChild(team);
  /* coming up: key dates as countdown chips */
  const kd=(S.dates||[]).filter(d=>d.d && (pd(d.e||d.d)>=today())).sort((a,b)=>a.d<b.d?-1:1).slice(0,5);
  if(kd.length){ const cu=h('div','nx-coming'); cu.appendChild(h('span','lb','Coming Up'));
    kd.forEach(d=>{ const n=days(d.d); const c=btn('nx-kd', null, ()=>window.__editDate && window.__editDate(d)); c.appendChild(h('b',null, n<=0 ? 'Now' : n+'d')); c.appendChild(h('span',null,d.t)); c.title=(d.k||'')+' · '+fmt(d.d)+(d.e&&d.e!==d.d?' – '+fmt(d.e):''); cu.appendChild(c); });
    L.appendChild(cu); }
  /* the plan: overdue, today, in flight, this week, everything else */
  const wkEnd=addD(today(), 7);
  const doing=M.filter(t=>st(t)==='In Progress' && late.indexOf(t)<0 && tod.indexOf(t)<0);
  const week=M.filter(t=>late.indexOf(t)<0 && tod.indexOf(t)<0 && doing.indexOf(t)<0 && t.due && pd(t.due)<=wkEnd);
  const rest=M.filter(t=>late.indexOf(t)<0 && tod.indexOf(t)<0 && doing.indexOf(t)<0 && week.indexOf(t)<0);
  const list=h('div','nx-list');
  const sec=(k, title, items, tone, opt, emptyTxt, dueKey, defFold)=>{ const fk='day|'+k; const shut=ui.fold[fk]===undefined ? !!defFold : ui.fold[fk]; const s=h('section','nx-grp'+(shut?' shut':''));
    const gh=h('div','nx-gh'+(tone?' '+tone:'')); const f=btn('nx-fold', null, ()=>{ ui.fold[fk]=!s.classList.contains('shut'); save(); s.classList.toggle('shut'); }); f.innerHTML=ic('down'); gh.appendChild(f);
    gh.appendChild(h('b',null,title)); gh.appendChild(h('span','nx-cnt',String(items.length)));
    if(dueKey!==undefined){ const a=btn('nx-add', null, ()=>newTask({due:dueKey})); a.innerHTML=ic('plus'); a.title='Add to '+title; gh.appendChild(a); }
    s.appendChild(gh); const it=h('div','nx-items'); items.forEach(t=>it.appendChild(row(t, opt))); if(!items.length) it.appendChild(h('div','nx-drope', emptyTxt)); s.appendChild(it);
    if(dueKey!==undefined) { s.addEventListener('dragover', e=>{ if(drag){ e.preventDefault(); s.classList.add('nx-over'); } }); s.addEventListener('dragleave', e=>{ if(!s.contains(e.relatedTarget)) s.classList.remove('nx-over'); });
      s.addEventListener('drop', e=>{ e.preventDefault(); s.classList.remove('nx-over'); if(drag){ const t=drag; drag=null; if(t.due!==dueKey) change(t, {due:dueKey}, (dueKey?'Due '+fmt(dueKey):'Cleared the date')+': '+t.t); } }); }
    list.appendChild(s); };
  if(late.length) sec('late','Overdue', late, 'bad', {pull:true});
  sec('today','Today', tod, 'warn', {}, 'Nothing planned for today. Drag something here, or hit Today on any task below.', iso(today()));
  if(doing.length) sec('doing','In Progress', doing, '', {pull:true});
  sec('week','Next 7 Days', week, '', {pull:true}, 'Nothing else due this week.', iso(addD(today(), (5-today().getDay()+7)%7||7)));
  const shown=late.length+tod.length+doing.length+week.length;
  if(rest.length) sec('rest','Later and Undated', rest, '', {pull:true}, '', undefined, shown+rest.length>14);
  const watch=S.tasks.filter(t=>isOpen(t) && t.o===me() && doers(t).indexOf(me())<0).sort(byDue);
  if(watch.length) sec('watch','You’re Accountable, Others Are Doing', watch, '', {}, '', undefined, shown+rest.length+watch.length>14);
  L.appendChild(list);
  /* below the list: your Team Projects at a glance, and what the team just finished */
  const lower=h('div','nx-lower');
  lower.appendChild(mailPanel(5)); lower.appendChild(peoplePanel());
  const R2=activeRocks().filter(r=>r.lead===me() || S.tasks.some(t=>t.r===r.id && isOpen(t) && doers(t).indexOf(me())>=0));
  const pj=h('section','nx-panel'); const ph=h('div','nx-gh'); ph.appendChild(h('b',null,'My Team Projects')); ph.appendChild(h('span','nx-cnt',String(R2.length))); pj.appendChild(ph);
  if(!R2.length) pj.appendChild(h('div','nx-drope','You’re not on a Team Project right now.'));
  R2.forEach(r=>{ const ts=S.tasks.filter(t=>t.r===r.id), op=ts.filter(isOpen), mine=op.filter(t=>doers(t).indexOf(me())>=0), lt=op.filter(t=>t.due && days(t.due)<0).length, pct=ts.length?Math.round((ts.length-op.length)/ts.length*100):0;
    const nextT=op.filter(t=>t.due).sort(byDue)[0];
    const b=btn('nx-prow', null, ()=>open('p:'+r.id)); b.style.setProperty('--rc', rcol(r));
    const top=h('div','tp'); top.appendChild(h('i','nx-sq')); top.lastChild.style.background=rcol(r); top.appendChild(h('b',null,r.name)); if(r.lead===me()) top.appendChild(h('span','lead','You lead'));
    top.appendChild(h('span','pc',pct+'%')); b.appendChild(top);
    const br=h('div','br'); const fi=h('i'); fi.style.width=pct+'%'; br.appendChild(fi); b.appendChild(br);
    const mt=h('div','mt'); mt.appendChild(h('span',null, mine.length+' yours · '+op.length+' open'+(lt?' · ':''))); if(lt) mt.appendChild(h('span','bad', lt+' late'));
    if(nextT) mt.appendChild(h('span','nxt', 'Next: '+nextT.t+' · '+fmt(nextT.due))); b.appendChild(mt);
    pj.appendChild(b); });
  lower.appendChild(pj);
  const wins=S.tasks.filter(t=>!isOpen(t)).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,8);
  const wf=h('section','nx-panel'); const wh=h('div','nx-gh'); wh.appendChild(h('b',null,'Recent Team Wins')); wf.appendChild(wh);
  if(!wins.length) wf.appendChild(h('div','nx-drope','Nothing finished yet.'));
  wins.forEach(t=>{ const r=btn('nx-win', null, ()=>editTask(t)); const d=doers(t)[0]; if(d) r.appendChild(av(d,22)); const tx=h('span','tx'); tx.appendChild(h('b',null,t.t)); const rk=rock(t.r); tx.appendChild(h('small',null,(d?first(d)+' finished this':'Finished')+(rk?' · '+rk.name:''))); r.appendChild(tx); const ago=Math.floor((Date.now()-(t.at||0))/864e5); r.appendChild(h('span','ago', ago<1?'today':ago===1?'yesterday':ago<14?ago+'d ago':fmt(iso(new Date(t.at))))); wf.appendChild(r); });
  lower.appendChild(wf);
  L.appendChild(lower);
  /* right: the day on the calendar */
  R.appendChild(dayPanel(me(), true));
}

/* the day as a timeline, with arrows to step through days */
function dayPanel(id, withNav){
  const c=h('div','nx-dp');
  let day=nextWorkday(today()); const now=Date.now();
  if(+day===+today() && now>etAt(day,18)) day=nextWorkday(addD(day,1));
  for(let i=0;i<Math.abs(ui.dd||0);i++) day=ui.dd>0 ? nextWorkday(addD(day,1)) : (function(){ let x=addD(day,-1); for(let j=0;j<10 && !workday(x);j++) x=addD(x,-1); return x; })();
  const isT=+day===+today();
  const hd=h('div','nx-dph');
  if(withNav){ const p=btn('nx-ib', null, ()=>{ ui.dd=(ui.dd||0)-1; paint(); }); p.innerHTML=ic('left'); p.setAttribute('aria-label','Previous day'); hd.appendChild(p); }
  const tt=h('div','tt'); tt.appendChild(h('b',null, isT?'Today':WDL[day.getDay()])); tt.appendChild(h('span',null, MON[day.getMonth()]+' '+day.getDate())); hd.appendChild(tt);
  if(withNav){ const n=btn('nx-ib', null, ()=>{ ui.dd=(ui.dd||0)+1; paint(); }); n.innerHTML=ic('right'); n.setAttribute('aria-label','Next day'); hd.appendChild(n);
    if(ui.dd){ hd.appendChild(btn('nx-mini','Back', ()=>{ ui.dd=0; paint(); })); } }
  c.appendChild(hd);
  const all=cal(id);
  /* all-day: key dates and due tasks for that day */
  const ad=h('div','nx-dpa');
  keyDatesOn(day).forEach(x=>{ const k=btn('kd', x.t, ()=>window.__editDate && window.__editDate(x)); ad.appendChild(k); });
  const hol=holiday(day); if(hol) ad.appendChild(h('span','kd hol', hol));
  (all||[]).filter(e=>e.all && e.s<+day+864e5 && e.e>+day).forEach(e=>ad.appendChild(h('span','kd ev', e.t||'All day')));
  S.tasks.filter(t=>isOpen(t) && t.due===iso(day) && doers(t).indexOf(id)>=0).forEach(t=>{ const k=btn('du', null, ()=>editTask(t)); k.innerHTML=sIcon(st(t))+'<span>'+t.t.replace(/</g,'&lt;')+'</span>'; ad.appendChild(k); });
  if(ad.childNodes.length) c.appendChild(ad);
  if(!all){ c.appendChild(h('p','nx-empty','Outlook isn’t coming through for '+(id===me()?'you':first(id))+' yet.')); return c; }
  const ev=all.filter(e=>e.e>+day && e.s<+day+864e5 && e.show!=='free' && !e.all).sort((a,b)=>a.s-b.s);
  const ws=etAt(day,8), we=etAt(day,18);
  let a=Math.min(ws, ...ev.map(e=>e.s)), b=Math.max(we, ...ev.map(e=>e.e)); const A=new Date(a); A.setMinutes(0,0,0); a=+A; const B=new Date(b); if(B.getMinutes()) B.setHours(B.getHours()+1,0,0,0); b=+B;
  const H=(b-a)/3600e3, px=52, col=h('div','nx-vday'); col.style.height=(H*px)+'px';
  for(let k=0;k<=H;k++){ const y=k*px; const l=h('span','hr', tm(a+k*3600e3)); l.style.top=y+'px'; col.appendChild(l); const g=h('i','gl'); g.style.top=y+'px'; col.appendChild(g); }
  const lanes=[]; ev.forEach(e=>{ let i=lanes.findIndex(x=>x<=e.s); if(i<0){ i=lanes.length; lanes.push(0); } lanes[i]=e.e; e._l=i; });
  const nl=Math.max(1,lanes.length);
  const w9=etAt(day,9), w5=etAt(day,17);
  let cur=w9; ev.filter(e=>e.show!=='oof').map(e=>[Math.max(e.s,w9),Math.min(e.e,w5)]).filter(x=>x[1]>x[0]).sort((x,y)=>x[0]-y[0]).concat([[w5,w5]]).forEach(([s,e])=>{ if(s-cur>=30*60e3 && s>(isT?now:0)){ const from=Math.max(cur, isT?now:0); if(s-from>=30*60e3){ const f=h('div','fr'); f.style.top=((from-a)/3600e3*px)+'px'; f.style.height=((s-from)/3600e3*px)+'px'; const m=Math.round((s-from)/60e3); f.appendChild(h('span',null, m>=60 ? (Math.round(m/30)/2)+'h open' : m+'m open')); col.appendChild(f); } } cur=Math.max(cur,e); });
  ev.forEach(e=>{ const x=h('div','ev '+(e.show||'busy')+(e.e<now?' past':'')+(e.s<=now&&e.e>now?' now':'')); x.style.top=((e.s-a)/3600e3*px)+'px'; x.style.height=Math.max(20,(e.e-e.s)/3600e3*px-2)+'px'; x.style.left='calc(46px + (100% - 46px) * '+(e._l/nl)+')'; x.style.width='calc((100% - 46px) / '+nl+' - 3px)';
    const short=(e.e-e.s)<45*60e3; if(short) x.classList.add('short'); x.appendChild(h('span','et', short ? tm(e.s)+' '+(e.t||'Busy') : (e.t||'Busy'))); if(!short) x.appendChild(h('span','ei',tmL(e.s)+'–'+tmL(e.e))); x.title=(e.t||'Busy')+' · '+tmL(e.s)+'–'+tmL(e.e); col.appendChild(x); });
  if(isT && now>a && now<b){ const n=h('i','nowl'); n.style.top=((now-a)/3600e3*px)+'px'; col.appendChild(n); }
  const sc=h('div','nx-dps'); sc.appendChild(col); c.appendChild(sc);
  const mins=ev.filter(e=>e.show!=='oof').reduce((n,e)=>n+(Math.min(e.e,w5)-Math.max(e.s,w9))/60e3,0);
  c.appendChild(h('div','nx-dpf', ev.length+(ev.length===1?' meeting':' meetings')+' · '+Math.max(0,Math.round((480-Math.max(0,mins))/30)/2)+'h open between 9 and 5'));
  setTimeout(()=>{ const nl2=col.querySelector('.nowl'), f1=col.querySelector('.ev:not(.past)'); const tgt=nl2||f1; if(tgt) sc.scrollTop=Math.max(0, parseFloat(tgt.style.top)-60); }, 0);
  return c;
}

/* ---------- INBOX ----------
   Every mailbox you can read: My Inbox first, then each shared mailbox (info@, membership@ …) as its own
   list you can drag into any order and fold away. Email only — asks and hand-offs are on My Tasks. */
function vInbox(){ vInboxSplit(); }
const IBX_SHOW=8;
function vInboxSplit(){
  const x=X(); const asks=myAsks(), nudges=myNudges();
  const askB=btn('nx-mini pri', 'Ask for Something', ()=>window.__ask2 && window.__ask2());
  const ol=h('a','nx-mini'); ol.href='https://outlook.office.com/mail/'; ol.target='_blank'; ol.rel='noopener'; ol.innerHTML=ic('ext')+'<span>Outlook</span>'; ol.title='Open Outlook';
  const boxes=x && x.MAIL.state==='ok' && x.mailBoxes ? x.mailBoxes() : [];
  const un=boxes.filter(b=>!b.k || !x.boxShut(b.k)).reduce((n,b)=>n+b.items.filter(m=>m.unread).length,0);
  header('Inbox', ic('inbox'), boxes.length ? (boxes.length>1 ? boxes.length+' mailboxes · ' : '')+un+' unread' : 'Every mailbox you can read, yours on top', [ol, askB]);
  body.classList.add('has-split');
  const wrap=h('div','nx-ibx');
  /* ---- left: mailboxes ---- */
  const left=h('div','nx-sl nx-ibm'); left.setAttribute('aria-label','Mailboxes');
  const fl=h('div','nx-ibf'); const flt=ui.ibf||'all';
  fl.appendChild(seg([['all','Everything'],['look','Needs a Look']], flt, k=>{ ui.ibf=k; save(); paint(); }));
  fl.appendChild(h('span','nx-ibh', boxes.length>1 ? 'Drag a mailbox by its handle to reorder' : ''));
  left.appendChild(fl);
  if(!x || x.MAIL.state!=='ok'){ const c=mailPanel(); c.querySelector('.nx-gh').remove(); left.appendChild(c); }
  else {
    const list=h('div','nx-ibxs');
    boxes.forEach(b=>{
      const shut=x.boxShut(b.k);
      const items=flt==='look' ? b.items.filter(m=>m.unread || m.flagged || m.important) : b.items;
      const unread=b.items.filter(m=>m.unread).length;
      const sec2=h('section','nx-grp nx-box'+(shut?' shut':'')+(b.k?' shared':' mine')); sec2.dataset.k=b.k;
      const gh=h('div','nx-gh');
      const grip=btn('nx-grip', null, null); grip.innerHTML='<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>';
      grip.title='Drag to reorder (or use the arrow keys)'; grip.setAttribute('aria-label','Move '+(b.k||'My Inbox')+' — use the up and down arrow keys');
      gh.appendChild(grip);
      const f=btn('nx-fold', null, ()=>{ x.setInbox({shut:Object.assign({}, x.ibCfg().shut||{}, {[b.k]:!shut})}); paint(); }); f.innerHTML=ic('down'); f.setAttribute('aria-label',(shut?'Open ':'Fold ')+(b.k||'My Inbox')); f.setAttribute('aria-expanded', String(!shut)); gh.appendChild(f);
      const nm=h('b',null, b.k ? b.k : 'My Inbox'); gh.appendChild(nm);
      if(b.k) gh.appendChild(h('span','nx-ibtag','Shared'));
      gh.appendChild(h('span','nx-cnt', unread ? unread+' unread' : (b.items.length ? 'all read' : '')));
      gh.appendChild(h('span','nx-sp'));
      if(shut && b.k) gh.appendChild(h('span','nx-ibz','Folded — not counted on your dashboard'));
      gh.addEventListener('click', e=>{ if(e.target.closest('button,a')) return; f.click(); });
      sec2.appendChild(gh);
      const it=h('div','nx-items');
      if(!b.ok) it.appendChild(h('div','nx-drope','Team HQ can’t read this mailbox right now — check you still have access to it in Outlook.'));
      else if(!items.length) it.appendChild(h('div','nx-drope', flt==='look' ? 'Nothing unread, flagged or important.' : 'Nothing here.'));
      else { const more=!!ui.ibMore && ui.ibMore[b.k]; items.slice(0, more ? 60 : IBX_SHOW).forEach(m=>it.appendChild(mailRow(m)));
        if(items.length>IBX_SHOW) it.appendChild(btn('nx-morel', more ? 'Show fewer' : 'Show '+(Math.min(items.length,60)-IBX_SHOW)+' more', ()=>{ ui.ibMore=Object.assign({}, ui.ibMore||{}, {[b.k]:!more}); paint(); })); }
      sec2.appendChild(it);
      boxDrag(grip, sec2, list);
      list.appendChild(sec2); });
    left.appendChild(list);
    if(x.MAIL.sent) left.appendChild(h('div','nx-ibup','Email last came through '+x.ago(x.MAIL.sent)+'. It checks every few minutes.'));
  }
  wrap.appendChild(left);
  body.appendChild(wrap);
}
/* drag a mailbox by its handle (mouse, touch or pen), or move it with the arrow keys; the order is saved */
function boxDrag(grip, sec2, list){
  const saveOrder=()=>{ const x=X(); const ord=[...list.querySelectorAll(':scope > .nx-box')].map(e=>e.dataset.k); if(x && x.setInbox) x.setInbox({order:ord}); };
  grip.addEventListener('keydown', e=>{ if(e.key!=='ArrowUp' && e.key!=='ArrowDown') return; e.preventDefault();
    const sib=e.key==='ArrowUp' ? sec2.previousElementSibling : sec2.nextElementSibling; if(!sib) return;
    if(e.key==='ArrowUp') list.insertBefore(sec2, sib); else list.insertBefore(sib, sec2); saveOrder(); grip.focus(); });
  /* while dragging, every mailbox shrinks to its title bar so the whole list fits and any spot is reachable;
     holding near the top or bottom edge keeps scrolling */
  grip.addEventListener('pointerdown', e=>{ if(e.button>0) return; e.preventDefault();
    const sc=sec2.closest('.nx-ibm'); let y=e.clientY, moved=false;
    const before0=sec2.getBoundingClientRect().top;
    sec2.classList.add('nx-boxdrag'); document.documentElement.classList.add('nx-boxing');
    /* keep the grabbed title bar under the pointer after the list shrinks */
    if(sc){ const d=sec2.getBoundingClientRect().top-before0; sc.scrollTop+=d; }
    const place=()=>{ const others=[...list.querySelectorAll(':scope > .nx-box')].filter(z=>z!==sec2);
      let before=null; for(const z of others){ const r=z.getBoundingClientRect(); if(y < r.top + r.height/2){ before=z; break; } }
      if(before){ if(sec2.nextElementSibling!==before) list.insertBefore(sec2, before); } else if(list.lastElementChild!==sec2) list.appendChild(sec2); };
    const tick=setInterval(()=>{ if(!moved || !sc) return; const R=sc.getBoundingClientRect(); const edge=56;
      if(y<R.top+edge){ sc.scrollTop-=Math.ceil((R.top+edge-y)/4); place(); } else if(y>R.bottom-edge){ sc.scrollTop+=Math.ceil((y-(R.bottom-edge))/4); place(); } }, 30);
    const mv=ev=>{ y=ev.clientY; if(Math.abs(y-e.clientY)>4) moved=true; if(moved) place(); };
    const up=()=>{ clearInterval(tick); document.removeEventListener('pointermove', mv, true); document.removeEventListener('pointerup', up, true); document.removeEventListener('pointercancel', up, true);
      sec2.classList.remove('nx-boxdrag'); document.documentElement.classList.remove('nx-boxing'); if(moved){ saveOrder(); sec2.scrollIntoView({block:'nearest'}); } };
    document.addEventListener('pointermove', mv, true); document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', up, true); });
}
/* ---------- MY TASKS / ALL TASKS ---------- */
function vList(kind){
  const key=kind, defG=kind==='mine'?'due':'status', defM=kind==='mine'?'list':'board';
  const g=ui.groups[key]||defG, m=ui.modes[key]||defM;
  let L=S.tasks.filter(t=>(isOpen(t) || (ui.showDone && recentDone(t))) && matchQ(t));
  if(kind==='mine') L=L.filter(t=>doers(t).indexOf(me())>=0);
  if(kind==='all' && ui.who) L=L.filter(t=>doers(t).indexOf(ui.who)>=0);
  if(kind==='all' && ui.proj) L=L.filter(t=>ui.proj==='-' ? !t.r : t.r===ui.proj);
  L.sort(byDue);
  const ctl=[];
  if(kind==='all'){ const w=h('select','nx-sel'); w.setAttribute('aria-label','Whose'); w.appendChild(new Option('Everyone','')); people().forEach(p=>w.appendChild(new Option(p.name,p.id))); w.value=ui.who||''; w.addEventListener('change', ()=>{ ui.who=w.value; save(); paint(); }); ctl.push(w);
    const p=h('select','nx-sel'); p.setAttribute('aria-label','Team Project'); p.appendChild(new Option('All Projects','')); activeRocks().forEach(r=>p.appendChild(new Option(r.name,r.id))); p.appendChild(new Option('No Team Project','-')); p.value=ui.proj||''; p.addEventListener('change', ()=>{ ui.proj=p.value; save(); paint(); }); ctl.push(p); }
  ctl.push(filterBox(), groupSel(key, defG, ['status','due','project','person']), doneToggle(), modeSeg(key, defM));
  header(VIEWS[kind].t, ic(VIEWS[kind].i), L.filter(isOpen).length+' open', ctl);
  const tv=taskView(L, g, m, key, {empty: ui.q ? 'Nothing matches “'+ui.q+'”.' : 'Nothing open. Nice.', noProj: false});
  if(kind==='mine' && !ui.q){ const sy=syncBand(m); if(sy.length){ const e=tv.querySelector(':scope > .nx-empty'); if(e) e.remove(); sy.forEach(x=>tv.appendChild(x)); } }
  if(kind==='mine' && !ui.q){ const ex=inboxBand(m); if(ex.top.length || ex.end.length){ const e=tv.querySelector(':scope > .nx-empty'); if(e) e.remove(); }
    ex.top.reverse().forEach(x=>tv.insertBefore(x, tv.firstChild)); ex.end.forEach(x=>tv.appendChild(x)); }
  withPeek(tv, L, m);
}

/* ---------- Sync Up to-dos ----------
   A card given to someone in a Sync Up — its Who is set, or it sits in that person's "… To Dos" list —
   shows on their My Tasks. It stays a Sync Up card: ticking it here ticks it there. The ones you
   handed to others in your Sync Ups show underneath, so you can see what is out with whom. */
const SYC={items:null, syncs:null, sub:false};
function syncSrc(){ const SY=window.__sy; if(SY && typeof SY==='object' && SY.started && SY.syncsSeen) return {items:SY.items||[], syncs:SY.syncs||[]};
  if(SYC.items && SYC.syncs) return {items:SYC.items, syncs:SYC.syncs}; startSync(); return null; }
function startSync(){ if(SYC.sub) return; const R=window.__hqRelay; if(!S.db || !S.db.collection) return; try{ if(R && R.syncMode && R.syncMode()!=='shared') return; }catch(e){} SYC.sub=true;
  const take=col=>snap=>{ const list=(snap && snap.docs ? snap.docs : []).map(d=>{ let b; try{ b=JSON.parse(JSON.stringify(d.data()||{})); }catch(e){ b={}; } b.id=d.id; return b; }); if(col==='syncs') SYC.syncs=list; else SYC.items=list; SYC.at=Date.now(); };
  try{ S.db.collection('syncs').onSnapshot(take('syncs'), ()=>{}); }catch(e){} try{ S.db.collection('syncitems').onSnapshot(take('syncitems'), ()=>{}); }catch(e){} }
const myKey=()=>{ try{ const R=window.__hqRelay; return String((R && R.myEmail && R.myEmail())||'').toLowerCase(); }catch(e){ return ''; } };
const byKey=k=>{ k=String(k||'').toLowerCase(); if(!k) return null; if(k==='me' || (k===myKey() && k)) return person(me()); return S.people.find(p=>String(p.email||'').toLowerCase()===k) || S.people.find(p=>{ const w=String(p.name||'').toLowerCase().replace(/[^a-z\s-]/g,'').split(/\s+/).filter(Boolean); return !p.email && w.length>1 && k.split('@')[0]===w[0][0]+w[w.length-1]; }) || null; };
function listOwner(s, id){ const l=(s.lists||[]).find(x=>x.id===id); if(!l) return null; const m=/^(.+?)[’']s\s+to[\s-]*dos?$/i.exec(String(l.name||'').trim()); if(!m) return null; const nm=m[1].trim().toLowerCase();
  return S.people.find(p=>{ const w=String(p.name||'').toLowerCase().split(/\s+/).filter(Boolean); return w[0]===nm || w.map(x=>x[0]).join('')===nm; }) || null; }
function syncTodos(){ const src=syncSrc(); if(!src) return null; const out=[];
  src.items.forEach(c=>{ if((c.kind||'card')!=='card' || c.done || c.arch) return; const s=src.syncs.find(z=>z.id===c.sync); if(!s) return; const o=c.who ? byKey(c.who) : listOwner(s, c.list); if(!o) return; out.push({c, s, o}); });
  return out.sort((a,b)=>(a.c.due||'9999').localeCompare(b.c.due||'9999') || (a.c.at||0)-(b.c.at||0)); }
const syncSig=()=>{ const L=syncTodos(); return L ? L.map(x=>x.c.id+(x.c.due||'')+x.o.id).join(',') : 'n'; };
function syncDone(c){ const N=window.__notes||{}; const cur=(N.card && N.card(c.id)) || c; const nx=Object.assign({}, cur, {done:true, doneAt:Date.now(), doneBy:S.me||''});
  if(SYC.items){ const i=SYC.items.findIndex(z=>z.id===c.id); if(i>=0) SYC.items[i]=nx; } try{ const SY=window.__sy; if(SY && Array.isArray(SY.items)){ const j=SY.items.findIndex(z=>z.id===c.id); if(j>=0) SY.items[j]=nx; } }catch(e){}
  const SY=window.__sy; let pr;
  if(SY && SY.mode) pr=N.put(nx);
  else { const body=Object.assign({}, nx); delete body.id; try{ pr=S.db.collection('syncitems').doc(nx.id).set(body); }catch(e){ pr=Promise.reject(e); } }
  Promise.resolve(pr).then(()=>toast('Done — ticked off in your Sync Up too.'), ()=>toast('That didn’t save. Try again in a moment.')); paint(); }
/* Inbox is only email, so the things that aren't your own tasks but still need you live here: asks and nudges
   (on top), work you handed off and other people's tasks due soon on projects you lead (at the bottom).
   Nothing is shown twice. */
function inboxBand(mode){
  const board=mode==='board', top=[], end=[];
  const part=(k, title, n, fill, tone)=>{ const fk='mine|ibx|'+k; const shut=!!ui.fold[fk];
    const sec=h('section', board ? 'nx-col nx-ibxgrp' : 'nx-grp nx-ibxgrp'+(shut?' shut':'')); const gh=h('div','nx-gh'+(tone?' '+tone:''));
    if(!board){ const f=btn('nx-fold', null, ()=>{ ui.fold[fk]=!sec.classList.contains('shut'); save(); sec.classList.toggle('shut'); }); f.innerHTML=ic('down'); f.setAttribute('aria-label','Show or hide '+title); gh.appendChild(f); }
    gh.appendChild(h('b',null,title)); gh.appendChild(h('span','nx-cnt',String(n))); sec.appendChild(gh);
    const it=h('div','nx-items'); fill(it); sec.appendChild(it); return sec; };
  const asks=myAsks(), nudges=myNudges();
  if(asks.length || nudges.length) top.push(part('asks', me()==='jonna' ? 'Asks for You' : 'Your Open Asks', asks.length+nudges.length, it=>{
    asks.slice().sort((a,b)=>(b.at||0)-(a.at||0)).forEach(a=>{ const r=btn('nx-row nx-ask'+(board?' nx-card':''), null, ()=>window.__editAsk && window.__editAsk(a)); if(a.by) r.appendChild(av(a.by,22)); r.appendChild(h('span','nx-tt', a.t)); r.appendChild(h('span','nx-sp')); r.appendChild(h('span','nx-state '+String(a.state||'New').toLowerCase().replace(/\s+/g,'-'), a.state||'New')); it.appendChild(r); });
    nudges.forEach(n=>{ const r=h('div','nx-row nx-ask'+(board?' nx-card':'')); if(n.by) r.appendChild(av(n.by,22)); r.appendChild(h('span','nx-tt', n.m||n.k)); r.appendChild(h('span','nx-sp')); r.appendChild(btn('nx-mini','Done', ()=>put('nudges', Object.assign({}, n, {done:1}), n))); it.appendChild(r); }); }, asks.length?'warn':''));
  const watch=S.tasks.filter(t=>isOpen(t) && t.o===me() && doers(t).indexOf(me())<0).sort(byDue);
  if(watch.length) end.push(part('handed', 'Handed Off — Others Are Doing', watch.length, it=>watch.forEach(t=>it.appendChild(row(t)))));
  const soon=S.tasks.filter(t=>isOpen(t) && t.due && days(t.due)<=7 && doers(t).indexOf(me())<0 && t.o!==me() && S.rocks.some(r=>r.id===t.r && r.lead===me())).sort(byDue);
  if(soon.length) end.push(part('lead', 'Due Soon on Projects You Lead', soon.length, it=>soon.forEach(t=>it.appendChild(row(t)))));
  return {top, end};
}
function syncBand(mode){
  const L=syncTodos(); if(!L || !L.length) return [];
  const mine=L.filter(x=>x.o.id===me()), out=L.filter(x=>x.o.id!==me());
  const secs=[], board=mode==='board';
  const part=(k, title, list, theirs, defShut)=>{ if(!list.length) return; const fk='mine|sync|'+k; const shut=ui.fold[fk]===undefined ? defShut : ui.fold[fk];
    const sec=h('section', board ? 'nx-col nx-sygrp' : 'nx-grp nx-sygrp'+(shut?' shut':'')); const gh=h('div','nx-gh');
    if(!board){ const f=btn('nx-fold', null, ()=>{ ui.fold[fk]=!sec.classList.contains('shut'); save(); sec.classList.toggle('shut'); }); f.innerHTML=ic('down'); f.setAttribute('aria-label','Show or hide '+title); gh.appendChild(f); }
    gh.appendChild(h('b',null,title)); gh.appendChild(h('span','nx-cnt',String(list.length))); sec.appendChild(gh);
    const items=h('div','nx-items');
    list.forEach(({c,s,o})=>{ const r=h('div','nx-row nx-syr'+(board?' nx-card':''));
      if(!theirs){ const ck=btn('nx-syck', null, e=>{ e.stopPropagation(); syncDone(c); }); ck.title='Mark done'; ck.setAttribute('aria-label','Mark “'+(c.t||'')+'” done'); r.appendChild(ck); }
      else r.appendChild(av(o.id, 20));
      r.appendChild(h('span','nx-tt', c.t||'Untitled'));
      r.appendChild(h('span','nx-ws', (theirs?first(o.id)+' · ':'')+(s.name||'Sync Up')));
      r.appendChild(h('span','nx-sp'));
      if(c.due){ const dd=days(c.due); r.appendChild(h('span','nx-due '+(dd<0?'bad':dd<=1?'warn':'ok'), dd<0?(-dd)+'d late':dd===0?'Today':dd===1?'Tomorrow':fmt(c.due))); }
      r.addEventListener('click', ()=>openClassic('syncs')); r.title='Open in Sync Ups';
      items.appendChild(r); });
    sec.appendChild(items); secs.push(sec); };
  part('sym', 'From Your Sync Ups', mine, false, false);
  part('syo', 'Handed Off in Your Sync Ups', out, true, true);
  return secs; }

/* ---------- a TEAM PROJECT ---------- */
function vProject(id){
  const r=rock(id); if(!r){ open('day'); return; }
  const key='p', g=ui.groups[key]||'ws', m=ui.modes[key]||'list';
  const all=S.tasks.filter(t=>t.r===id), open_=all.filter(isOpen), done=all.length-open_.length, late=open_.filter(t=>t.due && days(t.due)<0).length;
  let L=all.filter(t=>(isOpen(t) || (ui.showDone && recentDone(t))) && matchQ(t) && (!ui.ws || (t.w||'')===ui.ws)).sort(byDue);
  const sq='<i class="nx-sq lg" style="background:'+rcol(r)+'"></i>';
  header(r.name, sq, (r.lead?'Led by '+first(r.lead)+' · ':'')+open_.length+' open'+(late?' · '+late+' late':''), [filterBox(), groupSel(key,'ws',['ws','status','due','person']), doneToggle(), modeSeg(key,'list')]);
  const band=h('div','nx-pband'); band.style.setProperty('--rc', rcol(r));
  const pct=all.length?Math.round(done/all.length*100):0;
  const ring=h('div','nx-pring'); const C=2*Math.PI*16; ring.innerHTML='<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" class="tr"/><circle cx="20" cy="20" r="16" class="pg" stroke-dasharray="'+(C*pct/100).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 20 20)"/></svg><b>'+pct+'%</b>'; band.appendChild(ring);
  const tx=h('div','tx'); if(r.desc) tx.appendChild(h('p',null,r.desc));
  { const u=Array.isArray(r.upd) && r.upd[0]; if(u && Date.now()-(u.at||0)<21*864e5){ const p=h('p','nx-pstat '+(u.k||'')); p.appendChild(h('b',null,({good:'On Track',risk:'At Risk',off:'Off Track'})[u.k]||'Update')); p.append(' '+(u.why||'')+' \u2014 '+first(u.by)+', '+fmt(iso(new Date(u.at)))); tx.appendChild(p); } }
  const ppl=h('div','who'); const ids=[...new Set(open_.flatMap(doers))]; if(r.lead && ids.indexOf(r.lead)<0) ids.unshift(r.lead); ids.slice(0,8).forEach(i=>{ const a=av(i,22); a.style.cursor='pointer'; a.addEventListener('click', ()=>open('u:'+i)); ppl.appendChild(a); }); tx.appendChild(ppl);
  band.appendChild(tx);
  const chips=h('div','nx-wschips');
  const chip=(k,l,n)=>{ const b=btn('nx-chip'+(ui.ws===k?' on':''), null, ()=>{ ui.ws=ui.ws===k?'':k; paint(); }); b.appendChild(h('span',null,l)); b.appendChild(h('b',null,String(n))); chips.appendChild(b); };
  chip('', 'All Workstreams', open_.length);
  const wsn=[...new Set((r.ws||[]).concat(open_.map(t=>t.w||'').filter(Boolean)))];
  wsn.forEach(w=>chip(w, w, open_.filter(t=>(t.w||'')===w).length));
  band.appendChild(chips);
  const more=btn('nx-mini', null, ()=>{ openClassic('rocks'); setTimeout(()=>window.__pv2 && window.__pv2.openPanel && window.__pv2.openPanel(id,{}), 120); }); more.innerHTML='<span>Timeline and More</span>'+ic('ext'); more.style.marginLeft='auto'; chips.appendChild(more);
  chips.appendChild(btn('nx-mini','Update Status', ()=>window.__pv2 && window.__pv2.updateStatus && window.__pv2.updateStatus(r.id)));
  chips.appendChild(btn('nx-mini','Rules', ()=>rulesDialog(r))); chips.appendChild(btn('nx-mini','Save as Template', ()=>saveTemplate(r)));
  body.appendChild(band);
  withPeek(taskView(L, g, m, id, {noProj:true, noWs:g==='ws', empty: ui.ws ? 'Nothing open in '+ui.ws+'.' : 'Nothing open on this Team Project.'}), L, m);
}

/* ---------- a PERSON ---------- */
function vPerson(id){
  const p=person(id); if(!p){ open('day'); return; }
  const s=statusOf(p);
  const key='u', g=ui.groups[key]||'status', m=ui.modes[key]||'list';
  const all=S.tasks.filter(t=>doers(t).indexOf(id)>=0), op=all.filter(isOpen), late=op.filter(t=>t.due && days(t.due)<0).length;
  const L=all.filter(t=>(isOpen(t) || (ui.showDone && recentDone(t))) && matchQ(t)).sort(byDue);
  const w=h('span','nx-avw'); w.appendChild(av(id,30)); w.appendChild(h('i','nx-dot '+s.k));
  header(p.name, w.outerHTML, (p.role?p.role+' · ':'')+s.t+(s.s?' '+s.s:''), [filterBox(), groupSel(key,'status',['status','due','project']), doneToggle(), modeSeg(key,'list')]);
  const grid=h('div','nx-day'); body.appendChild(grid);
  const Lc=h('div','nx-dl'), Rc=h('div','nx-dr'); grid.appendChild(Lc); grid.appendChild(Rc);
  const band=h('div','nx-pband person');
  const tx=h('div','tx'); if(p.focus) tx.appendChild(h('p',null,p.focus));
  const nums=h('div','nums'); [[op.length,'open'],[late,'late'],[activeRocks().filter(r=>r.lead===id).length,'leads']].forEach(([n,l],i)=>{ const b=h('span','n'+(i===1&&n?' bad':'')); b.appendChild(h('b',null,String(n))); b.appendChild(h('small',null,l)); nums.appendChild(b); }); tx.appendChild(nums);
  band.appendChild(tx);
  const acts=h('div','acts');
  if(id!==me()) acts.appendChild(btn('nx-mini pri','Find a Time', ()=>{ try{ const k2='tools:team-hq:mismo.teamhq.ft'; const cur=JSON.parse(localStorage.getItem(k2)||'{}'); cur.who=[me(), id]; localStorage.setItem(k2, JSON.stringify(cur)); }catch(e){} openClassic('findtime'); }));
  acts.appendChild(btn('nx-mini', id===me()?'Add a Task':'Add a Task for '+first(id), ()=>newTask({o:id, d:[id]})));
  band.appendChild(acts);
  Lc.appendChild(band);
  Lc.appendChild(taskView(L, g, m, 'u:'+id, {empty:'Nothing open for '+first(id)+'.'}));
  Rc.appendChild(dayPanel(id, true));
}



/* ---------- MY DASHBOARD: My Day and My Board in one place, built like MISMO Media's dashboard ---------- */
const DK='hqDash';
const TILES={
  tasks:{n:'My Tasks', g:'Your Day', k:'#74BFEB', d:'What’s open, what’s late, and what’s next'},
  day:{n:'Your Day', g:'Your Day', k:'#5AA9E6', d:'Your meetings and the countdown to the next one', w:2},
  email:{n:'Email to Look At', g:'Your Day', k:'#F2B134', d:'Flagged, important and unread mail from people'},
  asks:{n:'Asks', g:'Your Day', k:'#E8833A', d:'Asks waiting on you, or where yours stand'},
  load:{n:'Your Week Ahead', g:'Your Day', k:'#9B8CF0', d:'Hours in meetings each day, at a glance'},
  people:{n:'My People', g:'Team', k:'#2BB673', d:'Your direct reports, where they are right now'},
  team:{n:'The Team Right Now', g:'Team', k:'#22B8CF', d:'Everyone — free, in a meeting or out'},
  projects:{n:'My Team Projects', g:'Team', k:'#9B8CF0', d:'Progress on the projects you lead or work on'},
  keydate:{n:'Next Key Date', g:'Team', k:'#3CCB7F', d:'A countdown to what’s coming up'},
  meeting:{n:'Team Meeting', g:'Team', k:'#E86F5A', d:'Countdown to the next one and what’s on the agenda'},
  wins:{n:'Team Wins', g:'Team', k:'#3CCB7F', d:'What the team finished lately'},
  findtime:{n:'Find a Time', g:'Team', k:'#5AA9E6', d:'Who’s free now, and the next time you’re all free'},
  board:{n:'My Board', g:'Team', k:'#74BFEB', d:'Your own board — free-form, notebook or rows'},
  systems:{n:'Connected Systems', g:'Team', k:'#74BFEB', d:'How MISMO’s systems connect, what each one does, and what’s live'}
};
function dashDefault(){
  const L=[{t:'day'},{t:'tasks'},{t:'email'},{t:'findtime'},{t:'people'},{t:'projects'},{t:'keydate'},{t:'meeting'},{t:'load'}];
  if(myAsks().length) L.splice(3,0,{t:'asks'});
  let fav=[]; try{ fav=(JSON.parse(localStorage.getItem('tools:team-hq:mismo.teamhq.hub')||'{}').fav)||[]; }catch(e){}
  const x=X(); const sys=x ? x.SYS.filter(z=>x.canOpen(z.k)) : [];
  let pick=fav.filter(k=>sys.some(z=>z.k===k)).slice(0,4);
  if(!pick.length) pick=(me()==='jonna' ? ['cms','marketing-hq','financials','summit-hq'] : ['summit-hq','meeting-trackers','member-360','sponsorship']).filter(k=>sys.some(z=>z.k===k));
  pick.forEach(k=>L.push({t:'sys', s:k}));
  L.push({t:'board'});
  return L;
}
function dashLayout(){ const b=S.bset||{}; return Array.isArray(b[DK]) && b[DK].length ? b[DK].map(z=>Object.assign({}, z)) : dashDefault(); }
function saveDash(L){ if(!S.bset) S.bset={}; S.bset[DK]=L.map(z=>{ const o={t:z.t}; ['s','go','f','sz','sec','lvl','card','at','mins','open'].forEach(k=>{ if(z[k]) o[k]=z[k]; }); if(Array.isArray(z.who) && z.who.length) o.who=z.who.slice(); if(Array.isArray(z.pick) && z.pick.length) o.pick=z.pick.slice(); return o; }); if(dashMixEdit!=null) S.bset.hqDashMix=dashMixEdit; try{ window.__saveMine && window.__saveMine(); }catch(e){} }
let dashEdit=null; /* the layout being customized, or null */
let dashMixEdit=null; /* mixed or uniform sizes, while customizing */
const SIZES=['s','w','t','b'], SZN={s:'Small',w:'Wide',t:'Tall',b:'Large'};
const MIXDEF={day:'b',tasks:'t',email:'w',asks:'s',load:'w',people:'w',team:'w',projects:'t',keydate:'t',meeting:'w',wins:'t',board:'s',findtime:'w',systems:'w'};
function dashMixed(){ if(dashMixEdit!=null) return dashMixEdit; const b=S.bset||{}; return b.hqDashMix===undefined ? true : !!b.hqDashMix; }
function sizeOf(cfg, i, L){ if(cfg.sz) return cfg.sz; if(cfg.w===2) return 'w';
  if(!dashMixed()) return cfg.t==='day' ? 'w' : 's';
  if(cfg.t==='sys'){ const n=L.slice(0,i).filter(z=>z.t==='sys').length; return ['s','w','t','s','b','s','w'][n%7]; }
  return MIXDEF[cfg.t] || 's'; }
function pinTile(k, go){ const L=dashLayout(); const i=L.findIndex(z=>z.t==='sys' && z.s===k && (z.go||'')===(go||'')); const had=i>=0; const t=had ? L.splice(i,1)[0] : {t:'sys', s:k, go:go||''}; L.splice(0,0,t); saveDash(L); toast((had?'Moved to the top of your dashboard':'Added to your dashboard')+(go?': '+go:''), null); if(viewKind()==='day' && !dashEdit) paint(); }
const sysOpenAll=()=>{ const v=(S.bset||{}).hqSysOpen; return v==='tab'||v==='hq' ? v : 'tile'; };
const opensInTab=cfg=>{ const g=sysOpenAll(); return g==='tile' ? !!(cfg && cfg.open==='tab') : g==='tab'; };
function setSysOpenAll(v){ if(!S.bset) S.bset={}; if(v==='tile') delete S.bset.hqSysOpen; else S.bset.hqSysOpen=v; try{ window.__saveMine && window.__saveMine(); }catch(e){} toast(v==='tab' ? 'Every system tile now opens in a new tab' : v==='hq' ? 'Every system tile now opens in Team HQ' : 'Each system tile opens its own way — set it in the tile’s gear'); paint(); }
function openSystem(k, go, sec, cfg){ const x=X(); if(opensInTab(cfg)){ const s=x && x.SYS.find(z=>z.k===k); if(s){ let u=x.tabUrl ? x.tabUrl(s, go||'', sec||'') : s.u; try{ u=new URL(u, document.baseURI).href; }catch(e){} window.open(u, '_blank', 'noopener'); return; } } if(x && x.openSys) x.openSys(k, go, {onPin:pinTile, sec:sec||''}); }
const opnTxt=cfg=>opensInTab(cfg) ? ' Open ↗' : ' Open →';
const em=t=>{ const e=h('em'); e.textContent=t; return e; };
function vDash(){
  const now=new Date(), hr=now.getHours();
  header('My Dashboard', ic('home'), WDL[now.getDay()]+', '+MON[now.getMonth()]+' '+now.getDate());
  const pg=h('div','nx-dash'); body.appendChild(pg);
  pg.appendChild(dashHero(now, hr));
  pg.appendChild(dashWeek());
  /* the tiles */
  const vb=h('div','nx-dvb'); vb.appendChild(h('h2',null,'Your Dashboard'));
  const r=h('div','nx-dvr');
  if(dashEdit){ r.appendChild(btn('nx-mini', '+ Add a Tile', openCatalog));
    const mx=h('div','nx-seg'); [['mix','Mixed Sizes'],['same','All the Same']].forEach(([k,l])=>mx.appendChild(btn('nx-sg'+((dashMixed()?'mix':'same')===k?' on':''), l, ()=>{ dashMixEdit=k==='mix'; dashEdit.forEach(z=>{ delete z.sz; delete z.w; }); paint(); }))); r.appendChild(mx);
    { const so=h('div','nx-seg nx-sysopen'); so.title='How system tiles open when you click them'; so.appendChild(h('span','nx-sgl','System Tiles Open')); [['hq','In Team HQ'],['tab','In a New Tab'],['tile','Each Tile']].forEach(([k,l])=>so.appendChild(btn('nx-sg'+(sysOpenAll()===k?' on':''), l, ()=>{ if(sysOpenAll()!==k) setSysOpenAll(k); }))); r.appendChild(so); }
    r.appendChild(btn('nx-mini', 'Shuffle Sizes', ()=>{ dashMixEdit=true; const pool=['s','s','w','t','b','w','s','t']; dashEdit.forEach(z=>{ delete z.w; z.sz=pool[Math.floor(Math.random()*pool.length)]; }); paint(); }));
    r.appendChild(btn('nx-mini', 'Reset', ()=>{ dashEdit=dashDefault(); dashMixEdit=null; paint(); }));
    r.appendChild(btn('nx-mini', 'Cancel', ()=>{ dashEdit=null; dashMixEdit=null; paint(); })); r.appendChild(btn('nx-mini pri', 'Save Layout', ()=>{ dashEdit.forEach((c,k)=>{ if(!c.sz){ c.sz=sizeOf(c, k, dashEdit); delete c.w; } }); saveDash(dashEdit); dashEdit=null; dashMixEdit=null; toast('Your dashboard is saved', null); paint(); })); }
  else { r.appendChild(btn('nx-mini', '+ Add a Tile', ()=>{ dashEdit=dashLayout(); paint(); openCatalog(); })); r.appendChild(btn('nx-mini', null, ()=>{ dashEdit=dashLayout(); paint(); })).innerHTML=ic('gear')+'<span>Customize</span>'; }
  vb.appendChild(r); pg.appendChild(vb);
  if(dashEdit) pg.appendChild(h('p','nx-dtip','Drag tiles to put them in order (you can do that any time, not just here), click a tile’s size to make it Small, Wide, Tall or Large, take off what you don’t need, then Save Layout. Open any system and use Make This a Dashboard Tile to pin the exact page you want — like an approval queue.'));
  const grid=h('div','nx-tiles'+(dashEdit?' editing':''));
  const L=dashEdit || dashLayout();
  L.forEach((cfg, i)=>{ let el=null; try{ el=tile(cfg, i, L); }catch(e){ console.error(e); } if(el){ el._sig=el.innerHTML; grid.appendChild(el); } });
  if(dashEdit){ const add=btn('nx-tadd', null, openCatalog); add.innerHTML='<b>+</b><span>Add a Tile</span>'; grid.appendChild(add); }
  pg.appendChild(grid); packTiles(grid, L); liven(grid);
}
/* tiles sit on an even grid of rows so their tops and bottoms line up; each one takes as many rows
   as its contents need (Small and Wide start at one row, Tall and Large at two), so a Small tile
   never gets stretched to match a long tile beside it */
let packRO=null, packMO=null;
/* ---------- life on the dashboard ----------
   The first time you see a number this visit it counts up, bars and meters fill in, and the tiles
   arrive one after another. After that a redraw is instant, so nothing keeps dancing. */
const SEENN=new Set(); let arrived=false;
function liven(grid){ if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if(!arrived){ arrived=true; [...grid.children].forEach((t,i)=>{ if(!t.classList.contains('st-tile')) return; t.style.animation='nxTileIn .45s cubic-bezier(.2,.8,.2,1) both'; t.style.animationDelay=Math.min(i*40, 520)+'ms'; setTimeout(()=>{ t.style.animation=''; t.style.animationDelay=''; }, 1200); }); }
  requestAnimationFrame(()=>countUps(grid)); }
function countUps(root){
  root.querySelectorAll('.st-big, .nx-fg b, .nx-hlg .t em').forEach(el=>{ const tn=[...el.childNodes].find(n=>n.nodeType===3 && /\d/.test(n.nodeValue)) || (el.childNodes.length===1 && el.firstChild.nodeType===3 ? el.firstChild : null); if(!tn) return;
    const raw=tn.nodeValue, m=/^([^\d−\-]*)([−\-]?)([\d,]+(?:\.\d+)?)(.*)$/.exec(raw.trim()); if(!m) return; const key=(el.closest('.st-tile')||{}).className+'|'+raw; if(SEENN.has(key)) return; SEENN.add(key);
    const target=parseFloat(m[3].replace(/,/g,'')); if(!isFinite(target) || target===0) return; const dec=(m[3].split('.')[1]||'').length, comma=/,/.test(m[3]) || target>=10000;
    const fmt=v=>m[1]+m[2]+(comma ? v.toLocaleString('en-US',{minimumFractionDigits:dec, maximumFractionDigits:dec}) : v.toFixed(dec))+m[4];
    const t0=performance.now(), dur=target>=1000 ? 900 : 650; const step=now=>{ const k=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-k,3); tn.nodeValue=fmt(target*e); if(k<1 && tn.isConnected) requestAnimationFrame(step); else tn.nodeValue=raw; }; requestAnimationFrame(step); });
  root.querySelectorAll('.st-meter > i, .nx-bars .bc i, .nx-prj .bar i, .nx-kl2 .bar i').forEach(b=>{ const key=(b.closest('.st-tile')||{}).className+'|bar|'+b.style.width+b.style.height; if(SEENN.has(key)) return; SEENN.add(key);
    const prop=b.style.height && !b.style.width ? 'height' : 'width'; const v=b.style[prop]; if(!v) return; b.style.transition='none'; b.style[prop]='0'; b.getBoundingClientRect(); b.style.transition=prop+' .8s cubic-bezier(.2,.8,.2,1)'; b.style[prop]=v; }); }
/* boxes on a grid of columns and rows: keep each where it is unless it overlaps one already settled, then slide it down just enough */
function settleBoxes(list, first){ const done=[]; const hit=(a,b)=>a.x<b.x+b.w && b.x<a.x+a.w && a.y<b.y+b.n && b.y<a.y+a.n;
  if(first) done.push(first);
  list.forEach(b=>{ if(b===first) return; let guard=0; for(;;){ const o=done.filter(d=>hit(b,d)); if(!o.length || guard++>200) break; b.y=Math.max(...o.map(d=>d.y+d.n)); } done.push(b); });
  return done; }
/* every tile of a size is the same height; a tile with more than fits loses list rows (then footer hints) until it fits */
const NOCUT='.st-top,.nx-tgear,.st-next,.nx-bars,.nx-pills,.nx-avrow,.nx-sysh,svg,.ring,.nx-env';
function calmTile(t){ if(!t.isConnected) return; t.classList.remove('nx-calm-auto'); const nx=[...t.children].find(k=>k.classList.contains('st-next') && !k.hidden && k.getClientRects().length);
  const kids=[...t.children].filter(k=>k!==nx && !k.hidden && k.getClientRects().length && !k.classList.contains('nx-tgear') && !k.classList.contains('st-top') && getComputedStyle(k).position!=='absolute'); if(!kids.length) return;
  const bottom=Math.max(...kids.map(k=>k.getBoundingClientRect().bottom)), r=t.getBoundingClientRect(); const end=nx ? nx.getBoundingClientRect().top : r.bottom-16;
  if(end-bottom>90) t.classList.add('nx-calm-auto'); }
function trimTile(t, maxH){ for(let g=0; g<14 && t.getBoundingClientRect().height>maxH+1; g++){
      let best=null, bb=-1;
      /* only rows of a list (three or more alike, side by side in the same box) are dropped, the last one first,
         and every list keeps at least one row — headings and the tile's own parts are never removed */
      t.querySelectorAll('*').forEach(c=>{ if(c.closest(NOCUT)) return; const vis=[...c.children].filter(k=>!k.hidden && k.getClientRects().length); if(vis.length<2) return;
        const last=vis[vis.length-1]; const alike=vis.filter(k=>k.tagName===last.tagName && k.className===last.className); if(alike.length<2 || alike.length<Math.min(3, vis.length)) return;
        const b=last.getBoundingClientRect(); if(b.height>=12 && b.bottom>bb){ bb=b.bottom; best=last; } });
      /* no list left to shorten: drop the tile's extra footer lines (a hint like "Raise something…") rather than cut text off */
      /* no list left: first tighten the spacing, then (on an app's tile) drop a line of extra text — the footer that says
         which app it's from goes last (November 5, 2026: Checks for Later lost "MISMO Money") */
      if(!best && !t.classList.contains('tight')){ t.classList.add('tight'); continue; }
      if(!best){ const blk=[...t.querySelectorAll('.nx-tbl,.nx-hlg,.nx-kl2,.nx-ggr,.nx-fgr,.mms-pl,.nx-ml2,.nx-tl2,.nx-ag')].filter(k=>!k.hidden && k.getClientRects().length && !k.closest(NOCUT)).pop(); if(blk){ blk.hidden=true; continue; } }
      if(!best && t.classList.contains('t-sys')){ const ex=[...t.querySelectorAll('.nx-glance,.st-sub,.nx-ctx')].filter(k=>!k.hidden && k.getClientRects().length).pop(); if(ex){ ex.hidden=true; continue; } }
      if(!best){ const vis=k=>k && !k.hidden && k.getClientRects().length; const ms=t.querySelector('.mic-steps'), nx=[...t.querySelectorAll('.st-next')].filter(vis).pop(); const opt=vis(ms) ? ms : nx; if(opt){ opt.hidden=true; continue; } }
      if(!best) return false; if(best.matches('.mtd-r')) best.hidden=true; else best.remove(); }
    return t.getBoundingClientRect().height<=maxH+1; };
function packTiles(grid, L){
  if(packRO){ packRO.disconnect(); packRO=null; } if(packMO){ packMO.disconnect(); packMO=null; }
  grid.classList.add('nx-pack');
  /* SLACK: a tile a few pixels over a row boundary eats into its bottom padding rather than taking a whole extra row */
  const ROW=84, GAP=10, SLACK=10;
  const cols=()=>getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
  const colSpan=t=>/\bsz-(w|b)\b/.test(t.className) && cols()>=2 ? 2 : 1;
  /* a tile you dropped into a particular spot stays in that spot (for this screen width); the rest flow around it */
  /* spots saved on an older, narrower grid are used on the 4-column one too, rather than thrown away */
  const pinOk=c=>!!(c && c.at && (c.at.c===cols() || (cols()>=4 && c.at.c>=2)));
  const pinOf=t=>{ if(t._pin) return t._pin; const c=L && t.dataset.i!=null ? L[+t.dataset.i] : null; return pinOk(c) ? c.at : null; };
  /* every tile of a size is the same height (Small 2 rows, Tall and Large 4). A tile with more than fits drops
     its last list rows until it fits; only something that can't be shortened (a chart) is allowed to grow. */
  const trim=trimTile;
  const fit=t=>{ if(!t.isConnected || t.classList.contains('nx-dropmark')) return; const tall=/\bsz-(t|b)\b/.test(t.className), min=tall?4:2;
    const keepR=t.style.gridRow, keepC=t.style.gridColumn; t.style.alignSelf='start'; let hgt=t.getBoundingClientRect().height; if(!hgt){ t.style.alignSelf=''; return; }
    const fixed=cols()>=2; const maxH=min*ROW+(min-1)*GAP; grid.classList.toggle('fixed', fixed);
    /* on the grid nothing may run past the tile's edge, not even a few pixels */
    if(fixed && hgt>maxH+1) trim(t, maxH);
    if(fixed) requestAnimationFrame(()=>calmTile(t));
    t.style.alignSelf='';
    /* on the grid every tile is exactly its size; stacked on a phone it takes what its contents need */
    const n=fixed ? min : Math.max(min, Math.ceil((hgt+GAP-SLACK)/(ROW+GAP))); t.dataset.n=n; const pin=pinOf(t);
    const cs=colSpan(t), px=pin ? Math.max(1, Math.min(pin.x, cols()-cs+1)) : 0;
    const r=(pin ? pin.y : 'auto')+' / span '+n, c=pin ? px+' / span '+cs : '';
    if(keepR!==r) t.style.gridRow=r; if(keepC!==c) t.style.gridColumn=c; };
  grid._fit=fit; grid._cols=cols; grid._colSpan=colSpan; grid._unit=ROW+GAP;
  /* measure every tile, then lay the placed ones out; if a tile grew and now runs into the one below,
     the lower one is shown pushed down (only on screen; the saved spots don't change) */
  const all=()=>{ const kids=[...grid.children].filter(k=>!k.classList.contains('nx-dropmark')); kids.forEach(fit); const C=cols();
    const placed=kids.filter(t=>{ const c=L && t.dataset.i!=null ? L[+t.dataset.i] : null; return pinOk(c); })
      .map(t=>{ const c=L[+t.dataset.i]; const w=colSpan(t); return {t, x:Math.max(1, Math.min(c.at.x, C-w+1)), y:c.at.y, w, n:+t.dataset.n||2}; })
      .sort((a,b)=>a.y-b.y || a.x-b.x);
    settleBoxes(placed).forEach(b=>{ const r=b.y+' / span '+b.n, c=b.x+' / span '+b.w; if(b.t.style.gridRow!==r) b.t.style.gridRow=r; if(b.t.style.gridColumn!==c) b.t.style.gridColumn=c; }); };
  all(); requestAnimationFrame(all);
  let tm=null; const later=()=>{ clearTimeout(tm); tm=setTimeout(all, 120); };
  if(window.ResizeObserver){ let lastW=grid.clientWidth; packRO=new ResizeObserver(()=>{ if(grid.clientWidth!==lastW){ lastW=grid.clientWidth; later(); } }); packRO.observe(grid); }
  packMO=new MutationObserver(later); packMO.observe(grid, {childList:true, subtree:true, characterData:true});
}
function dashHero(now, hr){
  const hero=h('div','nx-hero');
  const hi=h('div','nx-hhi'); hi.appendChild(h('div','nx-eb', WD[now.getDay()].toUpperCase()+', '+MON[now.getMonth()].toUpperCase()+' '+now.getDate()));
  hi.appendChild(h('h1',null,(hr<12?'Good morning':hr<17?'Good afternoon':'Good evening')+', '+first(me())));
  const p=h('p'); const M=myOpen().sort(byDue), late=M.filter(t=>t.due && days(t.due)<0);
  const x=X(); const wd=nextWorkday(today()), Ld=x && x.dayLoad ? x.dayLoad(me(), +wd===+today() && Date.now()>etAt(wd,17) ? nextWorkday(addD(wd,1)) : wd) : null;
  const dayName=+wd===+today()?'Today':WDL[wd.getDay()];
  const bits=[];
  if(Ld) bits.push(()=>{ p.append(dayName+' you have '); p.appendChild(em(Ld.n+(Ld.n===1?' meeting':' meetings'))); p.append(' and '); p.appendChild(em((Math.round(Ld.free/30)/2)+' hours free')); });
  if(late.length) bits.push(()=>{ p.append('start with '); p.appendChild(em(late[0].t)); p.append(' — '+(-days(late[0].due))+' days late'); });
  else if(M[0]) bits.push(()=>{ p.append('next up is '); p.appendChild(em(M[0].t)); });
  const kd=nextKeyDate(); if(kd) bits.push(()=>{ p.appendChild(em(kd.t)); const n=days(kd.d); p.append(n<=0?' is happening now':' is '); if(n>0) p.appendChild(em(n+(n===1?' day':' days'))); if(n>0) p.append(' away'); });
  const asks=myAsks().filter(a=>(a.state||'New')==='New'); if(me()==='jonna' && asks.length) bits.push(()=>{ p.appendChild(em(asks.length+(asks.length===1?' new ask':' new asks'))); p.append(' waiting on you'); });
  bits.forEach((f,i)=>{ if(i) p.append('; '); f(); }); if(bits.length) p.append('.'); else p.append('A clear runway. Pick something from your list and get ahead.');
  const s0=p.firstChild; if(s0 && s0.nodeType===3) s0.textContent=s0.textContent.charAt(0).toUpperCase()+s0.textContent.slice(1);
  hi.appendChild(p); hero.appendChild(hi);
  /* on your plate: the next seven days */
  const nd=h('div','nx-needs'); const nh=h('div','nx-nh'); nh.append('On Your Plate'); nh.appendChild(h('span',null,'next 7 days')); nd.appendChild(nh);
  const items=[];
  late.forEach(t=>items.push({d:'Late', k:'#FF8A7A', t:t.t, fn:()=>editTask(t), o:-1}));
  M.filter(t=>t.due && days(t.due)>=0 && days(t.due)<=7).forEach(t=>items.push({d:fmt(t.due), k:'#74BFEB', t:t.t, fn:()=>editTask(t), o:days(t.due)}));
  (S.dates||[]).filter(d=>d.d && days(d.d)>=0 && days(d.d)<=7 && (!(d.who||[]).length || (d.who||[]).indexOf(me())>=0)).forEach(d=>items.push({d:fmt(d.d), k:'#3CCB7F', t:d.t, fn:()=>window.__editDate && window.__editDate(d), o:days(d.d)}));
  try{ const nm=window.__mtg && window.__mtg.next && window.__mtg.next(); const md=typeof nm==='string'?nm:''; if(md && days(md)>=0 && days(md)<=7) items.push({d:fmt(md), k:'#E86F5A', t:'Team Meeting', fn:()=>openClassic('agenda'), o:days(md)}); }catch(e){}
  if(me()==='jonna') asks.forEach(a=>items.push({d:'New Ask', k:'#E8833A', t:a.t, fn:()=>window.__editAsk && window.__editAsk(a), o:-0.5}));
  items.sort((a,b)=>a.o-b.o);
  if(!items.length) nd.appendChild(h('div','nx-nempty','Nothing due in the next seven days.'));
  items.slice(0,6).forEach(it=>{ const b=btn('nx-need', null, it.fn); b.style.setProperty('--k', it.k); b.appendChild(h('span',null,it.d)); b.appendChild(h('b',null,it.t)); nd.appendChild(b); });
  const all=btn('nx-all', null, ()=>open('mine')); all.textContent='See All My Tasks →'; nd.appendChild(all);
  hero.appendChild(nd);
  return hero;
}
/* ---------- Find a Time tile: its own people, and the times right here ---------- */
const ETT=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York', hour:'numeric', minute:'2-digit'});
const tmET=ms=>ETT.format(new Date(ms)).replace(':00','').replace(/\s?(AM|PM)/,' $1');
const sameTZ=()=>{ const t=Date.now(); return tmET(t)===tmL(t); };
function ftIds(cfg){ const x=X(); const valid=id=>id!==me() && !!person(id);
  if(cfg && Array.isArray(cfg.who) && cfg.who.filter(valid).length) return cfg.who.filter(valid).slice(0,8);
  const mp=x && x.myPeople ? x.myPeople().filter(valid) : []; return (mp.length ? mp : people().filter(p=>p.id!==me()).map(p=>p.id)).slice(0,8); }
function ftSave(cfg, L){ if(!dashEdit && L){ saveDash(L); } paint(); }
function ftPick(cfg, L, after){ closeMenus(); const chosen=new Set(Array.isArray(cfg.who)&&cfg.who.length ? cfg.who : ftIds(cfg));
  const ov=h('div','hqx-ov'); const box=h('div','hqx-box'); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','Who to find a time with');
  box.appendChild(h('h2',null,'Who to Find a Time With')); box.appendChild(h('p',null,'Pick anyone. You’re always included. This is just for this tile — My People stays as it is.'));
  const g=h('div','hqx-g'); const n=h('p','nx-ftn');
  const upd=()=>{ n.textContent=chosen.size ? chosen.size+' picked' : 'Nobody picked — the tile will use My People'; };
  people().filter(p=>p.id!==me()).forEach(p=>{ const b=btn('hqx-p'+(chosen.has(p.id)?' on':''), null, ()=>{ if(chosen.has(p.id)) chosen.delete(p.id); else if(chosen.size<8) chosen.add(p.id); else { toast('Up to eight people at a time'); return; } b.classList.toggle('on', chosen.has(p.id)); upd(); });
    b.appendChild(av(p.id, 30)); const t=h('span','tx'); t.appendChild(h('b',null,p.name)); t.appendChild(h('small',null,p.role||'')); b.appendChild(t); b.appendChild(h('i','ck')); g.appendChild(b); });
  box.appendChild(g); upd(); box.appendChild(n);
  const close=()=>{ ov.remove(); document.removeEventListener('keydown', esc); };
  const ft=h('div','hqx-ft');
  ft.appendChild(btn('btn ghost','Everyone', ()=>{ people().filter(p=>p.id!==me()).slice(0,8).forEach(p=>chosen.add(p.id)); g.querySelectorAll('.hqx-p').forEach((b,i)=>b.classList.toggle('on', chosen.has(people().filter(p=>p.id!==me())[i].id))); upd(); }));
  ft.appendChild(btn('btn ghost','Clear', ()=>{ chosen.clear(); g.querySelectorAll('.hqx-p').forEach(b=>b.classList.remove('on')); upd(); }));
  ft.appendChild(btn('btn ghost','Cancel', close));
  ft.appendChild(btn('btn','Save', ()=>{ const ids=people().map(p=>p.id).filter(id=>chosen.has(id)); if(ids.length) cfg.who=ids; else delete cfg.who; close(); ftSave(cfg, L); if(after) after(); }));
  box.appendChild(ft); ov.appendChild(box); ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
  const esc=e=>{ if(e.key==='Escape') close(); }; document.addEventListener('keydown', esc); document.body.appendChild(ov); }
/* every time in the next two weeks when everyone picked is free (9 to 5 Eastern, half-hour starts), a few per day */
function freeTimes(ids, mins, max){ const now=Date.now(); let d=today(); const C=ids.map(id=>({id, ev:cal(id)})).filter(c=>c.ev); const out=[]; if(!C.length) return {list:out, seen:0};
  for(let k=0;k<15 && out.length<max;k++,d=addD(d,1)){ if(!workday(d)) continue; let t=Math.max(etAt(d,9), now); t=Math.ceil(t/18e5)*18e5; const end=etAt(d,17); let perDay=0, lastEnd=0;
    for(; t+mins*6e4<=end && perDay<3 && out.length<max; t+=18e5){ const e2=t+mins*6e4; if(t<lastEnd) continue;
      if(C.every(c=>!c.ev.some(e=>e.show!=='free' && !e.all && e.s<e2 && e.e>t))){ out.push({t, e:e2}); perDay++; lastEnd=e2+60*6e4; } } }
  return {list:out, seen:C.length}; }
function ftDialog(cfg, L){ const x=X(); closeMenus(); let mins=cfg.mins||30;
  const ov=h('div','hqx-ov'); const box=h('div','hqx-box nx-ftd'); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','Find a Time');
  const close=()=>{ ov.remove(); document.removeEventListener('keydown', esc); };
  const draw=()=>{ box.textContent=''; const ids=ftIds(cfg), all=[me()].concat(ids);
    const hd=h('div','nx-ftdh'); const tt=h('div'); tt.appendChild(h('h2',null,'Find a Time')); tt.appendChild(h('p',null,'When you and these people are all free in the next two weeks, between 9 and 5 Eastern.'+(sameTZ()?'':' Times are in your time, with Eastern underneath.'))); hd.appendChild(tt); box.appendChild(hd);
    const who=h('div','nx-ftdw'); all.forEach(id=>{ const pp=person(id); if(!pp) return; const s2=statusOf(pp); const c=h('span','nx-ftc'); const a=h('span','nx-avw'); a.appendChild(av(id,26)); a.appendChild(h('i','nx-dot '+s2.k)); c.appendChild(a); c.appendChild(h('span',null, id===me()?'You':first(id))); c.title=pp.name+' · '+s2.t+(s2.s?' '+s2.s:''); who.appendChild(c); });
    const ch=btn('nx-mini', 'Change People', ()=>ftPick(cfg, L, draw)); who.appendChild(ch); box.appendChild(who);
    const sg=h('div','nx-seg'); [[30,'30 Min'],[45,'45 Min'],[60,'1 Hour'],[90,'1½ Hours']].forEach(([m,l])=>sg.appendChild(btn('nx-sg'+(m===mins?' on':''), l, ()=>{ mins=m; if((cfg.mins||30)!==m){ if(m===30) delete cfg.mins; else cfg.mins=m; ftSave(cfg, L); } draw(); })));
    const lr=h('div','nx-ftdl'); lr.appendChild(h('b',null,'How Long')); lr.appendChild(sg); box.appendChild(lr);
    const R=freeTimes(all, mins, 9); const list=h('div','nx-ftdt');
    if(!R.seen) list.appendChild(h('p','nx-ftn','Calendars aren’t in yet. Give it a moment and open this again.'));
    else if(!R.list.length){ const best=nextShared(all, mins); list.appendChild(h('p','nx-ftn','There’s no time in the next two weeks when everyone is free.'+(best ? ' The closest: '+WDL[new Date(best.t).getDay()]+', '+MON[new Date(best.t).getMonth()]+' '+new Date(best.t).getDate()+' at '+tmL(best.t)+', without '+best.out.map(first).join(', ')+'.' : ''))); }
    else { let lastDay=''; R.list.forEach(sl=>{ const d0=new Date(sl.t), dk=d0.toDateString(); if(dk!==lastDay){ lastDay=dk; list.appendChild(h('div','nx-ftdd', (dk===new Date().toDateString()?'Today':WDL[d0.getDay()])+', '+MON[d0.getMonth()]+' '+d0.getDate())); }
      const r=h('div','nx-ftr'); r.appendChild(h('b',null, tmL(sl.t)+' – '+tmL(sl.e))); if(!sameTZ()) r.appendChild(h('small','nx-fte', tmET(sl.t)+' – '+tmET(sl.e)+' Eastern')); r.appendChild(h('span','sp'));
      r.appendChild(btn('nx-mini','Copy', ()=>{ const txt=WDL[d0.getDay()]+', '+MON[d0.getMonth()]+' '+d0.getDate()+', '+tmET(sl.t)+' – '+tmET(sl.e)+' Eastern'; try{ navigator.clipboard.writeText(txt); toast('Copied: '+txt); }catch(e){ toast(txt); } }));
      if(x && x.ACT && x.ACT.on) r.appendChild(btn('nx-mini pri','Book It', ()=>{ close(); x.bookDialog({subject:'MISMO Meeting', start:sl.t, mins, who:ids}); }));
      list.appendChild(r); }); }
    box.appendChild(list);
    const ft=h('div','hqx-ft'); ft.appendChild(btn('btn ghost','Open Find a Time', ()=>{ close(); try{ const k2='tools:team-hq:mismo.teamhq.ft'; const cur=JSON.parse(localStorage.getItem(k2)||'{}'); cur.who=all; localStorage.setItem(k2, JSON.stringify(cur)); }catch(e){} openClassic('findtime'); }));
    ft.appendChild(btn('btn','Done', close)); box.appendChild(ft); };
  draw(); ov.appendChild(box); ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
  const esc=e=>{ if(e.key==='Escape') close(); }; document.addEventListener('keydown', esc); document.body.appendChild(ov); }
function nextShared(ids, mins){ const now=Date.now(); let d=today(); const C=ids.map(id=>({id, ev:cal(id)})).filter(c=>c.ev); if(!C.length) return null;
  let best=null;
  for(let k=0;k<15;k++,d=addD(d,1)){ if(!workday(d)) continue; let t=Math.max(etAt(d,9), now); t=Math.ceil(t/18e5)*18e5; const end=etAt(d,17);
    for(; t+mins*6e4<=end; t+=18e5){ const e2=t+mins*6e4; const freeIds=C.filter(c=>!c.ev.some(e=>e.show!=='free' && !e.all && e.s<e2 && e.e>t)).map(c=>c.id);
      if(freeIds.length===C.length) return {t, n:C.length, of:C.length, out:[]};
      if(freeIds.indexOf(me())>=0 && (!best || freeIds.length>best.n)) best={t, n:freeIds.length, of:C.length, out:C.map(c=>c.id).filter(id=>freeIds.indexOf(id)<0)}; } }
  return best; }
function nextKeyDate(){ const F=(S.dates||[]).filter(d=>d.d && pd(d.e||d.d)>=today()).sort((a,b)=>(b.pin?1:0)-(a.pin?1:0) || (a.d<b.d?-1:1)); return F.find(d=>days(d.d)>=0) || F[0] || null; }
function dashWeek(){
  const wrap=h('div','nx-sw'); const t0=today(); const x=X();
  for(let i=0;i<7;i++){ const d=addD(t0,i); const key=iso(d), hol=holiday(d), wk=d.getDay()%6===0;
    const due=myOpen().filter(t=>t.due===key), late=i===0 ? myOpen().filter(t=>t.due && days(t.due)<0) : [];
    const kd=keyDatesOn(d), L=!wk && x && x.dayLoad ? x.dayLoad(me(), d) : null;
    const b=btn('nx-swd'+(i===0?' now':'')+(wk?' wkd':''), null, ()=>open('cal'));
    b.appendChild(h('span',null, i===0?'Today':WD[d.getDay()])); b.appendChild(h('b',null,String(d.getDate())));
    /* the dashes: red late tasks (today only), blue tasks due, green key dates, gray meetings (one dash for every two) — each one says what it is when you point at it */
    const pills=h('div','nx-pills'); const pil=(k,n,what)=>{ for(let j=0;j<Math.min(n,4);j++){ const z=h('i'); z.style.setProperty('--k',k); z.title=what; pills.appendChild(z); } };
    const pl=(n,one,many)=>n+' '+(n===1?one:many);
    pil('#FF8A7A', late.length, pl(late.length,'late task','late tasks')); pil('#74BFEB', due.length, pl(due.length,'task due','tasks due')); pil('#3CCB7F', kd.length, kd.map(z=>z.t).join(', ')||'Key date'); if(L && L.n) pil('#5A7A94', Math.ceil(L.n/2), pl(L.n,'meeting','meetings')); b.appendChild(pills);
    const sm = hol ? hol : kd.length ? kd[0].t : late.length ? pl(late.length,'task late','tasks late') : due.length ? pl(due.length,'task due','tasks due') : L ? pl(L.n,'meeting','meetings') : wk ? 'Weekend' : 'Clear';
    b.appendChild(h('small',null,sm)); b.title=[late.length?pl(late.length,'task late','tasks late'):'', due.length?pl(due.length,'task due','tasks due'):'', L?pl(L.n,'meeting','meetings'):'', kd.map(z=>z.t).join(', ')].filter(Boolean).join(' · ');
    wrap.appendChild(b); }
  /* what the colors mean, small, under the days */
  const key=h('div','nx-swkey'); [['#FF8A7A','Late'],['#74BFEB','Due'],['#3CCB7F','Key date'],['#5A7A94','Meetings']].forEach(([k,t])=>{ const sp=h('span'); const z=h('i'); z.style.setProperty('--k',k); sp.appendChild(z); sp.append(t); key.appendChild(sp); }); wrap.appendChild(key);
  return wrap;
}
/* one tile */
/* one tile's own menu: size, how much it shows, what it shows, take it off — no trip to the top */
function sizeItems(cfg, sz, done){ return SIZES.map(k=>({label:SZN[k], hint:{s:'one box', w:'two across', t:'two down', b:'two by two'}[k], on:k===sz, fn:()=>{ delete cfg.w; cfg.sz=k; done(); }})); }
function levelItems(cfg, done){ const lv=lvlOf(cfg); return [{label:'High Level', hint:'just the headline', on:lv==='hi', fn:()=>{ cfg.lvl='hi'; done(); }}, {label:'Detailed', hint:'more numbers and lists', on:lv==='det', fn:()=>{ cfg.lvl='det'; done(); }}]; }
function tileMenu(cfg, i, L, sz, anchor){
  const commit=()=>{ saveDash(L); paint(); };
  let changed=false; const later=()=>{ changed=true; saveDash(L); };
  const items=[{node:h('div','nx-ml','Size')}].concat(sizeItems(cfg, sz, commit), [{node:h('div','nx-ml','How Much to Show')}], levelItems(cfg, commit));
  if(cfg.t==='sys') sysItems(cfg, commit, later).forEach(it=>items.push(it));
  if(cfg.t==='sys'){ items.push({node:h('div','nx-msep')}); items.push({label:'Add Another Tile from This App', hint:'pick a different page', fn:()=>{ L.splice(i+1, 0, {t:'sys', s:cfg.s}); commit(); toast('Added — use its gear to pick the page or tile it shows.'); }}); }
  items.push({node:h('div','nx-msep')}); items.push({label:'Take This Tile Off', fn:()=>{ L.splice(i,1); commit(); toast('Tile taken off. Add it back any time from Customize.'); }});
  const meta=cfg.t==='sys' ? sysMeta(cfg) : TILES[cfg.t];
  popMenu(anchor, items, meta ? (meta.lab||meta.n) : 'This Tile'); if(menuEl){ menuEl.classList.add('tall','nx-tmenu'); menuEl._onClose=()=>{ if(changed) paint(); }; }
}
/* Customize This Tile: a live preview on the left, plain choices on the right, nothing saved until Save */
function tileEditor(cfg, i, L, inEdit){
  const x=X(); closeMenus(); const work=JSON.parse(JSON.stringify(cfg));
  const meta0=work.t==='sys' ? sysMeta(work) : TILES[work.t]; const sysS=work.t==='sys' && x ? x.SYS.find(z=>z.k===work.s) : null;
  const ov=h('div','hqx-ov'); const box=h('div','hqx-box nx-ted'); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','Customize this tile');
  const hd=h('div','nx-tedh'); hd.appendChild(h('h2',null,'Customize This Tile')); hd.appendChild(h('p',null, sysS ? 'Pick a page from '+sysS.n+', then what you want to see from it.' : 'Pick the size and how much it shows.')); box.appendChild(hd);
  const wrap=h('div','nx-tedw'); const left=h('div','nx-tedp'); left.appendChild(h('div','nx-tedl','Preview')); const pv=h('div','nx-tiles nx-tedg'); left.appendChild(pv); const right=h('div','nx-tedr'); wrap.appendChild(left); wrap.appendChild(right); box.appendChild(wrap);
  const sec=(title, note)=>{ const s0=h('section','nx-teds'); s0.appendChild(h('h3',null,title)); if(note) s0.appendChild(h('p',null,note)); right.appendChild(s0); return s0; };
  const seg=(opts, cur, fn)=>{ const g=h('div','nx-tseg'); opts.forEach(([k,l,sub])=>{ const b=btn(k===cur?'on':'', null, ()=>{ fn(k); draw(); }); b.appendChild(h('b',null,l)); if(sub) b.appendChild(h('small',null,sub)); g.appendChild(b); }); return g; };
  function preview(){ pv.textContent=''; const keep=dashEdit; dashEdit=null; let el=null; try{ el=tile(work, 0, [work]); }catch(e){ console.error(e); } dashEdit=keep; if(el){ el.querySelectorAll('.nx-tgear,.nx-tctl').forEach(z=>z.remove()); el.tabIndex=-1; pv.appendChild(el); try{ asOnDash(el); }catch(e){} } }
  /* the preview is the tile exactly as your dashboard will show it: same width, same height, same rows dropped to fit */
  function asOnDash(el){ const main=document.querySelector('.nx-dash .nx-tiles.nx-pack'); const cols=main ? getComputedStyle(main).gridTemplateColumns.split(' ').filter(Boolean) : [];
    if(cols.length<2) return;
    const colW=parseFloat(cols[0]), sz=(el.className.match(/\bsz-(\w)\b/)||[])[1]||'s', cs=(sz==='w'||sz==='b')?2:1, rows=(sz==='t'||sz==='b')?4:2;
    const W=cs*colW+(cs-1)*10, H=rows*84+(rows-1)*10;
    pv.style.setProperty('display','block','important'); pv.style.height='';
    el.style.width=W+'px'; el.style.height=''; el.style.transform='';
    trimTile(el, H); el.style.height=H+'px'; el.style.overflow='hidden';
    const avail=pv.clientWidth; if(avail && W>avail){ const k=avail/W; el.style.transform='scale('+k.toFixed(4)+')'; el.style.transformOrigin='top left'; pv.style.height=Math.ceil(H*k)+'px'; } }
  function draw(){ preview(); right.textContent='';
    if(sysS){
      const nav=x.navOf(sysS.k); const s1=sec('1. Page', nav.length ? 'Which page of '+(x.SHORT[sysS.k]||sysS.n)+' this tile comes from.' : 'Open '+(x.SHORT[sysS.k]||sysS.n)+' once and its pages show up here.');
      const sel=h('select','hqx-in'); const o0=new Option('Its Home Page',''); sel.appendChild(o0); nav.forEach(n=>{ const cn=x.countFor(sysS.k,n); sel.appendChild(new Option(n+(cn && cn.n>0?' ('+cn.n+')':''), n)); }); sel.value=work.go||''; sel.addEventListener('change', ()=>{ work.go=sel.value; work.card=''; work.pick=[]; work.sec=''; x.wantData && x.wantData(sysS.k, work.go); draw(); }); s1.appendChild(sel);
      const d=x.sysData(sysS.k, work.go||''); const cur=pickCard(work, d);
      const s2=sec('2. What to Show', 'Each choice is one tile. Want two? Use “Add Another Tile from This App” below.');
      if(!d){ s2.appendChild(h('div','nx-tedw8','Reading this page… it takes up to half a minute the first time.')); if(x.wantData) x.wantData(sysS.k, work.go||''); }
      else { const g=h('div','nx-topts');
        const opt=(on, label, val, unit, note, fn)=>{ const b=btn('nx-topt'+(on?' on':''), null, ()=>{ fn(); draw(); }); const t=h('span','t',label); b.appendChild(t); if(val){ const v=h('span','v'); v.appendChild(h('b',null,val)); if(unit) v.appendChild(h('small',null,unit)); b.appendChild(v); } if(note) b.appendChild(h('span','n',note)); g.appendChild(b); };
        if(d.figs.length || d.gauges.length) opt(!cur, 'Headline Numbers', d.figs[0] ? d.figs[0].v : (d.gauges[0] ? d.gauges[0].p+'%' : ''), d.figs[0] ? d.figs[0].n : (d.gauges[0]?d.gauges[0].n:''), (d.figs.length+d.gauges.length)+' numbers'+(d.gauges.length?' and gauges':'')+' from this page', ()=>{ work.card='#num'; });
        d.cards.filter(goodCard).forEach(c=>opt(cur===c, c.t, c.big||'', c.unit||'', c.rows && c.rows.length ? c.rows.length+' rows'+(c.groups?' · by status':'') : c.text ? c.text.slice(0,60) : c.sub ? c.sub.slice(0,60) : '', ()=>{ work.card=c.t; work.sec=''; }));
        if(!g.childNodes.length) s2.appendChild(h('div','nx-tedw8', d.empty ? 'Nothing is on this page right now, so the tile will say so. When something shows up there, it’ll appear here too.' : 'Nothing to pick on this page yet.'));
        else s2.appendChild(g);
        if(!cur && (d.figs.length + d.gauges.length)>1){ const s3=sec('3. Numbers to Include', 'Tick the ones you want. None ticked means all of them, in order.'); const ch=h('div','nx-tchk'); const pk=Array.isArray(work.pick) ? work.pick : (work.pick=[]);
          d.figs.map(f=>['f:'+f.n, f.n, f.v]).concat(d.gauges.map(gg=>['g:'+gg.n, gg.n+' gauge', gg.p+'%'])).forEach(([k,l,v])=>{ const b=btn(pk.indexOf(k)>=0?'on':'', null, ()=>{ const i2=pk.indexOf(k); if(i2>=0) pk.splice(i2,1); else pk.push(k); draw(); }); b.appendChild(h('i')); b.appendChild(h('span',null,l)); b.appendChild(h('b',null,v)); ch.appendChild(b); }); s3.appendChild(ch); } } }
    const sz=sizeOf(work, 0, [work]);
    const s4=sec(sysS ? (x && x.sysData(sysS.k, work.go||'') && !pickCard(work, x.sysData(sysS.k, work.go||'')) && 1 ? 'Size' : 'Size') : 'Size'); s4.appendChild(seg([['s','Small','one box'],['w','Wide','two across'],['t','Tall','two down'],['b','Large','two by two']], sz, k=>{ delete work.w; work.sz=k; }));
    const s5=sec('How Much Detail'); s5.appendChild(seg([['hi','High Level','just the top — no list'],['det','Detailed','adds the list underneath']], lvlOf(work), k=>{ work.lvl=k; }));
    if(sysS){ const g=sysOpenAll(); if(g==='tile'){ const s6=sec('When You Click It'); s6.appendChild(seg([['hq','Open in Team HQ','opens right here'],['tab','Open in a New Tab','the system on its own']], work.open==='tab'?'tab':'hq', k=>{ if(k==='tab') work.open='tab'; else delete work.open; })); } else { sec('When You Click It', 'Every system tile is set to open '+(g==='tab'?'in a new tab':'in Team HQ')+'. To choose tile by tile, use Customize → System Tiles Open → Each Tile.'); } }
  }
  const close=()=>{ ov.remove(); document.removeEventListener('keydown', esc); window.removeEventListener('hq:counts', onData); };
  const commit=()=>{ if(inEdit) paint(); else { saveDash(L); paint(); } };
  const ft=h('div','nx-tedf'); const fl=h('div','l'), fr=h('div','r');
  if(sysS) fl.appendChild(btn('btn ghost', 'Add Another Tile from This App', ()=>{ const nt={t:'sys', s:work.s}; L.splice(i+1, 0, nt); close(); commit(); setTimeout(()=>tileEditor(nt, i+1, L, inEdit), 60); }));
  fl.appendChild(btn('btn ghost danger', 'Take This Tile Off', ()=>{ L.splice(i,1); close(); commit(); toast('Tile taken off. Add it back any time from Customize.'); }));
  fr.appendChild(btn('btn ghost','Cancel', close));
  fr.appendChild(btn('btn','Save', ()=>{ Object.keys(cfg).forEach(k=>delete cfg[k]); Object.assign(cfg, work); if(Array.isArray(cfg.pick) && !cfg.pick.length) delete cfg.pick; close(); commit(); }));
  ft.appendChild(fl); ft.appendChild(fr); box.appendChild(ft);
  ov.appendChild(box); ov.addEventListener('click', e=>{ if(e.target===ov) close(); }); document.body.appendChild(ov);
  const esc=e=>{ if(e.key==='Escape') close(); }; document.addEventListener('keydown', esc);
  let dt=null; const onData=()=>{ clearTimeout(dt); dt=setTimeout(draw, 200); }; window.addEventListener('hq:counts', onData);
  draw(); }
function tileShell(cfg, meta, i, L){
  const sz=sizeOf(cfg, i, L); const el=h('div','st-tile t-'+cfg.t+' sz-'+sz); el.dataset.i=i;
  el.style.setProperty('--k', meta.k); el.tabIndex=0; el.setAttribute('role','button'); el.setAttribute('aria-label', meta.n);
  if(dashEdit){ el.dataset.i=i;
    const ctl=h('div','nx-tctl');
    const cb=btn('nx-tcb', null, e=>{ e.stopPropagation(); tileEditor(cfg, i, L, true); }); cb.innerHTML='Customize · '+SZN[sz]; cb.title='Pick what this tile shows, its size and how much detail'; ctl.appendChild(cb);
    const rm=btn('nx-tcb x','×', e=>{ e.stopPropagation(); L.splice(i,1); paint(); }); rm.title='Take this tile off'; rm.setAttribute('aria-label','Take '+meta.n+' off'); ctl.appendChild(rm);
    el.appendChild(ctl);
  }
  else { const g=btn('nx-tgear', null, e=>{ e.stopPropagation(); tileEditor(cfg, i, L, false); }); g.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'; g.title='Customize this tile'; g.setAttribute('aria-label','Customize '+meta.n); el.appendChild(g); }
  if(!phone() && L && L.length>1) dragTile(el, i, L);
  return el;
}
let tdrag=null;
function dragReset(){ const t=tdrag; tdrag=null; document.documentElement.classList.remove('nx-tdragging'); if(t){ try{ t.ghost && t.ghost.remove(); }catch(e){} try{ t.el.classList.remove('nx-ph'); }catch(e){} cancelAnimationFrame(t.raf||0); } }
/* drag a tile to move it: press and move a little, a copy follows the mouse, the spot it will land in
   shows as a dashed outline, the other tiles glide out of the way, and the order saves when you let go */
function dragTile(el, i, L){
  el.dataset.i=i; el.removeAttribute('draggable');
  el.addEventListener('dragstart', e=>e.preventDefault());
  el.addEventListener('pointerdown', e=>{
    if(e.button!==0 || e.pointerType==='touch' || tdrag) return;
    if(e.target.closest('button,a,input,select,textarea,[contenteditable],.nx-tctl,.nx-tgear')) return;
    const sx=e.clientX, sy=e.clientY; let started=false;
    const grid=el.parentNode, sc=el.closest('.nx-body') || document.scrollingElement;
    const move=ev=>{
      if(!started){ if(Math.hypot(ev.clientX-sx, ev.clientY-sy)<6) return; started=true; begin(ev); }
      tdrag.x=ev.clientX; tdrag.y=ev.clientY; place(); };
    const up=()=>{ document.removeEventListener('pointermove', move, true); document.removeEventListener('pointerup', up, true); document.removeEventListener('pointercancel', up, true); document.removeEventListener('keydown', esc, true); if(started) finish(false); };
    const esc=ev=>{ if(ev.key==='Escape' && tdrag){ ev.preventDefault(); document.removeEventListener('pointermove', move, true); document.removeEventListener('pointerup', up, true); document.removeEventListener('pointercancel', up, true); document.removeEventListener('keydown', esc, true); finish(true); } };
    document.addEventListener('pointermove', move, true); document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', up, true); document.addEventListener('keydown', esc, true);
    function geom(){ const cs=getComputedStyle(grid); const tracks=cs.gridTemplateColumns.split(' ').map(parseFloat).filter(n=>!isNaN(n)); const cg=parseFloat(cs.columnGap)||0; const rg=parseFloat(cs.rowGap)||0; const unit=grid._unit||94;
      return {tracks, cg, rg, unit, C:tracks.length, colW:tracks[0]||100}; }
    function begin(ev){
      const r=el.getBoundingClientRect();
      const ghost=el.cloneNode(true); ghost.classList.add('nx-ghost'); ghost.removeAttribute('id'); ghost.querySelectorAll('[id]').forEach(z=>z.removeAttribute('id'));
      Object.assign(ghost.style, {position:'fixed', left:r.left+'px', top:r.top+'px', width:r.width+'px', height:r.height+'px', margin:'0', zIndex:'9999', pointerEvents:'none'});
      document.body.appendChild(ghost);
      const mark=h('div','nx-dropmark'); if(getComputedStyle(grid).position==='static') grid.style.position='relative'; grid.appendChild(mark);
      tdrag={el, L, grid, sc, ghost, mark, edit:!!dashEdit, ox:sx-r.left, oy:sy-r.top, x:ev.clientX, y:ev.clientY, raf:0, w:grid._colSpan ? grid._colSpan(el) : 1, n:+el.dataset.n||2, cell:null};
      el.classList.add('nx-lift'); document.documentElement.classList.add('nx-tdragging');
      try{ window.getSelection().removeAllRanges(); }catch(x){}
      const tick=()=>{ if(!tdrag) return; const t=tdrag; const box=t.sc===document.scrollingElement ? {top:0, bottom:innerHeight} : t.sc.getBoundingClientRect();
        const edge=70; let dy=0; if(t.y<box.top+edge) dy=-Math.ceil((box.top+edge-t.y)/5); else if(t.y>box.bottom-edge) dy=Math.ceil((t.y-(box.bottom-edge))/5);
        if(dy){ t.sc.scrollTop+=dy; place(); } t.raf=requestAnimationFrame(tick); };
      tdrag.raf=requestAnimationFrame(tick); place(); }
    /* only the copy under the mouse and a dashed outline move; every other tile stays exactly where it is */
    function place(){ const t=tdrag; if(!t) return;
      const gx=t.x-t.ox, gy=t.y-t.oy;
      t.ghost.style.transform='translate('+(gx-parseFloat(t.ghost.style.left))+'px,'+(gy-parseFloat(t.ghost.style.top))+'px) rotate(1deg) scale(1.02)';
      const g=geom(), gr=grid.getBoundingClientRect();
      const x=Math.max(1, Math.min(g.C-t.w+1, Math.round((gx-gr.left)/(g.colW+g.cg))+1));
      const y=Math.max(1, Math.round((gy-gr.top)/g.unit)+1);
      if(t.cell && t.cell.x===x && t.cell.y===y) return; t.cell={x, y};
      const row=g.unit-g.rg; Object.assign(t.mark.style, {left:((x-1)*(g.colW+g.cg))+'px', top:((y-1)*g.unit)+'px', width:(t.w*g.colW+(t.w-1)*g.cg)+'px', height:(t.n*row+(t.n-1)*g.rg)+'px'}); }
    function finish(cancel){ const t=tdrag; if(!t) return;
      const eat=ev=>{ ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', eat, true); setTimeout(()=>document.removeEventListener('click', eat, true), 0);
      const target=cancel ? el.getBoundingClientRect() : t.mark.getBoundingClientRect();
      t.ghost.style.transition='transform .16s ease, opacity .16s'; t.ghost.style.transform='translate('+(target.left-parseFloat(t.ghost.style.left))+'px,'+(target.top-parseFloat(t.ghost.style.top))+'px)';
      setTimeout(()=>{ const cell=t.cell; try{ t.mark.remove(); }catch(e){} el.classList.remove('nx-lift'); dragReset();
        if(cancel || !cell || !el.isConnected) return;
        /* where every tile is right now, on this screen's grid */
        const g=geom(), gr=grid.getBoundingClientRect(); const C=g.C;
        const boxes=[...grid.children].filter(z=>z.classList.contains('st-tile') && z.dataset.i!=null).map(z=>{ const r=z.getBoundingClientRect(); return {i:+z.dataset.i, x:Math.max(1, Math.round((r.left-gr.left)/(g.colW+g.cg))+1), y:Math.max(1, Math.round((r.top-gr.top)/g.unit)+1), w:grid._colSpan(z), n:+z.dataset.n||2}; });
        const me=boxes.find(b=>b.i===+el.dataset.i); if(!me) return;
        if(me.x===cell.x && me.y===cell.y) return;
        me.x=cell.x; me.y=cell.y;
        /* anything in the way slides straight down; everything else stays put */
        const others=boxes.filter(b=>b!==me).sort((a,b)=>a.y-b.y || a.x-b.x);
        settleBoxes(others, me);
        boxes.forEach(b=>{ L[b.i].at={c:C, x:b.x, y:b.y}; });
        L.forEach((c,k)=>{ if(!c.sz && dashMixed()){ c.sz=sizeOf(c, k, L); delete c.w; } }); /* keep every tile the size it is now */
        const NL=L.slice().sort((a,b)=>((a.at&&a.at.c===C?a.at.y:1e4)-(b.at&&b.at.c===C?b.at.y:1e4)) || ((a.at?a.at.x:0)-(b.at?b.at.x:0)));
        if(t.edit){ L.splice(0, L.length, ...NL); paint(); }
        else { saveDash(NL); paint(); toast('Tile moved', null); } }, 170); }
  }); }
function tile(cfg, i, L){
  const meta = cfg.t==='sys' ? sysMeta(cfg) : TILES[cfg.t]; if(!meta) return null;
  const el=tileShell(cfg, meta, i, L);
  const top=h('div','st-top'); top.appendChild(h('span','st-lab', meta.lab||meta.n)); el.appendChild(top);
  const go=()=>{ if(dashEdit) return; meta.go ? meta.go() : null; };
  const x=X(), t0=today(); const SZ=sizeOf(cfg, i, L), tall=SZ==='t'||SZ==='b', wide=SZ==='w'||SZ==='b';
  if(cfg.t==='tasks'){ const M=myOpen(), late=M.filter(t=>t.due && days(t.due)<0).length, all=S.tasks.filter(t=>doers(t).indexOf(me())>=0), done=all.length-M.length;
    if(late) top.appendChild(h('span','st-pill hot', late+' late'));
    const b=h('div','st-big'); b.append(String(M.length)); b.appendChild(h('small',null,'open')); el.appendChild(b);
    const m=h('div','st-meter'); const f=h('i'); f.style.width=(all.length?Math.round(done/all.length*100):0)+'%'; m.appendChild(f); el.appendChild(m);
    el.appendChild(h('div','st-sub', done+' of '+all.length+' done · '+M.filter(t=>t.due && days(t.due)>=0 && days(t.due)<=7).length+' due this week'));
    M.sort(byDue); if(tall){ const ls=h('div','nx-tl2'); M.slice(0, SZ==='b'?8:5).forEach(t=>{ const r=h('div','tr'+(t.due && days(t.due)<0?' late':'')); const ck=btn('ck', null, e=>{ e.stopPropagation(); if(!dashEdit) complete(t, r, e); }); ck.title='Mark done'; ck.innerHTML=ic('check'); r.appendChild(ck); const tt=h('span','tt',t.t); r.appendChild(tt); if(t.due) r.appendChild(h('span','dd', days(t.due)<0 ? (-days(t.due))+'d late' : fmt(t.due))); r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) editTask(t); }); ls.appendChild(r); }); el.appendChild(ls); }
    else { const nx=M[0]; if(nx){ const n=h('div','st-next'); n.append('Next: '); n.appendChild(h('b',null,nx.t)); if(nx.due) n.append(' · '+fmt(nx.due)); el.appendChild(n); } }
    meta.go=()=>open('mine'); }
  else if(cfg.t==='day'){ let day=nextWorkday(t0); const now=Date.now(); if(+day===+t0 && now>etAt(day,17)) day=nextWorkday(addD(day,1));
    top.firstChild.textContent=+day===+t0?'Your Day':'Your '+WDL[day.getDay()];
    const calIn=!!cal(me()); const ev=(cal(me())||[]).filter(e=>e.e>+day && e.s<+day+864e5 && e.show!=='free' && !e.all).sort((a,b)=>a.s-b.s);
    const nx=ev.find(e=>e.e>now), cur=ev.find(e=>e.s<=now && e.e>now);
    const row=h('div','mic-row'+(wide?'':' mic-stack')); const ep=h('div','mic-ep');
    ep.appendChild(h('b',null, !calIn ? 'Getting your calendar…' : cur ? 'In: '+(cur.t||'Busy') : nx ? 'Next: '+(nx.t||'Busy') : ev.length ? 'Meetings done' : 'No meetings'));
    ep.appendChild(h('small',null, !calIn ? 'from Outlook' : cur ? 'until '+tmL(cur.e) : nx ? tmL(nx.s)+(+day!==+t0?' '+WD[day.getDay()]:'') : 'the day is yours'));
    row.appendChild(ep);
    if(nx && !cur && SZ==='s'){ const ms=Math.max(0,nx.s-now), hh=Math.floor(ms/36e5), mm=Math.floor(ms%36e5/6e4); const sm=ep.querySelector('small'); if(sm) sm.append(' · in '+(hh>=24 ? Math.floor(hh/24)+'d' : hh ? hh+'h '+mm+'m' : mm+' min')); row.classList.remove('mic-stack'); }
    else if(nx && !cur){ const ms=Math.max(0,nx.s-now), dd=Math.floor(ms/864e5), hh=Math.floor(ms%864e5/36e5), mm=Math.floor(ms%36e5/6e4); const cd=h('div','mic-cd'); (dd?[[dd,'Days'],[hh,'Hrs']]:[[hh,'Hrs'],[mm,'Min']]).forEach(([v,l])=>{ const sp=h('span'); sp.appendChild(h('b',null,String(v).padStart(2,'0'))); sp.appendChild(h('small',null,l)); cd.appendChild(sp); }); row.appendChild(cd); }
    el.appendChild(row);
    const cap=SZ==='b'?10:tall?6:wide?4:1; const ag=h('div','nx-ag'+(wide?'':' one')); ev.slice(0,cap).forEach(e=>{ const r=h('div','ae'+(e.e<now?' past':'')+(e.s<=now&&e.e>now?' on':'')); r.appendChild(h('span','t',tm(e.s))); r.appendChild(h('span','n',e.t||'Busy')); ag.appendChild(r); }); if(ev.length>cap) ag.appendChild(h('div','ae more','+'+(ev.length-cap)+' more')); el.appendChild(ag);
    if(SZ==='b'){ const w9=etAt(day,9), w5=etAt(day,17); const gaps=[]; let c2=Math.max(w9, +day===+t0?now:0); ev.filter(e=>e.show!=='oof').map(e=>[Math.max(e.s,w9),Math.min(e.e,w5)]).filter(z=>z[1]>z[0]).sort((a,b)=>a[0]-b[0]).concat([[w5,w5]]).forEach(([a,b2])=>{ if(a-c2>=30*6e4) gaps.push([c2,a]); c2=Math.max(c2,b2); });
      if(gaps.length){ const gl=h('div','nx-gaps'); gl.appendChild(h('small',null,'Open Time to Get Things Done')); const gw=h('div','gw'); gaps.slice(0,6).forEach(([a,b2])=>{ const m=Math.round((b2-a)/6e4); const g=h('span'); g.appendChild(h('b',null,tm(a)+'–'+tm(b2))); g.append(' '+(m>=60?(Math.round(m/30)/2)+'h':m+'m')); gw.appendChild(g); }); gl.appendChild(gw); el.appendChild(gl); } }
    const Ld=x && x.dayLoad ? x.dayLoad(me(), day) : null; if(Ld){ const n=h('div','st-next'); n.appendChild(h('b',null,(Math.round(Ld.free/30)/2)+'h open')); n.append(' 9–5 · '+ev.length+(ev.length===1?' meeting':' meetings')); el.appendChild(n); }
    meta.go=()=>open('cal'); }
  else if(cfg.t==='email'){ const ok=x && x.MAIL.state==='ok'; const items=ok ? x.mailItems().filter(m=>m.flagged||m.important||m.unread) : [];
    const art=h('div','nx-env'); art.innerHTML='<svg viewBox="0 0 64 44"><rect x="2" y="2" width="60" height="40" rx="4"/><path d="M4 5l28 21L60 5"/></svg>'; if(ok && items.length) art.appendChild(h('b',null,String(items.length))); el.appendChild(art);
    if(!ok){ el.appendChild(h('div','st-sub','Connect your Outlook email and what you’ve flagged or need to read shows up here.')); }
    else { const fl=items.filter(m=>m.flagged).length; const im=items.filter(m=>m.important && !m.flagged).length, un=items.filter(m=>m.unread).length; el.appendChild(h('div','st-sub', items.length ? [fl?fl+' flagged':'', im?im+' important':'', un?un+' unread':''].filter(Boolean).join(' · ') : 'All caught up — nothing flagged, important or unread'));
      /* nothing waiting on a tall tile: the latest mail from people, so the room still says something */
      if(!items.length && tall){ const lt=x.mailItems().slice(0, SZ==='b'?6:4); if(lt.length){ el.appendChild(h('small','nx-ftml','Latest')); const ls=h('div','nx-ml2'); lt.forEach(m=>{ const r=h('div','mr'); r.appendChild(h('b',null,m.from)); r.appendChild(h('span',null,m.subject)); if(m.link) r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) window.open(m.link,'_blank','noopener'); }); ls.appendChild(r); }); el.appendChild(ls); } else el.classList.add('nx-calm'); }
      const show=items.slice(0, SZ==='b'?6:tall?4:wide?2:1); if(show.length>1 || tall){ const ls=h('div','nx-ml2'); show.forEach(m=>{ const r=h('div','mr'); r.appendChild(h('b',null,m.from)); r.appendChild(h('span',null,m.subject)); if(m.link) r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) window.open(m.link,'_blank','noopener'); }); ls.appendChild(r); }); el.appendChild(ls); } else if(items[0]){ const n=h('div','st-next'); n.appendChild(h('b',null,items[0].from)); n.append(' · '+items[0].subject); el.appendChild(n); } }
    meta.go=()=>open('inbox'); }
  else if(cfg.t==='asks'){ const A=myAsks(), nw=A.filter(a=>(a.state||'New')==='New');
    if(nw.length) top.appendChild(h('span','st-pill hot', nw.length+' new'));
    const b=h('div','st-big'); b.append(String(A.length)); b.appendChild(h('small',null, me()==='jonna'?'asks for you':'open asks')); el.appendChild(b);
    if(A[0] && tall){ const ls=h('div','nx-kl2'); A.slice().sort((a,c)=>(c.at||0)-(a.at||0)).slice(0, SZ==='b'?8:5).forEach(a=>{ const r=h('div','kr'); r.appendChild(h('b',null,a.state||'New')); r.appendChild(h('span',null,a.t)); r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit && window.__editAsk) window.__editAsk(a); }); ls.appendChild(r); }); el.appendChild(ls); }
    if(!A.length) el.classList.add('nx-calm');
    if(A[0]){ const n=h('div','st-next'); n.append('Newest: '); n.appendChild(h('b',null,A.slice().sort((a,c)=>(c.at||0)-(a.at||0))[0].t)); el.appendChild(n); } else el.appendChild(h('div','st-sub','Nothing waiting. Ask for something any time.'));
    meta.go=()=>open('mine'); }
  else if(cfg.t==='load'){ let d0=nextWorkday(t0); if(+d0===+t0 && Date.now()>etAt(d0,17)) d0=nextWorkday(addD(d0,1)); const D=[d0]; while(D.length<5) D.push(nextWorkday(addD(D[D.length-1],1)));
    if(!cal(me())){ el.appendChild(h('div','st-sub','Getting your calendar from Outlook…')); meta.go=()=>open('cal'); }
    else {
    const bars=h('div','nx-bars'); let free=0; const LD=D.map(d=>x && x.dayLoad ? x.dayLoad(me(), d) : null); const top=Math.max(2, ...LD.map(z=>z?z.busy/60:0)); D.forEach((d,di)=>{ const Ld=LD[di]; const hrs=Ld?Ld.busy/60:0; if(Ld) free+=Ld.free; const c=h('div','bc'+(+d===+t0?' on':'')); const bb=h('i'); bb.style.height=Math.max(4, Math.min(82, hrs/top*82))+'%'; const bw=h('div','bw'); bw.appendChild(h('b',null,(Math.round(hrs*2)/2)+'h')); bw.appendChild(bb); c.appendChild(bw); c.appendChild(h('span',null,WD[d.getDay()])); c.appendChild(h('small','dn',String(d.getDate()))); bars.appendChild(c); }); el.appendChild(bars);
    const busiest=LD.reduce((bi,z,k)=>z && (!LD[bi] || z.busy>LD[bi].busy) ? k : bi, 0); const bs=h('div','st-next'); bs.appendChild(h('b',null,(Math.round(free/30)/2)+'h open')); bs.append(LD[busiest] && LD[busiest].busy>=120 ? ' · '+WDL[D[busiest].getDay()]+' is busiest' : ' over the next 5 days'); el.appendChild(bs);
    meta.go=()=>open('cal'); } }
  else if(cfg.t==='people' || cfg.t==='team'){ const ids=cfg.t==='team' ? people().filter(p=>p.id!==me()).map(p=>p.id) : (x ? x.myPeople() : []);
    if(!ids.length){ el.appendChild(h('div','st-sub','Choose your direct reports, or anyone you keep an eye on.')); const c=btn('st-act','Choose My People', e=>{ e.stopPropagation(); x && x.pickPeople(); }); el.appendChild(c); meta.go=()=>x && x.pickPeople(); }
    else { const row=h('div','nx-avrow'); const tally={free:0,busy:0,away:0,off:0,unk:0}; ids.forEach(id=>{ const pp=person(id); if(!pp) return; const s2=statusOf(pp); tally[s2.k]=(tally[s2.k]||0)+1; const w=h('span','nx-avw'); w.appendChild(av(id,34)); w.appendChild(h('i','nx-dot '+s2.k)); w.title=pp.name+' · '+s2.t+(s2.s?' '+s2.s:''); row.appendChild(w); }); el.appendChild(row);
      const parts=[]; if(tally.free) parts.push(tally.free+' free'); if(tally.busy) parts.push(tally.busy+' in meetings'); if(tally.away) parts.push(tally.away+' out'); if(tally.off) parts.push(t0.getDay()%6===0?'weekend':tally.off+' off');
      el.appendChild(h('div','st-sub', parts.join(' · ')||'—'));
      if(tall || wide){ const ls=h('div','nx-pl2'+(wide?' two':'')); ids.slice(0,SZ==='b'?8:tall?5:4).forEach(id=>{ const pp=person(id); if(!pp) return; const s2=statusOf(pp); const r=h('div','pr'); r.appendChild(h('i','nx-dot '+s2.k)); r.appendChild(h('b',null,first(id))); r.appendChild(h('span',null,s2.t+(s2.s?' · '+s2.s:''))); r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) open('u:'+id); }); ls.appendChild(r); }); el.appendChild(ls); }
      /* a tall tile: what they're working on, late first */
      if(tall){ const W=S.tasks.filter(t=>isOpen(t) && doers(t).some(d=>ids.indexOf(d)>=0)).sort(byDue).slice(0, SZ==='b'?6:4); if(W.length){ const wl=h('div','nx-kl2'); wl.appendChild(h('small','nx-ftml', cfg.t==='team' ? 'The Team’s Next Work' : 'What They’re On')); W.forEach(t=>{ const r=h('div','kr'+(t.due && days(t.due)<0?' late':'')); r.appendChild(h('b',null, first(doers(t).find(d=>ids.indexOf(d)>=0)))); r.appendChild(h('span',null,t.t)); r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) editTask(t); }); wl.appendChild(r); }); el.appendChild(wl); } }
      const late=S.tasks.filter(t=>isOpen(t) && t.due && days(t.due)<0 && doers(t).some(d=>ids.indexOf(d)>=0)).length; const n=h('div','st-next'); n.appendChild(h('b',null,String(S.tasks.filter(t=>isOpen(t) && doers(t).some(d=>ids.indexOf(d)>=0)).length))); n.append(' open'); if(late){ n.append(' · '); n.appendChild(h('b',null,late+' late')); } el.appendChild(n);
      meta.go=()=>open('people'); } }
  else if(cfg.t==='projects'){ const R=activeRocks().filter(r=>r.lead===me() || S.tasks.some(t=>t.r===r.id && isOpen(t) && doers(t).indexOf(me())>=0));
    if(!R.length) el.appendChild(h('div','st-sub','You’re not on a Team Project right now.'));
    const pc=SZ==='b'?8:tall?6:wide?4:3; R.slice(0,pc).forEach(r=>{ const ts=S.tasks.filter(t=>t.r===r.id), op=ts.filter(isOpen), pct=ts.length?Math.round((ts.length-op.length)/ts.length*100):0; const rw=btn('nx-prj', null, e=>{ e.stopPropagation(); if(!dashEdit) open('p:'+r.id); }); rw.style.setProperty('--rc', rcol(r)); const tp=h('div','tp'); tp.appendChild(h('b',null,r.name)); tp.appendChild(h('span',null,pct+'%')); rw.appendChild(tp); const m=h('div','st-meter'); const f=h('i'); f.style.width=pct+'%'; f.style.background=rcol(r); m.appendChild(f); rw.appendChild(m);
      if(R.length<=3 && (tall || R.length<=2)){ op.slice().sort(byDue).slice(0, tall ? (R.length===1?(SZ==='b'?8:6):2) : wide ? 2 : 1).forEach(t=>{ const q=h('div','pn'); q.appendChild(h('b',null, !t.due ? 'No date' : days(t.due)<0 ? (-days(t.due))+'d late' : fmt(t.due))); q.appendChild(h('span',null, t.t)); q.appendChild(h('em',null, first(doers(t)[0]))); rw.appendChild(q); }); }
      el.appendChild(rw); });
    if(R.length>pc) el.appendChild(h('div','st-next','+'+(R.length-pc)+' more'));
    meta.go=()=>openClassic('rocks'); }
  else if(cfg.t==='keydate'){ const kd=nextKeyDate(); if(!kd){ el.appendChild(h('div','st-sub','No key dates coming up.')); meta.go=()=>openClassic('dates'); }
    else { const n=Math.max(0,days(kd.d)), C=2*Math.PI*44, frac=Math.max(.04, 1-Math.min(n,120)/120); const rg=h('div','ring'); rg.innerHTML='<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/><circle class="rv" cx="50" cy="50" r="44" stroke-dasharray="'+(C*frac).toFixed(1)+' '+C.toFixed(1)+'"/></svg>'; const dv=h('div'); dv.appendChild(h('b',null,String(n))); dv.appendChild(h('small',null,n===1?'day':'days')); rg.appendChild(dv); el.appendChild(rg);
      el.appendChild(h('div','nx-kdt', kd.t)); el.lastChild.appendChild(h('small',null, fmt(kd.d)+(kd.e&&kd.e!==kd.d?' – '+fmt(kd.e):'')));
      if(tall || wide){ const more=(S.dates||[]).filter(d=>d!==kd && d.d && days(d.d)>=0).sort((a,b)=>a.d<b.d?-1:1).slice(0, SZ==='b'?7:tall?5:2); if(more.length){ const ls=h('div','nx-kl2'); more.forEach(d=>{ const r=h('div','kr'); r.appendChild(h('b',null,days(d.d)+'d')); r.appendChild(h('span',null,d.t)); r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit && window.__editDate) window.__editDate(d); }); ls.appendChild(r); }); el.appendChild(ls); } }
      meta.go=()=>openClassic('dates'); } }
  else if(cfg.t==='meeting'){ let md=''; try{ const nm=window.__mtg && window.__mtg.next && window.__mtg.next(); md=typeof nm==='string'?nm:''; }catch(e){}
    if(md){ const n=Math.max(0,days(md)); const cd=h('div','mic-cd'); [[n,n===1?'Day':'Days']].forEach(([v,l])=>{ const sp=h('span'); sp.appendChild(h('b',null,String(v).padStart(2,'0'))); sp.appendChild(h('small',null,l)); cd.appendChild(sp); }); const row=h('div','mic-row'); const ep=h('div','mic-ep'); ep.appendChild(h('b',null, wide ? WDL[pd(md).getDay()]+', '+fmt(md) : fmt(md))); const items=(S.agenda||[]).filter(a=>a.mtg===md && !a.done); ep.appendChild(h('small',null, (wide?'':WDL[pd(md).getDay()]+' · ')+items.length+(items.length===1?' item':' items')+(wide?' on the agenda':''))); { const ip=(S.dates||[]).find(d=>d.d===md && /meeting/i.test(d.k||'') && d.loc); if(ip){ const miss=people().map(p=>p.id).filter(id=>(ip.who||[]).indexOf(id)<0).map(first); var locEl=h('div','mic-loc mic-locw','In person · '+ip.loc+(miss.length ? ' · '+miss.join(', ')+' out' : '')); } } row.appendChild(ep); row.appendChild(cd); el.appendChild(row); if(typeof locEl!=='undefined' && locEl) el.appendChild(locEl);
      if(tall){ const ai=(S.agenda||[]).filter(a=>a.mtg===md && !a.done).slice(0,5); if(ai.length){ const ls=h('div','nx-kl2'); ai.forEach(a=>{ const r=h('div','kr'); r.appendChild(h('b',null,a.kind||'Item')); r.appendChild(h('span',null,a.t)); ls.appendChild(r); }); el.appendChild(ls); } }
      const st2=h('div','mic-steps'); ['Before Business','Team Projects','Around the Room','Good of the Order'].forEach(z=>st2.appendChild(h('span',null,z))); el.appendChild(st2); }
    else el.appendChild(h('div','st-sub','No team meeting on the calendar.'));
    const n2=h('div','st-next'); n2.append('Raise something: '); n2.appendChild(h('b',null,'add it to the agenda')); el.appendChild(n2);
    meta.go=()=>openClassic('agenda'); }
  else if(cfg.t==='wins'){ const W=S.tasks.filter(t=>!isOpen(t)).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0, SZ==='b'?10:tall?9:wide?3:3);
    W.forEach(t=>{ const r=h('div','nx-wn'); const d=doers(t)[0]; if(d) r.appendChild(av(d,22)); const tx=h('span',null,t.t); r.appendChild(tx); el.appendChild(r); }); if(!W.length) el.appendChild(h('div','st-sub','Nothing finished yet.'));
    meta.go=()=>{ ui.showDone=true; save(); open('mine'); }; }
  else if(cfg.t==='board'){ let names=[]; try{ const Lb=(S.nb&&S.nb.pages&&S.nb.pages[0]&&S.nb.pages[0].tabs&&S.nb.pages[0].tabs[0]&&S.nb.pages[0].tabs[0].L)||S.layout||[]; Lb.forEach(r=>(r.r||[]).forEach(c=>names.push(c.t))); }catch(e){}
    const NM={mytasks:'My Tasks',mynote:'My Notes',mtoday:'Meeting Trackers',links:'My Systems',vault:'Locked Note'}; const g=h('div','nx-bgrid'); [...new Set(names)].slice(0,6).forEach(n=>g.appendChild(h('span',null,NM[n]||n.replace(/^./,c=>c.toUpperCase())))); el.appendChild(g);
    el.appendChild(h('div','st-next', 'Your own board — free-form, notebook or rows'));
    meta.go=()=>openClassic('mine'); }
  else if(cfg.t==='findtime'){ const ids=ftIds(cfg); const mins=cfg.mins||30;
    const row=h('div','nx-avrow'); let free=0; ids.forEach(id=>{ const pp=person(id); if(!pp) return; const s2=statusOf(pp); if(s2.k==='free') free++; const w=h('span','nx-avw'); w.appendChild(av(id, tall?34:28)); w.appendChild(h('i','nx-dot '+s2.k)); w.title=pp.name+' · '+s2.t+(s2.s?' '+s2.s:''); row.appendChild(w); });
    if(!dashEdit && SZ!=='s'){ const pk=btn('nx-ftpk', null, e=>{ e.stopPropagation(); ftPick(cfg, L); }); pk.textContent=(cfg.who && cfg.who.length ? 'Change People' : 'Pick People'); pk.title='Pick who this tile finds a time with'; row.appendChild(pk); }
    el.appendChild(row);
    const slot=nextShared([me()].concat(ids), mins);
    const b=h('div','nx-ftv'); b.appendChild(h('small',null, !slot ? 'Next time you’re free together' : slot.n===slot.of ? 'Next time you’re all free' : 'Best time in the next two weeks')); b.appendChild(h('b',null, slot ? WDL[new Date(slot.t).getDay()]+', '+MON[new Date(slot.t).getMonth()]+' '+new Date(slot.t).getDate()+' at '+tmL(slot.t) : 'Calendars aren’t in yet')); if(slot && slot.n<slot.of) b.appendChild(h('span',null, slot.n+' of '+slot.of+' free — not '+slot.out.map(first).join(', ')));
    if(slot && x && x.ACT && x.ACT.on && !dashEdit && SZ!=='s'){ const bk=btn('nx-mini pri nx-ftb','Book It', e=>{ e.stopPropagation(); x.bookDialog({subject:'MISMO Meeting', start:slot.t, mins, who:ids}); }); bk.title='Book this time in Outlook and invite everyone'; b.appendChild(bk); }
    el.appendChild(b);
    /* Tall and Large have room for the next few times too */
    if(tall && slot && slot.n===slot.of){ const more=freeTimes([me()].concat(ids), mins, SZ==='b'?6:4).list.filter(z=>z.t!==slot.t).slice(0, SZ==='b'?4:2);
      if(more.length){ const ls=h('div','nx-kl2 nx-ftmore'); ls.appendChild(h('small','nx-ftml','Also free')); more.forEach(z=>{ const d0=new Date(z.t); const r=h('div','kr'); r.appendChild(h('b',null, WD[d0.getDay()]+' '+MON[d0.getMonth()]+' '+d0.getDate())); r.appendChild(h('span',null, tmL(z.t)+' – '+tmL(z.e))); r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) ftDialog(cfg, L); }); ls.appendChild(r); }); el.appendChild(ls); } }
    el.appendChild(h('div','st-next', free+' of '+ids.length+' free now · tap for more times'));
    meta.go=()=>ftDialog(cfg, L); }
  else if(cfg.t==='systems'){ if(window.__hqSystems) window.__hqSystems.tile(el, SZ); else el.appendChild(h('div','st-sub','Open it to see the map.')); meta.go=()=>open('systems'); }
  else if(cfg.t==='sys'){ meta.draw(el, top, SZ); }
  if(cfg.t!=='sys' && lvlOf(cfg)==='hi' && !tall){ el.classList.add('lv-hi'); el.querySelectorAll('.nx-kl2:not(.nx-ftmore),.nx-tl2,.nx-gaps,.mic-steps').forEach(z=>z.remove()); }
  el.addEventListener('click', e=>{ if(dashEdit || e.target.closest('button:not(.st-tile)')) return; go(); });
  el.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target===el && !dashEdit){ e.preventDefault(); go(); } });
  return el;
}
/* ---------- system tiles: a Team HQ version of a system's page ----------
   The headline numbers, gauges and section counts are read from the page in the background
   (x.wantData) and drawn here in Team HQ's own style. High Level shows the few that matter;
   Detailed shows more. The person can choose exactly which ones in Settings. */
const lvlOf=cfg=>cfg.lvl || ((cfg.t==='sys' || cfg.t==='keydate') ? 'hi' : 'det');
function gaugeEl(g, big){ const p=Math.max(0, +g.p||0), C=2*Math.PI*40, f=Math.min(p,100)/100; const w=h('div','nx-gg'+(big?' big':'')+(p>=100?' full':''));
  w.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="tr" cx="50" cy="50" r="40"/><circle class="pg" cx="50" cy="50" r="40" stroke-dasharray="'+(C*f).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 50 50)"/></svg>';
  const c=h('div','c'); c.appendChild(h('b',null,(Math.round(p*10)/10)+'%')); w.appendChild(c);
  const l=h('div','l'); l.appendChild(h('span',null,g.n)); if(g.v) l.appendChild(h('small',null, big && g.b ? g.v+' of '+g.b : g.v)); w.appendChild(l); w.title=g.n+': '+p+'%'+(g.v?' — '+g.v:'')+(g.b?' of '+g.b+' budget':''); return w; }
function figEl(f, big){ const w=h('div','nx-fg'+(big?' big':'')+(f.tone?' '+f.tone:'')+(String(f.v||'').length>6?' long':'')); w.appendChild(h('b',null,f.v)); w.appendChild(h('span',null,f.n)); if(f.s && big) w.appendChild(h('small',null,f.s)); return w; }
/* the page's own tiles, drawn the Team HQ way: one per Team HQ tile, picked in Settings */
const goodCard=c=>c && !/^(\d+\s+to\s+\w+|up to date|all caught up|caught up|nothing today)$/i.test(c.t||'') && (c.big || (c.rows && c.rows.length) || c.text);
function pickCard(cfg, d){ if(!d || !Array.isArray(d.cards) || !d.cards.length) return null;
  if(cfg.card==='#num') return null;
  if(cfg.card){ return d.cards.find(c=>c.t===cfg.card) || null; }
  /* first time on a page: its headline numbers when it has gauges or no tiles of its own, otherwise its first real tile */
  if(d.gauges.length) return null;
  if(d.figs.length>=3 && d.cards.some(c=>/^at a glance$/i.test(c.t||'') && c.text)) return null;
  const real=d.cards.filter(c=>!c.fig && c.t!=='Today');
  const rich=real.find(c=>!c.tbl && c.big && ((c.rows && c.rows.length) || c.meter!=null)); if(rich) return rich;
  if(d.figs.length>=3) return null;
  const tbl=real.find(c=>c.tbl); if(tbl) return tbl;
  const withBig=real.find(c=>c.big); if(withBig) return withBig;
  if(d.figs.length) return null;
  return d.cards.find(c=>goodCard(c) && (c.big || (c.rows && c.rows.length) || (c.meter!=null && isFinite(c.meter)) || c.pill || /^(today|this week|the week ahead)$/i.test(c.t||''))) || null; }
/* ---------- Meeting Trackers' day, drawn as a day: a calendar leaf, the meetings in time order
   with a live "On Now / in 20 min" beside each, and on a quiet day who meets next ---------- */
const ETF=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York', weekday:'long', month:'long', day:'numeric', hour:'numeric', minute:'2-digit', hourCycle:'h23'});
function etNowParts(){ const o={}; ETF.formatToParts(new Date()).forEach(p=>o[p.type]=p.value); return {label:o.weekday+', '+o.month+' '+o.day, mins:(+o.hour%24)*60+(+o.minute)}; }
function mtSpan(t){ const m=/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[–\-]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(String(t||'').trim()); if(!m) return null;
  const ap2=m[6].toUpperCase(), ap1=(m[3]||ap2).toUpperCase(); const cv=(hh,mi,ap)=>{ hh=+hh%12; if(ap==='PM') hh+=12; return hh*60+(+mi||0); };
  let a=cv(m[1],m[2],ap1); const b=cv(m[4],m[5],ap2); if(!m[3] && a>b) a-=720; return [a,b]; }
function mtStatus(r, mins){ const a=+r.dataset.a, b=+r.dataset.b; if(!isFinite(a) || !isFinite(b) || r.dataset.today!=='1') return null;
  if(r.classList.contains('x')) return {k:'x', t:'Cancelled'};
  if(mins>=b) return {k:'done', t:'Done'}; if(mins>=a) return {k:'now', t:'On Now'};
  const dd=a-mins; return dd<=90 ? {k:'soon', t:dd<=1?'Starting':'in '+(dd>=60 ? Math.floor(dd/60)+'h'+(dd%60?' '+dd%60+'m':'') : dd+' min')} : {k:'later', t:''}; }
function mtTick(){ const n=etNowParts(); document.querySelectorAll('.mtd-r[data-a]').forEach(r=>{ const st=mtStatus(r, n.mins); if(!st) return; r.classList.toggle('now', st.k==='now'); r.classList.toggle('done', st.k==='done'); const sp=r.querySelector('.st'); if(sp){ sp.textContent=st.t; sp.hidden=!st.t; } });
  document.querySelectorAll('.mtd').forEach(w=>{ const on=w.querySelectorAll('.mtd-r.now').length, pill=w.closest('.st-tile') && w.closest('.st-tile').querySelector('.st-pill'); if(pill){ pill.textContent=on ? 'On Now' : 'Today'; pill.classList.toggle('live', !!on); } }); }
let mtTimer=0;
const mtShortDay=s=>{ const m=/^(\w{3})\w*,\s+(\w{3})\w*\s+(\d+)/.exec(s||''); return m ? m[1]+', '+m[2]+' '+m[3] : s; };
const mtInit=n=>{ const w=String(n).replace(/[^A-Za-z0-9 ]/g,' ').split(/\s+/).filter(Boolean); return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase(); };
function mtDay(el, top, c, SZ, s, cfg, d){
  if(s.k!=='meeting-trackers' && !c.mt) return false;
  let mtg=Array.isArray(c.mtg) ? c.mtg : [], nxt=c.nxt || null;
  if(!c.mt){ const m=/^No workgroup meetings today\.\s*Next up\s+(.+?)\s+—\s+(\d+)\s+meetings?:\s*(.+)$/i.exec(c.text||'');
    if(m) nxt={day:m[1], n:+m[2], names:m[3].replace(/\s+and\s+\d+\s+more\s*$/,'').split(/,\s*/)};
    else if(!/^No workgroup meetings/i.test(c.text||'')) return false; }
  const now=etNowParts(), isToday=!c.head || c.head===now.label;
  const small=SZ==='s', cap=small?0:SZ==='b'?8:SZ==='t'?6:3;
  const pill=h('span','st-pill','Today'); top.appendChild(pill);
  const w=h('div','mtd'+(small?' sm':''));
  const dm=/^(\w+),\s+(\w+)\s+(\d+)/.exec(c.head||now.label) || [];
  const cal=h('div','mtd-cal'); cal.appendChild(h('i',null,(dm[2]||'').slice(0,3).toUpperCase())); cal.appendChild(h('b',null,dm[3]||'')); cal.appendChild(h('small',null,(dm[1]||'').slice(0,3).toUpperCase())); w.appendChild(cal);
  const mn=h('div','mtd-m'); w.appendChild(mn);
  const live=mtg.filter(x=>!x.x);
  if(mtg.length){
    mn.appendChild(h('div','mtd-h', mtg.length+' meeting'+(mtg.length===1?'':'s')+(isToday?' today':' on '+mtShortDay(c.head))));
    const sub=h('div','mtd-s'); mn.appendChild(sub);
    const ls=h('div','mtd-ls'); let firstUp=null;
    mtg.forEach((x,i)=>{ const sp=mtSpan(x.tm); const r=h('div','mtd-r'+(x.x?' x':'')); if(sp){ r.dataset.a=sp[0]; r.dataset.b=sp[1]; } r.dataset.today=isToday?'1':'0';
      r.appendChild(h('span','tm', x.tm || '—')); r.appendChild(h('span','nm', x.n)); const st=h('span','st'); st.hidden=true; r.appendChild(st);
      const ss=mtStatus(r, now.mins); if(ss){ r.classList.toggle('now', ss.k==='now'); r.classList.toggle('done', ss.k==='done'); st.textContent=ss.t; st.hidden=!ss.t; if(!firstUp && (ss.k==='soon'||ss.k==='later')) firstUp=x; }
      ls.appendChild(r); });
    /* the rows that matter now: from the first one not yet over, with a finished one above it when there is room */
    const rows=[...ls.children], fnd=rows.findIndex(r=>!r.classList.contains('done') && !r.classList.contains('x')), st0=Math.max(0, Math.min(fnd<0?rows.length:fnd, rows.length-cap));
    rows.forEach((r,i)=>{ r.hidden=!(i>=st0 && i<st0+cap); });
    const later=Math.max(0, rows.length-st0-cap), earlier=st0;
    const onN=ls.querySelectorAll('.mtd-r.now').length;
    sub.innerHTML=''; if(onN){ sub.appendChild(h('b',null,onN+' on now')); sub.append(firstUp ? ' · next at '+String(firstUp.tm).replace(/[–\-].*$/,'') : ''); }
    else if(firstUp) sub.append('Next at '+String(firstUp.tm).replace(/[–\-].*$/,'')+' · '+firstUp.n);
    else sub.append(live.length ? 'All done for today' : 'All cancelled today');
    if(onN){ pill.textContent='On Now'; pill.classList.add('live'); }
    if(cap){ if(later || earlier){ const mo=h('div','mtd-more',[later ? '+'+later+' more later' : '', earlier ? earlier+' earlier' : ''].filter(Boolean).join(' \u00b7 ')); ls.appendChild(mo); } mn.appendChild(ls); }
  } else {
    mn.appendChild(h('div','mtd-h','No meetings today'));
    if(nxt){ const tm=new Date(Date.now()+864e5), tmo=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York', weekday:'long', month:'long', day:'numeric'}).format(tm).replace(/^(\w+)\s/,'$1, ');
      const sub=h('div','mtd-s'); sub.append('Next up '); sub.appendChild(h('b',null, nxt.day===tmo ? 'tomorrow' : mtShortDay(nxt.day))); sub.append(' · '+nxt.n+' meeting'+(nxt.n===1?'':'s')); mn.appendChild(sub);
      if(cap && nxt.names && nxt.names.length){ const cp=h('div','mtd-chips'); nxt.names.slice(0,cap).forEach(n=>{ const ch=h('span','mtd-chip'); ch.title=n; ch.appendChild(h('i',null,mtInit(n))); ch.appendChild(h('span',null,n)); cp.appendChild(ch); }); if(nxt.n>Math.min(cap,nxt.names.length)) cp.appendChild(h('span','mtd-chip more','+'+(nxt.n-Math.min(cap,nxt.names.length)))); mn.appendChild(cp); } }
    else mn.appendChild(h('div','mtd-s','Nothing scheduled in the next two weeks'));
  }
  el.appendChild(w);
  const nt=h('div','st-next'); nt.append((X().SHORT[s.k]||s.n)+(d && d.at ? ' · '+X().ago(d.at) : '')); nt.appendChild(h('b','opn', opnTxt(cfg))); el.appendChild(nt);
  if(!mtTimer) mtTimer=setInterval(mtTick, 30000);
  return true; }
/* ---------- MMS home, drawn as a pipeline: how many are live, where they sit, and what needs a hand ---------- */
const MMS_STAGE={'Building':'#A78BFA','In Review':'#74bfeb','Review':'#74bfeb','Comment':'#f5b85a','Publishing':'#5fd3a0','Governance':'#f08ca8'};
function mmsHome(el, top, SZ, s, cfg, d){
  if(s.k!=='mms' || cfg.go || cfg.sec || (cfg.card && cfg.card!=='#mms') || !d || !Array.isArray(d.cards)) return false;
  const C=t=>d.cards.find(c=>c.t===t); const N=t=>{ const c=C(t); const v=c && parseInt(String(c.big||'').replace(/[^\d]/g,''),10); return isFinite(v) ? v : null; };
  const wc=d.cards.find(c=>/^Where the \d+/i.test(c.t||'')); const live=N('Live Work') ?? (wc ? +(/\d+/.exec(wc.t)||[0])[0] : null);
  if(live==null) return false;
  const st=[]; if(wc && wc.text){ const re=/([A-Za-z][A-Za-z ]*?)\s+(\d+)(?=\s|$)/g; let m; while((m=re.exec(wc.text))) st.push({n:m[1].trim(), v:+m[2]}); }
  const small=SZ==='s'||SZ==='w', wide=SZ==='w'||SZ==='b', tall=SZ==='t'||SZ==='b';   /* a wide tile is a small one with what's on your plate beside it */
  const go=(page)=>e=>{ e.stopPropagation(); if(!dashEdit) openSystem(s.k, page, '', cfg); };
  const mine=N('Your Move')||0, late=N('Past Target')||0, soon=N('Closing in 7 Days')||0, moved=N('Moved This Week')||0, gov=N('With Governance')||0, pub=N('Published');
  top.firstChild.textContent='MMS';
  if(mine){ const p=h('span','st-pill mms-you', mine+' your move'); p.addEventListener('click', go('My Queue')); top.appendChild(p); }
  const w=h('div','mms'+(small?' sm':'')+(wide?' wd':'')+(tall?' tl':'')); el.appendChild(w);
  const L=h('div','mms-l'); w.appendChild(L); const Rc=wide ? h('div','mms-r') : null; if(Rc) w.appendChild(Rc);
  const b=h('div','st-big'); b.append(String(live)); b.appendChild(h('small',null,'live work')); L.appendChild(b);
  if(moved && !small) L.appendChild(h('div','mms-mv', '+'+moved+' moved this week'));
  if(st.length){ const tot=st.reduce((a,z)=>a+z.v,0)||1; const bar=h('div','mms-bar'); st.forEach(z=>{ if(!z.v) return; const i=h('i'); i.style.flex=String(z.v); i.style.background=MMS_STAGE[z.n]||'#9fb3c8'; i.title=z.v+' '+z.n; bar.appendChild(i); }); L.appendChild(bar);
    const lg=h('div','mms-lg'); st.forEach(z=>{ const r=h('span'); const dt=h('i'); dt.style.background=MMS_STAGE[z.n]||'#9fb3c8'; r.appendChild(dt); r.appendChild(h('b',null,String(z.v))); r.append(' '+z.n.replace(/^In /,'')); lg.appendChild(r); }); L.appendChild(lg); }
  /* what needs a hand, worst first */
  const A=[]; if(late) A.push({v:late, t:small?'late':'past target', k:'bad', p:'All Work'}); if(soon) A.push({v:soon, t:small?'due soon':'closing in 7 days', k:'warn', p:'All Work'});
  if(gov && !small) A.push({v:gov, t:'with Governance', k:'', p:'Governance'}); if(pub!=null && tall) A.push({v:pub, t:'published', k:'ok', p:'All Work'});
  if(A.length){ const R=h('div','mms-a'); (small ? A.slice(0,2) : A).forEach(a=>{ const r=h('div','mms-ar'+(a.k?' '+a.k:'')); r.appendChild(h('b',null,String(a.v))); r.appendChild(h('span',null,a.t)); r.addEventListener('click', go(a.p)); R.appendChild(r); }); (small || !Rc ? L : Rc).appendChild(R); }
  /* the one on your plate */
  const pl=C('On Your Plate'); if(pl && pl.text && (tall || SZ==='w')){ const t=String(pl.text).trim(); const id=/^(WR\d{4}_\d+)\s+/.exec(t); let rest=id ? t.slice(id[0].length) : t;
    const am=/\s+((?:Approve|Review|Sign|Confirm|Assign|Respond|Publish|Vote|Decide|Set|Pick|Schedule|Send|Submit|Close|Check|Finish|Start|Answer|Name|Choose)\b.*)$/.exec(rest); const act=am ? am[1] : ''; if(am) rest=rest.slice(0, am.index);
    const P=h('div','mms-pl'); P.appendChild(h('em',null,'On your plate')); const tt=h('b',null,rest); P.appendChild(tt); if(act) P.appendChild(h('small',null,(id?id[1]+' · ':'')+act)); else if(id) P.appendChild(h('small',null,id[1]));
    P.addEventListener('click', go('My Queue')); if(SZ==='w') Rc.insertBefore(P, Rc.firstChild); else el.appendChild(P); }
  const nt=h('div','st-next'); nt.append('MMS'+(d.at ? ' · '+X().ago(d.at) : '')); nt.appendChild(h('b','opn', opnTxt(cfg))); el.appendChild(nt);
  return true; }
function drawCard(el, top, c, SZ, lvl, s, cfg, d){ const x=X(), det=lvl==='det', small=SZ==='s', tall=SZ==='t'||SZ==='b';
  if(c.k && /^(#|rgb|hsl|var)/.test(c.k)) el.style.setProperty('--k', c.k);
  /* a page's day strip ("Today · Sunday, November 1 · No workgroup meetings today…") keeps the system's name on top */
  const dayStrip=/^(today|this week|the week ahead)$/i.test(c.t);
  if(dayStrip && mtDay(el, top, c, SZ, s, cfg, d)) return;
  if(dayStrip){ top.appendChild(h('span','st-pill', c.t)); if(c.head) el.appendChild(h('div','nx-chd', c.head)); if(c.text) el.appendChild(h('div','nx-ctx nx-day', c.text)); const nt=h('div','st-next'); nt.append((x.SHORT[s.k]||s.n)+(cfg.go?' · '+cfg.go:'')+(d && d.at ? ' · '+x.ago(d.at) : '')); nt.appendChild(h('b','opn', opnTxt(cfg))); el.appendChild(nt); return; }
  top.firstChild.textContent=c.t; if(String(c.t||'').length<=14 || SZ==='w' || SZ==='b'){ const ti=h('span','nx-tsym'); ti.innerHTML=x.symbol(s.k); top.appendChild(ti); }
  if(c.pill) top.appendChild(h('span','st-pill'+(c.hot?' hot':''), c.pill));
  if(c.big){ const b=h('div','st-big'); b.append(c.big); if(c.unit) b.appendChild(h('small',null,c.unit)); el.appendChild(b); }
  else if(c.head){ el.appendChild(h('div','nx-chd', c.head)); }
  if(c.meter!=null && isFinite(c.meter)){ const m=h('div','st-meter'); const f=h('i'); f.style.width=Math.max(0,Math.min(100,c.meter))+'%'; m.appendChild(f); el.appendChild(m); }
  if(c.sub && !small) el.appendChild(h('div','st-sub', c.sub));
  if(c.text && !c.big && !small) el.appendChild(h('div','nx-ctx', c.text));
  if(c.groups && c.groups.length && !small){ const g=h('div','nx-cgrp'); c.groups.slice(0, det||tall?5:3).forEach(([k,n])=>{ const sp=h('span'); sp.appendChild(h('b',null,String(n))); sp.append(k); g.appendChild(sp); }); el.appendChild(g); }
  if(c.total && !small && !(c.sub && c.sub.indexOf(c.total)>=0)) el.appendChild(h('div','st-sub', 'Total '+c.total));
  if(c.rows && c.rows.length && !small && (det || tall)){ const ls=h('div','nx-crows'); c.rows.slice(0, SZ==='b'?6:tall?5:3).forEach(r=>{ const row=h('div','cr'); row.appendChild(h('b',null,r[0])); if(r.length>2){ row.appendChild(h('i',null,r[1])); row.appendChild(h('em',null,r[2])); } else if(r[1]){ /^\d/.test(r[1]) || /days?|ago|late|due/i.test(r[1]) ? row.appendChild(h('em',null,r[1])) : row.appendChild(h('i',null,r[1])); } ls.appendChild(row); }); el.appendChild(ls); }
  const nt=h('div','st-next'); nt.append((x.SHORT[s.k]||s.n)+(cfg.go?' · '+cfg.go:'')+(d && d.at ? ' · '+x.ago(d.at) : '')); nt.appendChild(h('b','opn', opnTxt(cfg))); el.appendChild(nt); }
function sysMeta(cfg){ const x=X(); const s=x && x.SYS.find(z=>z.k===cfg.s); if(!s) return null;
  const meta={n:s.n, lab:(x.SHORT[s.k]||s.n), k:s.c};
  meta.draw=(el, top, SZ)=>{
    const lvl=lvlOf(cfg), det=lvl==='det';
    if(x.wantData) x.wantData(s.k, cfg.go||'');
    const d=x.sysData ? x.sysData(s.k, cfg.go||'') : null;
    if(mmsHome(el, top, SZ, s, cfg, d)) return;
    const card=pickCard(cfg, d);
    if(card && !cfg.sec){ drawCard(el, top, card, SZ, lvl, s, cfg, d); return; }
    const cs=cfg.go && cfg.sec ? x.countFor(s.k, cfg.go, cfg.sec) : null; const c0=cs || (cfg.go && x.countFor(s.k, cfg.go)); const c=cs ? cs : (c0 && c0.n>0 ? c0 : null);
    let F=d ? d.figs.slice() : [], G=d ? d.gauges.slice() : [];
    if(Array.isArray(cfg.pick) && cfg.pick.length){ F=F.filter(f=>cfg.pick.indexOf('f:'+f.n)>=0); G=G.filter(g=>cfg.pick.indexOf('g:'+g.n)>=0); }
    if(d && !F.length && !G.length && !(Array.isArray(cfg.pick) && cfg.pick.length)){ /* a page with no headline numbers: use the counts on the system's own menu instead */
      F=x.navOf(s.k).map(n=>({n, c:x.countFor(s.k,n)})).filter(z=>z.c && z.c.n>0 && z.n!==cfg.go).map(z=>({n:z.n, v:String(z.c.n), s:'', tone:''})); }
    const small=SZ==='s', wide=SZ==='w'||SZ==='b', tall=SZ==='t'||SZ==='b';
    const isZero=f=>/^[−\-]?[$€£]?0+(\.0+)?%?$/.test(String(f.v||'').trim());
    if(F.length>1 && isZero(F[0])){ const k=F.findIndex(f=>!isZero(f)); if(k>0) F.unshift(F.splice(k,1)[0]); }
    const nF=small ? 1 : det ? (SZ==='b'?6:wide?4:tall?5:2) : (SZ==='b'?4:wide?3:tall?4:1), nG=small ? 0 : det ? (SZ==='b'?6:wide?4:tall?4:2) : (SZ==='b'?3:wide?3:tall?2:0);
    /* the app's mark sits small beside its name, so the numbers get the room (November 5, 2026) */
    if(wide || String(x.SHORT[s.k]||s.n).length<=14){ const ti=h('span','nx-tsym'); ti.innerHTML=x.symbol(s.k); top.appendChild(ti); }
    const head=h('div','nx-sysh');
    const lead=h('div','nx-syl'); let dirL=null;
    if(c && !(cfg.go && !cfg.sec && F.length)){ const b=h('div','st-big'); b.append(String(c.n)); b.appendChild(h('small',null, cfg.sec ? (c.n===1?'item':'items') : cfg.go)); lead.appendChild(b); if(cfg.sec && c.x) lead.appendChild(h('div','st-sub', c.x)); }
    else if(F.length){ lead.appendChild(figEl(F[0], true)); F=F.slice(1); }
    else if(G.length && small){ lead.appendChild(gaugeEl(G[0], false)); }
    else if(!d){ el.classList.add('nx-filling'); const sk=h('div','nx-skel'); sk.appendChild(h('i','a')); sk.appendChild(h('i','b')); sk.appendChild(h('i','c')); lead.appendChild(sk); }
    else if(d.empty){ lead.appendChild(h('div','nx-chd', s.d || (x.SHORT[s.k]||s.n))); lead.appendChild(h('div','st-sub', 'Open it to see what’s new.')); }
    else { const cs0=d.cards||[], intro=cs0[0] && cs0[0].head ? cs0[0] : null;
      dirL=cs0.filter(c=>c!==intro && !c.mt && !c.big && !c.tbl && !c.fig && c.t && c.t.length<=40 && !/^(today|this week|at a glance)$/i.test(c.t));
      if(dirL.length>=2){ const b=h('div','st-big'); b.append(String(dirL.length)); b.appendChild(h('small',null, intro ? intro.t : 'on '+(cfg.go||'the page'))); lead.appendChild(b); }
      else { dirL=null; lead.appendChild(h('div','st-sub', (intro && (intro.text||intro.sub)) || s.d)); } }
    head.appendChild(lead); el.appendChild(head);
    if(dirL){ if(small || SZ==='w') el.appendChild(h('div','nx-glance'+(small?' sm':''), dirL.map(c=>c.t).join(' · ')));
      else { const ls=h('div','nx-kl2 nx-dir'); dirL.slice(0, SZ==='b'?10:7).forEach(c=>{ const r=h('div','kr'); r.appendChild(h('b',null,c.t)); if(c.sub||c.text) r.appendChild(h('span',null,c.sub||c.text)); r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) openSystem(s.k, cfg.go||'', '', cfg); }); ls.appendChild(r); }); el.appendChild(ls); } }
    const pg=cfg.sec || cfg.go || '';
    if(pg && !wide){ top.firstChild.textContent=pg; const ti=top.querySelector('.nx-tsym'); if(ti && pg.length>14) ti.remove(); }
    else if(pg && lead.textContent.toLowerCase().indexOf(pg.toLowerCase())<0) top.appendChild(h('span','st-pill', pg));
    /* the page's own one-line summary ("10 things need you, 2 overdue; start with …") says what the number means */
    { const gl=d && (d.cards||[]).find(c=>/^at a glance$/i.test(c.t||'') && c.text); if(gl && !(Array.isArray(cfg.pick) && cfg.pick.length)){ const g=h('div','nx-glance'+(small?' sm':''), String(gl.text).replace(/\s+([;,.])/g,'$1').replace(/\s+/g,' ').trim()); el.appendChild(g); } }
    const leadT=lead.textContent.toLowerCase(); const said=t=>!!t && leadT.indexOf(String(t).toLowerCase())>=0;
    { const seen=new Set(); F=F.filter(f=>{ const k=String(f.n||'').toLowerCase(); if(seen.has(k) || said(f.n)) return false; seen.add(k); return true; }); }
    if(!small){
      F=F.filter(f=>!isZero(f));
      const fr=F.slice(0, Math.max(0, SZ==='w' ? Math.min(nF-1, 2) : nF-1)); if(fr.length){ const row=h('div','nx-fgr'); fr.forEach(f=>row.appendChild(figEl(f, det))); if(SZ==='w'){ row.classList.add('side'); head.appendChild(row); } else el.appendChild(row); }
      const gr=G.slice(0, nG); if(gr.length){ const row=h('div','nx-ggr'); gr.forEach(g=>row.appendChild(gaugeEl(g, det && gr.length<=3))); el.appendChild(row); }
      /* the page's own highlight tiles under the numbers ("MISMO Matters · November · 0 of 13 approved") */
      if(d && !(Array.isArray(cfg.pick) && cfg.pick.length)){ const nH=det ? (SZ==='b'?4:wide||tall?2:1) : (SZ==='b'?2:wide||tall?1:0);
        const shownN=new Set(d.figs.map(f=>f.n).concat(d.gauges.map(g=>g.n)));
        const HL=(d.cards||[]).filter(c=>goodCard(c) && !shownN.has(c.t) && !said(c.t) && !said(c.pill) && !said(c.head) && !c.fig && !c.tbl && c.t!=='Today' && !/^(at a glance|today|this week)$/i.test(c.t) && (c.meter!=null || c.pill || c.big || c.head) && (c.sub || c.text || c.big)).slice(0, nH);
        if(HL.length){ const ls=h('div','nx-hlg'); HL.forEach(c=>{ const r=h('div','hl'); if(c.k && /^(#|rgb|hsl)/.test(c.k)) r.style.setProperty('--hk', c.k);
          const t1=h('div','t'); t1.appendChild(h('b',null,c.t)); const tag=c.big ? c.big+(c.unit?' '+c.unit:'') : (c.pill || c.head || ''); if(tag) t1.appendChild(h('em',null,tag)); r.appendChild(t1);
          if(c.meter!=null && isFinite(c.meter)){ const m=h('div','st-meter'); const f=h('i'); f.style.width=Math.max(0,Math.min(100,c.meter))+'%'; m.appendChild(f); r.appendChild(m); }
          const ln=c.sub || c.text; if(ln) r.appendChild(h('small',null,ln));
          r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) openSystem(s.k, cfg.go||'', '', cfg); }); ls.appendChild(r); }); el.appendChild(ls); } }
      /* a tall tile with room left: the page's own list, from today on ("The Weekly Run · Fri, Nov 6 · S2 Ep 1") */
      if(tall && d && Array.isArray(d.cards)){ const real=r=>r && r.length>1 && r[1] && r[1]!=='·';
        const tb=d.cards.find(c=>c.tbl && Array.isArray(c.rows) && c.rows.filter(real).length>=2);
        if(tb){ const t00=new Date(); t00.setHours(0,0,0,0); const yr=t00.getFullYear();
          let rows=tb.rows.filter(real).filter(r=>{ const p=Date.parse(String(r[0]).replace(/^\w{3},\s*/,'')+' '+yr); return isNaN(p) || /\d{4}/.test(r[0]) || p>=+t00 || (+t00-p)>200*864e5; });
          if(rows.length){ const ls=h('div','nx-kl2 nx-tbl'); ls.appendChild(h('small','nx-ftml', tb.t)); rows.slice(0, SZ==='b'?6:4).forEach(r=>{ const kr=h('div','kr'); kr.appendChild(h('b',null,String(r[0]))); kr.appendChild(h('span',null,r.slice(1).filter(z=>z && z!=='·').join(' · '))); kr.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) openSystem(s.k, cfg.go||'', '', cfg); }); ls.appendChild(kr); }); el.appendChild(ls); } } }
      if(tall && !det && !(Array.isArray(cfg.pick) && cfg.pick.length)){ const usedN=new Set(F.map(f=>f.n)); const nv=x.navOf(s.k).map(n=>({n, c:x.countFor(s.k,n)})).filter(z=>z.c && z.c.n>0 && z.n!==cfg.go && !usedN.has(z.n) && !said(z.n) && !F.some(f=>String(f.v)===String(z.c.n) && said(f.n))).slice(0, SZ==='b'?6:4);
        if(nv.length){ const ls=h('div','nx-kl2 nx-navc'); ls.appendChild(h('small','nx-ftml','In '+(x.SHORT[s.k]||s.n))); nv.forEach(z=>{ const r=h('div','kr'); r.appendChild(h('b',null,String(z.c.n))); r.appendChild(h('span',null,z.n)); r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) openSystem(s.k, z.n, '', cfg); }); ls.appendChild(r); }); el.appendChild(ls); } }
      if(det && d && d.secs){ const sl=Object.keys(d.secs).filter(n=>n!==cfg.sec && d.secs[n].n>0).slice(0, SZ==='b'?6:4); if(sl.length){ const ls=h('div','nx-kl2'); sl.forEach(n=>{ const r=h('div','kr'); r.appendChild(h('b',null,String(d.secs[n].n))); r.appendChild(h('span',null,n)); r.addEventListener('click', e=>{ e.stopPropagation(); if(!dashEdit) openSystem(s.k, cfg.go, n, cfg); }); ls.appendChild(r); }); el.appendChild(ls); } } }
    const nt=h('div','st-next'); nt.append((x.SHORT[s.k]||s.n)+(cfg.go && wide?' · '+cfg.go:'')+(d ? ' · '+x.ago(d.at) : c ? ' · checked '+x.ago(c.at) : '')); nt.appendChild(h('b','opn', opnTxt(cfg))); el.appendChild(nt);
  };
  meta.go=()=>openSystem(s.k, cfg.go||'', cfg.sec||'', cfg);
  return meta; }
function sysSettings(cfg, anchor){ const x=X(); const s=x.SYS.find(z=>z.k===cfg.s); let changed=false; popMenu(anchor, sysItems(cfg, paint, ()=>{ changed=true; }), (x.SHORT[s.k]||s.n)); if(menuEl){ menuEl.classList.add('tall'); menuEl._onClose=()=>{ if(changed) paint(); }; } }
function sysItems(cfg, done, later){ const x=X(); const s=x.SYS.find(z=>z.k===cfg.s); const items=[];
  const nav=x.navOf(s.k); if(nav.length){ items.push({node:h('div','nx-ml','Show This Page')}); items.push({label:'Its Home Page', on:!cfg.go, fn:()=>{ cfg.go=''; cfg.sec=''; cfg.pick=[]; cfg.card=''; done(); }}); nav.forEach(n=>{ const cn=x.countFor(s.k,n); items.push({label:n, hint:cn && cn.n>0 ? String(cn.n) : '', on:cfg.go===n && !cfg.sec, fn:()=>{ cfg.go=n; cfg.sec=''; cfg.pick=[]; cfg.card=''; done(); }}); }); }
  else items.push({node:h('div','nx-ml','Open '+(x.SHORT[s.k]||s.n)+' once and its pages show up here to pick from')});
  const d=x.sysData(s.k, cfg.go||''); const pk=Array.isArray(cfg.pick) ? cfg.pick : [];
  const cards=d && Array.isArray(d.cards) ? d.cards.filter(goodCard) : []; const curCard=pickCard(cfg, d);
  if(cards.length){ items.push({node:h('div','nx-ml','What to Show')}); items.push({label:'Headline Numbers and Gauges', on:!curCard, fn:()=>{ cfg.card='#num'; done(); }}); cards.forEach(c=>items.push({label:c.t, hint:c.big ? c.big+(c.unit?' '+c.unit:'') : c.pill||'', on:curCard===c, fn:()=>{ cfg.card=c.t; cfg.sec=''; done(); }})); }
  const tog=key=>{ const L=(Array.isArray(cfg.pick) ? cfg.pick : []).slice(); const i=L.indexOf(key); if(i>=0) L.splice(i,1); else L.push(key); cfg.pick=L; later(); };
  if(d && !curCard && (d.figs.length || d.gauges.length)){ items.push({node:h('div','nx-ml','Numbers to Show'+(pk.length?'':' (all, in order)'))});
    d.figs.forEach(f=>items.push({label:f.n, hint:f.v, keep:true, on:pk.indexOf('f:'+f.n)>=0, isOn:()=>(cfg.pick||[]).indexOf('f:'+f.n)>=0, fn:()=>tog('f:'+f.n)}));
    d.gauges.forEach(g=>items.push({label:g.n+' Gauge', hint:g.p+'%', keep:true, on:pk.indexOf('g:'+g.n)>=0, isOn:()=>(cfg.pick||[]).indexOf('g:'+g.n)>=0, fn:()=>tog('g:'+g.n)}));
    if(pk.length) items.push({label:'Show All of Them Again', fn:()=>{ cfg.pick=[]; done(); }}); }
  const secs=d && d.secs ? Object.keys(d.secs) : (cfg.go ? x.secsOf(s.k, cfg.go).map(z=>z.n) : []);
  if(cfg.go && secs.length){ items.push({node:h('div','nx-ml','Or Count One Section')}); items.push({label:'None — Show the Numbers', on:!cfg.sec, fn:()=>{ cfg.sec=''; done(); }}); secs.forEach(n=>{ const cc=x.countFor(s.k, cfg.go, n) || (d && d.secs[n]); items.push({label:n, hint:cc?String(cc.n):'', on:cfg.sec===n, fn:()=>{ cfg.sec=n; done(); }}); }); }
  return items; }
function openCatalog(){
  const x=X(); if(!dashEdit) dashEdit=dashLayout();
  const ov=h('div','hqx-ov'); const box=h('div','hqx-box nx-cat'); box.setAttribute('role','dialog'); box.setAttribute('aria-label','Add a Tile');
  box.appendChild(h('h2',null,'Add a Tile')); box.appendChild(h('p',null,'Pick what you want to see. Systems open right here in Team HQ when you click them.'));
  const close=()=>ov.remove();
  const sec=(t)=>box.appendChild(h('div','nx-sec',t));
  const card=(name, desc, k, symHtml, fn, on)=>{ const b=btn('nx-cti'+(on?' on':'')); b.style.setProperty('--k',k); const i=h('span','ci'); i.innerHTML=symHtml; b.appendChild(i); const t=h('span','tx'); t.appendChild(h('b',null,name)); t.appendChild(h('small',null,desc)); b.appendChild(t); b.appendChild(h('em',null,on?'On':'Add')); b.addEventListener('click', ()=>{ fn(); b.classList.add('on'); b.querySelector('em').textContent='Added'; }); return b; };
  ['Your Day','Team'].forEach(g=>{ sec(g); const gr=h('div','nx-ctg'); Object.keys(TILES).filter(k=>TILES[k].g===g).forEach(k=>{ const on=dashEdit.some(z=>z.t===k); gr.appendChild(card(TILES[k].n, TILES[k].d, TILES[k].k, ic(k==='email'?'mail':k==='people'||k==='team'?'ppl':k==='day'||k==='load'?'cal':k==='tasks'?'mine':k==='board'?'all':k==='asks'?'inbox':k==='findtime'?'search':k==='systems'?'net':'week'), ()=>{ if(!dashEdit.some(z=>z.t===k)) dashEdit.push({t:k}); paint(); }, on)); }); box.appendChild(gr); });
  sec('MISMO Systems'); const gs=h('div','nx-ctg'); (x?x.SYS:[]).filter(z=>x.canOpen(z.k)).sort((a,b)=>a.n.localeCompare(b.n)).forEach(z=>{ let n=dashEdit.filter(q=>q.t==='sys' && q.s===z.k).length; const cb=card(z.n, (z.auto ? 'New · ' : '')+z.d, z.c, x.symbol(z.k), ()=>{ const nt={t:'sys', s:z.k}; dashEdit.push(nt); paint(); if(n>0){ close(); setTimeout(()=>tileEditor(nt, dashEdit.length-1, dashEdit, true), 60); } }, false); const ci=cb.querySelector('.ci'); const badge=h('i','cnt'); const setB=()=>{ badge.textContent=n?String(n):''; badge.title=n?n+' on your dashboard':''; badge.hidden=!n; }; setB(); ci.appendChild(badge); cb.addEventListener('click', ()=>{ n++; setB(); cb.classList.remove('on'); cb.querySelector('em').textContent='Add'; }); gs.appendChild(cb); }); box.appendChild(gs);
  const ft=h('div','hqx-ft'); const d=btn('btn','Done', close); ft.appendChild(d); box.appendChild(ft);
  ov.appendChild(box); ov.addEventListener('click', e=>{ if(e.target===ov) close(); }); document.body.appendChild(ov);
}
/* new numbers from a system: redraw the dashboard once they've stopped arriving, not for every one */
/* an app newly found on resources.mismo.org: show it in the menus straight away */
window.addEventListener('hq:sys', ()=>{ if(!ui.on || dashEdit || busy() || !shell || shell.hidden) return; drawRail(); });
window.addEventListener('hq:bset', ()=>{ if(!ui.on || dashEdit || busy() || !shell || shell.hidden) return; drawRail(); if(viewKind()!=='systems') paint(); });
let countsT=null; window.addEventListener('hq:counts', ()=>{ clearTimeout(countsT); countsT=setTimeout(refreshSysTiles, 600); });
function refreshSysTiles(){ if(!ui.on || viewKind()!=='day' || tdrag || !shell || shell.hidden) return; const grid=body.querySelector('.nx-tiles'); if(!grid) return;
  const L=dashEdit || dashLayout();
  grid.querySelectorAll(':scope > .t-sys').forEach(el=>{ const i=+el.dataset.i; const cfg=L[i]; if(!cfg || cfg.t!=='sys' || el.contains(document.activeElement)) return; let nu=null; try{ nu=tile(cfg, i, L); }catch(e){} if(!nu) return;
    /* nothing changed: leave the tile alone (redrawing it made it flicker) */
    const sig=nu.innerHTML; if(el._sig===sig) return; nu._sig=sig;
    nu.style.gridRow=el.style.gridRow; nu.style.gridColumn=el.style.gridColumn; nu.style.animation='none'; el.replaceWith(nu);
    /* fit it to its size straight away, so it never shows a frame of too much */
    try{ grid._fit && grid._fit(nu); }catch(e){} countUps(nu); }); }

/* ---------- every tile Team HQ offers, in every size, on one screen (for checking them all at once:
   window.__hqGallery() — each built-in tile, then each MISMO system's home page, including ones found later) ---------- */
window.__hqGallery=function(opt){ opt=opt||{}; const x=X(); const colW=opt.w||200, ROWH=84, GAP=10;
  const old=document.getElementById('hq-gallery'); if(old) old.remove();
  const ov=h('div'); ov.id='hq-gallery'; ov.style.cssText='position:fixed;inset:0;z-index:99999;overflow:auto;background:var(--bg,#eef3f8);padding:16px';
  const bar=h('div'); bar.style.cssText='display:flex;gap:8px;align-items:center;margin-bottom:12px;font-weight:700'; bar.append('Every tile · '+colW+'px columns'); bar.appendChild(btn('nx-mini','Close', ()=>ov.remove())); ov.appendChild(bar);
  const sizes=opt.sizes||['s','t','w'];
  const L=[]; Object.keys(TILES).forEach(k=>sizes.forEach(sz=>L.push({t:k, sz})));
  ((x && x.SYS)||[]).filter(z=>x.canOpen(z.k)).forEach(z=>sizes.forEach(sz=>L.push({t:'sys', s:z.k, sz})));
  if(opt.only) for(let i=L.length-1;i>=0;i--){ const c=L[i]; if(!(new RegExp(opt.only,'i')).test(c.t+':'+(c.s||''))) L.splice(i,1); }
  const grid=h('div','nx-tiles fixed'); grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,'+colW+'px);grid-auto-rows:'+ROWH+'px;gap:'+GAP+'px;grid-auto-flow:dense';
  ov.appendChild(grid); document.body.appendChild(ov);
  L.forEach((cfg,i)=>{ let el=null; try{ el=tile(cfg, i, L); }catch(e){ el=h('div','st-tile', 'ERROR '+cfg.t+' '+(cfg.s||'')+': '+e.message); } if(!el) return;
    const tall=cfg.sz==='t'||cfg.sz==='b', wide=cfg.sz==='w'||cfg.sz==='b', n=tall?4:2; el.style.gridRow='span '+n; el.style.gridColumn='span '+(wide?2:1);
    el.dataset.gal=cfg.t+(cfg.s?':'+cfg.s:'')+':'+cfg.sz; el.title=el.dataset.gal; grid.appendChild(el);
    const maxH=n*ROWH+(n-1)*GAP; el.style.alignSelf='start'; requestAnimationFrame(()=>{ if(el.getBoundingClientRect().height>maxH+1) trimTile(el, maxH); el.style.alignSelf=''; requestAnimationFrame(()=>calmTile(el)); }); });
  return L.length; };
/* ---------- email and people, shared by My Day, Inbox and People ---------- */
const X=()=>window.__hqx;
function mailRow(m){ const x=X(); const r=h('div','nx-mrow'+(m.unread?' unread':''));
  const ic2=h('span','mi'+(m.flagged?' flag':m.important?' imp':m.unread?'':' rd')); ic2.textContent=m.flagged?'⚑':m.important?'!':m.unread?'•':''; if(m.flagged||m.important||m.unread) ic2.title=m.flagged?'Flagged':m.important?'Important':'Unread'; r.appendChild(ic2);
  const tx=h('div','tx'); const tp=h('div','tp'); tp.appendChild(h('b',null,m.from||'Someone')); tp.appendChild(h('span','ag', m.at?x.ago(m.at):'')); tx.appendChild(tp); tx.appendChild(h('div','sj', m.subject)); r.appendChild(tx);
  if(m.pend){ r.classList.add('pend'); tp.querySelector('.ag').textContent=m.pend; }
  const ac=h('div','ac');
  const live=x && x.ACT && x.ACT.on && m.id && !m.box && !/^https?:/i.test(m.id) && !m.pend;
  const ob=(k, title, fn)=>{ const b=btn('nx-ib ox', null, e=>{ e.stopPropagation(); fn(); }); b.innerHTML=ic(k); b.title=title; b.setAttribute('aria-label', title); ac.appendChild(b); };
  if(live){
    ob(m.flagged?'unflag':'flag', m.flagged?'Unflag in Outlook':'Flag in Outlook', ()=>x.mailAct(m, m.flagged?'unflag':'flag'));
    ob(m.unread?'read':'unread', m.unread?'Mark read in Outlook':'Mark unread in Outlook', ()=>x.mailAct(m, m.unread?'read':'unread'));
    ob('folder', 'File into a folder', ()=>x.pickFolder(m));
    ob('trash', 'Delete (goes to Deleted Items)', ()=>x.mailAct(m, 'del')); }
  const mk=btn('nx-ib', null, e=>{ e.stopPropagation(); newTask({t:m.subject, p:m.important?'High':'Normal', notes:'From '+(m.from||'')+(m.box?' (to '+m.box+')':'')+(m.link?' — '+m.link:'')}); }); mk.innerHTML=ic('plus'); mk.title='Make it a task'; ac.appendChild(mk);
  r.appendChild(ac);
  const er=x && x.lastErr && x.lastErr(m.id); if(er){ r.classList.add('err'); r.title='Outlook couldn’t do the last change ('+er.err+')'; }
  if(m.link){ r.addEventListener('click', ()=>window.open(m.link, '_blank', 'noopener')); r.title='Open in Outlook'; }
  return r; }
function mailPanel(limit){
  const x=X(); const pn=h('section','nx-panel'); const gh=h('div','nx-gh'); gh.appendChild(h('b',null,'Email to Look At'));
  const items=x && x.MAIL.state==='ok' ? x.mailItems().filter(m=>m.flagged || m.important || m.unread) : [];
  if(x && x.MAIL.state==='ok') gh.appendChild(h('span','nx-cnt', String(items.length)));
  const ol=h('a','nx-add'); ol.href='https://outlook.office.com/mail/'; ol.target='_blank'; ol.rel='noopener'; ol.innerHTML=ic('ext'); ol.title='Open Outlook'; gh.appendChild(ol);
  pn.appendChild(gh);
  if(!x || x.MAIL.state==='loading' || x.MAIL.state==='idle'){ pn.appendChild(h('div','nx-drope','Checking your email…')); return pn; }
  if(x.MAIL.state!=='ok'){ const c=h('div','nx-connect'); c.innerHTML=ic('mail'); const t=h('div'); t.appendChild(h('b',null,'Connect your Outlook email'));
    t.appendChild(h('span',null,'Flagged, important and unread mail from people will show here — subject, sender and a link. Never the message itself.'));
    if(me()!=='jonna') t.appendChild(btn('nx-mini','Ask to Turn It On', ()=>window.__ask2 && window.__ask2()));
    c.appendChild(t); pn.appendChild(c); return pn; }
  if(!items.length){ pn.appendChild(h('div','nx-drope','Nothing flagged or waiting. Inbox under control.')); return pn; }
  items.slice(0, limit||6).forEach(m=>pn.appendChild(mailRow(m)));
  if(items.length>(limit||6)) pn.appendChild(btn('nx-morel', 'See all '+items.length+' in Inbox', ()=>open('inbox')));
  return pn; }
function personCard(p, big){
  const s=statusOf(p), x=X(), wd=nextWorkday(today()), L=x && x.dayLoad ? x.dayLoad(p.id, wd) : null;
  const open_=S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(p.id)>=0).sort(byDue), late=open_.filter(t=>t.due && days(t.due)<0).length;
  const c=h('div','nx-pc2 '+s.k+(big?' big':'')); c.style.setProperty('--pc', pcol(p));
  const top=h('button','tp'); top.type='button'; top.addEventListener('click', ()=>open('u:'+p.id));
  const w=h('span','nx-avw'); w.appendChild(av(p.id, big?40:32)); w.appendChild(h('i','nx-dot '+s.k)); top.appendChild(w);
  const nm=h('span','nm'); nm.appendChild(h('b',null,p.id===me()?p.name+' (You)':p.name)); nm.appendChild(h('small',null, s.t+(s.s?' · '+s.s:''))); top.appendChild(nm); c.appendChild(top);
  if(L){ const ld=h('div','ld'); ld.appendChild(h('span',null,(+wd===+today()?'Today':WDL[wd.getDay()])+' · '+L.n+(L.n===1?' meeting':' meetings')+' · '+(Math.round(L.free/30)/2)+'h free')); const br=h('div','br'); const f=h('i'); f.style.width=Math.min(100,L.busy/480*100)+'%'; br.appendChild(f); ld.appendChild(br); c.appendChild(ld); }
  const nums=h('div','nums'); [[open_.length,'open',''],[late,'late',late?'bad':''],[activeRocks().filter(r=>r.lead===p.id).length,'leads','']].forEach(([n,l,cl])=>{ const b=h('span','n '+cl); b.appendChild(h('b',null,String(n))); b.appendChild(h('small',null,l)); nums.appendChild(b); }); c.appendChild(nums);
  if(big){ const nx=open_.filter(t=>t.due).slice(0,3); if(nx.length){ const l=h('div','nxl'); nx.forEach(t=>{ const r=row(t,{noWs:true, noProj:true}); l.appendChild(r); }); c.appendChild(l); } }
  const acts=h('div','acts');
  if(p.id!==me()) acts.appendChild(btn('nx-mini','Find a Time', ()=>{ try{ const k2='tools:team-hq:mismo.teamhq.ft'; const cur=JSON.parse(localStorage.getItem(k2)||'{}'); cur.who=[me(), p.id]; localStorage.setItem(k2, JSON.stringify(cur)); }catch(e){} openClassic('findtime'); }));
  acts.appendChild(btn('nx-mini', p.id===me()?'Add a Task':'Hand Them a Task', ()=>newTask({o:p.id, d:[p.id]})));
  c.appendChild(acts);
  return c; }
function peoplePanel(){
  const x=X(), ids=x ? x.myPeople() : [];
  const pn=h('section','nx-panel'); const gh=h('div','nx-gh'); gh.appendChild(h('b',null,'My People')); if(ids.length) gh.appendChild(h('span','nx-cnt',String(ids.length)));
  const ch=btn('nx-add', null, ()=>x && x.pickPeople()); ch.innerHTML=ic('plus'); ch.title='Choose My People'; gh.appendChild(ch); pn.appendChild(gh);
  if(!ids.length){ const c=h('div','nx-connect'); c.innerHTML=ic('ppl'); const t=h('div'); t.appendChild(h('b',null,'Keep your people in view')); t.appendChild(h('span',null,'Pick your direct reports, or anyone you work closely with.')); t.appendChild(btn('nx-mini','Choose My People', ()=>x && x.pickPeople())); c.appendChild(t); pn.appendChild(c); return pn; }
  ids.forEach(id=>{ const p=person(id); if(!p) return; const s=statusOf(p), op=S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(id)>=0), lt=op.filter(t=>t.due && days(t.due)<0).length;
    const r=btn('nx-win', null, ()=>open('u:'+id)); const w=h('span','nx-avw'); w.appendChild(av(id,24)); w.appendChild(h('i','nx-dot '+s.k)); r.appendChild(w);
    const tx=h('span','tx'); tx.appendChild(h('b',null,p.name)); tx.appendChild(h('small',null, s.t+(s.s?' · '+s.s:''))); r.appendChild(tx);
    r.appendChild(h('span','ago'+(lt?' bad':''), op.length+' open'+(lt?' · '+lt+' late':''))); pn.appendChild(r); });
  return pn; }

/* ---------- PEOPLE ---------- */
function vPeople(){
  const x=X(), ids=x ? x.myPeople() : [];
  header('People', ic('ppl'), 'Where everyone is, how full their day is, and what they’re carrying', [btn('nx-mini', ids.length?'Change My People':'Choose My People', ()=>x && x.pickPeople())]);
  const wrap=h('div','nx-ppl');
  if(ids.length){ wrap.appendChild(h('div','nx-sec','My People')); const g=h('div','nx-pgrid big'); ids.forEach(id=>{ const p=person(id); if(p) g.appendChild(personCard(p, true)); }); wrap.appendChild(g); }
  else { const pr=btn('nx-pprompt', null, ()=>x && x.pickPeople()); pr.innerHTML=ic('ppl')+'<span><b>Keep your people in view</b><small>Choose your direct reports, or anyone you work closely with — they’ll sit at the top here and on My Day and My Board.</small></span><em>Choose My People</em>'; wrap.appendChild(pr); }
  wrap.appendChild(h('div','nx-sec', ids.length?'Everyone Else':'The Team'));
  const g2=h('div','nx-pgrid'); people().filter(p=>ids.indexOf(p.id)<0).forEach(p=>g2.appendChild(personCard(p, false))); wrap.appendChild(g2);
  /* the week at a glance: how full each person's calendar is, day by day */
  const t0=today(); let mon=addD(t0, -((t0.getDay()+6)%7)); if(t0.getDay()===6 || t0.getDay()===0) mon=addD(mon,7);
  const D=[0,1,2,3,4].map(i=>addD(mon,i));
  wrap.appendChild(h('div','nx-sec','The Week at a Glance · hours in meetings'));
  const hm=h('div','nx-heat'); hm.appendChild(h('span','hh'));
  D.forEach(d=>{ const c=h('span','hh'+(+d===+t0?' on':'')); c.textContent=WD[d.getDay()]+' '+d.getDate(); hm.appendChild(c); }); hm.appendChild(h('span','hh','Due This Week'));
  const order=ids.concat(people().map(p=>p.id).filter(i=>ids.indexOf(i)<0));
  order.forEach(id=>{ const p=person(id); if(!p) return; const nm=btn('hn', null, ()=>open('u:'+id)); nm.appendChild(av(id,22)); nm.appendChild(h('span',null,first(id))); hm.appendChild(nm);
    D.forEach(d=>{ const L=x && x.dayLoad ? x.dayLoad(id, d) : null, hol=holiday(d); const c=h('span','hc'); if(hol){ c.textContent='Off'; c.classList.add('off'); } else if(!L){ c.textContent='—'; c.classList.add('na'); } else { const hr=L.busy/60; c.textContent=(Math.round(hr*2)/2)+'h'; c.style.setProperty('--a', Math.min(1, hr/7).toFixed(2)); c.title=first(id)+' · '+WDL[d.getDay()]+': '+L.n+' meetings, '+(Math.round(L.free/30)/2)+'h free'; if(hr>=6) c.classList.add('full'); } hm.appendChild(c); });
    const due=S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(id)>=0 && t.due && pd(t.due)>=D[0] && pd(t.due)<=D[4]).length; const late=S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(id)>=0 && t.due && days(t.due)<0).length;
    const dc=h('span','hd'); dc.textContent=due+' due'+(late?' · '+late+' late':''); if(late) dc.classList.add('bad'); hm.appendChild(dc); });
  wrap.appendChild(hm);
  wrap.appendChild(h('div','nx-sec','Workload · the next four weeks'));
  wrap.appendChild(workloadBlock(order));
  body.appendChild(wrap);
}

/* ---------- MY WEEK: plan it by dragging (Sunsama-style) ---------- */
function vWeek(){
  const t0=today(); let mon=addD(t0, -((t0.getDay()+6)%7)); if(t0.getDay()===6 || t0.getDay()===0) mon=addD(mon,7); mon=addD(mon, 7*(ui.ww||0));
  const D=[0,1,2,3,4].map(i=>addD(mon,i)), fri=D[4];
  const nv=h('div','nx-seg'); const pv=btn('nx-sg', null, ()=>{ ui.ww=(ui.ww||0)-1; paint(); }); pv.innerHTML=ic('left'); pv.setAttribute('aria-label','Previous week'); nv.appendChild(pv);
  nv.appendChild(btn('nx-sg'+(!ui.ww?' on':''), 'This Week', ()=>{ ui.ww=0; paint(); }));
  const nx=btn('nx-sg', null, ()=>{ ui.ww=(ui.ww||0)+1; paint(); }); nx.innerHTML=ic('right'); nx.setAttribute('aria-label','Next week'); nv.appendChild(nx);
  const M=myOpen().sort(byDue);
  const inWeek=M.filter(t=>t.due && pd(t.due)>=D[0] && pd(t.due)<=fri);
  const x=X(); let meet=0, free=0; D.forEach(d=>{ const L=x && x.dayLoad ? x.dayLoad(me(), d) : null; if(L){ meet+=L.n; free+=L.free; } });
  header('My Week', ic('week'), MON[D[0].getMonth()]+' '+D[0].getDate()+' – '+MON[fri.getMonth()]+' '+fri.getDate()+' · '+inWeek.length+' planned · '+meet+' meetings · '+(Math.round(free/30)/2)+'h open', [nv]);
  const wk=h('div','nx-week');
  /* the backlog: late and undated, ready to drop onto a day */
  const lateL=M.filter(t=>t.due && days(t.due)<0 && pd(t.due)<D[0]), undated=M.filter(t=>!t.due), later=M.filter(t=>t.due && pd(t.due)>fri);
  const bl=h('section','nx-wcol back'); const bh=h('div','nx-wh'); bh.appendChild(h('b',null,'To Plan')); bh.appendChild(h('small',null, phone() ? 'tap a date to plan it' : 'drag onto a day')); bl.appendChild(bh);
  const bb=h('div','nx-wb');
  const sub=(title, L, tone)=>{ if(!L.length) return; bb.appendChild(h('div','nx-wsub'+(tone?' '+tone:''), title+' · '+L.length)); L.forEach(t=>bb.appendChild(card(t,{}))); };
  sub('Overdue', lateL, 'bad'); sub('No Date', undated); sub('Later', later.slice(0,12));
  if(!lateL.length && !undated.length && !later.length) bb.appendChild(h('div','nx-drope','Everything has a day. Nice.'));
  bl.appendChild(bb);
  bl.addEventListener('dragover', e=>{ if(drag){ e.preventDefault(); bl.classList.add('nx-over'); } }); bl.addEventListener('dragleave', e=>{ if(!bl.contains(e.relatedTarget)) bl.classList.remove('nx-over'); });
  bl.addEventListener('drop', e=>{ e.preventDefault(); bl.classList.remove('nx-over'); if(drag){ const t=drag; drag=null; if(t.due) change(t, {due:''}, 'Back to To Plan: '+t.t); } });
  wk.appendChild(bl);
  D.forEach(d=>{ const isT=+d===+t0, key=iso(d), hol=holiday(d), L=x && x.dayLoad ? x.dayLoad(me(), d) : null;
    const col=h('section','nx-wcol'+(isT?' today':'')+(d<t0?' past':'')+(hol?' hol':''));
    const hd=h('div','nx-wh'); const tt=h('div','tt'); tt.appendChild(h('small',null,WD[d.getDay()])); tt.appendChild(h('b',null,String(d.getDate()))); hd.appendChild(tt);
    const info=h('div','inf'); if(hol) info.appendChild(h('span','hol',hol)); else if(L){ info.appendChild(h('span',null, L.n+(L.n===1?' meeting':' meetings')+' · '+(Math.round(L.free/30)/2)+'h open')); const br=h('div','br'); const f=h('i'); f.style.width=Math.min(100,L.busy/480*100)+'%'; br.appendChild(f); info.appendChild(br); }
    hd.appendChild(info);
    const a=btn('nx-add', null, ()=>newTask({due:key})); a.innerHTML=ic('plus'); a.title='Add a task for '+WDL[d.getDay()]; hd.appendChild(a);
    col.appendChild(hd);
    const kd=keyDatesOn(d); if(kd.length){ const k=h('div','nx-wkd'); kd.forEach(z=>k.appendChild(btn('kd', z.t, ()=>window.__editDate && window.__editDate(z)))); col.appendChild(k); }
    const b=h('div','nx-wb'); const T=M.filter(t=>t.due===key);
    T.forEach(t=>b.appendChild(card(t,{})));
    const doneT=S.tasks.filter(t=>!isOpen(t) && t.due===key && doers(t).indexOf(me())>=0); if(doneT.length) b.appendChild(h('div','nx-wdone', '✓ '+doneT.length+' done'));
    if(!T.length) b.appendChild(h('div','nx-drope', hol ? 'Day off' : 'Drop a task here'));
    col.appendChild(b);
    const ev=(cal(me())||[]).filter(e=>e.s<+d+864e5 && e.e>+d && e.show!=='free' && !e.all).sort((a2,b2)=>a2.s-b2.s);
    if(ev.length){ const mm=h('div','nx-wev'); mm.appendChild(h('div','nx-wsub','On the Calendar')); ev.forEach(e=>{ const r=h('div','ev'+(e.e<Date.now()?' past':'')+(e.show==='tentative'?' tent':'')); r.appendChild(h('span','t',tm(e.s))); r.appendChild(h('span','n',e.t||'Busy')); r.title=(e.t||'Busy')+' · '+tmL(e.s)+'–'+tmL(e.e); mm.appendChild(r); }); col.appendChild(mm); }
    col.addEventListener('dragover', e=>{ if(drag){ e.preventDefault(); col.classList.add('nx-over'); } }); col.addEventListener('dragleave', e=>{ if(!col.contains(e.relatedTarget)) col.classList.remove('nx-over'); });
    col.addEventListener('drop', e=>{ e.preventDefault(); col.classList.remove('nx-over'); if(drag){ const t=drag; drag=null; if(t.due!==key) change(t, {due:key}, 'Planned for '+WDL[d.getDay()]+': '+t.t); } });
    wk.appendChild(col); });
  body.appendChild(wk);
}

/* ---------- CALENDAR: the week ---------- */
function vCal(){
  const t0=today(); let mon=addD(t0, -((t0.getDay()+6)%7)); if(t0.getDay()===6 || t0.getDay()===0) mon=addD(mon,7); mon=addD(mon, 7*(ui.tw||0));
  const D=[0,1,2,3,4].map(i=>addD(mon,i));
  const nv=h('div','nx-seg'); const pv=btn('nx-sg', null, ()=>{ ui.tw=(ui.tw||0)-1; paint(); }); pv.innerHTML=ic('left'); pv.setAttribute('aria-label','Previous week'); nv.appendChild(pv);
  nv.appendChild(btn('nx-sg'+(!ui.tw?' on':''), 'This Week', ()=>{ ui.tw=0; paint(); }));
  const nx=btn('nx-sg', null, ()=>{ ui.tw=(ui.tw||0)+1; paint(); }); nx.innerHTML=ic('right'); nx.setAttribute('aria-label','Next week'); nv.appendChild(nx);
  const ft=btn('nx-mini pri','Find a Time', ()=>{ try{ const k2='tools:team-hq:mismo.teamhq.ft'; const cur=JSON.parse(localStorage.getItem(k2)||'{}'); cur.who=[me()].concat(ui.tpeople); localStorage.setItem(k2, JSON.stringify(cur)); }catch(e){} openClassic('findtime'); });
  header('Calendar', ic('cal'), MON[D[0].getMonth()]+' '+D[0].getDate()+' – '+MON[D[4].getMonth()]+' '+D[4].getDate(), [nv, ft]);
  const ov=h('div','nx-overlay'); ov.appendChild(h('span','lb','Lay over busy time'));
  people().filter(p=>p.id!==me()).forEach(p=>{ const on=ui.tpeople.indexOf(p.id)>=0; const b=btn('nx-chip'+(on?' on':''), null, ()=>{ const i=ui.tpeople.indexOf(p.id); if(i>=0) ui.tpeople.splice(i,1); else ui.tpeople.push(p.id); save(); paint(); }); b.appendChild(av(p.id,18)); b.appendChild(h('span',null,first(p.id))); ov.appendChild(b); });
  body.appendChild(ov);
  const startH=7, endH=18, px=Math.max(42, Math.min(80, Math.floor(((body.clientHeight||700)-150)/(endH-startH))));
  const wrap=h('div','nx-cal'); const grid=h('div','nx-cg'); wrap.appendChild(grid);
  grid.appendChild(h('div','nx-cx'));
  D.forEach(d=>{ const hd=h('div','nx-cd'+(+d===+t0?' today':'')); hd.appendChild(h('small',null,WD[d.getDay()])); hd.appendChild(h('b',null,String(d.getDate()))); const hol=holiday(d); if(hol) hd.appendChild(h('span','hol',hol)); grid.appendChild(hd); });
  grid.appendChild(h('div','nx-cx al','All day'));
  const M=S.tasks.filter(t=>isOpen(t) && t.due && doers(t).indexOf(me())>=0);
  D.forEach(d=>{ const c=h('div','nx-ca'); keyDatesOn(d).forEach(x=>{ const k=btn('kd', x.t, ()=>window.__editDate && window.__editDate(x)); k.title=(x.k||'')+' · '+x.t; c.appendChild(k); });
    M.filter(t=>t.due===iso(d)).forEach(t=>{ const k=btn('du', null, ()=>editTask(t)); k.innerHTML=sIcon(st(t))+'<span>'+t.t.replace(/</g,'&lt;')+'</span>'; c.appendChild(k); }); grid.appendChild(c); });
  const hours=h('div','nx-chs'); for(let k=startH;k<=endH;k++){ const l=h('span',null, (k%12||12)+(k<12?'a':'p')); l.style.top=((k-startH)*px)+'px'; hours.appendChild(l); } hours.style.height=((endH-startH)*px)+'px'; grid.appendChild(hours);
  const now=Date.now();
  D.forEach(d=>{ const col=h('div','nx-cc'+(+d===+t0?' today':'')); col.style.height=((endH-startH)*px)+'px';
    const base=new Date(d); base.setHours(startH,0,0,0); const y=ms=>(ms-+base)/3600e3*px;
    for(let k=0;k<=endH-startH;k++){ const g=h('i','gl'); g.style.top=(k*px)+'px'; col.appendChild(g); }
    ui.tpeople.forEach((pid,k)=>{ const p=person(pid); if(!p) return; (cal(pid)||[]).filter(e=>e.s<+d+864e5 && e.e>+d && e.show!=='free' && !e.all).forEach(e=>{ const s=h('i','ob'); s.style.top=Math.max(0,y(e.s))+'px'; s.style.height=Math.max(4, y(e.e)-Math.max(0,y(e.s)))+'px'; s.style.setProperty('--pc', pcol(p)); s.style.left=(3+k*5)+'px'; s.title=p.name+' busy '+tmL(e.s)+'–'+tmL(e.e); col.appendChild(s); }); });
    const ev=(cal(me())||[]).filter(e=>e.s<+d+864e5 && e.e>+d && e.show!=='free' && !e.all).sort((a,b)=>a.s-b.s);
    const lanes=[]; ev.forEach(e=>{ let i=lanes.findIndex(x=>x<=e.s); if(i<0){ i=lanes.length; lanes.push(0); } lanes[i]=e.e; e._l=i; }); const nl=Math.max(1,lanes.length);
    const off=ui.tpeople.length*5+4;
    ev.forEach(e=>{ const x=h('div','ce '+(e.show||'busy')+(e.e<now?' past':'')); x.style.top=y(e.s)+'px'; x.style.height=Math.max(18, y(e.e)-y(e.s)-2)+'px';
      x.style.left='calc('+off+'px + (100% - '+(off+3)+'px) * '+(e._l/nl)+')'; x.style.width='calc((100% - '+(off+3)+'px) / '+nl+' - 2px)';
      const short=(e.e-e.s)<45*60e3; if(short) x.classList.add('short'); x.appendChild(h('span','et', short ? tm(e.s)+' '+(e.t||'Busy') : (e.t||'Busy'))); if(!short) x.appendChild(h('span','ei',tmL(e.s)+'–'+tmL(e.e))); x.title=(e.t||'Busy')+' · '+tmL(e.s)+'–'+tmL(e.e); col.appendChild(x); });
    if(+d===+t0 && now>+base && now<+base+(endH-startH)*3600e3){ const n=h('i','nowl'); n.style.top=y(now)+'px'; col.appendChild(n); }
    grid.appendChild(col); });
  body.appendChild(wrap);
}

/* ---------- phones: a bottom tab bar and a sheet with everything ---------- */
function drawTabbar(){ if(!tabbar) return;
  if(!tabbar.querySelector('.nx-tb')){
    [['day','Dashboard','home'],['mine','My Tasks','mine'],['cal','Calendar','cal'],['inbox','Inbox','inbox']].forEach(([k,l,i])=>{ const b=btn('nx-tb', null, ()=>open(k)); b.dataset.k=k; b.innerHTML=ic(i)+'<span>'+l+'</span>'; tabbar.appendChild(b); });
    const m=btn('nx-tb nx-tbm', null, e=>{ e.stopPropagation(); if(menuEl && menuEl.classList.contains('sheet')) closeMenus(); else openMenuSheet(); }); m.innerHTML=ic('menu')+'<span>Everything</span>'; tabbar.appendChild(m); }
  tabbar.querySelectorAll('.nx-tb[data-k]').forEach(b=>{ b.classList.toggle('on', ui.view===b.dataset.k); if(b.dataset.k==='inbox'){ const n=myAsks().length+myNudges().length; let bd=b.querySelector('.nx-badge'); if(n){ if(!bd){ bd=h('b','nx-badge hot'); b.appendChild(bd); } bd.textContent=String(n); } else if(bd) bd.remove(); } });
}
function openMenuSheet(){
  closeMenus(); menuEl=h('div','nx-menu sheet tall');
  const grp=(t)=>menuEl.appendChild(h('div','nx-ml',t));
  const item=(label, fn, iconHtml)=>{ const b=btn('nx-mi', null, ()=>{ closeMenus(); fn(); }); b.innerHTML=(iconHtml||'')+'<span>'+label+'</span>'; menuEl.appendChild(b); };
  grp('You'); Object.keys(VIEWS).filter(k=>!VIEWS[k].team).forEach(k=>item(VIEWS[k].t, ()=>open(k), ic(VIEWS[k].i)));
  grp('Team Pages'); [...document.querySelectorAll('.hq.rail nav button[data-hq]')].forEach(b=>{ const s=b.querySelector('svg'); item(b.textContent.trim(), ()=>openClassic(b.dataset.hq), s?s.outerHTML:''); }); /* team views (Connected Systems) after the other team pages, as on the left menu */ Object.keys(VIEWS).filter(k=>VIEWS[k].team && (k!=='systems' || window.__hqSystems)).forEach(k=>item(VIEWS[k].t, ()=>open(k), ic(VIEWS[k].i)));
  { const hb=document.getElementById('help-btn'); if(hb){ const s=hb.querySelector('svg'); item('Help', ()=>{ hideApp(); ui.view='c:help'; save(); pushView(ui.view); hb.click(); markRail(); }, s?s.outerHTML:''); } }
  document.body.appendChild(menuEl);
  { const mine=menuEl; setTimeout(()=>document.addEventListener('click', function off(e){ if(menuEl!==mine){ document.removeEventListener('click', off); return; } if(mine && !mine.contains(e.target) && !e.target.closest('.nx-tbm')){ closeMenus(); document.removeEventListener('click', off); } }), 0); }
}

/* ---------- switch in the masthead ---------- */
let sw=null;
function placeSwitch(){ const r=document.querySelector('.hqtop-r'); if(!r || r.querySelector('.nx-switch')) return;
  sw=btn('nx-switch', null, ()=>setOn(!ui.on)); sw.title='Switch between the new and classic Team HQ'; r.insertBefore(sw, r.firstChild); paintSwitch(); }
function paintSwitch(){ if(!sw) return; sw.innerHTML='<span class="tg'+(ui.on?' on':'')+'"><i></i></span><span class="lb">New Team HQ</span>'; sw.setAttribute('aria-pressed', String(ui.on)); }
function setOn(v){ ui.on=v; save(); paintSwitch();
  if(v){ if(!shell) build(); document.documentElement.classList.add('nx-on'); drawRail(); open('day'); try{ window.__hub && window.__hub.paint(); }catch(e){} }
  else { hideApp(); document.documentElement.classList.remove('nx-on'); railNodes.forEach(n=>n.remove()); railNodes=[]; restoreBoardBtn(); window.__show && window.__show(S.tab && S.tab.indexOf('nx')<0 ? S.tab : 'today'); try{ window.__hub && window.__hub.paint(); }catch(e){} } }

/* ---------- keep it live ---------- */
let lastSig='';
function hsh(str){ let x=0; for(let i=0;i<str.length;i++){ x=((x<<5)-x+str.charCodeAt(i))|0; } return x; }
const sig=()=>[S.tasks.length, hsh(S.tasks.map(t=>[t.id,t.at,t.s,t.due,t.w,t.r,t.o,(t.d||[]).join(','),t.p,t.t,(t.notes||'').length,(t.sub||[]).map(z=>z.done?1:0).join(''),(t.wait||[]).join(','),t.rep||'',(t.fol||[]).join(','),t.repNext||''].join('|')).join('~')), (S.asks||[]).length, (S.asks||[]).map(a=>a.state).join(''), (S.nudges||[]).filter(n=>!n.done).length, S.rocks.length+'/'+S.rocks.map(r=>(Array.isArray(r.upd)&&r.upd[0]&&r.upd[0].at)||0).join(','), (window.__hqx&&window.__hqx.sig?window.__hqx.sig():''), (ui.view==='mine'?syncSig():''), Object.keys((window.__cal&&window.__cal.CAL&&window.__cal.CAL.by)||{}).length, (window.__cal&&window.__cal.CAL&&window.__cal.CAL.at)||0].join(':');
function busy(){ if(drag || tdrag!=null || menuEl || document.documentElement.classList.contains('nx-boxing') || document.querySelector('.hqx-ov')) return true; const a=document.activeElement; return !!(a && (a.tagName==='INPUT' || a.tagName==='SELECT' || a.tagName==='TEXTAREA') && (shell && shell.contains(a))); }
/* Connected Systems keeps itself current, so task and inbox changes elsewhere don't rebuild it (and move the reader) */
const live=setInterval(()=>{ if(!ui.on || document.hidden) return; const s=sig(); if(s===lastSig) return; if(busy()) return; lastSig=s; drawRail(); if(viewKind()!=='systems') paint(); }, 1200);
const clock=setInterval(()=>{ if(!ui.on || document.hidden || busy()) return; drawRail(); if(shell && !shell.hidden && (viewKind()==='day' || viewKind()==='person')) paint(); }, 60e3);
/* if the classic page redraws its rail, put our items back */
const railMo=new MutationObserver(()=>{ if(!ui.on) return; const nav=navEl(); if(nav && railNodes.length && !nav.contains(railNodes[0])) drawRail(); });
const railEl=document.querySelector('.hq.rail'); if(railEl) railMo.observe(railEl, {childList:true, subtree:true});
document.addEventListener('click', onRailClick, true);
/* keys: C new task, / filter, J/K move, Enter open, X done, 1-5 views */
const onKey=e=>{ if(!ui.on || !shell || shell.hidden || document.documentElement.classList.contains('app-exp')) return; const a=document.activeElement; if(a && (a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT'||a.isContentEditable)) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return; if(document.querySelector('dialog[open], .modal.open, .ed-ov:not([hidden])')) return;
  const k=e.key.toLowerCase();
  const m={'1':'day','2':'inbox','3':'mine','4':'cal','5':'people'}[k]; if(m){ open(m); e.preventDefault(); return; }
  if(k==='c'){ e.preventDefault(); newTask(ctxAdd()); return; }
  if(k==='/'){ const i=head.querySelector('.nx-find'); if(i){ e.preventDefault(); i.focus(); } return; }
  const rows=[...body.querySelectorAll('.nx-row[data-id]')].filter(r=>r.offsetParent);
  if(!rows.length) return;
  if(sel<0 && peekEl && peekEl.isConnected && ui.peek) sel=rows.findIndex(r=>r.dataset.id===ui.peek);
  if(k==='j' || k==='arrowdown'){ sel=Math.min(rows.length-1, sel+1); e.preventDefault(); }
  else if(k==='k' || k==='arrowup'){ sel=Math.max(0, sel-1); e.preventDefault(); }
  else if(k==='enter' && rows[sel]){ rows[sel].click(); e.preventDefault(); return; }
  else if(k==='x' && rows[sel]){ const t=S.tasks.find(x=>x.id===rows[sel].dataset.id); if(t && isOpen(t)){ const r=rows[sel].getBoundingClientRect(); complete(t, rows[sel], {clientX:r.left+20, clientY:r.top+16}); } e.preventDefault(); return; }
  else return;
  rows.forEach((r,i)=>r.classList.toggle('kb', i===sel)); if(rows[sel]){ rows[sel].scrollIntoView({block:'nearest'}); if(peekEl && peekEl.isConnected) selectPeek(rows[sel].dataset.id); }
};
document.addEventListener('keydown', onKey);
const onResize=()=>{ if(ui.on && shell && !shell.hidden && !busy()){ clearTimeout(onResize._t); onResize._t=setTimeout(paint, 150); } };
window.addEventListener('resize', onResize);


/* ---------- My Board's Add a Panel: leave out what My Dashboard already has ---------- */
const DASH_HAS=['My Tasks','Due This Week','Plan My Day','Team Projects List','Where My Team Is Today','Who Is Free','Countdowns','What People Have Asked For','Meeting Trackers: Workgroup Meetings','Sponsorship Portal','Meeting Trackers','Service Orders and Agreements','Financial System','CMS','Member 360','New Certifications','My Systems'];
function trimPanels(){
  if(!ui.on) return;
  document.querySelectorAll('.pgxleft').forEach(left=>{
    left.querySelectorAll('button.pgxrow').forEach(r=>{ const t=((r.querySelector('b')||{}).textContent||'').trim(); if(DASH_HAS.indexOf(t)>=0 && !r.classList.contains('sel')) r.style.display='none'; });
    const hidden=[];
    left.querySelectorAll('.pgxsec').forEach(sec=>{ const any=[...sec.querySelectorAll('button.pgxrow')].some(r=>r.style.display!=='none'); sec.style.display=any?'':'none'; if(!any){ const hd=(sec.firstElementChild&&sec.firstElementChild.textContent||'').trim().toLowerCase(); hidden.push(hd); } });
    const box=left.closest('[role=dialog], dialog') || left.parentElement;
    box.querySelectorAll('button.pgxcat').forEach(c=>{ const n=c.textContent.trim().toLowerCase(); if(hidden.some(hd=>hd.indexOf(n)===0)) c.style.display='none'; });
    if(!left.querySelector('.nx-pgxnote')){ const n=h('div','nx-pgxnote'); n.appendChild(h('span',null,'Your tasks, your day, your team, key dates, asks and every MISMO system live on My Dashboard now — these are the things only your board does.')); const b=btn('nx-mini','Add a Tile to My Dashboard', ()=>{ const x=box.querySelector('.pgxclose'); if(x) x.click(); dashEdit=dashLayout(); open('day'); setTimeout(openCatalog, 60); }); n.appendChild(b); left.insertBefore(n, left.firstChild); }
  });
}
const onPgx=()=>{ if(!ui.on) return; setTimeout(trimPanels, 30); setTimeout(trimPanels, 250); };
document.addEventListener('click', onPgx, true);

/* ---------- styles ---------- */
const css=h('style'); css.id='nx-css'; css.textContent=`
html.nx-show body{overflow:hidden}
html.nx-show main{visibility:hidden}
html.nx-on .mob-bar{display:none!important}
html.app-exp .nx-tabbar,html.app-exp .nx,html.app-exp .hq.rail{display:none!important}html.app-exp.nx-on body{padding-bottom:0!important}
.nx{position:fixed;top:calc(var(--hq-h) + env(safe-area-inset-top,0px));left:var(--rail-w,240px);right:0;bottom:0;z-index:90;display:flex;flex-direction:column;background:var(--ground);font-variant-numeric:tabular-nums;transition:left .2s cubic-bezier(.4,0,.2,1)}
body.railmini .nx{left:var(--rail-mini,62px)}
@media(max-width:900px){body:not(.railmini) .nx{left:var(--rail-mini,62px)}}
.nx[hidden]{display:none}
/* rail items */
.hq nav .nx-rl{display:flex;align-items:center;padding:12px 10px 3px}
.hq nav .nx-rl:first-child{padding-top:4px}
.nx-rl>span,.nx-rlb{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.5)}
.hq nav .nx-rlb{display:flex!important;align-items:center;gap:4px;width:100%;padding:0!important;background:none!important;border:0;cursor:pointer;font-size:9.5px!important;color:rgba(255,255,255,.5)!important}
.hq nav .nx-rlb:hover{color:#fff!important}
.hq nav .nx-rlb svg{width:12px!important;height:12px!important;stroke-width:2.4!important;transition:transform .15s}
.hq nav .nx-rlb svg.shut{transform:rotate(-90deg)}
.hq nav .nx-rb{position:relative}
.hq nav .nx-rb.sub{padding:5px 10px 5px 12px;font-size:12.5px}
.hq nav .nx-rb>span:not(.nx-avw){min-width:0;overflow:hidden;text-overflow:ellipsis}
.nx-badge{margin-left:auto;flex:0 0 auto;min-width:20px;text-align:center;font-size:10.5px;font-weight:700;font-style:normal;padding:1px 6px;border-radius:4px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.82)}
.nx-badge.hot{background:#e8833a;color:#fff}
.nx-badge.late{color:#ffb3aa;box-shadow:inset 0 0 0 1px rgba(255,157,145,.45)}
.nx-sq{display:inline-block;flex:0 0 auto;width:9px;height:9px;border-radius:2px}
.nx-sq.lg{width:18px;height:18px;border-radius:4px}
.nx-rb .nx-sq{margin:0 4px}
.nx-avw{position:relative;display:inline-flex;flex:0 0 auto}
.nx-avw .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700}
.nx-dot{position:absolute;right:-2px;bottom:-2px;width:9px;height:9px;border-radius:50%;border:2px solid var(--surface);background:#9aa9b6}
.hq nav .nx-dot{border-color:var(--navy)}
.nx-dot.free{background:#2bb673}.nx-dot.busy{background:#e0533f}.nx-dot.away{background:#e8a33a}.nx-dot.unk{background:transparent;border-color:transparent}
body.railmini .hq nav .nx-rl,body.railmini .hq nav .nx-rb.sub,body.railmini .nx-badge{display:none}
/* header */
.nx-head{flex:0 0 auto;display:flex;align-items:center;gap:10px 14px;flex-wrap:wrap;padding:10px 20px;background:var(--surface);border-bottom:1px solid var(--border)}
.nx-hl{display:flex;align-items:center;gap:10px;min-width:0}
.nx-hi{display:inline-flex;align-items:center;color:var(--c1)}
.nx-hi>svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.nx-hi .av{width:30px;height:30px}
.nx-ht{display:flex;flex-direction:column;min-width:0}
.nx-ht h1{margin:0;font-size:16.5px;font-weight:700;letter-spacing:-.01em;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
.nx-hs{font-size:12px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-qa{flex:1 1 200px;max-width:560px;display:flex;align-items:center;gap:8px;height:36px;padding:0 8px 0 10px;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;transition:border-color .15s,box-shadow .15s,background .15s}
.nx-qa:focus-within{background:var(--surface);border-color:var(--c1);box-shadow:0 0 0 3px color-mix(in srgb,var(--c1) 15%,transparent)}
.nx-qa .pi{width:16px;height:16px;flex:0 0 auto;fill:none;stroke:var(--c1);stroke-width:2.4;stroke-linecap:round}
.nx-qa input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:13.5px;color:var(--ink)}
.nx-hint{font-size:11.5px;font-weight:700;color:var(--c1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}
.nx-k{font:inherit;font-size:10.5px;font-weight:700;color:var(--ink-3);border:1px solid var(--border);border-radius:4px;padding:0 5px;background:var(--surface)}
.nx-qa.typing .nx-k,.nx-qa:focus-within .nx-k{display:none}
.nx-hr{display:flex;align-items:center;gap:6px;margin-left:auto;flex-wrap:wrap}
.nx-body{flex:1;min-height:0;overflow:auto;animation:nxIn .2s ease}
.nx-body.nx-v-person,.nx-body.nx-v-inbox{overflow:hidden}
@keyframes nxIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
/* controls */
.nx-seg{display:flex;align-items:center;border:1px solid var(--border);border-radius:6px;background:var(--surface);overflow:hidden}
.nx-sg{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border:0;border-right:1px solid var(--border);background:transparent;color:var(--ink-2);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.nx-sg:last-child{border-right:0}
.nx-sgl{padding:0 10px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);border-right:1px solid var(--border);height:30px;display:inline-flex;align-items:center;white-space:nowrap}
.nx-hr>.nx-sg{border:1px solid var(--border);border-radius:6px;background:var(--surface)}
.nx-sg svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.nx-sg:hover{background:var(--surface-2);color:var(--ink)}
.nx-sg.on,.nx-hr>.nx-sg.on{background:var(--navy);border-color:var(--navy);color:#fff}
:root[data-theme="dark"] .nx-sg.on{background:var(--sky);color:var(--navy-deep)}
.nx-seg.ico .nx-sg{padding:0 8px}
.nx-sel,.nx-find{height:32px;padding:0 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font:inherit;font-size:12.5px;max-width:170px}
.nx-find{width:110px}
.nx-mini{display:inline-flex;align-items:center;gap:6px;height:32px;border:1px solid var(--border);background:var(--surface);color:var(--ink);font:inherit;font-size:12.5px;font-weight:700;padding:0 11px;border-radius:6px;cursor:pointer;white-space:nowrap}
.nx-mini svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.nx-mini:hover{border-color:var(--c1);color:var(--c1)}
.nx-mini.pri{background:var(--navy);border-color:var(--navy);color:#fff}
.nx-mini.pri:hover{background:var(--navy-mid);color:#fff}
:root[data-theme="dark"] .nx-mini.pri{background:var(--sky);border-color:var(--sky);color:var(--navy-deep)}
.nx-ib{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink-2);cursor:pointer}
.nx-ib svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.nx-ib:hover{color:var(--c1);border-color:var(--c1)}
.nx-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--ink-2);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.nx-chip b{font-size:11px;color:var(--ink-3)}
.nx-chip:hover{border-color:var(--border-strong);color:var(--ink)}
.nx-chip.on{background:var(--navy);border-color:var(--navy);color:#fff}.nx-chip.on b{color:var(--sky)}
.nx-chip .av{width:18px;height:18px;font-size:8px}
.nx-empty{margin:0;padding:24px 20px;font-size:13px;color:var(--ink-3)}
/* status icons */
.si{width:16px;height:16px;flex:0 0 auto;display:block}
.si .o{fill:none;stroke-width:1.7}
.si.ns .o{stroke:var(--ink-3)}
.si.ip .o{stroke:#d9a400}.si.ip .f{fill:#d9a400}
.si.wt .o{stroke:var(--warn);stroke-dasharray:2.4 1.6}.si.wt .p{stroke:var(--warn);stroke-width:1.7;stroke-linecap:round}
.si.dn .f{fill:var(--c1)}.si.dn .k{fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
/* list */
.nx-list{padding:0 0 60px}
.nx-grp{border-bottom:1px solid var(--rule)}
.nx-gh{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;height:36px;padding:0 20px 0 8px;background:var(--surface-2);border-bottom:1px solid var(--rule);font-size:13px;color:var(--ink)}
.nx-gh b{font-weight:700}
.nx-gh .gi{display:inline-flex}
.nx-gh.bad b{color:var(--bad)}.nx-gh.warn b{color:var(--ink)}
.nx-gh.warn{box-shadow:inset 3px 0 0 #d9a400}.nx-gh.bad{box-shadow:inset 3px 0 0 var(--bad)}
.nx-cnt{font-size:12px;font-weight:600;color:var(--ink-3)}
.nx-fold{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--ink-3);cursor:pointer}
.nx-fold svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;transition:transform .15s}
.nx-fold:hover{background:var(--surface-3);color:var(--ink)}
.nx-grp.shut .nx-fold svg{transform:rotate(-90deg)}
.nx-grp.shut .nx-items{display:none}
.nx-add{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--ink-3);cursor:pointer}
.nx-add svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
.nx-add:hover{background:var(--surface-3);color:var(--c1)}
.nx-row{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:0 20px 0 14px;background:var(--surface);border:0;border-bottom:1px solid var(--rule);font:inherit;font-size:13.5px;text-align:left;color:var(--ink);cursor:pointer;transition:background .12s,opacity .3s,transform .3s,max-height .3s;max-height:160px;overflow:hidden}
.nx-row:last-child{border-bottom:0}
.nx-row:hover{background:color-mix(in srgb,var(--sky) 7%,var(--surface))}
.nx-row.kb{box-shadow:inset 3px 0 0 var(--c1);background:color-mix(in srgb,var(--sky) 10%,var(--surface))}
.nx-row.dragging{opacity:.4}
.nx-row.done{opacity:0;transform:translateX(24px);max-height:0;min-height:0}
.nx-row.isdone .nx-tt{color:var(--ink-3);text-decoration:line-through}
.nx-sb{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:26px;height:26px;padding:0;border:0;border-radius:5px;background:transparent;cursor:pointer}
.nx-sb:hover{background:var(--surface-3)}
.nx-sb:hover .si.ns .o{stroke:var(--c1)}
.nx-hi-p{flex:0 0 auto;font-weight:800;color:var(--bad);margin:0 -4px 0 -2px}
.nx-tt{flex:0 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.nx-ws{flex:0 3 auto;min-width:0;max-width:200px;font-size:12.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-sp{flex:1 1 0;min-width:4px}
.nx-pj{flex:0 1 auto;display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:190px;height:22px;padding:0 8px;border:1px solid var(--border);border-radius:4px;font-size:11.5px;font-weight:600;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-pj::before{content:"";flex:0 0 auto;width:8px;height:8px;border-radius:2px;background:var(--rc,var(--cn))}
.nx-due{flex:0 0 auto;min-width:62px;height:24px;padding:0 6px;border:0;border-radius:4px;background:transparent;font:inherit;font-size:12px;font-weight:600;color:var(--ink-3);text-align:right;cursor:pointer;white-space:nowrap}
.nx-due svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;opacity:0;vertical-align:middle}
.nx-row:hover .nx-due svg{opacity:.7}
.nx-due:hover{background:var(--surface-3);color:var(--ink)}
.nx-due.bad{color:var(--bad)}.nx-due.warn{color:#b07f00}
.nx-avs{flex:0 0 auto;display:flex;min-width:20px}
.nx-avs .av,.nx-gh .av,.nx-ask .av,.nx-tp .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700}
.nx-avs .av+.av{margin-left:-6px;box-shadow:0 0 0 2px var(--surface)}
.nx-pull{flex:0 0 auto;display:none;align-items:center;gap:4px;height:24px;padding:0 8px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--c1);font:inherit;font-size:11.5px;font-weight:700;cursor:pointer}
.nx-pull svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.nx-row:hover .nx-pull,.nx-row.kb .nx-pull{display:inline-flex}
@media(hover:none){.nx-pull{display:inline-flex}}
.nx-pull:hover{background:var(--sky-wash);border-color:var(--c1)}
.nx-drope{padding:10px 20px 10px 50px;font-size:12.5px;color:var(--ink-3);background:var(--surface)}
.nx-over{background:color-mix(in srgb,var(--sky) 9%,var(--surface-2))!important;box-shadow:inset 0 0 0 2px var(--c1)!important}
html.nx-dragging .nx-grp.shut .nx-items{display:block}
/* board */
.nx-board{display:flex;gap:12px;align-items:flex-start;padding:14px 20px 40px}
.nx-col{flex:1 1 270px;max-width:440px;min-width:270px;display:flex;flex-direction:column;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;transition:background .15s,box-shadow .15s}
.nx-col .nx-gh{position:static;border-radius:8px 8px 0 0;background:transparent;padding:0 8px 0 12px}
.nx-col .nx-items{display:flex;flex-direction:column;gap:7px;padding:8px}
.nx-row.nx-card{flex-wrap:wrap;row-gap:6px;min-height:0;padding:9px 10px;border:1px solid var(--border);border-radius:6px;max-height:220px;box-shadow:0 1px 2px rgba(13,49,76,.05)}
.nx-row.nx-card:hover{box-shadow:0 6px 16px rgba(13,49,76,.10)}
.nx-card .nx-tt{flex:1 1 calc(100% - 40px);white-space:normal;line-height:1.35}
.nx-card .nx-sp{display:none}
.nx-card .nx-pj{margin-left:34px}
.nx-card .nx-due{margin-left:auto;min-width:0}
.nx-card .nx-pull{display:none!important}
.nx-col .nx-drope{padding:16px 8px;border:1.5px dashed var(--border-strong);border-radius:6px;text-align:center;background:transparent}
/* my dashboard (after MISMO Media's dashboard) */
.nx-dash{padding:18px 24px 40px;max-width:1500px}
.nx-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;background:var(--navy);color:#fff;border-radius:10px;padding:22px 24px;margin-bottom:22px;position:relative;overflow:hidden}
.nx-hero::after{content:"";position:absolute;right:-60px;top:-80px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(116,191,235,.22),rgba(116,191,235,0) 70%);pointer-events:none}
:root[data-theme="dark"] .nx-hero{background:#0a2433}
.nx-hhi{position:relative;z-index:1;min-width:0}
.nx-eb{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--sky)}
.nx-hhi h1{font-size:30px;font-weight:700;line-height:1.15;margin:6px 0 10px;color:#fff}
.nx-hhi p{font-size:15px;line-height:1.6;color:rgba(255,255,255,.86);margin:0}
.nx-hhi p em{font-style:normal;color:var(--sky);font-weight:600}
.nx-needs{background:rgba(255,255,255,.07);border:1px solid rgba(116,191,235,.25);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px;position:relative;z-index:1;min-width:0}
.nx-nh{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.7);display:flex;gap:8px;align-items:baseline}
.nx-nh span{letter-spacing:0;text-transform:none;font-weight:500;color:rgba(255,255,255,.5)}
.nx-need{display:grid;grid-template-columns:76px minmax(0,1fr);gap:10px;align-items:baseline;text-align:left;background:rgba(255,255,255,.06);border:0;border-left:3px solid var(--k,var(--sky));border-radius:5px;padding:7px 10px;color:#fff;font:inherit;cursor:pointer}
.nx-need:hover{background:rgba(255,255,255,.13)}
.nx-need span{font-size:11.5px;color:rgba(255,255,255,.65);white-space:nowrap}
.nx-need b{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-nempty{font-size:13px;color:rgba(255,255,255,.7);padding:6px 2px}
.nx-all{align-self:flex-start;margin-top:4px;border:0;background:none;padding:2px 0;color:var(--sky);font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.nx-all:hover{text-decoration:underline}
.nx-sw{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-bottom:22px}
.nx-swkey{grid-column:1 / -1;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:4px 14px;margin-top:-2px;font-size:11px;font-weight:600;color:var(--ink-3)}.nx-swkey span{display:inline-flex;align-items:center;gap:5px}.nx-swkey i{display:inline-block;width:12px;height:4px;border-radius:2px;background:var(--k)}
.nx-swd{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font:inherit;text-align:left;color:var(--ink);cursor:pointer;transition:transform .15s,box-shadow .15s}
.nx-swd:hover{transform:translateY(-2px);box-shadow:0 10px 20px -12px rgba(6,32,47,.35)}
.nx-swd span{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--ink-3)}
.nx-swd b{font-size:20px;line-height:1.1;color:var(--ink)}
.nx-swd small{max-width:100%;font-size:11px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nx-swd.now{background:var(--navy);border-color:var(--navy)}.nx-swd.now span{color:var(--sky)}.nx-swd.now b{color:#fff}.nx-swd.now small{color:rgba(255,255,255,.75)}
.nx-swd.wkd:not(.now){background:var(--surface-2)}
.nx-pills{display:flex;gap:3px;align-items:center;align-self:stretch;min-width:0;max-width:100%;min-height:8px;margin:2px 0;overflow:hidden}
.nx-pills i{flex:0 1 16px;min-width:4px;height:5px;border-radius:3px;background:var(--k)}
.nx-dvb{display:flex;align-items:center;gap:14px;margin-bottom:12px;flex-wrap:wrap}
.nx-dvb h2{margin:0;font-size:17px;font-weight:700;color:var(--ink)}
.nx-dvr{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap}
.nx-dtip{margin:-4px 0 12px;font-size:12.5px;color:var(--ink-2)}
.nx-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(150px,auto);grid-auto-flow:row dense;gap:14px}
.st-tile{--st-line:rgba(116,191,235,.18);position:relative;display:flex;flex-direction:column;gap:10px;min-width:0;padding:16px 18px;border:1px solid rgba(116,191,235,.18);border-radius:12px;color:#fff;cursor:pointer;text-align:left;background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--k,#74bfeb) 26%,transparent),transparent 60%),linear-gradient(160deg,#10324a,#0b2436);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 10px 24px -14px rgba(6,32,47,.6);transition:transform .18s,box-shadow .18s;overflow:hidden}
@keyframes nxTileIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
.st-tile::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.08) 48%,rgba(255,255,255,.02) 56%,transparent 70%);background-size:260% 100%;background-position:130% 0;opacity:0;transition:background-position .9s ease,opacity .25s}
.st-tile:hover::after{opacity:1;background-position:-30% 0}
.st-tile:has(.st-pill.hot){box-shadow:0 0 0 1px rgba(255,120,100,.28),0 10px 30px -18px rgba(255,90,70,.55)}
.st-tile:hover{transform:translateY(-3px);box-shadow:0 0 0 1px color-mix(in srgb,var(--k,#74bfeb) 55%,transparent),0 18px 34px -16px rgba(6,32,47,.75)}
.st-tile:focus-visible{outline:2px solid var(--sky);outline-offset:2px}
.st-top{display:flex;align-items:center;gap:8px;min-width:0}
.st-lab{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:color-mix(in srgb,var(--k,#74bfeb) 70%,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-pill{margin-left:auto;flex:0 0 auto;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,.12);color:#fff;white-space:nowrap;max-width:60%;overflow:hidden;text-overflow:ellipsis}
.st-pill.hot{background:#c94a3b}
.st-big{font-size:40px;font-weight:700;line-height:1;letter-spacing:-.02em;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.st-big small{font-size:13px;font-weight:600;color:var(--sky);letter-spacing:0}
.st-sub{font-size:12.5px;line-height:1.45;color:rgba(255,255,255,.78)}
.st-next{margin-top:auto;font-size:12.5px;color:rgba(255,255,255,.7);padding-top:10px;border-top:1px solid var(--st-line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-next b{color:#fff}.st-next .opn{float:right;color:var(--k)}
.nx-chd{font-size:18px;font-weight:800;color:#fff}
.nx-ctx{font-size:13px;line-height:1.45;color:rgba(255,255,255,.82)}
.nx-crows{display:flex;flex-direction:column;gap:6px;min-width:0}
.nx-hlg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}.nx-hlg .hl{display:flex;flex-direction:column;gap:5px;min-width:0;padding:9px 11px;border-radius:6px;background:rgba(255,255,255,.06);border-left:3px solid var(--hk,var(--k));cursor:pointer}.nx-hlg .hl:hover{background:rgba(255,255,255,.1)}
.nx-hlg .t{display:flex;align-items:baseline;gap:8px;min-width:0}.nx-hlg .t b{flex:1;min-width:0;font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-hlg .t em{flex:0 0 auto;font-style:normal;font-size:12px;font-weight:800;color:var(--hk,var(--k))}.nx-hlg small{font-size:11.5px;line-height:1.35;color:rgba(255,255,255,.62);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.nx-hlg .st-meter{margin:0}
.nx-crows .cr{display:flex;align-items:baseline;gap:8px;min-width:0;padding:8px 11px;border-radius:6px;background:rgba(255,255,255,.06);border-left:3px solid var(--k)}
.nx-crows .cr b{flex:0 0 auto;max-width:48%;font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-crows .cr i{flex:1;min-width:0;font-style:normal;font-size:12.5px;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-crows .cr em{margin-left:auto;flex:0 0 auto;font-style:normal;font-size:12.5px;font-weight:800;color:var(--k)}
.st-meter{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;flex:0 0 auto}
.st-meter i{display:block;height:100%;background:var(--k);border-radius:3px}
.st-act{align-self:flex-start;height:30px;padding:0 12px;border:1px solid rgba(116,191,235,.45);border-radius:6px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.st-tile .mic-row{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap}
.st-tile .mic-ep{flex:1 1 180px;min-width:0;display:flex;flex-direction:column;gap:2px}.st-tile .mic-ep b{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.st-tile .mic-ep small{font-size:12.5px;color:rgba(255,255,255,.7)}
.st-tile .mic-cd{display:flex;gap:6px}
.st-tile:not(.sz-w):not(.sz-b) .mic-row.mic-stack{flex-shrink:0;flex-direction:column;align-items:stretch;gap:9px}.st-tile .mic-row.mic-stack .mic-ep{flex:0 0 auto}.st-tile .mic-row.mic-stack .mic-ep b{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25}.st-tile .mic-row.mic-stack .mic-cd span{flex:1}
.st-tile.tight{row-gap:6px}.st-tile.tight .st-big{font-size:32px}.st-tile.tight .st-next{padding-top:6px}.st-tile.tight .nx-fgr{gap:5px}.st-tile.tight .nx-fgr .nx-fg{padding-top:5px;padding-bottom:5px}.st-tile.tight .nx-glance{-webkit-line-clamp:2}
.st-top .nx-tsym{order:-1;flex:0 0 auto;width:17px;height:17px;color:var(--k);opacity:.9}.st-top .nx-tsym svg{width:100%;height:100%;display:block}
.nx-syl .nx-fg.big span{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25}
.nx-glance{font-size:12.5px;line-height:1.4;color:rgba(255,255,255,.78);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;flex:0 0 auto}.nx-glance.sm{-webkit-line-clamp:2;font-size:12px}
.st-tile.sz-t .nx-fgr .nx-fg span{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25}
.nx-bars .bc .dn{display:block;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);line-height:1;margin-top:1px}
.st-tile.t-sys.sz-t .nx-fgr .nx-fg span{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25}
.st-tile.t-sys.sz-s .nx-sysh{flex:1 1 auto;align-items:center}
.st-tile.nx-calm{justify-content:center}.st-tile.nx-calm .st-top{position:absolute;top:16px;left:18px;right:18px}
.nx-dir .kr{flex-direction:column;align-items:stretch;gap:1px}.nx-dir .kr b{font-size:12.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-dir .kr span{font-size:11.5px;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-sysh .nx-fgr.side{flex:1.3 1 0;min-width:0;grid-template-columns:repeat(auto-fit,minmax(110px,1fr))}.nx-sysh .nx-fgr.side .nx-fg span{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.nx-pl2.two{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px}.nx-kl2 .kr.late b{color:#ff8a7a}
.nx-sysh .nx-fgr.side{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.nx-sysh .nx-fgr.side .nx-fg{padding:7px 9px}.nx-sysh .nx-fgr.side .nx-fg b{font-size:19px}
.st-tile.sz-t .mtd{flex-direction:column;gap:10px}.st-tile.sz-t .mtd-cal{flex:0 0 auto;width:64px}.st-tile.sz-t .mtd-m{width:100%}
.st-tile.t-findtime.sz-s .nx-ftv b{font-size:15px}.st-tile.t-findtime.sz-w .nx-ftv{display:grid;grid-template-columns:1fr auto;column-gap:10px;align-items:center}.st-tile.t-findtime.sz-w .nx-ftv > *:not(.nx-ftb){grid-column:1}.st-tile.t-findtime.sz-w .nx-ftv .nx-ftb{grid-column:2;grid-row:1 / span 3}
.nx-hlg .t em{max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-tile.nx-calm-auto{justify-content:center}.st-tile.nx-calm-auto > .st-top{position:absolute;top:16px;left:18px;right:18px}.st-tile.nx-calm-auto > .st-next{position:absolute;bottom:16px;left:18px;right:18px;margin-top:0}
.st-tile.sz-t .nx-fgr .nx-fg.long{display:flex;flex-direction:column;align-items:flex-start;gap:1px}.st-tile.sz-t .nx-fgr .nx-fg.long b{font-size:20px}
.st-tile.sz-t .mtd-r{flex-wrap:wrap;row-gap:0}.st-tile.sz-t .mtd-r .nm{flex:1 0 100%;order:3}.st-tile.sz-t .mtd-r .st{margin-left:auto}
.nx-hlg{min-width:0;max-width:100%;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))}.nx-hlg .hl{min-width:0;max-width:100%;overflow:hidden}
.st-tile .mic-locw{font-size:12.5px;line-height:1.35;margin-top:-4px}
/* Small and Tall tiles: the countdown stays beside the date, and the place line takes at most two lines */
.st-tile:not(.sz-w):not(.sz-b) .mic-row{flex-wrap:nowrap;gap:10px;align-items:center}.st-tile:not(.sz-w):not(.sz-b) .mic-ep{flex:1 1 0}.st-tile:not(.sz-w):not(.sz-b) .mic-loc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.st-tile .mic-cd span{background:rgba(0,0,0,.25);border:1px solid var(--st-line);border-radius:8px;padding:5px 8px;text-align:center;min-width:50px}
.st-tile .mic-cd b{display:block;font-size:20px;line-height:1.1}
.st-tile .mic-cd small{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.st-tile .mic-steps{display:flex;flex-wrap:wrap;gap:5px}.st-tile .mic-steps span{font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;background:rgba(255,255,255,.08);border:1px solid var(--st-line);color:rgba(255,255,255,.85)}
.st-tile .ring{position:relative;width:110px;height:110px;align-self:center}
.st-tile .ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.st-tile .ring circle{fill:none;stroke:rgba(255,255,255,.12);stroke-width:8}
.st-tile .ring circle.rv{stroke:var(--k);stroke-linecap:round}
.st-tile .ring div{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.st-tile .ring b{font-size:30px;line-height:1}.st-tile .ring small{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.nx-ag{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px}
.nx-ag .ae{display:flex;gap:8px;align-items:baseline;padding:5px 8px;border-radius:5px;background:rgba(255,255,255,.05);border-left:3px solid var(--k);font-size:12.5px;min-width:0}
.nx-ag .ae .t{flex:0 0 auto;font-weight:700;color:var(--k);font-size:11px}.nx-ag .ae .n{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-ag .ae.past{opacity:.45}.nx-ag .ae.on{background:rgba(43,182,115,.18);border-left-color:#2bb673}.nx-ag .ae.more{border:0;background:none;color:rgba(255,255,255,.6)}
.nx-env{position:relative;width:76px;height:52px;color:var(--k)}
.nx-env svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:3;stroke-linejoin:round}
.nx-env b{position:absolute;right:-10px;top:-8px;min-width:24px;height:24px;padding:0 6px;border-radius:5px;background:#c94a3b;color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center}
.nx-avrow{display:flex;flex-wrap:wrap;gap:8px}
.nx-avrow .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700;box-shadow:0 0 0 2px rgba(255,255,255,.15)}
.st-tile .nx-dot{border-color:#0d2b40;width:12px;height:12px}
.nx-prj{display:flex;flex-direction:column;gap:5px;width:100%;padding:0;border:0;background:none;font:inherit;color:#fff;text-align:left;cursor:pointer}
.nx-prj .tp{display:flex;gap:8px;font-size:12.5px}.nx-prj .tp b{flex:1;min-width:0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-prj .tp span{color:rgba(255,255,255,.7);font-weight:700}
.nx-prj:hover .tp b{color:var(--sky)}
.nx-prj .pn{display:flex;gap:8px;align-items:baseline;padding:5px 8px;border-radius:5px;background:rgba(255,255,255,.06);font-size:12px;min-width:0}.nx-prj .pn b{flex:0 0 auto;color:var(--rc);font-size:11px}.nx-prj .pn span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,.85)}.nx-prj .pn em{font-style:normal;flex:0 0 auto;font-size:11px;color:rgba(255,255,255,.55)}
.nx-bars{display:flex;gap:10px;align-items:stretch;flex:1 1 104px;min-height:104px;max-height:320px}.st-tile.sz-s .nx-bars{flex-basis:60px;min-height:60px;gap:6px}
.st-tile.sz-s .ring{width:84px;height:84px}.st-tile.sz-s .ring b{font-size:24px}
.nx-bars .bc{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px}.nx-bars .bc .bw{flex:1 1 0;min-height:0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px}
.nx-bars .bc i{display:block;width:100%;max-width:46px;border-radius:4px 4px 2px 2px;background:linear-gradient(180deg,var(--k),color-mix(in srgb,var(--k) 45%,transparent))}
.nx-bars .bc b{font-size:11px;color:rgba(255,255,255,.8)}.nx-bars .bc span{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.55)}
.nx-bars .bc.on span{color:var(--sky)}
.nx-wn{display:flex;gap:8px;align-items:center;font-size:12.5px;min-width:0}.nx-wn span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-wn .av{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700;font-size:9px}
.nx-bgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.nx-bgrid span{padding:7px 9px;border-radius:6px;background:rgba(255,255,255,.07);border:1px solid var(--st-line);font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-sysb{display:flex;gap:16px;align-items:center;min-width:0}
.nx-sysh{display:flex;gap:14px;align-items:center;min-width:0}
.nx-sym.sm{width:52px;height:52px;padding:9px;border-radius:12px}
.nx-syl{flex:1;min-width:0;container-type:inline-size}
.nx-ftpk{display:inline-flex;align-items:center;justify-content:center;text-align:center;line-height:1.2;margin-left:4px;padding:5px 10px;border-radius:6px;border:1px dashed rgba(255,255,255,.35);background:transparent;color:rgba(255,255,255,.85);font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.nx-ftpk:hover{border-color:var(--k,#74bfeb);color:#fff}.nx-ftpk svg{width:12px;height:12px}
.nx-ftd{width:min(560px,94vw)}
.nx-ftml{display:block;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.55);margin:2px 0 2px}.nx-ftmore .kr b{min-width:86px}
.nx-ftdh h2{margin:0 0 4px}.nx-ftdh p{margin:0 0 12px;color:var(--ink-2);font-size:13.5px}
.nx-ftdw{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}
.nx-ftc{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 3px;border-radius:6px;background:var(--surface-2,#f6fafd);border:1px solid var(--border);font-size:13px;font-weight:600;color:var(--ink)}
.nx-ftdl{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}.nx-ftdl b{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.nx-ftdt{display:flex;flex-direction:column;gap:6px;max-height:min(46vh,420px);overflow:auto;padding-right:2px}
.nx-ftdd{margin-top:6px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.nx-ftr{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}
.nx-ftr b{font-size:14px;color:var(--ink);font-variant-numeric:tabular-nums}.nx-fte{font-size:12px;color:var(--ink-3)}.nx-ftr .sp{flex:1}
.nx-ftn{margin:6px 0;color:var(--ink-2);font-size:13.5px}
.mic-loc{display:block;margin-top:3px;color:var(--k,#e86f5a)!important;font-weight:700}
.mtd{display:flex;gap:14px;align-items:flex-start;min-width:0;min-height:0}
.mtd-cal{flex:0 0 60px;border-radius:11px;overflow:hidden;text-align:center;background:rgba(255,255,255,.07);border:1px solid color-mix(in srgb,var(--k,#74bfeb) 50%,transparent);box-shadow:0 8px 18px -12px var(--k,#74bfeb)}
.mtd-cal i{display:block;font-style:normal;font-size:10px;font-weight:800;letter-spacing:.14em;padding:3px 0 2px;background:var(--k,#74bfeb);color:#14203a}
.mtd-cal b{display:block;font-size:27px;font-weight:800;line-height:1.05;padding-top:5px;color:#fff;font-variant-numeric:tabular-nums}
.mtd-cal small{display:block;font-size:9.5px;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,.62);padding:1px 0 6px}
.mtd-m{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.st-tile:has(.mtd){gap:8px}
.mtd-h{font-size:19px;font-weight:800;line-height:1.15;color:#fff;letter-spacing:-.01em}
.mtd-s{font-size:12.5px;line-height:1.4;color:rgba(255,255,255,.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mtd-s b{color:var(--k,#74bfeb);font-weight:700}
.mtd-ls{display:flex;flex-direction:column;gap:4px;margin-top:3px;min-width:0}
.mtd-r{display:flex;align-items:center;gap:10px;min-width:0;padding:4px 9px;border-radius:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);font-size:13px;transition:background .3s,border-color .3s,opacity .3s}
.mtd-r[hidden],.st-next[hidden],.mic-steps[hidden]{display:none!important}
/* Wide: the meetings sit side by side under the heading, so the tile stays Wide-sized */
/* Wide: one meeting per line with its full name (as many as fit); the heading already says how many there are */
.st-tile.sz-w .mtd-m{gap:3px}.st-tile.sz-w .mtd-ls{gap:3px;margin-top:0}
.st-tile.sz-w .mtd-r{padding:2px 9px;line-height:1.3}.st-tile.sz-w .mtd-r .tm{min-width:62px}
.st-tile.sz-w .mtd-m:has(.mtd-ls) > .mtd-s{display:none}
.mtd-r .tm{flex:0 0 auto;min-width:76px;font-size:11.5px;font-weight:700;color:var(--k,#74bfeb);font-variant-numeric:tabular-nums;white-space:nowrap}
.mtd-r .nm{flex:1;min-width:0;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mtd-r .st{flex:0 0 auto;font-size:9.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,.13);color:rgba(255,255,255,.85);white-space:nowrap}
.mtd-r .st[hidden]{display:none}
.mtd-r.now{background:color-mix(in srgb,var(--k,#74bfeb) 22%,transparent);border-color:var(--k,#74bfeb)}
.mtd-r.now .st{display:inline-flex;align-items:center;gap:5px;background:var(--k,#74bfeb);color:#14203a}
.mtd-r.now .st::before{content:"";width:6px;height:6px;border-radius:50%;background:#14203a;animation:mtdPulse 1.8s ease-in-out infinite}
.mtd-r.done{opacity:.45}.mtd-r.x{opacity:.45}.mtd-r.x .nm{text-decoration:line-through}
.mtd-more{font-size:11.5px;font-weight:700;color:rgba(255,255,255,.6);padding-left:9px}
.mms{display:flex;gap:14px;min-height:0;flex:0 0 auto}.mms-l{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:7px}.mms-r{flex:1.15 1 0;min-width:0;display:flex;flex-direction:column;gap:8px}
.mms .st-big small{color:var(--k);font-size:14px;font-weight:700;letter-spacing:0}
.mms-mv{font-size:11.5px;font-weight:700;color:#5fd3a0;margin-top:-3px}
.mms-bar{display:flex;gap:2px;height:8px;border-radius:4px;overflow:hidden;flex:0 0 auto}.mms-bar i{display:block;min-width:4px}
.mms-lg{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;font-size:11.5px;color:rgba(255,255,255,.72)}.mms-lg span{display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.mms-lg i{width:7px;height:7px;border-radius:2px;flex:0 0 auto}.mms-lg b{color:#fff;font-weight:800}
.mms-a{display:flex;flex-direction:column;gap:4px}.mms-ar{display:flex;align-items:baseline;gap:7px;padding:4px 9px;border-radius:6px;background:rgba(255,255,255,.07);cursor:pointer;font-size:12px;color:rgba(255,255,255,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.mms-ar:hover{background:rgba(255,255,255,.13)}.mms-ar b{font-size:13.5px;font-weight:800;color:#fff;min-width:14px}.mms-ar.bad b{color:#ff8a7a}.mms-ar.warn b{color:#f5b85a}.mms-ar.ok b{color:#5fd3a0}
.mms.sm .mms-lg{display:none}.mms.sm .mms-l{gap:6px}.mms.sm .mms-a{flex-direction:row;gap:5px}.mms.sm .mms-ar{padding:2px 7px;font-size:11px;gap:4px;flex:0 1 auto}.st-tile:has(.mms.sm) .st-big{font-size:36px}.st-tile:has(.mms.sm) .st-next{padding-top:7px}.mms.sm .mms-ar b{min-width:0;font-size:12.5px}
.mms-pl{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:8px;background:rgba(167,139,250,.12);border-left:3px solid var(--k);cursor:pointer;min-width:0;flex:0 0 auto}.st-tile > .mms-pl{margin-top:10px}.mms-pl:hover{background:rgba(167,139,250,.2)}
.mms-pl em{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--k)}.mms-pl b{font-size:12.5px;font-weight:700;color:#fff;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.mms-pl small{font-size:11px;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mms.tl:not(.wd){flex-direction:column}.mms.tl .mms-l{flex:0 0 auto}
.st-pill.mms-you{background:var(--k);color:#1b1440;cursor:pointer}
.mtd-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;min-width:0}
.mtd-chip{display:inline-flex;align-items:center;gap:7px;max-width:100%;min-width:0;padding:2px 11px 2px 2px;border-radius:6px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);font-size:12.5px;color:#fff}
.mtd-chip>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.mtd-chip i{flex:0 0 22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.02em;background:color-mix(in srgb,var(--k,#74bfeb) 40%,transparent);color:#fff}
.mtd-chip.more{padding:3px 10px;font-weight:700;color:rgba(255,255,255,.7)}
.mtd.sm{gap:11px}.mtd.sm .mtd-cal{flex-basis:50px}.mtd.sm .mtd-cal b{font-size:22px}.mtd.sm .mtd-h{font-size:15.5px}
.st-pill.live{background:var(--k,#74bfeb);color:#14203a}
@keyframes mtdPulse{0%,100%{opacity:1}50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.mtd-r.now .st::before{animation:none}}
.nx-day{font-size:14px;line-height:1.45;color:rgba(255,255,255,.85);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.nx-skel{display:flex;flex-direction:column;gap:7px;padding:2px 0}.nx-skel i{display:block;height:12px;border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,.07),rgba(255,255,255,.16),rgba(255,255,255,.07));background-size:200% 100%;animation:nxsk 1.4s ease-in-out infinite}.nx-skel .a{width:55%;height:30px}.nx-skel .b{width:80%}.nx-skel .c{width:40%}@keyframes nxsk{0%{background-position:100% 0}100%{background-position:-100% 0}}@media (prefers-reduced-motion:reduce){.nx-skel i{animation:none}}.nx-syl .nx-fg.big b{font-size:min(34px,15.5cqi)}.nx-syl .st-big{font-size:min(40px,18cqi)}
.nx-fg{display:flex;flex-direction:column;gap:1px;min-width:0}
.nx-fg b{font-size:20px;font-weight:800;letter-spacing:-.01em;color:#fff;white-space:nowrap}
.nx-fg span{font-size:12px;font-weight:600;color:rgba(255,255,255,.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-fg small{font-size:11.5px;color:rgba(255,255,255,.55);line-height:1.35}
.nx-fg.big b{font-size:34px;line-height:1.05}.nx-fg.big span{font-size:13px;color:var(--k)}
.nx-fg.good b{color:#7ee2a8}.nx-fg.bad b{color:#ff9b8a}
.nx-fgr{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
/* Tall tiles: each number is one compact row (number, then what it is) so they all fit without trimming */
.st-tile.sz-t .nx-fgr{grid-template-columns:minmax(0,1fr);gap:6px}
.st-tile.sz-t .nx-fgr .nx-fg{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:10px;align-items:center;padding:7px 11px}
.st-tile.sz-t .nx-fgr .nx-fg b,.st-tile.sz-t .nx-fgr .nx-fg.big b{grid-row:1 / span 2;font-size:24px;line-height:1}
.st-tile.sz-t .nx-fgr .nx-fg span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-tile.sz-t .nx-fgr .nx-fg small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-fgr .nx-fg{padding:9px 11px;border-radius:8px;background:rgba(0,0,0,.2);border:1px solid var(--st-line)}
.nx-fgr .nx-fg{container-type:inline-size}.nx-fgr .nx-fg b{font-size:min(20px,15cqi)}.nx-fgr .nx-fg.big b{font-size:min(34px,15.5cqi)}
.nx-ggr{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px}
.nx-gg{position:relative;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.2);border:1px solid var(--st-line);min-width:0}
.nx-gg svg{flex:0 0 auto;width:44px;height:44px}.nx-gg .tr{fill:none;stroke:rgba(255,255,255,.12);stroke-width:10}.nx-gg .pg{fill:none;stroke:var(--k);stroke-width:10;stroke-linecap:round}
.nx-gg.full .pg{stroke:#7ee2a8}
.nx-gg .c{position:absolute;left:10px;top:8px;width:44px;height:44px;display:flex;align-items:center;justify-content:center}.nx-gg .c b{font-size:10px;font-weight:800;color:#fff}
.nx-gg .l{display:flex;flex-direction:column;min-width:0}.nx-gg .l span{font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-gg .l small{font-size:11px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-gg.big{flex-direction:column;align-items:center;text-align:center;padding:12px 8px}.nx-gg.big svg{width:76px;height:76px}.nx-gg.big .c{left:50%;top:12px;width:76px;height:76px;transform:translateX(-50%)}.nx-gg.big .c b{font-size:15px}.nx-gg.big .l{align-items:center}
.st-tile.lv-hi.t-keydate{justify-content:center}.st-tile.lv-hi.t-keydate .st-top{position:absolute;top:16px;left:18px;right:18px}
/* Small: the ring sits beside the date's name, under the label, so nothing touches */
.st-tile.sz-s.lv-hi.t-keydate{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;column-gap:14px;padding-top:42px}
.st-tile.sz-s.lv-hi.t-keydate .ring{width:80px;height:80px;align-self:center}
.st-tile.sz-s.lv-hi.t-keydate .nx-kdt{text-align:left}
.nx-sym{flex:0 0 auto;width:64px;height:64px;padding:10px;border-radius:14px;background:color-mix(in srgb,var(--k) 16%,transparent);border:1px solid color-mix(in srgb,var(--k) 40%,transparent);color:var(--k);transition:transform .25s}
.st-tile:hover .nx-sym{transform:scale(1.06) rotate(-3deg)}
.nx-sysv{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.nx-tiles.editing .st-tile{cursor:grab;animation:nxWig .9s ease-in-out infinite alternate}
.nx-tiles.editing .st-tile:nth-child(2n){animation-delay:.3s}
@keyframes nxWig{from{transform:rotate(-.4deg)}to{transform:rotate(.4deg)}}
.st-tile.nx-lift{opacity:.35;animation:none!important}
.nx-dropmark{position:absolute;box-sizing:border-box;border:2px dashed var(--sky);border-radius:12px;background:rgba(116,191,235,.12);pointer-events:none;z-index:5;transition:left .12s ease,top .12s ease}
.st-tile.nx-ghost{box-shadow:0 18px 40px rgba(6,32,47,.35)!important;opacity:.95;animation:none!important;cursor:grabbing}
html.nx-tdragging,html.nx-tdragging *{cursor:grabbing!important;user-select:none!important}
html.nx-tdragging .nx-tiles .st-tile{animation:none!important}


.nx-tctl{position:absolute;top:8px;right:8px;z-index:3;display:flex;gap:4px}
.nx-tcb{height:26px;padding:0 9px;border:1px solid rgba(255,255,255,.3);border-radius:5px;background:rgba(6,32,47,.85);color:#fff;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.nx-tcb.x{width:26px;padding:0;font-size:16px}.nx-tcb:hover{background:var(--sky);color:#06202f}
.nx-tadd{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:150px;border:2px dashed var(--border-strong);border-radius:12px;background:transparent;font:inherit;color:var(--ink-3);cursor:pointer}
.nx-tadd b{font-size:30px;line-height:1}.nx-tadd:hover{border-color:var(--c1);color:var(--c1)}
.nx-cat{width:min(860px,100%)}
.nx-ctg{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr));gap:8px}
.nx-cti{display:flex;align-items:center;gap:10px;padding:10px;height:72px;box-sizing:border-box;overflow:hidden;border:1px solid var(--border);border-radius:8px;background:var(--surface);font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.nx-cti:hover{border-color:var(--k)}.nx-cti.on{background:var(--sky-wash)}
.nx-cti .ci{flex:0 0 auto;width:38px;height:38px;padding:7px;border-radius:9px;background:linear-gradient(160deg,#10324a,#0b2436);color:var(--k)}
.nx-cti .ci svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.nx-cti .tx{flex:1;min-width:0;display:flex;flex-direction:column}.nx-cti .tx b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-cti .tx small{font-size:11.5px;color:var(--ink-3);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nx-cti .ci{position:relative}.nx-cti .ci .cnt{position:absolute;top:-6px;right:-6px;min-width:17px;height:17px;padding:0 4px;border-radius:4px;background:var(--c1);color:#fff;font-style:normal;font-size:10.5px;font-weight:800;line-height:17px;text-align:center;box-shadow:0 0 0 2px var(--surface)}
.nx-cgrp{display:flex;flex-wrap:wrap;gap:6px}.nx-cgrp span{display:inline-flex;align-items:baseline;gap:5px;padding:4px 9px;border-radius:5px;background:rgba(255,255,255,.08);font-size:12px;color:rgba(255,255,255,.8)}.nx-cgrp b{font-size:13px;color:var(--k)}
.nx-ted{width:min(1040px,100%)!important;max-height:calc(100vh - 32px);display:flex;flex-direction:column;padding:0!important;overflow:hidden}
.nx-tedh{padding:18px 22px 6px}.nx-tedh h2{margin:0 0 3px!important}.nx-tedh p{margin:0;font-size:13px;color:var(--ink-2)}
.nx-tedw{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:18px;padding:12px 22px;overflow:auto}
.nx-tedp{position:sticky;top:0;align-self:start;max-height:calc(100vh - 210px);overflow:auto;scrollbar-width:thin}.nx-tedl{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:8px}
.nx-tedg{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-auto-rows:minmax(150px,auto)!important;pointer-events:none}
.nx-tedg .st-tile.sz-s{grid-column:span 1}.nx-tedg .st-tile{animation:none!important}
.nx-teds{margin-bottom:16px}.nx-teds h3{margin:0 0 2px;font-size:14px;color:var(--ink)}.nx-teds>p{margin:0 0 8px;font-size:12px;color:var(--ink-3)}
.nx-tedw8{padding:12px;border:1px dashed var(--border-strong);border-radius:8px;font-size:12.5px;color:var(--ink-2)}
.nx-topts{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
.nx-topt{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:78px;padding:9px 11px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface);font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.nx-topt:hover{border-color:var(--border-strong)}.nx-topt.on{border-color:var(--c1);background:var(--sky-wash);box-shadow:inset 0 0 0 1px var(--c1)}
.nx-topt{min-width:0;overflow:hidden}
.nx-topt .t{max-width:100%;font-size:12.5px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.nx-topt .v{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:5px;max-width:100%;min-width:0}
.nx-topt .v b{max-width:100%;font-size:18px;font-weight:800;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nx-topt .v small{min-width:0;max-width:100%;font-size:11px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nx-topt .n{max-width:100%;font-size:11px;color:var(--ink-3);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.nx-tchk{display:flex;flex-wrap:wrap;gap:6px}.nx-tchk button{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface);font:inherit;font-size:12.5px;color:var(--ink);cursor:pointer}
.nx-tchk i{width:14px;height:14px;border:1.5px solid var(--border-strong);border-radius:3px}.nx-tchk button.on{border-color:var(--c1);background:var(--sky-wash)}.nx-tchk button.on i{background:var(--c1);border-color:var(--c1)}.nx-tchk b{font-size:12px;color:var(--ink-3)}
.nx-tseg{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));border:1px solid var(--border);border-radius:8px;overflow:hidden}
.nx-tseg button{display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 6px;border:0;border-right:1px solid var(--border);background:var(--surface);font:inherit;color:var(--ink);cursor:pointer}.nx-tseg button:last-child{border-right:0}
.nx-tseg button b{font-size:13px}.nx-tseg button small{font-size:10.5px;color:var(--ink-3)}.nx-tseg button.on{background:var(--navy,#0d314c);color:#fff}.nx-tseg button.on small{color:rgba(255,255,255,.75)}
.nx-tedf{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:12px 22px;border-top:1px solid var(--rule);background:var(--surface-2)}.nx-tedf .l,.nx-tedf .r{display:flex;gap:8px;flex-wrap:wrap}
.btn.danger{color:var(--bad)}
@media(max-width:760px){.nx-tedw{grid-template-columns:1fr}.nx-tedp{position:static}}
.nx-cti em{font-style:normal;flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--c1)}.nx-cti.on em{color:var(--good)}
/* your dashboard is always the 4-column grid you arranged — the same spots and sizes on any computer screen;
   only when the space is phone-narrow do the tiles stack, in your order */
@media(max-width:900px){.nx-hero{grid-template-columns:minmax(0,1fr)}}
.nx-dash{container-type:inline-size}
@container (max-width:600px){.nx-tiles{grid-template-columns:minmax(0,1fr)!important}.nx-tiles .st-tile.sz-w,.nx-tiles .st-tile.sz-b{grid-column:auto!important}.nx-tiles .st-tile.sz-t,.nx-tiles .st-tile.sz-b{grid-row:auto}}
@media(max-width:640px){.nx-dash{padding:12px 12px 30px}.nx-hhi h1{font-size:24px}.nx-hhi p{font-size:14px}.nx-sw{display:flex;overflow-x:auto}.nx-swd{flex:0 0 96px}.nx-tiles{grid-template-columns:minmax(0,1fr)}.nx-ag{grid-template-columns:minmax(0,1fr)}.nx-dvr{margin-left:0}}
.st-tile.sz-w{grid-column:span 2}.st-tile.sz-t{grid-row:span 2}.st-tile.sz-b{grid-column:span 2;grid-row:span 2}
.nx-tiles.nx-pack{grid-auto-rows:84px;gap:10px}
.nx-tiles.nx-pack > .st-tile{min-height:0}
.nx-tiles.nx-pack.fixed > .st-tile{overflow:hidden}
.nx-tiles{grid-auto-flow:row dense}
.nx-ag.one{grid-template-columns:minmax(0,1fr)}
.nx-tl2{display:flex;flex-direction:column;gap:4px}
.nx-tl2 .tr{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,.06);font-size:12.5px;min-width:0;transition:opacity .3s,transform .3s}
.nx-tl2 .tr:hover{background:rgba(255,255,255,.12)}.nx-tl2 .tr.done{opacity:0;transform:translateX(20px)}
.nx-tl2 .ck{flex:0 0 auto;width:18px;height:18px;padding:0;border:1.5px solid rgba(255,255,255,.45);border-radius:50%;background:transparent;color:transparent;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.nx-tl2 .ck svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:3}.nx-tl2 .ck:hover{border-color:#3ccb7f;color:#3ccb7f}
.nx-tl2 .tt{flex:1;min-width:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3;word-break:break-word}.nx-tl2 .dd{flex:0 0 auto;font-size:11px;color:rgba(255,255,255,.6);font-weight:700}.nx-tl2 .tr.late .dd{color:#ff8a7a}
.nx-ml2,.nx-pl2,.nx-kl2{display:flex;flex-direction:column;gap:4px}
.nx-ml2 .mr,.nx-pl2 .pr,.nx-kl2 .kr{display:flex;align-items:baseline;gap:8px;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,.06);font-size:12.5px;min-width:0;cursor:pointer}
.nx-ml2 .mr:hover,.nx-pl2 .pr:hover,.nx-kl2 .kr:hover{background:rgba(255,255,255,.12)}
.nx-ml2 b,.nx-pl2 b{flex:0 0 auto;max-width:40%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-ml2 span,.nx-pl2 span,.nx-kl2 span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,.8)}
.nx-pl2 .pr{align-items:center}.nx-pl2 .nx-dot{position:static;flex:0 0 auto;border:0}
.nx-kl2 b{flex:0 0 auto;min-width:34px;color:var(--k)}
.nx-kdt{font-size:14px;font-weight:700;text-align:center;line-height:1.3}.nx-kdt small{display:block;font-size:12px;font-weight:500;color:rgba(255,255,255,.65)}
.nx-ftv{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:8px;background:rgba(0,0,0,.22);border:1px solid var(--st-line)}
.nx-gaps{display:flex;flex-direction:column;gap:6px}.nx-gaps small{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.6)}
.nx-gaps .gw{display:flex;flex-wrap:wrap;gap:6px}.nx-gaps .gw span{padding:6px 10px;border-radius:6px;background:repeating-linear-gradient(135deg,rgba(60,203,127,.16) 0 7px,rgba(60,203,127,.06) 7px 13px);border:1px solid rgba(60,203,127,.35);font-size:12px;color:rgba(255,255,255,.8)}.nx-gaps .gw b{color:#7ee2b8;margin-right:4px}
.nx-ftv span{font-size:12px;color:rgba(255,255,255,.7)}
.nx-ftv small{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.6)}.nx-ftv b{font-size:18px;color:var(--k)}
.nx-ftv .nx-ftb{align-self:flex-start;margin-top:6px;height:28px;background:var(--k,#74bfeb);border-color:var(--k,#74bfeb);color:#06202f}
.st-tile.sz-b .nx-sym,.st-tile.sz-t .nx-sym{width:76px;height:76px}
.st-tile.sz-b .st-big{font-size:52px}
@media(max-width:900px){.st-tile.sz-b,.st-tile.sz-w{grid-column:span 2}}
@media(max-width:640px){.st-tile.sz-w,.st-tile.sz-b{grid-column:auto}.st-tile.sz-t,.st-tile.sz-b{grid-row:auto}}
.nx-pgxnote{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border:1px solid var(--border);border-left:3px solid var(--c1);border-radius:6px;background:var(--sky-wash);font-size:12.5px;color:var(--ink-2)}
.nx-pgxnote span{flex:1 1 280px}
/* email, people, week */
.nx-mrow{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--rule);background:var(--surface);cursor:pointer}
.nx-mrow:last-child{border-bottom:0}.nx-mrow:hover{background:var(--surface-2)}
.nx-mrow .mi{flex:0 0 auto;width:20px;height:20px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:var(--ink-3);background:var(--surface-3)}
.nx-mrow .mi.flag{color:#fff;background:var(--bad)}.nx-mrow .mi.imp{color:#fff;background:#e8833a}
.nx-mrow .tx{flex:1;min-width:0}.nx-mrow .tp{display:flex;gap:8px;align-items:baseline}.nx-mrow .tp b{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-mrow.unread .tp b,.nx-mrow.unread .sj{font-weight:800}
.nx-mrow .ag{margin-left:auto;flex:0 0 auto;font-size:11px;color:var(--ink-3)}
.nx-mrow .sj{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-sygrp .nx-row{cursor:pointer}.nx-sygrp .nx-row:hover{background:var(--surface-2)}
.nx-syck{flex:0 0 auto;margin:0 2px;width:18px;height:18px;padding:0;border:2px solid var(--border-strong);border-radius:4px;background:var(--surface);cursor:pointer}.nx-syck:hover{border-color:var(--good,#2bb673);background:var(--sky-wash)}
.nx-syd{flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--ink-3)}.nx-syd.bad{color:var(--bad)}.nx-syd.warn{color:#c77700}
.nx-mrow{position:relative}.nx-mrow .ac{flex:0 0 auto;display:flex;gap:4px}.nx-mrow .nx-ib{width:26px;height:26px}.nx-mrow .nx-ib svg{width:15px;height:15px}
.nx-mrow .ox{display:none}
@media(hover:hover){.nx-mrow:hover .ox,.nx-mrow:focus-within .ox{display:inline-flex}}
@media(hover:none){.nx-mrow .ox{display:inline-flex}.nx-mrow .ac{gap:3px}}
.nx-mrow .ox[title^="Delete"]:hover{color:var(--bad);border-color:var(--bad)}
.nx-mrow.pend{opacity:.62}.nx-mrow.pend .ag{color:var(--c1);font-weight:700}
.nx-mrow.err .mi{outline:2px solid var(--bad);outline-offset:1px}
.nx-items>.nx-panel{border:0;border-radius:0}
.nx-connect{display:flex;gap:12px;align-items:flex-start;padding:14px}
.nx-connect>svg{flex:0 0 auto;width:28px;height:28px;fill:none;stroke:var(--c1);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.nx-connect>div{display:flex;flex-direction:column;align-items:flex-start;gap:6px}.nx-connect b{font-size:13.5px;color:var(--ink)}.nx-connect span{font-size:12.5px;color:var(--ink-2);line-height:1.45}
.nx-morel{display:block;width:100%;padding:8px 14px;border:0;border-top:1px solid var(--rule);background:var(--surface);font:inherit;font-size:12.5px;font-weight:700;color:var(--c1);text-align:left;cursor:pointer}
.nx-win .ago.bad{color:var(--bad)}.nx-win .nx-avw .av{font-size:9px}
.nx-ppl{padding:6px 20px 30px}
.nx-sec{margin:14px 0 8px;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
.nx-pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr));gap:10px}
.nx-pgrid.big{grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr))}
.nx-pc2{display:flex;flex-direction:column;gap:9px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:inset 0 3px 0 var(--pc);transition:box-shadow .15s,transform .15s}
.nx-pc2:hover{transform:translateY(-1px);box-shadow:inset 0 3px 0 var(--pc),0 8px 20px rgba(13,49,76,.10)}
.nx-pc2 .tp{display:flex;align-items:center;gap:10px;padding:0;border:0;background:none;font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.nx-pc2 .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700}
.nx-pc2 .nm{display:flex;flex-direction:column;min-width:0}.nx-pc2 .nm b{font-size:14px}.nx-pc2 .nm small{font-size:12px;color:var(--ink-3)}
.nx-pc2.free .nm small{color:var(--good)}.nx-pc2.busy .nm small{color:var(--bad)}.nx-pc2.away .nm small{color:var(--warn)}
.nx-pc2 .ld span{font-size:12px;font-weight:600;color:var(--ink-2)}
.nx-pc2 .br,.nx-wh .br{height:5px;border-radius:3px;background:var(--surface-3);overflow:hidden;margin-top:4px}.nx-pc2 .br i,.nx-wh .br i{display:block;height:100%;background:linear-gradient(90deg,var(--sky),var(--c1))}
.nx-pc2 .nums{display:flex;gap:6px}.nx-pc2 .n{display:inline-flex;align-items:baseline;gap:4px;padding:3px 9px;border:1px solid var(--rule);border-radius:5px;background:var(--surface-2)}
.nx-pc2 .n b{font-size:15px}.nx-pc2 .n small{font-size:11px;color:var(--ink-3)}.nx-pc2 .n.bad b{color:var(--bad)}
.nx-pc2 .nxl{border:1px solid var(--rule);border-radius:6px;overflow:hidden}.nx-pc2 .nxl .nx-row{min-height:34px;padding:0 10px 0 6px;font-size:12.5px}
.nx-pc2 .acts{display:flex;flex-wrap:wrap;gap:6px}
.nx-pprompt{display:flex;align-items:center;gap:14px;width:100%;margin:10px 0 4px;padding:14px 16px;border:1.5px dashed var(--c1);border-radius:8px;background:var(--sky-wash);font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.nx-pprompt>svg{flex:0 0 auto;width:30px;height:30px;fill:none;stroke:var(--c1);stroke-width:1.7;stroke-linecap:round}
.nx-pprompt span{flex:1;display:flex;flex-direction:column;gap:2px}.nx-pprompt b{font-size:14px}.nx-pprompt small{font-size:12.5px;color:var(--ink-2)}
.nx-pprompt em{font-style:normal;flex:0 0 auto;padding:7px 12px;border-radius:6px;background:var(--navy);color:#fff;font-size:12.5px;font-weight:700}
.nx-heat{display:grid;grid-template-columns:minmax(120px,1.2fr) repeat(5,minmax(60px,1fr)) minmax(100px,1fr);gap:4px;padding:10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow-x:auto}
.nx-heat .hh{font-size:11px;font-weight:700;color:var(--ink-3);text-align:center;padding:2px 0}.nx-heat .hh.on{color:var(--c1)}
.nx-heat .hn{display:flex;align-items:center;gap:8px;padding:2px 4px;border:0;border-radius:5px;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;text-align:left}
.nx-heat .hn:hover{background:var(--surface-2)}.nx-heat .hn .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700}
.nx-heat .hc{display:flex;align-items:center;justify-content:center;height:30px;border-radius:5px;font-size:12px;font-weight:700;color:var(--ink);background:color-mix(in srgb,var(--c1) calc(var(--a,0) * 70%),var(--surface-2))}
.nx-heat .hc.full{color:#fff}.nx-heat .hc.off{background:var(--warn-soft);color:var(--warn)}.nx-heat .hc.na{color:var(--ink-3)}
.nx-heat .hd{display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--ink-2)}.nx-heat .hd.bad{color:var(--bad)}
.nx-week{display:grid;grid-template-columns:minmax(190px,1.1fr) repeat(5,minmax(150px,1fr));gap:10px;padding:14px 20px 30px;align-items:start}
.nx-wcol{display:flex;flex-direction:column;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;min-height:340px;transition:background .15s,box-shadow .15s}
.nx-wcol.back{background:var(--surface);border-style:dashed}
.nx-wcol.today{border-color:var(--c1);box-shadow:0 0 0 1px var(--c1)}
.nx-wcol.past{opacity:.75}.nx-wcol.hol{background:var(--warn-soft)}
.nx-wh{display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid var(--rule)}
.nx-wh>b{font-size:13.5px}.nx-wh>small{font-size:11.5px;color:var(--ink-3)}
.nx-wh .tt{display:flex;flex-direction:column;align-items:center;line-height:1.05;min-width:30px}.nx-wh .tt small{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}.nx-wh .tt b{font-size:19px}
.nx-wcol.today .nx-wh .tt b{color:var(--c1)}
.nx-wh .inf{flex:1;min-width:0;font-size:11px;font-weight:600;color:var(--ink-3)}.nx-wh .hol{color:var(--warn);font-weight:700}
.nx-wkd{display:flex;flex-direction:column;gap:3px;padding:6px 8px 0}
.nx-wkd .kd{display:block;width:100%;padding:3px 7px;border:0;border-radius:4px;background:color-mix(in srgb,var(--c2) 15%,var(--surface));box-shadow:inset 3px 0 0 var(--c2);font:inherit;font-size:11.5px;font-weight:600;color:var(--ink);text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.nx-wb{display:flex;flex-direction:column;gap:6px;padding:8px}
.nx-wb .nx-row.nx-card .nx-pj{margin-left:0}
.nx-wb .nx-drope{padding:14px 8px;border:1.5px dashed var(--border-strong);border-radius:6px;text-align:center;background:transparent}
.nx-wsub{margin:4px 2px 0;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}.nx-wsub.bad{color:var(--bad)}
.nx-wev{display:flex;flex-direction:column;gap:3px;padding:2px 8px 10px}
.nx-wev .ev{display:flex;gap:6px;align-items:baseline;padding:4px 7px;border-radius:4px;background:var(--surface);border-left:3px solid var(--c1);font-size:11.5px;min-width:0}
.nx-wev .ev .t{flex:0 0 auto;font-weight:700;color:var(--c1);font-size:10.5px}.nx-wev .ev .n{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.nx-wev .ev.past{opacity:.5}.nx-wev .ev.tent{border-left-style:dashed}
.nx-wdone{font-size:11.5px;font-weight:700;color:var(--good);padding:2px 4px}
@media(max-width:640px){.nx-pprompt{display:flex;align-items:center;gap:14px;width:100%;margin:10px 0 4px;padding:14px 16px;border:1.5px dashed var(--c1);border-radius:8px;background:var(--sky-wash);font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.nx-pprompt>svg{flex:0 0 auto;width:30px;height:30px;fill:none;stroke:var(--c1);stroke-width:1.7;stroke-linecap:round}
.nx-pprompt span{flex:1;display:flex;flex-direction:column;gap:2px}.nx-pprompt b{font-size:14px}.nx-pprompt small{font-size:12.5px;color:var(--ink-2)}
.nx-pprompt em{font-style:normal;flex:0 0 auto;padding:7px 12px;border-radius:6px;background:var(--navy);color:#fff;font-size:12.5px;font-weight:700}
.nx-heat{display:grid;grid-template-columns:minmax(120px,1.2fr) repeat(5,minmax(60px,1fr)) minmax(100px,1fr);gap:4px;padding:10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow-x:auto}
.nx-heat .hh{font-size:11px;font-weight:700;color:var(--ink-3);text-align:center;padding:2px 0}.nx-heat .hh.on{color:var(--c1)}
.nx-heat .hn{display:flex;align-items:center;gap:8px;padding:2px 4px;border:0;border-radius:5px;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;text-align:left}
.nx-heat .hn:hover{background:var(--surface-2)}.nx-heat .hn .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700}
.nx-heat .hc{display:flex;align-items:center;justify-content:center;height:30px;border-radius:5px;font-size:12px;font-weight:700;color:var(--ink);background:color-mix(in srgb,var(--c1) calc(var(--a,0) * 70%),var(--surface-2))}
.nx-heat .hc.full{color:#fff}.nx-heat .hc.off{background:var(--warn-soft);color:var(--warn)}.nx-heat .hc.na{color:var(--ink-3)}
.nx-heat .hd{display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--ink-2)}.nx-heat .hd.bad{color:var(--bad)}
.nx-week{grid-template-columns:minmax(0,1fr);padding:12px;min-width:0}.nx-wcol.back{order:9}.nx-wcol{min-height:0}.nx-ppl{padding:4px 12px 24px}}
/* split + peek */
.nx-body.has-split{overflow:hidden;display:flex;flex-direction:column}
.nx-body.has-split>.nx-pband{flex:0 0 auto}
.nx-split{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,420px);height:100%}
.nx-sl{min-height:0;overflow:auto;border-right:1px solid var(--border);background:var(--surface)}
.nx-sl .nx-list{min-height:100%}
.nx-row.sel{background:color-mix(in srgb,var(--sky) 14%,var(--surface));box-shadow:inset 3px 0 0 var(--c1)}
.nx-peek{min-height:0;overflow:auto;background:var(--surface);padding:14px 18px 20px;display:flex;flex-direction:column;gap:12px}
/* Inbox: every mailbox, full width */
.nx-ibx{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr);height:100%}
.nx-ibm{min-height:0;overflow:auto;background:var(--surface)}
.nx-ibt{min-height:0;overflow:auto;background:var(--surface);padding-bottom:40px}
.nx-ibf{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--surface);border-bottom:1px solid var(--rule)}
.nx-ibf .nx-sg{height:28px}
.nx-ibh{margin-left:auto;font-size:11.5px;color:var(--ink-3)}
.nx-box .nx-gh{top:45px;padding-left:4px;cursor:pointer}
.nx-box.mine .nx-gh{background:var(--sky-wash)}
.nx-box.mine .nx-gh b{font-size:13.5px}
.nx-grip{display:inline-flex;align-items:center;justify-content:center;width:20px;height:26px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--ink-3);cursor:grab;touch-action:none}
.nx-grip svg{width:14px;height:14px;fill:currentColor}
.nx-grip:hover,.nx-grip:focus-visible{background:var(--surface-3);color:var(--ink)}
html.nx-boxing,html.nx-boxing *{cursor:grabbing!important;user-select:none}
html.nx-boxing .nx-box .nx-items,html.nx-boxing .nx-ibz{display:none}
html.nx-boxing .nx-box .nx-gh{position:static}
.nx-box.nx-boxdrag{position:relative;z-index:4;box-shadow:0 6px 22px rgba(6,32,47,.22);outline:2px solid var(--c1);outline-offset:-2px}
.nx-ibtag{font-size:10.5px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;color:var(--ink-3);border:1px solid var(--border);border-radius:4px;padding:1px 5px}
.nx-ibz{font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-box .nx-drope{padding-left:48px}
.nx-ibup{padding:12px 16px 30px;font-size:11.5px;color:var(--ink-3)}
.nx-ibsub{padding:6px 20px 4px 40px;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--ink-3);background:var(--surface)}
.nx-ibsub.bad{color:var(--bad)}.nx-ibsub.warn{color:#b8641d}
.nx-ibt .nx-gh{padding-left:8px}
.nx-ibl .nx-sg{height:30px}
a.nx-mini{text-decoration:none}
@media(min-width:1100px){.nx-box .nx-mrow{padding-top:6px;padding-bottom:6px}.nx-box .nx-mrow .tx{display:grid;grid-template-columns:minmax(140px,230px) minmax(0,1fr) auto;column-gap:16px;align-items:baseline}.nx-box .nx-mrow .tp{display:contents}.nx-box .nx-mrow .tp b{grid-column:1;grid-row:1}.nx-box .nx-mrow .sj{grid-column:2;grid-row:1}.nx-box .nx-mrow .ag{grid-column:3;grid-row:1;margin-left:0}}
.nx-mrow .mi.rd{background:transparent}
.nx-box .nx-mrow:not(.unread) .sj{color:var(--ink-2)}
@media(max-width:1000px){.nx-body.nx-v-inbox.has-split{overflow:auto;display:block}.nx-ibx{display:block;height:auto}.nx-ibm,.nx-ibt{overflow:visible;border-right:0}.nx-ibt{border-top:6px solid var(--surface-3)}.nx-ibf{position:static}.nx-box .nx-gh{top:0}.nx-ibh{display:none}}
@media(max-width:640px){.nx-ibl{display:none}.nx-ibz{display:none}}
.nx-pk-top{display:flex;align-items:center;gap:8px;min-width:0}
.nx-pk-top .nx-pj{cursor:pointer;background:var(--surface);font:inherit;font-size:11.5px;font-weight:600}
.nx-pk-none{font-size:12px;color:var(--ink-3);font-weight:600}
.nx-pk-title{width:100%;resize:none;overflow:hidden;border:1px solid transparent;border-radius:6px;padding:4px 6px;margin:0 -6px;background:transparent;font:inherit;font-size:19px;font-weight:700;line-height:1.3;letter-spacing:-.01em;color:var(--ink)}
.nx-pk-title:hover{border-color:var(--border)}.nx-pk-title:focus{outline:0;border-color:var(--c1);background:var(--surface-2)}
.nx-pk-f{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px;align-items:start}
.nx-pk-f>label{padding-top:6px;font-size:11.5px;font-weight:700;color:var(--ink-3)}
.nx-pk-st{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
.nx-pk-s{display:flex;align-items:center;gap:7px;height:30px;padding:0 9px;border:1px solid var(--border);border-radius:6px;background:var(--surface);font:inherit;font-size:12.5px;font-weight:600;color:var(--ink-2);cursor:pointer}
.nx-pk-s:hover{border-color:var(--border-strong);color:var(--ink)}
.nx-pk-s.on{border-color:var(--c1);background:var(--sky-wash);color:var(--ink)}
.nx-pk-due .cur{display:block;font-size:13px;margin:5px 0 6px}.nx-pk-due .cur.bad{color:var(--bad)}
.nx-pk-due .q,.nx-pk-row,.nx-pk-ppl{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.nx-pk-date{height:28px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--ink);font:inherit;font-size:12px;padding:0 6px}
.nx-pk-p{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 4px 0 3px;border:1px solid var(--border);border-radius:14px;font-size:12.5px;font-weight:600}
.nx-pk-p>span:not(.av){padding-right:4px}
.nx-pk-p .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700;font-size:9px}
.nx-pk-p .x{border:0;background:transparent;color:var(--ink-3);font-size:15px;line-height:1;cursor:pointer;padding:0 5px}
.nx-pk-p .x:hover{color:var(--bad)}
.nx-pk-row .nx-sel{flex:1 1 140px;max-width:none}
.nx-pk-notes{width:100%;min-height:110px;resize:vertical;border:1px solid var(--border);border-radius:6px;padding:8px 10px;background:var(--surface-2);font:inherit;font-size:13px;line-height:1.5;color:var(--ink)}
.nx-pk-notes:focus{outline:0;border-color:var(--c1);background:var(--surface)}
.nx-pk-ft{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:auto;padding-top:12px;border-top:1px solid var(--rule)}
.nx-pk-ft .tip{margin-left:auto;font-size:11px;color:var(--ink-3)}
.nx-pk-empty{margin:auto;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;color:var(--ink-3);font-size:13px}
.nx-pk-empty svg{width:34px;height:34px;fill:none;stroke:var(--border-strong);stroke-width:1.6}
.nx-pk-empty b{color:var(--ink-2)}
/* my day */
.nx-lower{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;padding:16px 20px 30px}
.nx-panel{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;align-self:start}
.nx-panel .nx-gh{position:static;padding-left:14px}
.nx-prow{display:flex;flex-direction:column;gap:6px;width:100%;padding:10px 14px;border:0;border-bottom:1px solid var(--rule);background:var(--surface);font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.nx-prow:last-child{border-bottom:0}
.nx-prow:hover{background:color-mix(in srgb,var(--rc) 7%,var(--surface))}
.nx-prow .tp{display:flex;align-items:center;gap:8px}.nx-prow .tp b{flex:1;min-width:0;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-prow .lead{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:3px;background:var(--sky-wash);color:var(--c1)}
.nx-prow .pc{font-size:12px;font-weight:700;color:var(--ink-2)}
.nx-prow .br{height:5px;border-radius:3px;background:var(--surface-3);overflow:hidden}.nx-prow .br i{display:block;height:100%;background:var(--rc);border-radius:3px}
.nx-prow .mt{display:flex;flex-wrap:wrap;gap:4px 8px;font-size:11.5px;color:var(--ink-3);font-weight:600}.nx-prow .mt .bad{color:var(--bad)}.nx-prow .mt .nxt{flex:1 1 100%;color:var(--ink-2);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-win{display:flex;align-items:center;gap:10px;width:100%;padding:8px 14px;border:0;border-bottom:1px solid var(--rule);background:var(--surface);font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.nx-win:last-child{border-bottom:0}.nx-win:hover{background:var(--surface-2)}
.nx-win .av{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700;font-size:9px}
.nx-win .tx{flex:1;min-width:0;display:flex;flex-direction:column}.nx-win .tx b{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-win .tx small{font-size:11.5px;color:var(--ink-3)}
.nx-win .ago{flex:0 0 auto;font-size:11.5px;color:var(--good);font-weight:700}
.nx-teamstrip{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));overflow:visible!important}
.nx-coming{flex-wrap:wrap}
.nx-day{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,400px);height:100%}
.nx-dl{min-height:0;overflow:auto;border-right:1px solid var(--border)}
.nx-dr{min-height:0;display:flex;flex-direction:column;background:var(--surface)}
.nx-strip{display:flex;gap:8px;flex-wrap:wrap;padding:14px 20px 10px}
.nx-stat{display:inline-flex;align-items:baseline;gap:6px;height:34px;padding:0 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);font:inherit;color:var(--ink);cursor:pointer;transition:border-color .15s,transform .15s}
.nx-stat:hover{border-color:var(--c1);transform:translateY(-1px)}
.nx-stat b{font-size:17px;line-height:34px}.nx-stat span{font-size:12.5px;color:var(--ink-3);font-weight:600}
.nx-stat.bad b{color:var(--bad)}.nx-stat.warn b{color:#b07f00}.nx-stat.hot{border-color:#e8833a}.nx-stat.hot b{color:#d0661c}
.nx-teamstrip{display:flex;gap:6px;padding:0 20px 10px;overflow-x:auto;scrollbar-width:thin}
.nx-tp{flex:0 0 auto;display:flex;align-items:center;gap:8px;height:40px;padding:0 10px 0 7px;border:1px solid var(--border);border-radius:6px;background:var(--surface);font:inherit;text-align:left;cursor:pointer;color:var(--ink)}
.nx-tp:hover{border-color:var(--c1)}
.nx-tp .tx{display:flex;flex-direction:column;line-height:1.2}.nx-tp .tx b{font-size:12.5px}.nx-tp .tx small{font-size:11px;color:var(--ink-3);white-space:nowrap}
.nx-tp.free .tx small{color:var(--good)}.nx-tp.busy .tx small{color:var(--bad)}.nx-tp.away .tx small{color:var(--warn)}
.nx-coming{display:flex;align-items:center;gap:6px;padding:0 20px 14px;overflow-x:auto;scrollbar-width:thin}
.nx-coming .lb,.nx-overlay .lb{flex:0 0 auto;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin-right:2px}
.nx-kd{flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 10px 0 4px;border:1px solid var(--border);border-radius:4px;background:var(--surface);font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer;white-space:nowrap}
.nx-kd b{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:3px;background:var(--navy);color:#fff;font-size:11px}
:root[data-theme="dark"] .nx-kd b{background:var(--sky);color:var(--navy-deep)}
.nx-kd:hover{border-color:var(--c1)}
.nx-dl .nx-list{border-top:1px solid var(--border);padding-bottom:0}
/* day panel */
.nx-dp{display:flex;flex-direction:column;height:100%;min-height:0}
.nx-dph{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--rule)}
.nx-dph .tt{flex:1;display:flex;align-items:baseline;gap:8px}.nx-dph .tt b{font-size:15px}.nx-dph .tt span{font-size:12.5px;color:var(--ink-3);font-weight:600}
.nx-dph .tt{order:0}.nx-dph .nx-ib:first-child{order:1}.nx-dph .nx-ib{order:2}.nx-dph .nx-mini{order:3;height:30px}
.nx-dpa{flex:0 0 auto;display:flex;flex-direction:column;gap:3px;padding:8px 14px;border-bottom:1px solid var(--rule);max-height:150px;overflow:auto}
.nx-dpa .kd,.nx-dpa .du,.nx-ca .kd,.nx-ca .du{display:flex;align-items:center;gap:6px;width:100%;min-height:24px;padding:2px 8px;border:0;border-radius:4px;font:inherit;font-size:12px;font-weight:600;text-align:left;color:var(--ink);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-dpa .kd,.nx-ca .kd{background:color-mix(in srgb,var(--c2) 15%,var(--surface));box-shadow:inset 3px 0 0 var(--c2)}
.nx-dpa .kd.hol{background:var(--warn-soft);box-shadow:inset 3px 0 0 var(--warn);cursor:default}
.nx-dpa .kd.ev{background:var(--surface-3);box-shadow:inset 3px 0 0 var(--c1);cursor:default}
.nx-dpa .du,.nx-ca .du{background:var(--surface-2);box-shadow:inset 0 0 0 1px var(--border)}
.nx-dpa .du span,.nx-ca .du span{overflow:hidden;text-overflow:ellipsis}
.nx-dps{flex:1;min-height:0;overflow:auto;padding:12px 14px 12px 6px}
.nx-dpf{flex:0 0 auto;padding:8px 14px;border-top:1px solid var(--rule);font-size:12px;font-weight:600;color:var(--ink-3)}
.nx-vday{position:relative}
.nx-vday .hr{position:absolute;left:0;width:38px;transform:translateY(-50%);font-size:10.5px;font-weight:600;color:var(--ink-3);text-align:right}
.nx-vday .gl{position:absolute;left:46px;right:0;height:1px;background:var(--rule)}
.nx-vday .fr{position:absolute;left:46px;right:0;display:flex;align-items:center;justify-content:center;border-radius:5px;background:repeating-linear-gradient(135deg,var(--good-soft) 0 7px,transparent 7px 13px);font-size:11px;font-weight:700;color:var(--good)}
.nx-vday .ev{position:absolute;z-index:1;display:flex;flex-direction:column;gap:1px;padding:3px 7px;border-radius:5px;background:color-mix(in srgb,var(--c1) 14%,var(--surface));border-left:3px solid var(--c1);color:var(--ink);overflow:hidden;font-size:11.5px}
.nx-vday .ev .et,.nx-cc .ce .et{display:block;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}
.nx-vday .ev .ei,.nx-cc .ce .ei{display:block;color:var(--ink-3);font-size:10.5px;line-height:1.3}
.nx-vday .ev.short,.nx-cc .ce.short{padding:1px 7px;justify-content:center}
.nx-vday .ev.tentative,.nx-cc .ce.tentative{background:var(--surface);border:1px dashed var(--c1);border-left:3px solid var(--c1)}
.nx-vday .ev.oof,.nx-cc .ce.oof{background:var(--warn-soft);border-left-color:var(--warn)}
.nx-vday .ev.past,.nx-cc .ce.past{opacity:.5}
.nx-vday .ev.now{box-shadow:0 0 0 2px #2bb673}
.nx-vday .nowl,.nx-cc .nowl{position:absolute;left:40px;right:0;height:2px;background:#e0533f;z-index:3}
.nx-cc .nowl{left:0}
.nx-vday .nowl::before,.nx-cc .nowl::before{content:"";position:absolute;left:-5px;top:-4px;width:10px;height:10px;border-radius:50%;background:#e0533f}
/* inbox */
.nx-two{display:grid;grid-template-columns:1fr 1fr;height:100%}
.nx-pane{min-height:0;overflow:auto;border-right:1px solid var(--border)}
.nx-pane .nx-gh{padding-left:16px}
.nx-ask .av{flex:0 0 auto;width:22px;height:22px;font-size:9px}
.nx-state{flex:0 0 auto;font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--surface-3);color:var(--ink-2)}
.nx-state.new{background:#e8833a;color:#fff}
/* project and person bands */
.nx-pband{display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;padding:12px 20px;border-bottom:1px solid var(--border);background:linear-gradient(90deg,color-mix(in srgb,var(--rc,var(--sky)) 12%,var(--surface)),var(--surface) 60%)}
.nx-pband .tx{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:6px}
.nx-pband p{margin:0;font-size:13px;color:var(--ink-2);line-height:1.45}
.nx-pband .who{display:flex;gap:4px}.nx-pband .who .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700;width:24px;height:24px;font-size:10px}
.nx-pring{position:relative;width:48px;height:48px;flex:0 0 auto}
.nx-pring svg{width:100%;height:100%}.nx-pring circle{fill:none;stroke-width:4.5}
.nx-pring .tr{stroke:var(--surface-3)}.nx-pring .pg{stroke:var(--rc,var(--c1));stroke-linecap:round}
.nx-pring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px}
.nx-wschips{flex:1 1 100%;display:flex;gap:6px;flex-wrap:wrap}
.nx-pband .nums{display:flex;gap:8px}
.nx-pband .nums .n{display:inline-flex;align-items:baseline;gap:5px;padding:4px 10px;border:1px solid var(--border);border-radius:5px;background:var(--surface)}
.nx-pband .nums b{font-size:16px}.nx-pband .nums small{font-size:11.5px;color:var(--ink-3);font-weight:600}.nx-pband .nums .bad b{color:var(--bad)}
.nx-pband .acts{display:flex;gap:6px;flex-wrap:wrap}
.nx-pband.person{background:var(--surface)}
/* calendar */
.nx-overlay{display:flex;align-items:center;gap:6px;padding:10px 20px;overflow-x:auto}
.nx-cal{margin:0 20px 24px;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:auto}
.nx-cg{display:grid;grid-template-columns:52px repeat(5,minmax(140px,1fr));min-width:780px}
.nx-cx{position:sticky;left:0;background:var(--surface);z-index:4}
.nx-cx.al{display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);border-bottom:1px solid var(--border)}
.nx-cd{position:sticky;top:0;z-index:3;display:flex;align-items:baseline;gap:6px;padding:9px 12px;background:var(--surface);border-bottom:1px solid var(--rule);border-left:1px solid var(--rule)}
.nx-cd small{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.nx-cd b{font-size:18px;color:var(--ink)}
.nx-cd.today b{background:var(--navy);color:#fff;border-radius:5px;padding:0 6px}
.nx-cd .hol{font-size:11px;font-weight:700;color:var(--warn)}
.nx-ca{display:flex;flex-direction:column;gap:3px;padding:5px;min-height:34px;border-left:1px solid var(--rule);border-bottom:1px solid var(--border);min-width:0}
.nx-chs{position:sticky;left:0;z-index:2;background:var(--surface)}
.nx-chs span{position:absolute;right:6px;transform:translateY(-50%);font-size:10.5px;font-weight:600;color:var(--ink-3)}
.nx-cc{position:relative;border-left:1px solid var(--rule)}
.nx-cc.today{background:color-mix(in srgb,var(--sky) 6%,var(--surface))}
.nx-cc .gl{position:absolute;left:0;right:0;height:1px;background:var(--rule)}
.nx-cc .ob{position:absolute;width:4px;border-radius:2px;background:var(--pc);opacity:.8;z-index:1}
.nx-cc .ce{position:absolute;z-index:2;display:flex;flex-direction:column;padding:3px 6px;border-radius:5px;background:color-mix(in srgb,var(--c1) 14%,var(--surface));border-left:3px solid var(--c1);color:var(--ink);font-size:11px;overflow:hidden}
/* menus */
.nx-tgear{position:absolute;top:10px;right:10px;z-index:3;width:28px;height:28px;padding:5px;border:1px solid rgba(255,255,255,.18);border-radius:6px;background:rgba(6,32,47,.55);color:rgba(255,255,255,.85);cursor:pointer;opacity:0;transition:opacity .15s}
.nx-tgear svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.st-tile:hover .nx-tgear,.st-tile:focus-within .nx-tgear,.nx-tgear:focus-visible{opacity:1}.nx-tgear:hover{background:rgba(6,32,47,.85);color:#fff;border-color:rgba(116,191,235,.6)}
@media(hover:none){.nx-tgear{opacity:.85}}
.st-tile:hover .st-top .st-pill:last-child{margin-right:30px}
.nx-tcb .lb{font-weight:500;opacity:.7}
.nx-mi.ck::after{content:'';margin-left:auto;flex:0 0 auto;width:15px;height:15px;border:1.5px solid var(--border-strong);border-radius:3px}
.nx-mi.ck.on::after{background:var(--c1) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/11px no-repeat;border-color:var(--c1)}
.nx-mi.ck small{margin-left:auto}.nx-mi.ck::after{margin-left:8px}
.nx-mi.on:not(.ck)::after{content:'✓';margin-left:auto;font-weight:800;color:var(--c1)}.nx-mi.on:not(.ck) small{margin-left:auto}.nx-mi.on:not(.ck) small+*{}
.nx-msep{height:1px;margin:5px 4px;background:var(--rule)}
.nx-tmenu{max-height:min(78vh,620px);overflow:auto}
.nx-menu{position:fixed;z-index:210;min-width:220px;max-width:300px;padding:5px;background:var(--surface);border:1px solid var(--border-strong);border-radius:8px;box-shadow:0 16px 40px rgba(6,32,47,.22);animation:nxIn .12s ease}
.nx-menu.sheet{left:10px;right:10px;max-width:none;bottom:calc(66px + env(safe-area-inset-bottom,0px));top:auto}
.nx-menu.tall{max-height:72vh;overflow:auto}
.nx-ml{padding:7px 9px 3px;font-size:10.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
.nx-mi{display:flex;align-items:center;gap:9px;width:100%;min-height:34px;padding:5px 9px;border:0;border-radius:5px;background:transparent;font:inherit;font-size:13px;font-weight:600;color:var(--ink);text-align:left;cursor:pointer}
.nx-mi>svg:not(.si){width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;color:var(--ink-3)}
.nx-mi .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700}
.nx-mi small{margin-left:auto;font-size:11.5px;color:var(--ink-3);font-weight:600}
.nx-mi:hover,.nx-mi.on{background:var(--sky-wash)}
.nx-mpick{display:flex;align-items:center;gap:8px;padding:5px 9px;font-size:13px;font-weight:600;color:var(--ink)}
.nx-mpick input{flex:1;height:30px;border:1px solid var(--border);border-radius:5px;background:var(--surface);color:var(--ink);font:inherit;font-size:12.5px;padding:0 6px}
/* bits */
.nx-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:300;display:flex;align-items:center;gap:14px;max-width:min(560px,calc(100vw - 24px));padding:10px 12px 10px 14px;background:var(--navy);color:#fff;border-radius:8px;box-shadow:0 14px 36px rgba(6,32,47,.35);font-size:13px;font-weight:600;animation:nxIn .2s ease}
.nx-toast span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-undo{flex:0 0 auto;border:1px solid rgba(255,255,255,.4);background:transparent;color:var(--sky);font:inherit;font-weight:700;padding:3px 11px;border-radius:5px;cursor:pointer}
.nx-burst{position:fixed;z-index:310;width:0;height:0;pointer-events:none}
.nx-burst i{position:absolute;width:6px;height:6px;border-radius:2px;animation:nxBurst .6s ease-out forwards}
@keyframes nxBurst{to{transform:translate(var(--x),var(--y)) rotate(200deg);opacity:0}}
.nx-switch{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:4px 10px;border:1px solid rgba(116,191,235,.35);border-radius:6px;background:rgba(255,255,255,.06);color:#fff;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.nx-switch .tg{position:relative;width:30px;height:17px;border-radius:5px;background:rgba(255,255,255,.25);transition:background .2s}
.nx-switch .tg i{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:3px;background:#fff;transition:transform .2s}
.nx-switch .tg.on{background:var(--sky)}.nx-switch .tg.on i{transform:translateX(13px)}
.nx-tabbar{display:none}
@media(max-width:1000px){
  .nx-body.nx-v-day,.nx-body.nx-v-person,.nx-body.nx-v-inbox{overflow:auto}
  .nx-day,.nx-two{grid-template-columns:minmax(0,1fr);height:auto}
  .nx-dl,.nx-pane{overflow:visible;border-right:0}
  .nx-dr{border-top:1px solid var(--border)}
  .nx-dps{max-height:560px}
}
/* phones */
@media(max-width:640px){
  .nx{left:0!important;bottom:calc(58px + env(safe-area-inset-bottom,0px))}
  html.nx-on .nx-tabbar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:99;padding:4px 4px calc(4px + env(safe-area-inset-bottom,0px));background:var(--navy);box-shadow:0 -1px 0 rgba(116,191,235,.25)}
  html.nx-on body{padding-bottom:calc(62px + env(safe-area-inset-bottom,0px))!important}
  .nx-tb{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;border:0;border-radius:8px;background:transparent;color:rgba(255,255,255,.7);font:inherit;font-size:10.5px;font-weight:700;cursor:pointer}
  .nx-tb svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .nx-tb.on{color:var(--sky);background:rgba(255,255,255,.08)}
  .nx-tb .nx-badge{position:absolute;top:2px;left:calc(50% + 6px);margin:0;padding:0 5px;font-size:10px}
  .nx-head{padding:8px 12px;gap:8px}
  .nx-hl{flex:1 1 auto}
  .nx-qa{order:3;flex:1 1 100%;max-width:none;height:40px}
  .nx-qa input{font-size:16px}
  .nx-hint,.nx-k{display:none}
  .nx-hr{order:4;flex:1 1 100%;margin-left:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
  .nx-hr::-webkit-scrollbar{display:none}
  .nx-hr>*{flex:0 0 auto}
  .nx-find{width:110px}
  .nx-row{flex-wrap:wrap;row-gap:4px;min-height:48px;padding:7px 12px 7px 8px}
  .nx-tt{flex:1 1 0;min-width:55%;white-space:normal;line-height:1.35}
  .nx-sp,.nx-ws{display:none}
  .nx-row:not(.nx-card) .nx-pj{max-width:150px;order:5;margin-left:34px}
  .nx-row:not(.nx-card) .nx-due{min-width:0}
  .hqtop-r{gap:8px!important}
  .nx-gh{padding-right:12px}
  .nx-strip,.nx-teamstrip,.nx-coming,.nx-overlay{padding-left:12px;padding-right:12px}
  .nx-strip{flex-wrap:nowrap;overflow-x:auto}.nx-stat{flex:0 0 auto}
  .nx-teamstrip{display:flex!important;overflow-x:auto!important}.nx-coming{flex-wrap:nowrap}
  .nx-lower{padding:12px;grid-template-columns:minmax(0,1fr)}
  .nx-board{padding:12px;scroll-snap-type:x mandatory}.nx-col{flex:0 0 84vw;scroll-snap-align:start}
  .nx-pband{padding:12px}
  .nx-cal{margin:0 12px 20px}
  .nx-switch .lb{display:none}
  .nx-menu-b{flex:0 0 auto}
}
`;
document.head.appendChild(css);

/* ---------- start ---------- */
/* take away the old New Team HQ switch if an earlier copy left one in the masthead */
document.querySelectorAll('.nx-switch').forEach(x=>x.remove());
const mo=new MutationObserver(()=>{}); 
/* it always opens on My Dashboard */
/* opened from the Expenses phone app: go straight to Expenses and nothing else */
const APPX=document.documentElement.classList.contains('app-exp') || new URLSearchParams(location.search).get('app')==='expenses';
if(ui.on){ build(); document.documentElement.classList.add('nx-on'); drawRail(); if(APPX) openClassic('expenses'); else open(DEEP||'day'); navInit(); lastSig=sig(); try{ window.__hub && window.__hub.paint(); }catch(e){} }
window.__nx={ version:'2.2', paint, open, setOn, parse:parseQuick, ui, pinTile,
  destroy(){ window.removeEventListener('popstate', onPop); clearInterval(live); clearInterval(clock); mo.disconnect(); railMo.disconnect(); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onRailClick, true); document.removeEventListener('click', onPgx, true); window.removeEventListener('resize', onResize);
    railNodes.forEach(n=>n.remove()); restoreBoardBtn(); if(shell) shell.remove(); if(tabbar) tabbar.remove(); if(sw) sw.remove(); closeMenus(); if(toastEl) toastEl.remove(); css.remove(); document.documentElement.classList.remove('nx-on','nx-show','nx-dragging'); } };
})();
