/* Team HQ upgrades — loaded by index.html after the app is ready.
 * skin: MISMO Media look, My Board styling + Tidy Up, Expenses on phones
 * projects-v2: Team Projects (Board, Timeline, Who's on What, workstream panel)
 * hub: My Hub at the top of My Board (My Day, systems, quick actions, Jump To)
 * findtime: Find a Time as its own tab, like the Scheduler, with a Doodle-style table
 * plans-v2: the Plans list as visual cards
 * today: Counting Down that rolls forward, The Next Four Weeks timeline
 * meeting: Team Meeting run of show and Put It on the Screen
 * mobile: bottom tab bar and phone layout for every tab
 * next: the reimagined Team HQ (Home, Work, Team, Time) behind the New Team HQ switch
 * Each part runs on its own; if one fails, the rest of Team HQ is untouched. */
(function(){
'use strict';
var MODS=[];
/* ===== hqx.js ===== */
MODS.push(function(){
/* Shared bits for My Board and the new Team HQ:
   - Email to Look At: each person's own Power Automate flow drops their flagged, important and
     unread-from-people mail into the relay as "mail-<their id>", the same way the Outlook calendar
     flow drops "cal-<their id>". Only the subject, sender, time, a short preview and the Outlook link
     are kept — never the body. This reads it and tidies whatever shape the flow sends.
     Expected: { at:"2026-11-02T13:05:00Z", msgs:[ {subject, from, fromEmail, received, link, flagged, important, unread, preview} ] }
     The Outlook connector's own field names (receivedDateTime, webLink, isRead, importance, flag, bodyPreview) work too.
   - My People: the people someone keeps an eye on (their direct reports, or anyone), saved with
     their board settings so it follows them to every device. */
(function(){
'use strict';
if(window.__hqx && window.__hqx.destroy) window.__hqx.destroy();
const S=window.__S; if(!S) return;
const MAIL={state:'idle', at:0, data:null, items:[]};
const str=v=>v==null?'':String(v);
function norm(m){
  const from=m.from && typeof m.from==='object' ? ((m.from.emailAddress||m.from).name || (m.from.emailAddress||m.from).address) : (m.from||m.f||m.sender||'');
  const fromEmail=m.fromEmail || (m.from && typeof m.from==='object' ? (m.from.emailAddress||m.from).address : '') || '';
  const flag=m.flagged!=null ? !!m.flagged : m.flag && typeof m.flag==='object' ? /flagged/i.test(m.flag.flagStatus||'') : !!m.flag;
  const imp=m.important!=null ? !!m.important : /high/i.test(str(m.importance||m.imp));
  const unread=m.unread!=null ? !!m.unread : m.isRead!=null ? !m.isRead : false;
  const at=Date.parse(m.received||m.receivedDateTime||m.at||m.date||'') || 0;
  return { id:str(m.id||m.link||m.webLink||m.subject+at), subject:str(m.subject||m.s||'(no subject)'), from:str(from), fromEmail:str(fromEmail), at, link:str(m.link||m.webLink||m.u||''), flagged:flag, important:imp, unread, preview:str(m.preview||m.bodyPreview||m.pv||'').slice(0,180) };
}
function loadMail(force){
  const R=window.__hqRelay; if(!R || !R.readOther || !S.me) return Promise.resolve(MAIL);
  if(MAIL.state==='loading') return MAIL.p;
  if(!force && MAIL.at && Date.now()-MAIL.at<4*60e3) return Promise.resolve(MAIL);
  MAIL.state='loading';
  MAIL.p=R.readOther('team-hq','mail-'+S.me).then(d=>{
    MAIL.data=d||null; const list=d ? (Array.isArray(d) ? d : (d.msgs||d.mail||d.value||d.items||[])) : [];
    MAIL.items=list.map(norm).sort((a,b)=>b.at-a.at); MAIL.state=d ? 'ok' : 'none'; MAIL.at=Date.now(); MAIL.sent=d && Date.parse(d.at||'') || 0; return MAIL;
  }).catch(()=>{ MAIL.state='none'; MAIL.at=Date.now(); return MAIL; });
  return MAIL.p;
}
const ago=ms=>{ const m=Math.round((Date.now()-ms)/60e3); if(m<1) return 'just now'; if(m<60) return m+'m ago'; const hh=Math.round(m/60); if(hh<24) return hh+'h ago'; const d=Math.round(hh/24); return d===1?'yesterday':d+'d ago'; };
function myPeople(){ const b=S.bset||{}; const L=Array.isArray(b.hqPeople) ? b.hqPeople : []; return L.filter(id=>S.people.some(p=>p.id===id) && id!==S.me); }
function setMyPeople(L){ if(!S.bset) S.bset={}; S.bset.hqPeople=L.slice(); try{ window.__saveMine && window.__saveMine(); }catch(e){} try{ window.dispatchEvent(new Event('hq:people')); }catch(e){} }

/* ---------- where someone is right now, from Outlook and Key Dates ---------- */
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const today=()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
function etAt(day, hour){ let t=Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hour+5, 0); const e=+new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York', hour:'numeric', hourCycle:'h23'}).format(t); return t+(hour-e)*3600e3; }
const tm=ms=>{ const d=new Date(ms); let hh=d.getHours(), mm=d.getMinutes(); const ap=hh<12?'a':'p'; hh=hh%12||12; return hh+(mm?':'+String(mm).padStart(2,'0'):'')+ap; };
function holiday(d){ try{ const r=window.__t && window.__t.holidayOn(d); return r ? (typeof r==='string'?r:(r.n||r.t||r.name||'Holiday')) : ''; }catch(e){ return ''; } }
const workday=d=>d.getDay()%6!==0 && !holiday(d);
function nextWorkday(d){ let x=new Date(d); for(let i=0;i<10 && !workday(x);i++) x=addD(x,1); return x; }
const cal=id=>{ const by=(window.__cal && window.__cal.CAL && window.__cal.CAL.by)||{}; return Array.isArray(by[id]) ? by[id] : null; };
function dayLoad(id, day){ const ev=cal(id); if(!ev) return null; const ws=etAt(day,9), we=etAt(day,17);
  const E=ev.filter(e=>e.s<+day+864e5 && e.e>+day && e.show!=='free' && e.show!=='oof' && !e.all);
  const iv=E.map(e=>[Math.max(e.s,ws),Math.min(e.e,we)]).filter(x=>x[1]>x[0]).sort((x,y)=>x[0]-y[0]); let busy=0, cs=0, ce=0; iv.forEach(([a,b])=>{ if(a>ce){ busy+=ce-cs; cs=a; ce=b; } else ce=Math.max(ce,b); }); busy=(busy+ce-cs)/60e3;
  return {n:E.length, busy, free:Math.max(0,480-busy)}; }
function statusOf(p){
  const now=Date.now(), ev=cal(p.id), d=today();
  let kd=[]; try{ kd=(window.__dOn ? window.__dOn(d) : []).filter(x=>/travel|out of office|pto|vacation/i.test((x.k||'')+' '+(x.t||'')) && (x.who||[]).indexOf(p.id)>=0); }catch(e){}
  if(d.getDay()%6===0){ const nw=nextWorkday(d), L=dayLoad(p.id, nw); return {k:'off', t:WD[nw.getDay()]+': '+(L ? L.n+(L.n===1?' meeting':' meetings') : 'back'), s:''}; }
  const hol=holiday(d); if(hol) return {k:'off', t:hol, s:''};
  if(kd.length) return {k:'away', t:/travel/i.test(kd[0].k||'')?'Traveling':'Out', s:kd[0].t};
  if(!ev) return {k:'unk', t:'No calendar', s:''};
  const oof=ev.find(e=>e.show==='oof' && e.s<=now && e.e>now); if(oof) return {k:'away', t:'Out', s:'until '+tm(oof.e)};
  const ws=etAt(d,9), we=etAt(d,17); if(now<ws) return {k:'off', t:'Not in yet', s:''}; if(now>we) return {k:'off', t:'Done for the day', s:''};
  const cur=ev.find(e=>e.s<=now && e.e>now && e.show!=='free' && !e.all);
  if(cur) return {k:'busy', t:'In a meeting', s:'until '+tm(cur.e)};
  const nx=ev.filter(e=>e.s>now && e.show!=='free' && !e.all).sort((a,b)=>a.s-b.s)[0];
  return {k:'free', t:'Free', s: nx && nx.s<we ? 'until '+tm(nx.s) : 'rest of day'};
}

/* ---------- choose My People ---------- */
function h(tag, cls, txt){ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function pickPeople(){
  const cur=myPeople(); const chosen=new Set(cur);
  const ov=h('div','hqx-ov'); const box=h('div','hqx-box'); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','Choose My People');
  box.appendChild(h('h2',null,'Choose My People'));
  box.appendChild(h('p',null,'Your direct reports, or anyone whose day and work you want in view. Only you see this list.'));
  const g=h('div','hqx-g');
  S.people.slice().sort((a,b)=>(a.ord||0)-(b.ord||0)).filter(p=>p.id!==S.me).forEach(p=>{
    const b=h('button','hqx-p'+(chosen.has(p.id)?' on':'')); b.type='button';
    const a=h('span','av'); a.textContent=p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join(''); a.style.background='var(--c'+(((p.color||0)%7)+1)+')'; b.appendChild(a);
    const t=h('span','tx'); t.appendChild(h('b',null,p.name)); t.appendChild(h('small',null,p.role||'')); b.appendChild(t);
    b.appendChild(h('i','ck')); b.addEventListener('click', ()=>{ if(chosen.has(p.id)) chosen.delete(p.id); else chosen.add(p.id); b.classList.toggle('on'); });
    g.appendChild(b); });
  box.appendChild(g);
  const ft=h('div','hqx-ft'); const close=()=>{ ov.remove(); document.removeEventListener('keydown', esc); };
  const c=h('button','btn ghost','Cancel'); c.type='button'; c.addEventListener('click', close);
  const sv=h('button','btn','Save My People'); sv.type='button'; sv.addEventListener('click', ()=>{ setMyPeople(S.people.filter(p=>chosen.has(p.id)).map(p=>p.id)); close(); });
  ft.appendChild(c); ft.appendChild(sv); box.appendChild(ft); ov.appendChild(box);
  ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
  const esc=e=>{ if(e.key==='Escape') close(); }; document.addEventListener('keydown', esc);
  document.body.appendChild(ov); setTimeout(()=>{ const f=box.querySelector('.hqx-p'); f && f.focus(); }, 30);
}
const css=document.createElement('style'); css.id='hqx-css'; css.textContent=`
.hqx-ov{position:fixed;inset:0;z-index:400;background:rgba(6,32,47,.45);display:flex;align-items:center;justify-content:center;padding:16px}
.hqx-box{width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--surface);border:1px solid var(--border-strong);border-radius:10px;box-shadow:0 24px 60px rgba(6,32,47,.35);padding:20px 22px}
.hqx-box h2{margin:0 0 4px;font-size:19px;color:var(--ink)}.hqx-box>p{margin:0 0 14px;font-size:13px;color:var(--ink-2)}
.hqx-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr));gap:8px}
.hqx-p{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface);font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.hqx-p:hover{border-color:var(--border-strong)}.hqx-p.on{border-color:var(--c1);background:var(--sky-wash)}
.hqx-p .av{flex:0 0 auto;width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px}
.hqx-p .tx{flex:1;min-width:0;display:flex;flex-direction:column}.hqx-p .tx b{font-size:13.5px}.hqx-p .tx small{font-size:11.5px;color:var(--ink-3)}
.hqx-p .ck{flex:0 0 auto;width:18px;height:18px;border-radius:4px;border:2px solid var(--border-strong)}
.hqx-p.on .ck{background:var(--c1) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/14px no-repeat;border-color:var(--c1)}
.hqx-ft{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
`;
document.head.appendChild(css);

/* ---------- MISMO's systems, their symbols, and opening one in a panel without leaving Team HQ ---------- */
const SYS=[
  ['summit-hq','Summit HQ','/summit-hq/','#E8A33A','Summit planning, schedule and run of show'],
  ['meeting-trackers','Meeting Trackers','/meeting-trackers/','#9B8CF0','Workgroup meetings, schedules and attendance'],
  ['scheduler','Scheduler','/scheduler/','#5AA9E6','Set up meetings without the back-and-forth'],
  ['member-360','Member 360','/member-360/','#2BB673','Members, prospects and stakeholders'],
  ['financials','MISMO Money','/financials/','#3CCB7F','Budget, forecast, reconciliation and board reporting'],
  ['iif-hq','IIF Planning HQ','/iif-hq/','#9ACD32','Lenders, invoices and payments for the IIF'],
  ['marketing-hq','MISMO Media','/marketing-hq/','#EB6834','MISMO Matters, Mic’d Up, LinkedIn and requests'],
  ['elections-hq','Elections HQ','/elections-hq/','#22B8CF','CoP, Board and Governance Committee elections'],
  ['website-migration','Website Migration HQ','/website-migration/','#94A3B8','Pages, decisions and cutover'],
  ['cms','Certification Management System','/cms/','#F0607A','Certifications, renewals and assessors'],
  ['so','Service Orders and Agreements','/service-orders/','#FB7185','Contractor agreements and e-signature'],
  ['sponsorship','Sponsorship Portal','/sponsorship/','#38BDF8','Sponsor packages, prospects and commitments'],
  ['hub','Initiative Hub','/initiative-hub/','#6B8CFF','Active workgroup initiatives by domain'],
  ['hub-requests','Work Requests','/initiative-hub/work-requests.html','#74BFEB','Requests coming in for the standards work'],
  ['glossary','Business Glossary','/glossary/','#2DD4BF','MISMO’s terms and definitions'],
  ['mismo-link','MISMO Link','/mismo-link/','#818CF8','The MISMO Link AI beta'],
  ['qr','QR Code Manager','/qr/','#74BFEB','Codes, scan tracking and expiry']
].map(([k,n,u,c,d])=>({k,n,u,c,d}));
const SHORT={'cms':'CMS','so':'Service Orders','website-migration':'Website Migration','iif-hq':'IIF Planning','hub-requests':'Work Requests','marketing-hq':'MISMO Media'};
const FIGSRC={ 'Meeting Trackers':'meeting-trackers', 'Certification Management System':'cms', 'Member 360':'member-360', 'Financial System':'financials', 'Service Orders':'so', 'Sponsorship Portal':'sponsorship' };
function access(){ try{ const x=window.ResourcesSession && window.ResourcesSession.current(); return (x && x.access) || null; }catch(e){ return null; } }
function canOpen(k){ const a=access(); if(!a) return true; if(k==='so') return Object.keys(a).some(x=>/^so-/.test(x)); if(k==='scheduler') return true; return !!a[k]; }
function figsFor(k){ return (S.figures||[]).filter(x=>FIGSRC[x.src]===k && String(x.v||'').trim()!==''); }
const SYM={
  'summit-hq':'<path d="M4 38l12-18 8 11 6-8 14 15z"/><path d="M30 12v8M30 12l7 3-7 3"/>',
  'meeting-trackers':'<circle cx="12" cy="14" r="4"/><circle cx="24" cy="14" r="4"/><circle cx="36" cy="14" r="4"/><path d="M5 30c0-4 3-7 7-7s7 3 7 7M17 30c0-4 3-7 7-7s7 3 7 7M29 30c0-4 3-7 7-7s7 3 7 7"/><path d="M6 38h36"/>',
  'scheduler':'<rect x="6" y="9" width="36" height="31" rx="4"/><path d="M6 18h36M15 5v8M33 5v8"/><path d="M17 29l5 5 9-10"/>',
  'member-360':'<circle cx="24" cy="24" r="6"/><ellipse cx="24" cy="24" rx="19" ry="9"/><circle cx="41" cy="22" r="2.5"/><circle cx="8" cy="27" r="2.5"/>',
  'financials':'<path d="M7 40h34"/><rect x="10" y="26" width="6" height="12" rx="1"/><rect x="21" y="18" width="6" height="20" rx="1"/><rect x="32" y="9" width="6" height="29" rx="1"/>',
  'iif-hq':'<ellipse cx="24" cy="12" rx="13" ry="5"/><path d="M11 12v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8M11 20v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8M11 28v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8"/>',
  'marketing-hq':'<path d="M6 24v0M11 18v12M16 12v24M21 20v8M26 8v32M31 16v16M36 21v6M41 14v20"/>',
  'elections-hq':'<path d="M8 24h32v16H8z"/><path d="M16 24V8h16v16"/><path d="M20 16l3 3 6-6"/>',
  'website-migration':'<rect x="5" y="8" width="38" height="30" rx="3"/><path d="M5 15h38"/><path d="M16 28h14M25 23l5 5-5 5"/>',
  'cms':'<circle cx="24" cy="19" r="11"/><path d="M19 19l4 4 7-8"/><path d="M17 28l-4 13 7-4 4 6 4-6 7 4-4-13"/>',
  'so':'<path d="M7 38c5-1 8-6 11-6s3 5 7 5 5-4 8-4 4 2 8 2"/><path d="M30 8l8 8-14 14-9 2 2-9z"/>',
  'sponsorship':'<path d="M24 6l5 10 11 1.6-8 7.8 2 11-10-5.3-10 5.3 2-11-8-7.8L19 16z"/>',
  'hub':'<circle cx="24" cy="24" r="5"/><circle cx="9" cy="11" r="4"/><circle cx="39" cy="11" r="4"/><circle cx="9" cy="37" r="4"/><circle cx="39" cy="37" r="4"/><path d="M12 14l8 7M36 14l-8 7M12 34l8-7M36 34l-8-7"/>',
  'hub-requests':'<path d="M6 28l5-18h26l5 18v10H6z"/><path d="M6 28h10l3 5h10l3-5h10"/>',
  'glossary':'<path d="M24 12c-5-4-12-4-18-2v28c6-2 13-2 18 2 5-4 12-4 18-2V10c-6-2-13-2-18 2z"/><path d="M24 12v28"/>',
  'mismo-link':'<path d="M20 28l8-8"/><path d="M22 14l4-4a8 8 0 0 1 12 12l-4 4M26 34l-4 4a8 8 0 0 1-12-12l4-4"/>',
  'qr':'<rect x="7" y="7" width="13" height="13" rx="1"/><rect x="28" y="7" width="13" height="13" rx="1"/><rect x="7" y="28" width="13" height="13" rx="1"/><path d="M28 28h5v5h-5zM36 36h5v5h-5zM36 28h5M28 38v3"/>'
};
const symbol=k=>'<svg class="hqx-sym" viewBox="0 0 48 48" aria-hidden="true">'+(SYM[k]||'<circle cx="24" cy="24" r="16"/>')+'</svg>';
/* counts a system shows on its own menu (e.g. "Action Queue 24"), remembered whenever it is opened here */
const CK='tools:team-hq:mismo.teamhq.syscount';
let counts={}; try{ counts=JSON.parse(localStorage.getItem(CK)||'{}')||{}; }catch(e){}
function readNav(doc){ const out={}; try{ doc.querySelectorAll('.hq nav button, nav button').forEach(b=>{ const t=(b.textContent||'').replace(/\s+/g,' ').trim(); const m=/^(.*?)\s*(\d+)$/.exec(t); const label=(m?m[1]:t).trim(); if(label) out[label]=m?+m[2]:0; }); }catch(e){} return out; }
function storeCounts(k, nav){ if(!nav || !Object.keys(nav).length) return; counts[k]={at:Date.now(), nav}; try{ localStorage.setItem(CK, JSON.stringify(counts)); }catch(e){} try{ window.dispatchEvent(new Event('hq:counts')); }catch(e){} }
function countFor(k, go){ const c=counts[k]; if(!c || !go || c.nav[go]==null) return null; return {n:c.nav[go], at:c.at}; }
function navOf(k){ const c=counts[k]; return c ? Object.keys(c.nav) : []; }
let pane=null;
function closeSys(){ if(!pane) return; const p=pane; pane=null; try{ storeCounts(p.k, readNav(p.fr.contentDocument)); }catch(e){} p.el.classList.add('out'); setTimeout(()=>p.el.remove(), 200); document.removeEventListener('keydown', p.esc); document.documentElement.classList.remove('hqx-sys-on'); }
function openSys(k, go, opt){
  opt=opt||{}; const s=typeof k==='object' ? k : SYS.find(x=>x.k===k); if(!s) return;
  if(pane) closeSys();
  const el=h('div','hqx-sys'); const scrim=h('div','hqx-scrim'); scrim.addEventListener('click', closeSys); el.appendChild(scrim);
  const box=h('div','hqx-pane'); box.setAttribute('role','dialog'); box.setAttribute('aria-label', s.n); box.style.setProperty('--k', s.c||'#74bfeb');
  const hd=h('div','hqx-ph'); const ic=h('span','ic'); ic.innerHTML=symbol(s.k); hd.appendChild(ic);
  const tt=h('div','tt'); tt.appendChild(h('b',null,s.n)); const sub=h('small',null, go ? go : (s.d||'')); tt.appendChild(sub); hd.appendChild(tt);
  if(opt.onPin){ const pin=h('button','hqx-pb','Make This a Dashboard Tile'); pin.type='button'; pin.addEventListener('click', ()=>{ let cur=''; try{ const fd=pane.fr.contentDocument; const b=fd.querySelector('nav button[aria-current], nav a[aria-current]') || [...fd.querySelectorAll('nav button, nav a')].find(z=>/(^|\s)(on|active|is-active|current|sel|selected)(\s|$)/.test(z.className||'')); if(b) cur=(b.textContent||'').replace(/\s+/g,' ').trim().replace(/\s*\d+$/,''); }catch(e){} opt.onPin(s.k, cur); pin.textContent='On Your Dashboard ✓'; pin.disabled=true; }); hd.appendChild(pin); }
  const nt=h('a','hqx-pb ghost','Open in a New Tab'); nt.href=s.u; nt.target='_blank'; nt.rel='noopener'; hd.appendChild(nt);
  const x=h('button','hqx-px','×'); x.type='button'; x.setAttribute('aria-label','Close and go back to Team HQ'); x.title='Close (Esc)'; x.addEventListener('click', closeSys); hd.appendChild(x);
  box.appendChild(hd);
  const ld=h('div','hqx-load'); ld.appendChild(h('i')); ld.appendChild(h('span',null,'Opening '+s.n+'…')); box.appendChild(ld);
  const fr=h('iframe','hqx-fr'); fr.src=s.u; fr.title=s.n; box.appendChild(fr);
  el.appendChild(box); document.body.appendChild(el); document.documentElement.classList.add('hqx-sys-on');
  const esc=e=>{ if(e.key==='Escape') closeSys(); }; document.addEventListener('keydown', esc);
  pane={el, fr, k:s.k, esc};
  fr.addEventListener('load', ()=>{
    let doc=null; try{ doc=fr.contentDocument; }catch(e){}
    if(doc){ try{ const st=doc.createElement('style'); st.textContent='.hqtop,body>header.mast,body>header.hqtop{display:none!important}:root{--hq-h:0px!important;--mast-h:0px!important;--masthead-h:0px!important}body{padding-top:0!important}'; doc.head.appendChild(st); }catch(e){} }
    let tries=0; const step=()=>{ tries++; if(!pane || pane.fr!==fr) return;
      const nav=doc ? readNav(doc) : {};
      if(go && doc){ const b=[...doc.querySelectorAll('.hq nav button, nav button')].find(z=>(z.textContent||'').replace(/\s+/g,' ').trim().replace(/\s*\d+$/,'')===go); if(b){ if(!b.hasAttribute('aria-current')) b.click(); go=null; } }
      if(Object.keys(nav).length) storeCounts(s.k, nav);
      if(tries<12 && (go || tries<8)) setTimeout(step, 700); else ld.remove();
      if(tries>2) ld.classList.add('done'); };
    step();
  });
}
const css2=document.createElement('style'); css2.id='hqx-css2'; css2.textContent=`
.hqx-sym{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.hqx-sys{position:fixed;inset:0;z-index:380}
.hqx-scrim{position:absolute;inset:0;background:rgba(6,32,47,.42);animation:hqxFade .2s ease}
.hqx-pane{position:absolute;top:calc(var(--hq-h,64px) + env(safe-area-inset-top,0px));right:0;bottom:0;width:75vw;display:flex;flex-direction:column;background:var(--surface);box-shadow:-18px 0 50px rgba(6,32,47,.35);animation:hqxIn .24s cubic-bezier(.2,.8,.2,1)}
.hqx-sys.out .hqx-pane{transform:translateX(100%);transition:transform .2s ease}.hqx-sys.out .hqx-scrim{opacity:0;transition:opacity .2s}
@keyframes hqxIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}
@keyframes hqxFade{from{opacity:0}to{opacity:1}}
.hqx-ph{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:10px 14px 10px 16px;background:linear-gradient(160deg,#10324a,#0b2436);color:#fff;border-bottom:3px solid var(--k)}
.hqx-ph .ic{flex:0 0 auto;width:32px;height:32px;color:var(--k)}
.hqx-ph .tt{flex:1;min-width:0;display:flex;flex-direction:column}.hqx-ph .tt b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hqx-ph .tt small{font-size:12px;color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hqx-pb{flex:0 0 auto;display:inline-flex;align-items:center;height:32px;padding:0 12px;border:1px solid rgba(116,191,235,.45);border-radius:6px;background:var(--sky);color:#06202f;font:inherit;font-size:12.5px;font-weight:700;text-decoration:none;cursor:pointer;white-space:nowrap;min-width:max-content}
.hqx-pb.ghost{background:rgba(255,255,255,.08);color:#fff}.hqx-pb:hover{filter:brightness(1.08)}.hqx-pb:disabled{opacity:.8;cursor:default}
.hqx-px{flex:0 0 auto;width:34px;height:32px;border:1px solid rgba(255,255,255,.25);border-radius:6px;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer}
.hqx-px:hover{background:rgba(255,255,255,.12)}
.hqx-fr{flex:1;width:100%;border:0;background:var(--ground)}
.hqx-load{position:absolute;left:0;right:0;top:58px;display:flex;align-items:center;justify-content:center;gap:10px;padding:40px;font-size:13px;font-weight:600;color:var(--ink-3);pointer-events:none;transition:opacity .3s}
.hqx-load.done{opacity:0}
.hqx-load i{width:18px;height:18px;border-radius:50%;border:2.5px solid var(--border);border-top-color:var(--c1);animation:hqxSpin .8s linear infinite}
@keyframes hqxSpin{to{transform:rotate(360deg)}}
html.hqx-sys-on body{overflow:hidden}
@media(max-width:640px){.hqx-pane{width:100%;top:0}.hqx-ph{padding-top:calc(10px + env(safe-area-inset-top,0px))}.hqx-ph .hqx-pb:not(.ghost){display:none}.hqx-ph .hqx-pb.ghost{padding:0 9px}}
`;
document.head.appendChild(css2);

loadMail(true);
const timer=setInterval(()=>{ if(!document.hidden) loadMail(true); }, 5*60e3);
window.__hqx={ version:'1.1', MAIL, loadMail, ago, myPeople, setMyPeople, pickPeople, statusOf, dayLoad, nextWorkday, SYS, SHORT, canOpen, figsFor, symbol, openSys, closeSys, countFor, navOf, sig:()=>MAIL.state+':'+MAIL.at+':'+MAIL.items.length+':'+myPeople().join(','),
  destroy(){ clearInterval(timer); closeSys(); css.remove(); css2.remove(); } };
})();

});
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
  if(k==='mail'){ const X=window.__hqx; return X && X.MAIL.state==='ok' ? X.MAIL.items.filter(m=>m.flagged || m.important || m.unread).length : 0; }
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
  if(X && X.MAIL.state==='ok'){ ['all','flagged','important','unread'].forEach(k=>{ const n=k==='all'?X.MAIL.items.length:X.MAIL.items.filter(m=>m[k]).length; const b=btn('hb-chip'+((ui.mf||'all')===k?' on':''), null, ()=>{ ui.mf=k; paint(); }); b.appendChild(h('span',null,{all:'All',flagged:'Flagged',important:'Important',unread:'Unread'}[k])); b.appendChild(h('b',null,String(n))); r.appendChild(b); }); }
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
  const L=X.MAIL.items.filter(m=>(ui.mf||'all')==='all' || m[ui.mf]);
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
/* ===== next.js ===== */
MODS.push(function(){
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
if(ui.on===undefined) ui.on = S.me==='jonna';
const qs=new URLSearchParams(location.search); if(qs.get('classic')==='1') ui.on=false; if(qs.get('next')==='1') ui.on=true;
const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify({on:ui.on, view:ui.view, modes:ui.modes, groups:ui.groups, who:ui.who, proj:ui.proj, showDone:ui.showDone, tpeople:ui.tpeople, fold:ui.fold})); }catch(e){} };

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
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>' };
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
const put=(c,o)=>window.__put ? window.__put(c,o) : Promise.resolve();
const cal=id=>{ const by=(window.__cal && window.__cal.CAL && window.__cal.CAL.by)||{}; return Array.isArray(by[id]) ? by[id] : null; };
function etAt(day, hour){ let t=Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hour+5, 0); const e=+new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York', hour:'numeric', hourCycle:'h23'}).format(t); return t+(hour-e)*3600e3; }
function holiday(d){ try{ const r=window.__t && window.__t.holidayOn(d); return r ? (typeof r==='string'?r:(r.n||r.t||r.name||'Holiday')) : ''; }catch(e){ return ''; } }
function keyDatesOn(d){ try{ return (window.__dOn ? window.__dOn(d) : []); }catch(e){ return []; } }
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
function change(t, patch, msg){ const before=Object.assign({}, t); put('tasks', Object.assign({}, t, patch)); toast(msg, ()=>put('tasks', before)); }
function complete(t, el, ev){ if(ev && ev.clientX) burst(ev.clientX, ev.clientY); if(el) el.classList.add('done');
  const before=Object.assign({}, t); setTimeout(()=>put('tasks', Object.assign({}, t, {s:'Done'})), el ? 320 : 0); toast('Done: '+t.t, ()=>put('tasks', before)); }

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
  day:{t:'My Dashboard', i:'home'}, week:{t:'My Week', i:'week'}, inbox:{t:'Inbox', i:'inbox'}, mine:{t:'My Tasks', i:'mine'}, cal:{t:'Calendar', i:'cal'}, all:{t:'All Tasks', i:'all'}, people:{t:'People', i:'ppl'} };
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
  const inboxN=myAsks().length+myNudges().length;
  add(railLbl('You'), firstClassic);
  add(railBtn('day','My Dashboard', ic('home')), firstClassic);
  add(railBtn('week','My Week', ic('week')), firstClassic);
  add(railBtn('inbox','Inbox', ic('inbox'), inboxN ? '<b class="nx-badge hot">'+inboxN+'</b>' : ''), firstClassic);
  const mineN=myOpen().length;
  add(railBtn('mine','My Tasks', ic('mine'), mineN ? '<b class="nx-badge">'+mineN+'</b>' : ''), firstClassic);
  const calB=add(railBtn('cal','Calendar', ic('cal')), firstClassic);
  placeBoardBtn(calB);
  add(railLbl('Team'), firstClassic);
  add(railBtn('all','All Tasks', ic('all')), firstClassic);
  add(railBtn('people','People', ic('ppl')), firstClassic);
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
  if(key.indexOf('c:')===0){ openClassic(key.slice(2)); return; }
  ui.view=key; ui.ws=''; ui.q=''; sel=-1; save();
  document.documentElement.classList.add('nx-show'); shell.hidden=false;
  paint(); body.scrollTop=0; markRail();
}
function openClassic(k){
  ui.view='c:'+k; save(); hideApp();
  const b=document.querySelector('.hq.rail nav button[data-hq="'+k+'"]');
  if(b) b.click(); else if(window.__show) window.__show(k);
  markRail(); window.scrollTo(0,0);
}
function hideApp(){ document.documentElement.classList.remove('nx-show'); if(shell) shell.hidden=true; closeMenus(); }
/* a click on a classic tab in the rail leaves the app area for that page */
function onRailClick(e){ if(!ui.on) return; const b=e.target.closest && e.target.closest('.hq.rail nav button[data-hq]'); if(!b) return;
  ui.view='c:'+b.dataset.hq; save(); hideApp(); setTimeout(markRail, 0); }

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
    else if(k==='all') vList('all');
    else if(k==='project') vProject(ui.view.slice(2));
    else if(k==='person') vPerson(ui.view.slice(2));
    else if(k==='cal') vCal();
    else if(k==='week') vWeek();
    else if(k==='people') vPeople();
    else vDash();
  }catch(e){ console.error(e); body.appendChild(h('p','nx-empty','Something went wrong drawing this view.')); }
  body.scrollTop=sy; const sl2=body.querySelector('.nx-sl, .nx-dl'); if(sl2) sl2.scrollTop=sly;
  drawTabbar();
}
function header(title, icon, sub, controls){
  const l=h('div','nx-hl');
  if(phone()){ const m=btn('nx-ib nx-menu-b', null, openMenuSheet); m.innerHTML=ic('menu'); m.setAttribute('aria-label','All of Team HQ'); l.appendChild(m); }
  if(icon){ const i=h('span','nx-hi'); i.innerHTML=icon; l.appendChild(i); }
  const tt=h('div','nx-ht'); tt.appendChild(h('h1',null,title)); if(sub) tt.appendChild(h('span','nx-hs',sub)); l.appendChild(tt);
  head.appendChild(l);
  head.appendChild(quickAdd());
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
  return r;
}
let drag=null;

