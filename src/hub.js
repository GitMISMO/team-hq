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
  /* in the new Team HQ, My Dashboard carries the numbers and tabs, so My Board is just the quick actions and your own board */
  const slim=document.documentElement.classList.contains('nx-on');
  if(!slim) w.appendChild(band());
  w.appendChild(actionBar());
  if(!slim) w.appendChild(workspace());
  return w;
}
/* ---------- one workspace, switched by tabs, instead of a long scroll ---------- */
function wsTabs(){
  const T=[['day','My Day'],['week','My Week'],['tasks','My Tasks'],['mail','My Email'],['projects','My Projects'],['people','My People'],['systems','My Systems']];
  const A=asksForMe(), N=nudgesForMe().filter(n=>!(me()===ASK_OWNER && n.k==='Asked For'));
  if(A.length || N.length) T.splice(0,0,['asks', me()===ASK_OWNER ? 'Asks for You' : 'Asks and Nudges']);
  return T;
}
function badge(k){
  if(k==='tasks') return mine().length;
  if(k==='asks'){ const n=asksForMe().filter(a=>a.state==='New').length + nudgesForMe().filter(x=>!(me()===ASK_OWNER && x.k==='Asked For')).length; return n; }
  if(k==='projects'){ return S.rocks.filter(r=>(r.status||'Active')==='Active').filter(r=>r.lead===me() || S.tasks.some(t=>t.r===r.id && isOpen(t) && doers(t).indexOf(me())>=0)).length; }
  if(k==='day'){ const P=dayPlan(workDay()); return P.ev ? P.ev.length : 0; }
  if(k==='mail'){ const X=window.__hqx; return X && X.MAIL.state==='ok' ? X.mailItems().filter(m=>m.flagged || m.important || m.unread).length : 0; }
  if(k==='people'){ const X=window.__hqx; return X ? X.myPeople().length : 0; }
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
  try{ inner = ui.tab==='day' ? dayCard() : ui.tab==='week' ? myWeek() : ui.tab==='tasks' ? tasksView() : ui.tab==='projects' ? (myProjects() || emptyNote('You don\u2019t lead or have open work in an active Team Project.')) : ui.tab==='asks' ? (forYou() || emptyNote('Nothing waiting for you.')) : ui.tab==='mail' ? mailView() : ui.tab==='people' ? peopleView() : launch(); }catch(e){ console.error(e); inner=emptyNote('Something went wrong showing this. Try another tab.'); }
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
/* ---------- My Email: the mail worth a look, from the person's own Outlook flow ---------- */
function mailView(){
  const X=window.__hqx, c=h('div','box hb-mail');
  const hd=h('div','hb-ch'); hd.appendChild(h('h3','sect-t','Email to Look At'));
  const r=h('div','hb-mr');
  if(X && X.MAIL.state==='ok'){ ['all','flagged','important','unread'].forEach(k=>{ const n=k==='all'?X.mailItems().length:X.mailItems().filter(m=>m[k]).length; const b=btn('hb-chip'+((ui.mf||'all')===k?' on':''), null, ()=>{ ui.mf=k; paint(); }); b.appendChild(h('span',null,{all:'All',flagged:'Flagged',important:'Important',unread:'Unread'}[k])); b.appendChild(h('b',null,String(n))); r.appendChild(b); }); }
  const rf=btn('btn ghost','Refresh', ()=>{ X && X.loadMail(true).then(paint); }); r.appendChild(rf);
  const ol=h('a','btn ghost'); ol.href='https://outlook.office.com/mail/'; ol.target='_blank'; ol.rel='noopener'; ol.innerHTML=svg('out')+'<span>Open Outlook</span>'; r.appendChild(ol);
  hd.appendChild(r); c.appendChild(hd);
  if(!X || X.MAIL.state==='loading' || X.MAIL.state==='idle'){ c.appendChild(emptyNote('Checking your email…')); return c; }
  if(X.MAIL.state!=='ok'){
    const w=h('div','hb-mcon'); w.innerHTML=svg('ask','big');
    const t=h('div','tx'); t.appendChild(h('b',null,'Your email isn’t connected yet'));
    t.appendChild(h('p',null,'Once your Outlook email flow is on, what you’ve flagged, anything marked important and unread mail from people show up here — the subject, who sent it, when, and a link straight to it in Outlook. Never the message itself.'));
    t.appendChild(h('p','hb-mnote', me()===ASK_OWNER ? 'Turn it on with the same kind of Power Automate flow that sends your calendar here.' : 'Ask Jonna to turn it on for you — it takes a few minutes.'));
    if(me()!==ASK_OWNER){ const a=btn('btn','Ask to Turn It On', ()=>window.__ask2 && window.__ask2()); t.appendChild(a); }
    w.appendChild(t); c.appendChild(w); return c; }
  const L=X.mailItems().filter(m=>(ui.mf||'all')==='all' || m[ui.mf]);
  if(X.MAIL.sent) c.appendChild(h('p','hb-msent','From Outlook '+X.ago(X.MAIL.sent)));
  if(!L.length){ c.appendChild(emptyNote('Nothing here. Inbox under control.')); return c; }
  const list=h('div','hb-ml');
  L.slice(0,40).forEach(m=>{ const row=h('div','hb-mrow'+(m.unread?' unread':''));
    const ic=h('span','mi'+(m.flagged?' flag':m.important?' imp':'')); ic.textContent=m.flagged?'⚑':m.important?'!':'•'; ic.title=m.flagged?'Flagged':m.important?'Important':'Unread'; row.appendChild(ic);
    const tx=h('div','tx'); const top=h('div','tp'); top.appendChild(h('b',null,m.from||'Someone')); top.appendChild(h('span','ag', m.at?X.ago(m.at):'')); tx.appendChild(top);
    tx.appendChild(h('div','sj', m.subject)); if(m.preview) tx.appendChild(h('div','pv', m.preview)); row.appendChild(tx);
    const acts=h('div','ac');
    if(m.link){ const o=h('a','btn ghost'); o.href=m.link; o.target='_blank'; o.rel='noopener'; o.textContent='Open'; acts.appendChild(o); }
    acts.appendChild(btn('btn ghost','Make It a Task', ()=>editTask({t:m.subject, o:me(), d:[me()], r:'', w:'', s:'Not Started', p:m.important?'High':'Normal', due:'', notes:'From '+(m.from||'')+(m.link?' — '+m.link:''), rail:0, ord:(S.tasks.length+1)*10, at:Date.now()})));
    row.appendChild(acts); list.appendChild(row); });
  c.appendChild(list);
  return c;
}
/* ---------- My People: direct reports, or anyone they keep an eye on ---------- */
function peopleView(){
  const X=window.__hqx, c=h('div','box hb-ppl');
  const hd=h('div','hb-ch'); hd.appendChild(h('h3','sect-t','My People'));
  const ed=btn('btn ghost', X && X.myPeople().length ? 'Change My People' : 'Choose My People', ()=>X && X.pickPeople()); hd.appendChild(ed); c.appendChild(hd);
  const ids=X ? X.myPeople() : [];
  if(!ids.length){ const w=h('div','hb-mcon'); const t=h('div','tx'); t.appendChild(h('b',null,'Keep your people in view'));
    t.appendChild(h('p',null,'Pick your direct reports, or anyone you work closely with. You’ll see where each of them is right now, how full their day is, what’s late and what’s next — and can find a time or hand them a task in one click.'));
    t.appendChild(btn('btn','Choose My People', ()=>X && X.pickPeople())); w.appendChild(t); c.appendChild(w); return c; }
  const g=h('div','hb-pg2');
  ids.forEach(id=>{ const p=person(id); if(!p) return; const s=X.statusOf(p), wd=X.nextWorkday(today()), L=X.dayLoad(id, wd);
    const open=S.tasks.filter(t=>isOpen(t) && doers(t).indexOf(id)>=0).sort(byDue), lt=open.filter(t=>t.due && days(t.due)<0);
    const k=h('div','hb-pcard '+s.k);
    const top=h('div','hd'); const aw=h('span','aw'); aw.appendChild(av(id,38)); aw.appendChild(h('i','dot')); top.appendChild(aw);
    const nm=h('div','nm'); nm.appendChild(h('b',null,p.name)); nm.appendChild(h('small',null,s.t+(s.s?' · '+s.s:''))); top.appendChild(nm); k.appendChild(top);
    if(L){ const ld=h('div','ld'); ld.appendChild(h('span',null,(+wd===+today()?'Today':WDL[wd.getDay()])+': '+L.n+(L.n===1?' meeting':' meetings')+' · '+hrs(L.free)+' free')); const br=h('div','br'); const f=h('i'); f.style.width=Math.min(100,L.busy/480*100)+'%'; br.appendChild(f); ld.appendChild(br); k.appendChild(ld); }
    const nums=h('div','nums'); [[open.length,'open',''],[lt.length,'late',lt.length?'bad':''],[S.rocks.filter(r=>(r.status||'Active')==='Active' && r.lead===id).length,'leads','']].forEach(([n,l,cl])=>{ const x=h('span','n '+cl); x.appendChild(h('b',null,String(n))); x.appendChild(h('small',null,l)); nums.appendChild(x); }); k.appendChild(nums);
    const nx=open.filter(t=>t.due).slice(0,3); if(nx.length){ const ul=h('div','nxl'); nx.forEach(t=>{ const b=btn('hb-due'+(days(t.due)<0?' late':''), null, ()=>editTask(t)); b.textContent=fmt(t.due)+' · '+t.t; ul.appendChild(b); }); k.appendChild(ul); }
    const acts=h('div','ac');
    acts.appendChild(btn('btn ghost','Their Work', ()=>{ if(window.__nx && window.__nx.ui && window.__nx.ui.on){ window.__nx.open('u:'+id); } else goTab('rocks'); }));
    acts.appendChild(btn('btn ghost','Find a Time', ()=>{ try{ const k2='tools:team-hq:mismo.teamhq.ft'; const cur=JSON.parse(localStorage.getItem(k2)||'{}'); cur.who=[me(), id]; localStorage.setItem(k2, JSON.stringify(cur)); }catch(e){} goTab('findtime'); }));
    acts.appendChild(btn('btn ghost','Add a Task', ()=>editTask({t:'', o:id, d:[id], r:'', w:'', s:'Not Started', p:'Normal', due:'', notes:'', rail:0, ord:(S.tasks.length+1)*10, at:Date.now()})));
    k.appendChild(acts); g.appendChild(k); });
  c.appendChild(g);
  return c;
}
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
  else { t.href=s.u; t.target='_blank'; t.rel='noopener'; t.title='Open '+s.n;
    t.addEventListener('click', e=>{ const X=window.__hqx; if(!X || !X.openSys || e.metaKey || e.ctrlKey || e.shiftKey || e.button!==0 || !X.SYS.some(z=>z.k===s.k)) return; if(e.target.closest('.star')) return; e.preventDefault(); X.openSys(s.k); }); }
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
.hb-mr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-left:auto}
.hb-mr .btn{display:inline-flex;align-items:center;gap:6px}.hb-mr .btn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2}
.hb-chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid var(--border);border-radius:4px;background:var(--surface);font:inherit;font-size:12.5px;font-weight:600;color:var(--ink-2);cursor:pointer}
.hb-chip b{font-size:11px;color:var(--ink-3)}.hb-chip.on{background:var(--navy);border-color:var(--navy);color:#fff}.hb-chip.on b{color:var(--sky)}
.hb-mcon{display:flex;gap:16px;align-items:flex-start;padding:16px;border:1.5px dashed var(--border-strong);border-radius:8px;background:var(--surface-2)}
.hb-mcon svg.big{flex:0 0 auto;width:40px;height:40px;fill:none;stroke:var(--c1);stroke-width:1.6}
.hb-mcon .tx b{display:block;font-size:15px;margin-bottom:4px}.hb-mcon .tx p{margin:0 0 8px;font-size:13px;color:var(--ink-2);max-width:680px;line-height:1.5}
.hb-mnote{font-weight:600;color:var(--ink)!important}
.hb-msent{margin:0 0 6px;font-size:11.5px;color:var(--ink-3)}
.hb-ml{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.hb-mrow{display:flex;align-items:flex-start;gap:12px;padding:10px 14px;border-bottom:1px solid var(--rule);background:var(--surface)}
.hb-mrow:last-child{border-bottom:0}.hb-mrow:hover{background:var(--surface-2)}
.hb-mrow .mi{flex:0 0 auto;width:22px;height:22px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:var(--ink-3);background:var(--surface-3)}
.hb-mrow .mi.flag{color:#fff;background:var(--bad)}.hb-mrow .mi.imp{color:#fff;background:#e8833a}
.hb-mrow .tx{flex:1;min-width:0}.hb-mrow .tp{display:flex;gap:8px;align-items:baseline}.hb-mrow .tp b{font-size:13px;font-weight:600}.hb-mrow.unread .tp b{font-weight:800}
.hb-mrow .ag{margin-left:auto;font-size:11.5px;color:var(--ink-3);white-space:nowrap}
.hb-mrow .sj{font-size:13.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hb-mrow.unread .sj{font-weight:700}
.hb-mrow .pv{font-size:12px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-mrow .ac{flex:0 0 auto;display:flex;gap:6px;align-self:center}
.hb-pcard{display:flex;flex-direction:column;gap:10px;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:8px}
.hb-pcard .hd{display:flex;align-items:center;gap:10px}.hb-pcard .aw{position:relative;display:inline-flex}
.hb-pcard .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700}
.hb-pcard .dot{position:absolute;right:-1px;bottom:-1px;width:12px;height:12px;border-radius:50%;border:2px solid var(--surface);background:#9aa9b6}
.hb-pcard.free .dot{background:#2bb673}.hb-pcard.busy .dot{background:#e0533f}.hb-pcard.away .dot{background:#e8a33a}
.hb-pcard .nm b{display:block;font-size:14.5px}.hb-pcard .nm small{font-size:12px;color:var(--ink-3)}
.hb-pcard.free .nm small{color:var(--good)}.hb-pcard.busy .nm small{color:var(--bad)}
.hb-pcard .ld span{font-size:12px;font-weight:600;color:var(--ink-2)}
.hb-pcard .br{height:5px;border-radius:3px;background:var(--surface-3);overflow:hidden;margin-top:4px}.hb-pcard .br i{display:block;height:100%;background:linear-gradient(90deg,var(--sky),var(--c1))}
.hb-pcard .nums{display:flex;gap:6px}.hb-pcard .n{display:inline-flex;align-items:baseline;gap:4px;padding:3px 9px;border:1px solid var(--rule);border-radius:5px;background:var(--surface-2)}
.hb-pcard .n b{font-size:15px}.hb-pcard .n small{font-size:11px;color:var(--ink-3)}.hb-pcard .n.bad b{color:var(--bad)}
.hb-pcard .nxl{display:flex;flex-direction:column;gap:4px}
.hb-pcard .ac{display:flex;flex-wrap:wrap;gap:6px}
@media(max-width:640px){.hb-mrow{flex-wrap:wrap}.hb-mrow .ac{flex:1 1 100%;justify-content:flex-end}.hb-mr{margin-left:0}}
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
let calSig=''; const calSigNow=()=>{ const C=window.__cal && window.__cal.CAL; return (C ? Object.keys(C.by||{}).length+':'+(C.at||'') : '')+'|'+(window.__hqx && window.__hqx.sig ? window.__hqx.sig() : ''); };
calSig=calSigNow(); const calTimer=setInterval(()=>{ const s=calSigNow(); if(s!==calSig){ calSig=s; paint(); } }, 1500);
paint();
window.__hub={ paint, openPal, closePal, version:'1.0',
  destroy(){ if(mo) mo.disconnect(); mo=null; clearInterval(timer); clearInterval(calTimer); document.removeEventListener('keydown', onKey); closePal(); css.remove(); const n=root.querySelector(':scope > .hb'); n && n.remove(); } };
})();