/* ---------- little menus ---------- */
let menuEl=null;
function closeMenus(){ if(menuEl){ menuEl.remove(); menuEl=null; } }
function popMenu(anchor, items, title){
  closeMenus(); menuEl=h('div','nx-menu'+(phone()?' sheet':'')); if(title) menuEl.appendChild(h('div','nx-ml', title));
  items.forEach(it=>{ if(it.node){ menuEl.appendChild(it.node); return; } const b=btn('nx-mi'+(it.on?' on':''), null, ()=>{ closeMenus(); it.fn(); }); b.innerHTML=(it.icon||'')+'<span>'+it.label+'</span>'+(it.hint?'<small>'+it.hint+'</small>':''); menuEl.appendChild(b); });
  document.body.appendChild(menuEl);
  if(!phone()){ const r=anchor.getBoundingClientRect(), mh=menuEl.offsetHeight; let top=r.bottom+4; if(top+mh>innerHeight-8) top=Math.max(8, r.top-mh-4);
    menuEl.style.top=top+'px'; menuEl.style.left=Math.max(8, Math.min(innerWidth-menuEl.offsetWidth-8, r.left))+'px'; }
  setTimeout(()=>document.addEventListener('click', function off(e){ if(menuEl && !menuEl.contains(e.target)){ closeMenus(); document.removeEventListener('click', off); } }), 0);
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
  const wrap=h('div', mode==='board' ? 'nx-board' : 'nx-list');
  const G=groupsOf(L, g, ctx).filter(x=>x.items.length || (g==='status' && x.k!=='Done') || (mode==='board' && g!=='person' && g!=='project'));
  if(!L.length && !opt.keepEmpty){ wrap.appendChild(h('p','nx-empty', opt.empty || 'Nothing here.')); return wrap; }
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
  if(mode==='board' || window.matchMedia('(max-width:1000px)').matches){ body.appendChild(view); return; }
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
  const ft=h('div','nx-pk-ft');
  if(isOpen(t)){ const d=btn('nx-mini pri', null, e=>complete(t, null, e)); d.innerHTML=ic('check')+'<span>Mark Done</span>'; ft.appendChild(d); }
  const o=btn('nx-mini', null, ()=>editTask(t)); o.innerHTML='<span>Full Editor</span>'+ic('ext'); ft.appendChild(o);
  ft.appendChild(h('span','tip','J / K to move · X done · Enter opens'));
  peekEl.appendChild(ft);
}

/* ---------- toolbar bits ---------- */
function seg(items, cur, fn, cls){ const s=h('div','nx-seg'+(cls?' '+cls:'')); items.forEach(([k,l,icon])=>{ const b=btn('nx-sg'+(cur===k?' on':''), null, ()=>fn(k)); b.innerHTML=(icon?ic(icon):'')+(l?'<span>'+l+'</span>':''); if(!l) b.title=k; s.appendChild(b); }); return s; }
function modeSeg(key, def){ const m=ui.modes[key]||def; return seg([['list','','list'],['board','','board']], m, k=>{ ui.modes[key]=k; save(); paint(); }, 'ico'); }
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
  const nIn=myAsks().length+myNudges().length; if(nIn) stat(nIn, me()==='jonna'?'asks for you':'your asks','hot',()=>open('inbox'));
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

/* ---------- INBOX ---------- */
function vInbox(){
  const asks=myAsks(), nudges=myNudges();
  const askB=btn('nx-mini pri', 'Ask for Something', ()=>window.__ask2 && window.__ask2());
  header('Inbox', ic('inbox'), me()==='jonna' ? 'Every ask from the team comes here' : 'Your asks, nudges and hand-offs', [askB]);
  const list=h('div','nx-list');
  const sec=(k, title, n, fill, tone)=>{ const fk='inbox|'+k; const s2=h('section','nx-grp'+(ui.fold[fk]?' shut':'')); const gh=h('div','nx-gh'+(tone?' '+tone:''));
    const f=btn('nx-fold', null, ()=>{ ui.fold[fk]=!s2.classList.contains('shut'); save(); s2.classList.toggle('shut'); }); f.innerHTML=ic('down'); gh.appendChild(f);
    gh.appendChild(h('b',null,title)); gh.appendChild(h('span','nx-cnt',String(n))); s2.appendChild(gh); const it=h('div','nx-items'); fill(it); s2.appendChild(it); list.appendChild(s2); };
  const askRow=a=>{ const r=btn('nx-row nx-ask', null, ()=>window.__editAsk && window.__editAsk(a)); if(a.by) r.appendChild(av(a.by,22)); r.appendChild(h('span','nx-tt', a.t)); if(a.by) r.appendChild(h('span','nx-ws', 'from '+first(a.by)));
    r.appendChild(h('span','nx-sp')); if(a.kind||a.k) r.appendChild(h('span','nx-ws', a.kind||a.k)); r.appendChild(h('span','nx-state '+String(a.state||'New').toLowerCase().replace(/\s+/g,'-'), a.state||'New')); return r; };
  sec('needs', me()==='jonna'?'Asks for You':'Your Open Asks', asks.length+nudges.length, it=>{
    if(!asks.length && !nudges.length) it.appendChild(h('div','nx-drope','All clear. New asks land here the moment someone sends one.'));
    asks.sort((a,b)=>(b.at||0)-(a.at||0)).forEach(a=>it.appendChild(askRow(a)));
    nudges.forEach(n=>{ const r=h('div','nx-row nx-ask'); if(n.by) r.appendChild(av(n.by,22)); r.appendChild(h('span','nx-tt', n.m||n.k)); r.appendChild(h('span','nx-sp')); r.appendChild(btn('nx-mini','Done', ()=>put('nudges', Object.assign({}, n, {done:1})))); it.appendChild(r); }); }, asks.length?'warn':'');
  const xm=X(); if(xm && xm.MAIL.state==='ok'){ const mi=xm.MAIL.items.filter(m=>m.flagged || m.important || m.unread); sec('mail','Email to Look At', mi.length, it=>{ if(!mi.length) it.appendChild(h('div','nx-drope','Nothing flagged or waiting.')); mi.slice(0,15).forEach(m=>it.appendChild(mailRow(m))); }); }
  else { sec('mail','Email to Look At', 0, it=>{ const c=mailPanel(); c.querySelector('.nx-gh').remove(); it.appendChild(c); }); }
  const waiting=myOpen().filter(t=>st(t)==='Waiting on Someone').sort(byDue);
  sec('wait','Waiting on Someone', waiting.length, it=>{ if(!waiting.length) it.appendChild(h('div','nx-drope','Nothing of yours is waiting on anyone.')); waiting.forEach(t=>it.appendChild(row(t))); });
  const watch=S.tasks.filter(t=>isOpen(t) && t.o===me() && doers(t).indexOf(me())<0).sort(byDue);
  sec('watch','You’re Accountable, Others Are Doing', watch.length, it=>{ if(!watch.length) it.appendChild(h('div','nx-drope','Nothing handed off right now.')); watch.forEach(t=>it.appendChild(row(t))); });
  const soon=S.tasks.filter(t=>isOpen(t) && t.due && days(t.due)<=7 && doers(t).indexOf(me())<0 && S.rocks.some(r=>r.id===t.r && r.lead===me())).sort(byDue);
  if(soon.length) sec('soon','Due Soon on Projects You Lead', soon.length, it=>soon.forEach(t=>it.appendChild(row(t))));
  const closed=(S.asks||[]).filter(a=>(a.state==='Built' || a.state==='Not Doing') && (me()==='jonna' || a.by===me())).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,8);
  sec('closed','Recently Closed Asks', closed.length, it=>{ if(!closed.length) it.appendChild(h('div','nx-drope','No closed asks yet.')); closed.forEach(a=>it.appendChild(askRow(a))); });
  withPeek(list, [], 'list');
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
  withPeek(taskView(L, g, m, key, {empty: ui.q ? 'Nothing matches “'+ui.q+'”.' : 'Nothing open. Nice.', noProj: false}), L, m);
}

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
  const ppl=h('div','who'); const ids=[...new Set(open_.flatMap(doers))]; if(r.lead && ids.indexOf(r.lead)<0) ids.unshift(r.lead); ids.slice(0,8).forEach(i=>{ const a=av(i,22); a.style.cursor='pointer'; a.addEventListener('click', ()=>open('u:'+i)); ppl.appendChild(a); }); tx.appendChild(ppl);
  band.appendChild(tx);
  const chips=h('div','nx-wschips');
  const chip=(k,l,n)=>{ const b=btn('nx-chip'+(ui.ws===k?' on':''), null, ()=>{ ui.ws=ui.ws===k?'':k; paint(); }); b.appendChild(h('span',null,l)); b.appendChild(h('b',null,String(n))); chips.appendChild(b); };
  chip('', 'All Workstreams', open_.length);
  const wsn=[...new Set((r.ws||[]).concat(open_.map(t=>t.w||'').filter(Boolean)))];
  wsn.forEach(w=>chip(w, w, open_.filter(t=>(t.w||'')===w).length));
  band.appendChild(chips);
  const more=btn('nx-mini', null, ()=>{ openClassic('rocks'); setTimeout(()=>window.__pv2 && window.__pv2.openPanel && window.__pv2.openPanel(id,{}), 120); }); more.innerHTML='<span>Timeline and More</span>'+ic('ext'); more.style.marginLeft='auto'; chips.appendChild(more);
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
  board:{n:'My Board Panels', g:'Team', k:'#74BFEB', d:'Your notes, locked note and system panels'}
};
function dashDefault(){
  const L=[{t:'day'},{t:'tasks'},{t:'email'},{t:'people'},{t:'projects'},{t:'keydate'},{t:'meeting'},{t:'load'}];
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
function saveDash(L){ if(!S.bset) S.bset={}; S.bset[DK]=L.map(z=>{ const o={t:z.t}; ['s','go','f','w'].forEach(k=>{ if(z[k]) o[k]=z[k]; }); return o; }); try{ window.__saveMine && window.__saveMine(); }catch(e){} }
let dashEdit=null; /* the layout being customized, or null */
function pinTile(k, go){ const L=dashLayout(); const i=L.findIndex(z=>z.t==='sys' && z.s===k && (z.go||'')===(go||'')); const had=i>=0; const t=had ? L.splice(i,1)[0] : {t:'sys', s:k, go:go||''}; L.splice(0,0,t); saveDash(L); toast((had?'Moved to the top of your dashboard':'Added to your dashboard')+(go?': '+go:''), null); if(viewKind()==='day' && !dashEdit) paint(); }
function openSystem(k, go){ const x=X(); if(x && x.openSys) x.openSys(k, go, {onPin:pinTile}); }
const em=t=>{ const e=h('em'); e.textContent=t; return e; };
function vDash(){
  const now=new Date(), hr=now.getHours();
  const cz=btn('nx-mini', null, ()=>{ dashEdit = dashEdit ? null : dashLayout(); paint(); }); cz.innerHTML=ic('gear')+'<span>'+(dashEdit?'Customizing…':'Customize')+'</span>';
  header('My Dashboard', ic('home'), WDL[now.getDay()]+', '+MON[now.getMonth()]+' '+now.getDate(), [cz]);
  const pg=h('div','nx-dash'); body.appendChild(pg);
  pg.appendChild(dashHero(now, hr));
  pg.appendChild(dashWeek());
  /* the tiles */
  const vb=h('div','nx-dvb'); vb.appendChild(h('h2',null,'Your Dashboard'));
  const r=h('div','nx-dvr');
  if(dashEdit){ r.appendChild(btn('nx-mini', '+ Add a Tile', openCatalog)); r.appendChild(btn('nx-mini', 'Reset', ()=>{ dashEdit=dashDefault(); paint(); }));
    r.appendChild(btn('nx-mini', 'Cancel', ()=>{ dashEdit=null; paint(); })); r.appendChild(btn('nx-mini pri', 'Save Layout', ()=>{ saveDash(dashEdit); dashEdit=null; toast('Your dashboard is saved', null); paint(); })); }
  else { r.appendChild(btn('nx-mini', '+ Add a Tile', ()=>{ dashEdit=dashLayout(); paint(); openCatalog(); })); r.appendChild(btn('nx-mini', null, ()=>{ dashEdit=dashLayout(); paint(); })).innerHTML=ic('gear')+'<span>Customize</span>'; }
  vb.appendChild(r); pg.appendChild(vb);
  if(dashEdit) pg.appendChild(h('p','nx-dtip','Drag tiles to put them in order, make one wide or narrow, take off what you don’t need, then Save Layout. Open any system and use Make This a Dashboard Tile to pin the exact page you want — like an approval queue.'));
  const grid=h('div','nx-tiles'+(dashEdit?' editing':''));
  const L=dashEdit || dashLayout();
  L.forEach((cfg, i)=>{ let el=null; try{ el=tile(cfg, i, L); }catch(e){ console.error(e); } if(el) grid.appendChild(el); });
  if(dashEdit){ const add=btn('nx-tadd', null, openCatalog); add.innerHTML='<b>+</b><span>Add a Tile</span>'; grid.appendChild(add); }
  pg.appendChild(grid);
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
  const all=btn('nx-all', null, ()=>open('week')); all.textContent='Plan My Week →'; nd.appendChild(all);
  hero.appendChild(nd);
  return hero;
}
function nextKeyDate(){ const F=(S.dates||[]).filter(d=>d.d && pd(d.e||d.d)>=today()).sort((a,b)=>(b.pin?1:0)-(a.pin?1:0) || (a.d<b.d?-1:1)); return F.find(d=>days(d.d)>=0) || F[0] || null; }
function dashWeek(){
  const wrap=h('div','nx-sw'); const t0=today(); const x=X();
  for(let i=0;i<7;i++){ const d=addD(t0,i); const key=iso(d), hol=holiday(d), wk=d.getDay()%6===0;
    const due=myOpen().filter(t=>t.due===key), late=i===0 ? myOpen().filter(t=>t.due && days(t.due)<0) : [];
    const kd=keyDatesOn(d), L=!wk && x && x.dayLoad ? x.dayLoad(me(), d) : null;
    const b=btn('nx-swd'+(i===0?' now':'')+(wk?' wkd':''), null, ()=>open(i===0?'cal':'week'));
    b.appendChild(h('span',null, i===0?'Today':WD[d.getDay()])); b.appendChild(h('b',null,String(d.getDate())));
    const pills=h('div','nx-pills'); const pil=(k,n)=>{ for(let j=0;j<Math.min(n,4);j++){ const z=h('i'); z.style.setProperty('--k',k); pills.appendChild(z); } };
    pil('#FF8A7A', late.length); pil('#74BFEB', due.length); pil('#3CCB7F', kd.length); if(L && L.n) pil('#5A7A94', Math.ceil(L.n/2)); b.appendChild(pills);
    const sm = hol ? hol : kd.length ? kd[0].t : due.length ? due.length+(due.length===1?' task due':' tasks due') : L ? L.n+(L.n===1?' meeting':' meetings') : wk ? 'Weekend' : 'Clear';
    b.appendChild(h('small',null,sm)); b.title=[due.length?due.length+' due':'', L?L.n+' meetings':'', kd.map(z=>z.t).join(', ')].filter(Boolean).join(' · ');
    wrap.appendChild(b); }
  return wrap;
}
/* one tile */
function tileShell(cfg, meta, i, L){
  const el=h('div','st-tile t-'+cfg.t+((cfg.w||meta.w)===2?' w2':''));
  el.style.setProperty('--k', meta.k); el.tabIndex=0; el.setAttribute('role','button'); el.setAttribute('aria-label', meta.n);
  if(dashEdit){ el.draggable=true; el.dataset.i=i;
    const ctl=h('div','nx-tctl');
    const wb=btn('nx-tcb', (cfg.w||meta.w)===2?'Narrow':'Wide', e=>{ e.stopPropagation(); cfg.w=(cfg.w||meta.w)===2?1:2; paint(); }); ctl.appendChild(wb);
    if(cfg.t==='sys'){ const sb=btn('nx-tcb','Settings', e=>{ e.stopPropagation(); sysSettings(cfg, sb); }); ctl.appendChild(sb); }
    const rm=btn('nx-tcb x','×', e=>{ e.stopPropagation(); L.splice(i,1); paint(); }); rm.title='Take this tile off'; rm.setAttribute('aria-label','Take '+meta.n+' off'); ctl.appendChild(rm);
    el.appendChild(ctl);
    el.addEventListener('dragstart', e=>{ tdrag=i; el.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed='move'; }catch(x){} });
    el.addEventListener('dragend', ()=>{ tdrag=null; el.classList.remove('dragging'); document.querySelectorAll('.st-tile.tover').forEach(z=>z.classList.remove('tover')); });
    el.addEventListener('dragover', e=>{ if(tdrag==null) return; e.preventDefault(); el.classList.add('tover'); });
    el.addEventListener('dragleave', ()=>el.classList.remove('tover'));
    el.addEventListener('drop', e=>{ e.preventDefault(); el.classList.remove('tover'); if(tdrag==null || tdrag===i) return; const [m]=L.splice(tdrag,1); L.splice(i,0,m); tdrag=null; paint(); });
  }
  return el;
}
let tdrag=null;
function tile(cfg, i, L){
  const meta = cfg.t==='sys' ? sysMeta(cfg) : TILES[cfg.t]; if(!meta) return null;
  const el=tileShell(cfg, meta, i, L);
  const top=h('div','st-top'); top.appendChild(h('span','st-lab', meta.lab||meta.n)); el.appendChild(top);
  const go=()=>{ if(dashEdit) return; meta.go ? meta.go() : null; };
  const x=X(), t0=today();
  if(cfg.t==='tasks'){ const M=myOpen(), late=M.filter(t=>t.due && days(t.due)<0).length, all=S.tasks.filter(t=>doers(t).indexOf(me())>=0), done=all.length-M.length;
    if(late) top.appendChild(h('span','st-pill hot', late+' late'));
    const b=h('div','st-big'); b.append(String(M.length)); b.appendChild(h('small',null,'open')); el.appendChild(b);
    const m=h('div','st-meter'); const f=h('i'); f.style.width=(all.length?Math.round(done/all.length*100):0)+'%'; m.appendChild(f); el.appendChild(m);
    el.appendChild(h('div','st-sub', done+' of '+all.length+' done · '+M.filter(t=>t.due && days(t.due)>=0 && days(t.due)<=7).length+' due this week'));
    const nx=M.sort(byDue)[0]; if(nx){ const n=h('div','st-next'); n.append('Next: '); n.appendChild(h('b',null,nx.t)); if(nx.due) n.append(' · '+fmt(nx.due)); el.appendChild(n); }
    meta.go=()=>open('mine'); }
  else if(cfg.t==='day'){ let day=nextWorkday(t0); const now=Date.now(); if(+day===+t0 && now>etAt(day,17)) day=nextWorkday(addD(day,1));
    top.firstChild.textContent=+day===+t0?'Your Day':'Your '+WDL[day.getDay()];
    const ev=(cal(me())||[]).filter(e=>e.e>+day && e.s<+day+864e5 && e.show!=='free' && !e.all).sort((a,b)=>a.s-b.s);
    const nx=ev.find(e=>e.e>now), cur=ev.find(e=>e.s<=now && e.e>now);
    const row=h('div','mic-row'); const ep=h('div','mic-ep');
    ep.appendChild(h('b',null, cur ? 'In: '+(cur.t||'Busy') : nx ? 'Next: '+(nx.t||'Busy') : ev.length ? 'Meetings done' : 'No meetings'));
    ep.appendChild(h('small',null, cur ? 'until '+tmL(cur.e) : nx ? tmL(nx.s)+(+day!==+t0?' '+WD[day.getDay()]:'') : 'the day is yours'));
    row.appendChild(ep);
    if(nx && !cur){ const ms=Math.max(0,nx.s-now), dd=Math.floor(ms/864e5), hh=Math.floor(ms%864e5/36e5), mm=Math.floor(ms%36e5/6e4); const cd=h('div','mic-cd'); (dd?[[dd,'Days'],[hh,'Hrs']]:[[hh,'Hrs'],[mm,'Min']]).forEach(([v,l])=>{ const sp=h('span'); sp.appendChild(h('b',null,String(v).padStart(2,'0'))); sp.appendChild(h('small',null,l)); cd.appendChild(sp); }); row.appendChild(cd); }
    el.appendChild(row);
    const ag=h('div','nx-ag'); ev.slice(0,6).forEach(e=>{ const r=h('div','ae'+(e.e<now?' past':'')+(e.s<=now&&e.e>now?' on':'')); r.appendChild(h('span','t',tm(e.s))); r.appendChild(h('span','n',e.t||'Busy')); ag.appendChild(r); }); if(ev.length>6) ag.appendChild(h('div','ae more','+'+(ev.length-6)+' more')); el.appendChild(ag);
    const Ld=x && x.dayLoad ? x.dayLoad(me(), day) : null; if(Ld){ const n=h('div','st-next'); n.appendChild(h('b',null,(Math.round(Ld.free/30)/2)+'h open')); n.append(' between 9 and 5 · '+ev.length+(ev.length===1?' meeting':' meetings')); el.appendChild(n); }
    meta.go=()=>open('cal'); }
  else if(cfg.t==='email'){ const ok=x && x.MAIL.state==='ok'; const items=ok ? x.MAIL.items.filter(m=>m.flagged||m.important||m.unread) : [];
    const art=h('div','nx-env'); art.innerHTML='<svg viewBox="0 0 64 44"><rect x="2" y="2" width="60" height="40" rx="4"/><path d="M4 5l28 21L60 5"/></svg>'; if(ok && items.length) art.appendChild(h('b',null,String(items.length))); el.appendChild(art);
    if(!ok){ el.appendChild(h('div','st-sub','Connect your Outlook email and what you’ve flagged or need to read shows up here.')); }
    else { const fl=items.filter(m=>m.flagged).length; el.appendChild(h('div','st-sub', items.length ? fl+' flagged · '+items.filter(m=>m.unread).length+' unread' : 'Nothing flagged or waiting')); if(items[0]){ const n=h('div','st-next'); n.appendChild(h('b',null,items[0].from)); n.append(' · '+items[0].subject); el.appendChild(n); } }
    meta.go=()=>open('inbox'); }
  else if(cfg.t==='asks'){ const A=myAsks(), nw=A.filter(a=>(a.state||'New')==='New');
    if(nw.length) top.appendChild(h('span','st-pill hot', nw.length+' new'));
    const b=h('div','st-big'); b.append(String(A.length)); b.appendChild(h('small',null, me()==='jonna'?'asks for you':'open asks')); el.appendChild(b);
    if(A[0]){ const n=h('div','st-next'); n.append('Newest: '); n.appendChild(h('b',null,A.slice().sort((a,c)=>(c.at||0)-(a.at||0))[0].t)); el.appendChild(n); } else el.appendChild(h('div','st-sub','Nothing waiting. Ask for something any time.'));
    meta.go=()=>open('inbox'); }
  else if(cfg.t==='load'){ let mon=addD(t0, -((t0.getDay()+6)%7)); if(t0.getDay()%6===0) mon=addD(mon,7); const D=[0,1,2,3,4].map(k=>addD(mon,k));
    const bars=h('div','nx-bars'); let free=0; D.forEach(d=>{ const Ld=x && x.dayLoad ? x.dayLoad(me(), d) : null; const hrs=Ld?Ld.busy/60:0; if(Ld) free+=Ld.free; const c=h('div','bc'+(+d===+t0?' on':'')); const bb=h('i'); bb.style.height=Math.max(4, Math.min(100, hrs/8*100))+'%'; c.appendChild(h('b',null,(Math.round(hrs*2)/2)+'h')); c.appendChild(bb); c.appendChild(h('span',null,WD[d.getDay()])); bars.appendChild(c); }); el.appendChild(bars);
    el.appendChild(h('div','st-next', (Math.round(free/30)/2)+' hours open this week between meetings'));
    meta.go=()=>open('week'); }
  else if(cfg.t==='people' || cfg.t==='team'){ const ids=cfg.t==='team' ? people().filter(p=>p.id!==me()).map(p=>p.id) : (x ? x.myPeople() : []);
    if(!ids.length){ el.appendChild(h('div','st-sub','Choose your direct reports, or anyone you keep an eye on.')); const c=btn('st-act','Choose My People', e=>{ e.stopPropagation(); x && x.pickPeople(); }); el.appendChild(c); meta.go=()=>x && x.pickPeople(); }
    else { const row=h('div','nx-avrow'); const tally={free:0,busy:0,away:0,off:0,unk:0}; ids.forEach(id=>{ const pp=person(id); if(!pp) return; const s2=statusOf(pp); tally[s2.k]=(tally[s2.k]||0)+1; const w=h('span','nx-avw'); w.appendChild(av(id,34)); w.appendChild(h('i','nx-dot '+s2.k)); w.title=pp.name+' · '+s2.t+(s2.s?' '+s2.s:''); row.appendChild(w); }); el.appendChild(row);
      const parts=[]; if(tally.free) parts.push(tally.free+' free'); if(tally.busy) parts.push(tally.busy+' in meetings'); if(tally.away) parts.push(tally.away+' out'); if(tally.off) parts.push(t0.getDay()%6===0?'weekend':tally.off+' off');
      el.appendChild(h('div','st-sub', parts.join(' · ')||'—'));
      const late=S.tasks.filter(t=>isOpen(t) && t.due && days(t.due)<0 && doers(t).some(d=>ids.indexOf(d)>=0)).length; const n=h('div','st-next'); n.appendChild(h('b',null,String(S.tasks.filter(t=>isOpen(t) && doers(t).some(d=>ids.indexOf(d)>=0)).length))); n.append(' open'); if(late){ n.append(' · '); n.appendChild(h('b',null,late+' late')); } el.appendChild(n);
      meta.go=()=>open('people'); } }
  else if(cfg.t==='projects'){ const R=activeRocks().filter(r=>r.lead===me() || S.tasks.some(t=>t.r===r.id && isOpen(t) && doers(t).indexOf(me())>=0));
    if(!R.length) el.appendChild(h('div','st-sub','You’re not on a Team Project right now.'));
    R.slice(0,4).forEach(r=>{ const ts=S.tasks.filter(t=>t.r===r.id), op=ts.filter(isOpen), pct=ts.length?Math.round((ts.length-op.length)/ts.length*100):0; const rw=btn('nx-prj', null, e=>{ e.stopPropagation(); if(!dashEdit) open('p:'+r.id); }); rw.style.setProperty('--rc', rcol(r)); const tp=h('div','tp'); tp.appendChild(h('b',null,r.name)); tp.appendChild(h('span',null,pct+'%')); rw.appendChild(tp); const m=h('div','st-meter'); const f=h('i'); f.style.width=pct+'%'; f.style.background=rcol(r); m.appendChild(f); rw.appendChild(m); el.appendChild(rw); });
    if(R.length>4) el.appendChild(h('div','st-next','+'+(R.length-4)+' more'));
    meta.go=()=>openClassic('rocks'); }
  else if(cfg.t==='keydate'){ const kd=nextKeyDate(); if(!kd){ el.appendChild(h('div','st-sub','No key dates coming up.')); meta.go=()=>openClassic('dates'); }
    else { const n=Math.max(0,days(kd.d)), C=2*Math.PI*44, frac=Math.max(.04, 1-Math.min(n,120)/120); const rg=h('div','ring'); rg.innerHTML='<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/><circle class="rv" cx="50" cy="50" r="44" stroke-dasharray="'+(C*frac).toFixed(1)+' '+C.toFixed(1)+'"/></svg>'; const dv=h('div'); dv.appendChild(h('b',null,String(n))); dv.appendChild(h('small',null,n===1?'day':'days')); rg.appendChild(dv); el.appendChild(rg);
      const s2=h('div','st-next'); s2.appendChild(h('b',null,kd.t)); s2.append(' · '+fmt(kd.d)+(kd.e&&kd.e!==kd.d?' – '+fmt(kd.e):'')); el.appendChild(s2); meta.go=()=>window.__editDate && window.__editDate(kd); } }
  else if(cfg.t==='meeting'){ let md=''; try{ const nm=window.__mtg && window.__mtg.next && window.__mtg.next(); md=typeof nm==='string'?nm:''; }catch(e){}
    if(md){ const n=Math.max(0,days(md)); const cd=h('div','mic-cd'); [[n,n===1?'Day':'Days']].forEach(([v,l])=>{ const sp=h('span'); sp.appendChild(h('b',null,String(v).padStart(2,'0'))); sp.appendChild(h('small',null,l)); cd.appendChild(sp); }); const row=h('div','mic-row'); const ep=h('div','mic-ep'); ep.appendChild(h('b',null,WDL[pd(md).getDay()]+', '+fmt(md))); const items=(S.agenda||[]).filter(a=>a.mtg===md && !a.done); ep.appendChild(h('small',null, items.length+(items.length===1?' item':' items')+' on the agenda')); row.appendChild(ep); row.appendChild(cd); el.appendChild(row);
      const st2=h('div','mic-steps'); ['Before Business','Team Projects','Around the Room','Good of the Order'].forEach(z=>st2.appendChild(h('span',null,z))); el.appendChild(st2); }
    else el.appendChild(h('div','st-sub','No team meeting on the calendar.'));
    const n2=h('div','st-next'); n2.append('Raise something: '); n2.appendChild(h('b',null,'add it to the agenda')); el.appendChild(n2);
    meta.go=()=>openClassic('agenda'); }
  else if(cfg.t==='wins'){ const W=S.tasks.filter(t=>!isOpen(t)).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,3);
    W.forEach(t=>{ const r=h('div','nx-wn'); const d=doers(t)[0]; if(d) r.appendChild(av(d,22)); const tx=h('span',null,t.t); r.appendChild(tx); el.appendChild(r); }); if(!W.length) el.appendChild(h('div','st-sub','Nothing finished yet.'));
    meta.go=()=>{ ui.showDone=true; save(); open('all'); }; }
  else if(cfg.t==='board'){ let names=[]; try{ const Lb=(S.nb&&S.nb.pages&&S.nb.pages[0]&&S.nb.pages[0].tabs&&S.nb.pages[0].tabs[0]&&S.nb.pages[0].tabs[0].L)||S.layout||[]; Lb.forEach(r=>(r.r||[]).forEach(c=>names.push(c.t))); }catch(e){}
    const NM={mytasks:'My Tasks',mynote:'My Notes',mtoday:'Meeting Trackers',links:'My Systems',vault:'Locked Note'}; const g=h('div','nx-bgrid'); [...new Set(names)].slice(0,6).forEach(n=>g.appendChild(h('span',null,NM[n]||n.replace(/^./,c=>c.toUpperCase())))); el.appendChild(g);
    el.appendChild(h('div','st-next', 'Notes, the locked note and system panels — arranged your way'));
    meta.go=()=>openClassic('mine'); }
  else if(cfg.t==='sys'){ meta.draw(el, top); }
  el.addEventListener('click', e=>{ if(dashEdit || e.target.closest('button:not(.st-tile)')) return; go(); });
  el.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target===el && !dashEdit){ e.preventDefault(); go(); } });
  return el;
}
function sysMeta(cfg){ const x=X(); const s=x && x.SYS.find(z=>z.k===cfg.s); if(!s) return null;
  const meta={n:s.n, lab:(x.SHORT[s.k]||s.n), k:s.c};
  meta.draw=(el, top)=>{
    if(cfg.go) top.appendChild(h('span','st-pill', cfg.go));
    const body2=h('div','nx-sysb'); const sym=h('div','nx-sym'); sym.innerHTML=x.symbol(s.k); body2.appendChild(sym);
    const val=h('div','nx-sysv');
    const c=cfg.go && x.countFor(s.k, cfg.go); const figs=x.figsFor(s.k); const fig=cfg.f ? figs.find(f=>f.id===cfg.f) : (cfg.go ? null : figs[0]);
    if(c){ const b=h('div','st-big'); b.append(String(c.n)); b.appendChild(h('small',null, cfg.go)); val.appendChild(b); }
    else if(fig){ const b=h('div','st-big'); b.append(String(fig.v)); val.appendChild(b); val.appendChild(h('div','st-sub', fig.n)); }
    else if(cfg.go){ val.appendChild(h('div','st-sub','Opens straight to '+cfg.go+'. The count shows here after the first time you open it.')); }
    else val.appendChild(h('div','st-sub', s.d));
    body2.appendChild(val); el.appendChild(body2);
    const nt=h('div','st-next'); nt.append(c ? 'Checked '+x.ago(c.at) : fig && fig.asof ? 'As of '+fmt(fig.asof) : 'Opens right here'); nt.appendChild(h('b','opn',' Open →')); el.appendChild(nt);
  };
  meta.go=()=>openSystem(s.k, cfg.go||'');
  return meta; }
function sysSettings(cfg, anchor){ const x=X(); const s=x.SYS.find(z=>z.k===cfg.s); const items=[];
  const nav=x.navOf(s.k); if(nav.length){ items.push({node:h('div','nx-ml','Opens To')}); items.push({label:'Its Home Page', on:!cfg.go, fn:()=>{ cfg.go=''; paint(); }}); nav.forEach(n=>items.push({label:n, on:cfg.go===n, fn:()=>{ cfg.go=n; cfg.f=''; paint(); }})); }
  else items.push({node:h('div','nx-ml','Open '+(x.SHORT[s.k]||s.n)+' once and its pages show up here to pick from')});
  const figs=x.figsFor(s.k); if(figs.length){ items.push({node:h('div','nx-ml','Number to Show')}); figs.forEach(f=>items.push({label:f.n, hint:String(f.v), on:cfg.f===f.id, fn:()=>{ cfg.f=f.id; paint(); }})); }
  popMenu(anchor, items, (x.SHORT[s.k]||s.n)); if(menuEl) menuEl.classList.add('tall'); }
function openCatalog(){
  const x=X(); if(!dashEdit) dashEdit=dashLayout();
  const ov=h('div','hqx-ov'); const box=h('div','hqx-box nx-cat'); box.setAttribute('role','dialog'); box.setAttribute('aria-label','Add a Tile');
  box.appendChild(h('h2',null,'Add a Tile')); box.appendChild(h('p',null,'Pick what you want to see. Systems open right here in Team HQ when you click them.'));
  const close=()=>ov.remove();
  const sec=(t)=>box.appendChild(h('div','nx-sec',t));
  const card=(name, desc, k, symHtml, fn, on)=>{ const b=btn('nx-cti'+(on?' on':'')); b.style.setProperty('--k',k); const i=h('span','ci'); i.innerHTML=symHtml; b.appendChild(i); const t=h('span','tx'); t.appendChild(h('b',null,name)); t.appendChild(h('small',null,desc)); b.appendChild(t); b.appendChild(h('em',null,on?'On':'Add')); b.addEventListener('click', ()=>{ fn(); b.classList.add('on'); b.querySelector('em').textContent='Added'; }); return b; };
  ['Your Day','Team'].forEach(g=>{ sec(g); const gr=h('div','nx-ctg'); Object.keys(TILES).filter(k=>TILES[k].g===g).forEach(k=>{ const on=dashEdit.some(z=>z.t===k); gr.appendChild(card(TILES[k].n, TILES[k].d, TILES[k].k, ic(k==='email'?'mail':k==='people'||k==='team'?'ppl':k==='day'||k==='load'?'cal':k==='tasks'?'mine':k==='board'?'all':k==='asks'?'inbox':'week'), ()=>{ if(!dashEdit.some(z=>z.t===k)) dashEdit.push({t:k}); paint(); }, on)); }); box.appendChild(gr); });
  sec('MISMO Systems'); const gs=h('div','nx-ctg'); (x?x.SYS:[]).filter(z=>x.canOpen(z.k)).sort((a,b)=>a.n.localeCompare(b.n)).forEach(z=>{ const on=dashEdit.some(q=>q.t==='sys' && q.s===z.k); gs.appendChild(card(z.n, z.d, z.c, x.symbol(z.k), ()=>{ dashEdit.push({t:'sys', s:z.k}); paint(); }, on)); }); box.appendChild(gs);
  const ft=h('div','hqx-ft'); const d=btn('btn','Done', close); ft.appendChild(d); box.appendChild(ft);
  ov.appendChild(box); ov.addEventListener('click', e=>{ if(e.target===ov) close(); }); document.body.appendChild(ov);
}
window.addEventListener('hq:counts', ()=>{ if(ui.on && viewKind()==='day' && !dashEdit) paint(); });

/* ---------- email and people, shared by My Day, Inbox and People ---------- */
const X=()=>window.__hqx;
function mailRow(m){ const x=X(); const r=h('div','nx-mrow'+(m.unread?' unread':''));
  const ic2=h('span','mi'+(m.flagged?' flag':m.important?' imp':'')); ic2.textContent=m.flagged?'⚑':m.important?'!':'•'; ic2.title=m.flagged?'Flagged':m.important?'Important':'Unread'; r.appendChild(ic2);
  const tx=h('div','tx'); const tp=h('div','tp'); tp.appendChild(h('b',null,m.from||'Someone')); tp.appendChild(h('span','ag', m.at?x.ago(m.at):'')); tx.appendChild(tp); tx.appendChild(h('div','sj', m.subject)); r.appendChild(tx);
  const ac=h('div','ac');
  const mk=btn('nx-ib', null, e=>{ e.stopPropagation(); newTask({t:m.subject, p:m.important?'High':'Normal', notes:'From '+(m.from||'')+(m.link?' — '+m.link:'')}); }); mk.innerHTML=ic('plus'); mk.title='Make it a task'; ac.appendChild(mk);
  r.appendChild(ac);
  if(m.link){ r.addEventListener('click', ()=>window.open(m.link, '_blank', 'noopener')); r.title='Open in Outlook'; }
  return r; }
function mailPanel(limit){
  const x=X(); const pn=h('section','nx-panel'); const gh=h('div','nx-gh'); gh.appendChild(h('b',null,'Email to Look At'));
  const items=x && x.MAIL.state==='ok' ? x.MAIL.items.filter(m=>m.flagged || m.important || m.unread) : [];
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
  if(items.length>(limit||6)) pn.appendChild(btn('nx-morel', 'See all '+items.length+' on My Board', ()=>{ try{ const k='tools:team-hq:mismo.teamhq.hub'; const u=JSON.parse(localStorage.getItem(k)||'{}'); u.tab='mail'; localStorage.setItem(k, JSON.stringify(u)); }catch(e){} openClassic('mine'); }));
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
function drawTabbar(){ if(!tabbar) return; tabbar.textContent='';
  [['day','Dashboard','home'],['week','My Week','week'],['mine','My Tasks','mine'],['inbox','Inbox','inbox']].forEach(([k,l,i])=>{ const b=btn('nx-tb'+(ui.view===k?' on':''), null, ()=>open(k)); b.dataset.k=k; b.innerHTML=ic(i)+'<span>'+l+'</span>'; if(k==='inbox'){ const n=myAsks().length+myNudges().length; if(n) b.insertAdjacentHTML('beforeend','<b class="nx-badge hot">'+n+'</b>'); } tabbar.appendChild(b); });
  const m=btn('nx-tb', null, openMenuSheet); m.innerHTML=ic('menu')+'<span>Everything</span>'; tabbar.appendChild(m);
}
function openMenuSheet(){
  closeMenus(); menuEl=h('div','nx-menu sheet tall');
  const grp=(t)=>menuEl.appendChild(h('div','nx-ml',t));
  const item=(label, fn, iconHtml)=>{ const b=btn('nx-mi', null, ()=>{ closeMenus(); fn(); }); b.innerHTML=(iconHtml||'')+'<span>'+label+'</span>'; menuEl.appendChild(b); };
  grp('You'); Object.keys(VIEWS).forEach(k=>item(VIEWS[k].t, ()=>open(k), ic(VIEWS[k].i)));
  grp('Team Pages'); [...document.querySelectorAll('.hq.rail nav button[data-hq]')].forEach(b=>{ const s=b.querySelector('svg'); item(b.textContent.trim(), ()=>openClassic(b.dataset.hq), s?s.outerHTML:''); });
  grp('Switch'); item('Classic Team HQ', ()=>setOn(false));
  document.body.appendChild(menuEl);
  setTimeout(()=>document.addEventListener('click', function off(e){ if(menuEl && !menuEl.contains(e.target)){ closeMenus(); document.removeEventListener('click', off); } }), 0);
}

/* ---------- switch in the masthead ---------- */
let sw=null;
function placeSwitch(){ const r=document.querySelector('.hqtop-r'); if(!r || r.querySelector('.nx-switch')) return;
  sw=btn('nx-switch', null, ()=>setOn(!ui.on)); sw.title='Switch between the new and classic Team HQ'; r.insertBefore(sw, r.firstChild); paintSwitch(); }
function paintSwitch(){ if(!sw) return; sw.innerHTML='<span class="tg'+(ui.on?' on':'')+'"><i></i></span><span class="lb">New Team HQ</span>'; sw.setAttribute('aria-pressed', String(ui.on)); }
function setOn(v){ ui.on=v; save(); paintSwitch();
  if(v){ if(!shell) build(); document.documentElement.classList.add('nx-on'); drawRail(); if(viewKind()==='classic') openClassic(ui.view.slice(2)); else open(ui.view); }
  else { hideApp(); document.documentElement.classList.remove('nx-on'); railNodes.forEach(n=>n.remove()); railNodes=[]; restoreBoardBtn(); window.__show && window.__show(S.tab && S.tab.indexOf('nx')<0 ? S.tab : 'today'); } }

/* ---------- keep it live ---------- */
let lastSig='';
function hsh(str){ let x=0; for(let i=0;i<str.length;i++){ x=((x<<5)-x+str.charCodeAt(i))|0; } return x; }
const sig=()=>[S.tasks.length, hsh(S.tasks.map(t=>[t.id,t.at,t.s,t.due,t.w,t.r,t.o,(t.d||[]).join(','),t.p,t.t,(t.notes||'').length].join('|')).join('~')), (S.asks||[]).length, (S.asks||[]).map(a=>a.state).join(''), (S.nudges||[]).filter(n=>!n.done).length, S.rocks.length, (window.__hqx&&window.__hqx.sig?window.__hqx.sig():''), Object.keys((window.__cal&&window.__cal.CAL&&window.__cal.CAL.by)||{}).length, (window.__cal&&window.__cal.CAL&&window.__cal.CAL.at)||0].join(':');
function busy(){ if(drag || tdrag!=null || menuEl || document.querySelector('.hqx-ov')) return true; const a=document.activeElement; return !!(a && (a.tagName==='INPUT' || a.tagName==='SELECT' || a.tagName==='TEXTAREA') && (shell && shell.contains(a))); }
const live=setInterval(()=>{ if(!ui.on || document.hidden) return; const s=sig(); if(s===lastSig) return; if(busy()) return; lastSig=s; drawRail(); paint(); }, 1200);
const clock=setInterval(()=>{ if(!ui.on || document.hidden || busy()) return; drawRail(); if(shell && !shell.hidden && (viewKind()==='day' || viewKind()==='person')) paint(); }, 60e3);
/* if the classic page redraws its rail, put our items back */
const railMo=new MutationObserver(()=>{ if(!ui.on) return; const nav=navEl(); if(nav && railNodes.length && !nav.contains(railNodes[0])) drawRail(); });
const railEl=document.querySelector('.hq.rail'); if(railEl) railMo.observe(railEl, {childList:true, subtree:true});
document.addEventListener('click', onRailClick, true);
/* keys: C new task, / filter, J/K move, Enter open, X done, 1-5 views */
const onKey=e=>{ if(!ui.on || !shell || shell.hidden) return; const a=document.activeElement; if(a && (a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT'||a.isContentEditable)) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return; if(document.querySelector('dialog[open], .modal.open, .ed-ov:not([hidden])')) return;
  const k=e.key.toLowerCase();
  const m={'1':'day','2':'week','3':'inbox','4':'mine','5':'cal','6':'all','7':'people'}[k]; if(m){ open(m); e.preventDefault(); return; }
  if(k==='c'){ const i=head.querySelector('.nx-qa input'); if(i){ e.preventDefault(); i.focus(); } return; }
  if(k==='/'){ const i=head.querySelector('.nx-find') || head.querySelector('.nx-qa input'); if(i){ e.preventDefault(); i.focus(); } return; }
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

/* ---------- styles ---------- */
const css=h('style'); css.id='nx-css'; css.textContent=`
html.nx-show body{overflow:hidden}
html.nx-show main{visibility:hidden}
html.nx-on .mob-bar{display:none!important}
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
.nx-swd{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font:inherit;text-align:left;color:var(--ink);cursor:pointer;transition:transform .15s,box-shadow .15s}
.nx-swd:hover{transform:translateY(-2px);box-shadow:0 10px 20px -12px rgba(6,32,47,.35)}
.nx-swd span{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--ink-3)}
.nx-swd b{font-size:20px;line-height:1.1;color:var(--ink)}
.nx-swd small{max-width:100%;font-size:11px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nx-swd.now{background:var(--navy);border-color:var(--navy)}.nx-swd.now span{color:var(--sky)}.nx-swd.now b{color:#fff}.nx-swd.now small{color:rgba(255,255,255,.75)}
.nx-swd.wkd:not(.now){background:var(--surface-2)}
.nx-pills{display:flex;gap:3px;align-items:center;min-height:8px;margin:2px 0}
.nx-pills i{width:16px;height:5px;border-radius:3px;background:var(--k)}
.nx-dvb{display:flex;align-items:center;gap:14px;margin-bottom:12px;flex-wrap:wrap}
.nx-dvb h2{margin:0;font-size:17px;font-weight:700;color:var(--ink)}
.nx-dvr{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap}
.nx-dtip{margin:-4px 0 12px;font-size:12.5px;color:var(--ink-2)}
.nx-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(150px,auto);gap:14px}
.st-tile{--st-line:rgba(116,191,235,.18);position:relative;display:flex;flex-direction:column;gap:10px;min-width:0;padding:16px 18px;border:1px solid rgba(116,191,235,.18);border-radius:12px;color:#fff;cursor:pointer;text-align:left;background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--k,#74bfeb) 26%,transparent),transparent 60%),linear-gradient(160deg,#10324a,#0b2436);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 10px 24px -14px rgba(6,32,47,.6);transition:transform .18s,box-shadow .18s;overflow:hidden}
.st-tile:hover{transform:translateY(-3px);box-shadow:0 0 0 1px color-mix(in srgb,var(--k,#74bfeb) 55%,transparent),0 18px 34px -16px rgba(6,32,47,.75)}
.st-tile:focus-visible{outline:2px solid var(--sky);outline-offset:2px}
.st-tile.w2{grid-column:span 2}
.st-top{display:flex;align-items:center;gap:8px;min-width:0}
.st-lab{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:color-mix(in srgb,var(--k,#74bfeb) 70%,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-pill{margin-left:auto;flex:0 0 auto;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,.12);color:#fff;white-space:nowrap;max-width:60%;overflow:hidden;text-overflow:ellipsis}
.st-pill.hot{background:#c94a3b}
.st-big{font-size:40px;font-weight:700;line-height:1;letter-spacing:-.02em;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.st-big small{font-size:13px;font-weight:600;color:var(--sky);letter-spacing:0}
.st-sub{font-size:12.5px;line-height:1.45;color:rgba(255,255,255,.78)}
.st-next{margin-top:auto;font-size:12.5px;color:rgba(255,255,255,.7);padding-top:10px;border-top:1px solid var(--st-line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-next b{color:#fff}.st-next .opn{float:right;color:var(--k)}
.st-meter{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;flex:0 0 auto}
.st-meter i{display:block;height:100%;background:var(--k);border-radius:3px}
.st-act{align-self:flex-start;height:30px;padding:0 12px;border:1px solid rgba(116,191,235,.45);border-radius:6px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.st-tile .mic-row{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap}
.st-tile .mic-ep{flex:1 1 180px;min-width:0;display:flex;flex-direction:column;gap:2px}.st-tile .mic-ep b{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.st-tile .mic-ep small{font-size:12.5px;color:rgba(255,255,255,.7)}
.st-tile .mic-cd{display:flex;gap:6px}
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
.nx-bars{display:flex;gap:10px;align-items:flex-end;height:96px}
.nx-bars .bc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;height:100%}
.nx-bars .bc i{display:block;width:100%;max-width:34px;border-radius:4px 4px 2px 2px;background:linear-gradient(180deg,var(--k),color-mix(in srgb,var(--k) 45%,transparent))}
.nx-bars .bc b{font-size:11px;color:rgba(255,255,255,.8)}.nx-bars .bc span{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.55)}
.nx-bars .bc.on span{color:var(--sky)}
.nx-wn{display:flex;gap:8px;align-items:center;font-size:12.5px;min-width:0}.nx-wn span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-wn .av{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:700;font-size:9px}
.nx-bgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.nx-bgrid span{padding:7px 9px;border-radius:6px;background:rgba(255,255,255,.07);border:1px solid var(--st-line);font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-sysb{display:flex;gap:16px;align-items:center;min-width:0}
.nx-sym{flex:0 0 auto;width:64px;height:64px;padding:10px;border-radius:14px;background:color-mix(in srgb,var(--k) 16%,transparent);border:1px solid color-mix(in srgb,var(--k) 40%,transparent);color:var(--k);transition:transform .25s}
.st-tile:hover .nx-sym{transform:scale(1.06) rotate(-3deg)}
.nx-sysv{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.nx-tiles.editing .st-tile{cursor:grab;animation:nxWig .9s ease-in-out infinite alternate}
.nx-tiles.editing .st-tile:nth-child(2n){animation-delay:.3s}
@keyframes nxWig{from{transform:rotate(-.4deg)}to{transform:rotate(.4deg)}}
.st-tile.dragging{opacity:.4}.st-tile.tover{box-shadow:0 0 0 3px var(--sky)}
.nx-tctl{position:absolute;top:8px;right:8px;z-index:3;display:flex;gap:4px}
.nx-tcb{height:26px;padding:0 9px;border:1px solid rgba(255,255,255,.3);border-radius:5px;background:rgba(6,32,47,.85);color:#fff;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.nx-tcb.x{width:26px;padding:0;font-size:16px}.nx-tcb:hover{background:var(--sky);color:#06202f}
.nx-tadd{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:150px;border:2px dashed var(--border-strong);border-radius:12px;background:transparent;font:inherit;color:var(--ink-3);cursor:pointer}
.nx-tadd b{font-size:30px;line-height:1}.nx-tadd:hover{border-color:var(--c1);color:var(--c1)}
.nx-cat{width:min(860px,100%)}
.nx-ctg{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr));gap:8px}
.nx-cti{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.nx-cti:hover{border-color:var(--k)}.nx-cti.on{background:var(--sky-wash)}
.nx-cti .ci{flex:0 0 auto;width:38px;height:38px;padding:7px;border-radius:9px;background:linear-gradient(160deg,#10324a,#0b2436);color:var(--k)}
.nx-cti .ci svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.nx-cti .tx{flex:1;min-width:0;display:flex;flex-direction:column}.nx-cti .tx b{font-size:13px}.nx-cti .tx small{font-size:11.5px;color:var(--ink-3);line-height:1.35}
.nx-cti em{font-style:normal;flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--c1)}.nx-cti.on em{color:var(--good)}
@media(max-width:1250px){.nx-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:900px){.nx-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.nx-hero{grid-template-columns:minmax(0,1fr)}}
@media(max-width:640px){.nx-dash{padding:12px 12px 30px}.nx-hhi h1{font-size:24px}.nx-hhi p{font-size:14px}.nx-sw{display:flex;overflow-x:auto}.nx-swd{flex:0 0 96px}.nx-tiles{grid-template-columns:minmax(0,1fr)}.st-tile.w2{grid-column:auto}.nx-ag{grid-template-columns:minmax(0,1fr)}.nx-dvr{margin-left:0}}
/* email, people, week */
.nx-mrow{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--rule);background:var(--surface);cursor:pointer}
.nx-mrow:last-child{border-bottom:0}.nx-mrow:hover{background:var(--surface-2)}
.nx-mrow .mi{flex:0 0 auto;width:20px;height:20px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:var(--ink-3);background:var(--surface-3)}
.nx-mrow .mi.flag{color:#fff;background:var(--bad)}.nx-mrow .mi.imp{color:#fff;background:#e8833a}
.nx-mrow .tx{flex:1;min-width:0}.nx-mrow .tp{display:flex;gap:8px;align-items:baseline}.nx-mrow .tp b{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-mrow.unread .tp b,.nx-mrow.unread .sj{font-weight:800}
.nx-mrow .ag{margin-left:auto;flex:0 0 auto;font-size:11px;color:var(--ink-3)}
.nx-mrow .sj{font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-mrow .ac{flex:0 0 auto}.nx-mrow .nx-ib{width:26px;height:26px}
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
  html.nx-on #newtask{display:none}
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
placeSwitch();
const mo=new MutationObserver(()=>placeSwitch()); const topEl=document.querySelector('.hqtop'); if(topEl) mo.observe(topEl, {childList:true, subtree:true});
if(ui.on){ build(); document.documentElement.classList.add('nx-on'); drawRail(); if(viewKind()==='classic') { markRail(); } else open(ui.view); lastSig=sig(); }
window.__nx={ version:'2.1', paint, open, setOn, parse:parseQuick, ui, pinTile,
  destroy(){ clearInterval(live); clearInterval(clock); mo.disconnect(); railMo.disconnect(); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onRailClick, true); window.removeEventListener('resize', onResize);
    railNodes.forEach(n=>n.remove()); restoreBoardBtn(); if(shell) shell.remove(); if(tabbar) tabbar.remove(); if(sw) sw.remove(); closeMenus(); if(toastEl) toastEl.remove(); css.remove(); document.documentElement.classList.remove('nx-on','nx-show','nx-dragging'); } };
})();

});
function boot(n){
  var S=window.__S;
  /* Team HQ waits for every file before it draws; once the core ones are in (from this
     browser's last copy or the relay), draw now and let the rest fill in as they arrive. */
  if(S && !S.ready && S.tab && window.__show && S.tasks && S.tasks.length && S.people && S.people.length && S.rocks && S.rocks.length){
    S.ready=true; try{ window.__show(S.tab); }catch(e){}
  }
  if(!(S && S.ready && window.__show && document.getElementById('app-mine'))){ if((n||0)<1200) setTimeout(function(){ boot((n||0)+1); }, 100); return; }
  MODS.forEach(function(m){ try{ m(); }catch(e){ try{ console.error('Team HQ upgrade failed to load', e); }catch(x){} } });
}
boot(0);
})();