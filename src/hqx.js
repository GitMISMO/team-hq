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
const MAIL={state:'idle', at:0, data:null, items:[], shared:[]};
const str=v=>v==null?'':String(v);
function norm(m){
  const from=m.from && typeof m.from==='object' ? ((m.from.emailAddress||m.from).name || (m.from.emailAddress||m.from).address) : (m.from||m.f||m.sender||'');
  const fromEmail=m.fromEmail || (m.from && typeof m.from==='object' ? (m.from.emailAddress||m.from).address : '') || '';
  const flag=m.flagged!=null ? !!m.flagged : m.flag && typeof m.flag==='object' ? /^flagged$/i.test(m.flag.flagStatus||'') : !!m.flag;
  const imp=m.important!=null ? !!m.important : /high/i.test(str(m.importance||m.imp));
  const unread=m.unread!=null ? !!m.unread : m.isRead!=null ? !m.isRead : false;
  const at=Date.parse(m.received||m.receivedDateTime||m.at||m.date||'') || 0;
  const rc=[].concat(m.toRecipients||[], m.ccRecipients||[]).map(z=>str(((z&&z.emailAddress)||z||{}).address).toLowerCase().trim()).filter(Boolean);
  return { id:str(m.id||m.link||m.webLink||m.subject+at), subject:str(m.subject||m.s||'(no subject)'), from:str(from), fromEmail:str(fromEmail), at, link:str(m.link||m.webLink||m.u||''), flagged:flag, important:imp, unread, preview:str(m.preview||m.bodyPreview||m.pv||'').slice(0,180), rc, box:'' };
}
/* leave out automatic replies, out-of-office notes, bounce-backs and meeting responses — not email anyone needs to look at */
const NOISE=/^\s*(automatic reply|auto[- ]?reply|autoreply|out of (the )?office|ooo\b|undeliverable|delivery (status notification|has failed)|mail delivery failed|accepted:|declined:|tentative:|tentatively accepted:|canceled:|cancelled:|read:|not read:|recall:)/i;

/* ---------- mailboxes ----------
   Mail is sorted into the mailbox it was sent to. "My Inbox" is mail sent to you. Shared mailboxes you can
   read (info@, membership@ …) come through as their own lists, and a copy that reached your own inbox only
   because it was sent to one of them goes with that mailbox, not yours. Each person orders and folds their
   mailboxes (bset.hqInbox); info@ and membership@ start folded at the bottom. A folded mailbox doesn't count
   on the dashboard — it's the "not right now" pile. */
const IBLOW=/^(info|membership)@/i;
function ibCfg(){ const c=S.bset && S.bset.hqInbox; return c && typeof c==='object' ? c : {}; }
function boxShut(k){ k=k||''; const s=ibCfg().shut||{}; if(!k) return !!s[''];  return Object.prototype.hasOwnProperty.call(s,k) ? !!s[k] : IBLOW.test(k); }
function setInbox(patch){ if(!S.bset) S.bset={}; S.bset.hqInbox=Object.assign({}, ibCfg(), patch); try{ window.__saveMine && window.__saveMine(); }catch(e){} try{ window.dispatchEvent(new Event('hq:inbox')); }catch(e){} }
function myAddrs(){ const set={}; const add=a=>{ a=str(a).toLowerCase().trim(); if(/@/.test(a)) set[a]=1; };
  const p=(S.people||[]).find(z=>z.id===S.me)||{}; add(p.email); (Array.isArray(p.emails)?p.emails:[]).forEach(add);
  const pe=personEmail(S.me); add(pe); const loc=pe.split('@')[0]; if(loc){ add(loc+'@mismo.org'); add(loc+'@mba.org'); }
  return set; }
/* MISMO's shared mailboxes live at mba.org with mismo.org aliases (info@, mismosummit@ …): either spelling is the same mailbox */
const ORGD=/@(mba|mismo)\.org$/i;
const canon=a=>{ a=str(a).toLowerCase().trim(); return ORGD.test(a) ? a.replace(ORGD,'@mismo.org') : a; };
function boxName(k){ return k ? k : 'My Inbox'; }
function mailBoxes(){
  const mine=myAddrs(); const shared=(MAIL.shared||[]);
  const known={}; shared.forEach(b=>{ known[b.a]=b; });
  const own=[], into={};
  MAIL.items.forEach(m=>{
    let k='';
    if(m.rc.length && !m.rc.some(a=>mine[a]) && !mine[(m.fromEmail||'').toLowerCase()]){ const hit=m.rc.map(canon).find(a=>known[a]); if(hit) k=hit; }
    if(!k){ own.push(m); return; }
    /* the shared mailbox has its own copy: keep that one */
    const dup=known[k].items.some(z=>z.subject===m.subject && Math.abs(z.at-m.at)<3*60e3);
    if(!dup) (into[k]=into[k]||[]).push(Object.assign({}, m, {box:k, viaMe:true})); });
  const L=[{k:'', n:'My Inbox', ok:true, items:mailFx(own)}];
  shared.forEach(b=>L.push({k:b.a, n:b.a, ok:b.ok!==false, items:mailFx(b.items.concat(into[b.a]||[])).sort((x,y)=>y.at-x.at)}));
  const ord=Array.isArray(ibCfg().order) ? ibCfg().order : [];
  const rank=b=>{ const i=ord.indexOf(b.k); if(i>=0) return i; return 1000+(b.k===''?0:IBLOW.test(b.k)?2000:1000)+L.indexOf(b); };
  return L.sort((x,y)=>rank(x)-rank(y)); }
function allMail(){ return mailBoxes().reduce((a,b)=>a.concat(b.items),[]); }
function loadMail(force){
  const R=window.__hqRelay; if(!R || !R.readOther || !S.me) return Promise.resolve(MAIL);
  if(MAIL.state==='loading') return MAIL.p;
  if(!force && MAIL.at && Date.now()-MAIL.at<4*60e3) return Promise.resolve(MAIL);
  MAIL.state='loading';
  MAIL.p=R.readOther('team-hq','mail-'+S.me).then(d=>{
    MAIL.data=d||null; const list=d ? (Array.isArray(d) ? d : (d.msgs||d.mail||d.value||d.items||[])) : [];
    MAIL.items=list.map(norm).filter(m=>!NOISE.test(m.subject)).sort((a,b)=>b.at-a.at);
    /* shared mailboxes the flow reads: [{a:'info@mismo.org', ok:true, msgs:[…]}] */
    MAIL.shared=(d && Array.isArray(d.boxes) ? d.boxes : []).filter(b=>b && b.a).map(b=>{ const a=canon(b.a);
      return {a, ok:b.ok!==false, items:(Array.isArray(b.msgs)?b.msgs:[]).map(norm).filter(m=>!NOISE.test(m.subject)).map(m=>Object.assign(m, {box:a, id:a+'|'+m.id})).sort((x,y)=>y.at-x.at)}; }); MAIL.state=d ? 'ok' : 'none'; MAIL.at=Date.now(); MAIL.sent=d && Date.parse(d.at||'') || 0; try{ if(ACT.on) settle(); }catch(e){} return MAIL;
  }).catch(()=>{ MAIL.state='none'; MAIL.at=Date.now(); return MAIL; });
  return MAIL.p;
}
/* ---------- your settings, kept straight across tabs and devices ----------
   Everything personal (dashboard layout, mailbox order, people, Outlook requests …) is one saved record.
   Every save of it, from anywhere in Team HQ, now goes through here:
   - nothing is saved until this page has read the latest saved copy (so a page that opened while the
     record couldn't be read — and is showing the starter dashboard — can never save that over yours);
   - a save sends only what this page changed, on top of the latest saved copy;
   - each setting carries the time it was last changed, so an older copy (a tab or phone still running an
     earlier version of Team HQ) can't put back something you've since changed — the newer one is restored;
   - an open Team HQ picks up changes made elsewhere every minute and whenever you come back to it. */
(function(){
  if(window.__mineMerge) return;
  const cl=v=>v==null?v:JSON.parse(JSON.stringify(v)); const J=v=>JSON.stringify(v===undefined?null:v);
  const AT='_at';
  let base=null, baseLay, pulled=false, trusted=false, chain=Promise.resolve(), oset=null, path='';
  const isDash=k=>/^hqDash/.test(k);
  /* read straight from the saved file (the page's own copy can be up to a poll behind) */
  async function readRemote(){ try{ const R=window.__hqRelay; if(R && R.readOther){ const f=await R.readOther('team-hq','profiles'); if(f && f.docs) return f.docs[S.uid] || {}; }
      const snap=await S.db.doc(path).get(); return snap.exists ? (snap.data()||{}) : {}; }catch(e){ return null; } }
  const dirtyOf=b=>{ b=b||{}; return [...new Set(Object.keys(b).concat(Object.keys(base||{})))].filter(k=>k!==AT && J(b[k])!==J((base||{})[k])); };
  /* fold a remote copy into this page; returns the keys that changed here */
  function adopt(d, keepDirty){
    const R=cl(d.bset)||{}; const RA=R[AT]||{}; if(!S.bset) S.bset={}; const LA=S.bset[AT]||{};
    const D=keepDirty ? dirtyOf(S.bset) : []; const ch=[], ours=[];
    if(!pulled && !trusted){ Object.keys(S.bset).forEach(k=>delete S.bset[k]); Object.assign(S.bset, R); base=cl(R); return {ch:['*'], ours}; }
    Object.keys(R).forEach(k=>{ if(k===AT) return;
      if(D.indexOf(k)>=0) return;
      if((LA[k]||0)>(RA[k]||0) && J(S.bset[k])!==J(R[k])){ ours.push(k); return; }   /* ours is newer: an older copy was saved over it */
      if(J(S.bset[k])!==J(R[k])){ S.bset[k]=R[k]; ch.push(k); } });
    Object.keys(S.bset).forEach(k=>{ if(k!==AT && !(k in R) && D.indexOf(k)<0 && base && (k in base) && !((LA[k]||0)>(RA[k]||0))){ delete S.bset[k]; ch.push(k); } });
    S.bset[AT]=Object.assign({}, RA, LA);
    const nb=cl(R); D.concat(ours).forEach(k=>{ if(base && k in base) nb[k]=cl(base[k]); else delete nb[k]; }); base=nb;
    if(J(S.layout)===J(baseLay) && d.layout!==undefined && J(d.layout)!==J(S.layout)){ S.layout=cl(d.layout); ch.push('layout'); baseLay=cl(d.layout); }
    return {ch, ours}; }
  const tell=ch=>{ if(ch.length){ try{ window.dispatchEvent(new CustomEvent('hq:bset', {detail:ch})); }catch(e){} } };
  /* every write of the record comes through here */
  function guardedSet(obj){
    chain=chain.then(async ()=>{
      let d=null; for(let i=0; i<6 && !d; i++){ d=await readRemote(); if(!d) await new Promise(r=>setTimeout(r, 2500)); }
      if(!d) return;                                   /* still can't read it: don't save over it blind */
      const firstPull=!pulled; const res=adopt(d, true); pulled=true; tell(res.ch);
      if(firstPull && !trusted) return;                /* this page was showing the starter dashboard: drop its save */
      const now=Date.now(); const D=dirtyOf(S.bset).concat(res.ours); const A=Object.assign({}, S.bset[AT]||{}); D.forEach(k=>{ if(!res.ours.includes(k)) A[k]=now; }); S.bset[AT]=A;
      const out=Object.assign({}, obj, {bset:cl(S.bset), layout:cl(S.layout)});
      /* remember what was actually sent: a click made while this save is on its way stays unsaved (and wins next time) */
      await oset(out); base=cl(out.bset); baseLay=cl(out.layout);
    }).catch(()=>{});
    return chain; }
  async function sync(){ chain=chain.then(async ()=>{ const d=await readRemote(); if(!d) return; const first=!pulled; const res=adopt(d, true); pulled=true; tell(res.ch);
      if(res.ours.length && !first){ const now=Date.now(); const A=Object.assign({}, S.bset[AT]||{}); res.ours.forEach(k=>{ A[k]=A[k]||now; }); dirtyOf(S.bset).forEach(k=>{ A[k]=now; }); S.bset[AT]=A; const o2={layout:cl(S.layout), bset:cl(S.bset), me:S.me||null, view:S.view, nb:S.nb||null}; await oset(o2); base=cl(o2.bset); } }).catch(()=>{}); return chain; }
  function start(){
    if(window.__mineMerge || !S.db || !S.uid || typeof S.db.doc!=='function') return; window.__mineMerge=true;
    path='data/users/'+S.uid+'/profile';
    trusted=!!(S.bset && Array.isArray(S.bset.hqDash) && S.bset.hqDash.length);
    base=cl(S.bset||{}); baseLay=cl(S.layout);
    const odoc=S.db.doc.bind(S.db);
    S.db.doc=function(p){ const r=odoc(p); if(p!==path || !r || typeof r.set!=='function') return r; if(!oset) oset=r.set.bind(r); return Object.assign(Object.create(Object.getPrototypeOf(r)), r, {set:obj=>guardedSet(obj)}); };
    { const r0=odoc(path); oset=r0.set.bind(r0); }
    window.__mineSync=sync;
    sync();
    setInterval(()=>{ if(!document.hidden) sync(); }, 60e3);
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) sync(); });
    window.addEventListener('focus', ()=>sync()); }
  const wait=()=>{ if(S.ready && S.db && S.uid) start(); else setTimeout(wait, 300); }; wait();
})();
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
  ['qr','QR Code Manager','/qr/','#74BFEB','Codes, scan tracking and expiry'],
  ['mms','MISMO Manufacturing System','/mms/','#A78BFA','Work requests, reviews and the facilitator queue']
].map(([k,n,u,c,d])=>({k,n,u,c,d}));
/* New apps show up by themselves: any app you've been given in People & Access that isn't listed above is added
   to Add a Tile (marked New), named and coloured from the app's own page. A dashboard tile is only placed when you add it. */
const DISC='tools:team-hq:mismo.teamhq.sysfound', SYS_SKIP=/^(team-hq.*|so-.+|as-.+|admin|forms?|people|relay|test.*)$|-(files|data|routes|private|public|hours)$/i;
function discover(){ const a=access(); if(!a) return false; let seen={}; try{ seen=JSON.parse(localStorage.getItem(DISC)||'{}')||{}; }catch(e){}
  const save=()=>{ try{ localStorage.setItem(DISC, JSON.stringify(seen)); }catch(e){} }, tell=()=>{ try{ window.dispatchEvent(new Event('hq:sys')); }catch(e){} };
  const paths=new Set(SYS.map(z=>z.u));
  Object.keys(a).forEach(k=>{ if(!a[k] || SYS.some(z=>z.k===k) || SYS_SKIP.test(k)) return; const u='/'+k+'/'; if(paths.has(u)) return;
    const c=seen[k]||{}; if(c.bad && Date.now()-(c.at||0)<864e5) return;
    const nice=k.replace(/[-_]+/g,' ').replace(/\b(hq|mms|cms|iif|qr)\b/gi,m=>m.toUpperCase()).replace(/\b\w/g,m=>m.toUpperCase());
    const ent={k, n:c.n||nice, u, c:c.c||'#74BFEB', d:c.d||'Opens right here in Team HQ', auto:1}; if(!c.bad) SYS.push(ent);
    if(c.n && Date.now()-(c.at||0)<864e5) return;
    fetch(u, {credentials:'same-origin'}).then(r=>r.ok ? r.text() : Promise.reject(r.status)).then(html=>{
      const doc=new DOMParser().parseFromString(html,'text/html');
      const t=((doc.querySelector('title')||{}).textContent||'').split(/\s+[|·–—]\s+/).map(z=>z.trim()).filter(z=>z && !/^MISMO$/i.test(z)).sort((p,q)=>q.length-p.length)[0]||'';   /* "MMS · MISMO Manufacturing System" → the longer, plainer name */
      const d=((doc.querySelector('meta[name="description"]')||{}).content||'').trim();
      const col=((doc.querySelector('meta[name="theme-color"]')||{}).content||'').trim();
      seen[k]={n:t||nice, d:d.length>90 ? d.slice(0,88).replace(/\s+\S*$/,'')+'…' : d, c:/^#[0-9a-f]{6}$/i.test(col) && !/^#0[0-9a-f]314c$/i.test(col) ? col : '', at:Date.now()}; save();
      let e2=SYS.find(z=>z.k===k); if(!e2){ e2=ent; SYS.push(e2); } Object.assign(e2, {n:seen[k].n, d:seen[k].d||e2.d, c:seen[k].c||e2.c}); tell();
    }).catch(()=>{ seen[k]={bad:1, at:Date.now()}; save(); const i=SYS.findIndex(z=>z.k===k && z.auto); if(i>=0){ SYS.splice(i,1); tell(); } }); });
  tell(); return true; }
{ let tries=0; const go=()=>{ if(discover() || ++tries>40) return; setTimeout(go, 1500); }; setTimeout(go, 1500); }
const SHORT={'cms':'CMS','so':'Service Orders','website-migration':'Website Migration','iif-hq':'IIF Planning','hub-requests':'Work Requests','marketing-hq':'MISMO Media','mms':'MMS'};
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
  'mms':'<circle cx="18" cy="20" r="7"/><path d="M18 9v4M18 27v4M7 20h4M25 20h4M10.2 12.2l2.9 2.9M22.9 24.9l2.9 2.9M10.2 27.8l2.9-2.9M22.9 15.1l2.9-2.9"/><path d="M6 40h36M30 40V28l6-4v16M36 24l6-4v20"/>',
  'qr':'<rect x="7" y="7" width="13" height="13" rx="1"/><rect x="28" y="7" width="13" height="13" rx="1"/><rect x="7" y="28" width="13" height="13" rx="1"/><path d="M28 28h5v5h-5zM36 36h5v5h-5zM36 28h5M28 38v3"/>'
};
const symbol=k=>'<svg class="hqx-sym" viewBox="0 0 48 48" aria-hidden="true">'+(SYM[k]||'<rect x="7" y="7" width="14" height="14" rx="3"/><rect x="27" y="7" width="14" height="14" rx="3"/><rect x="7" y="27" width="14" height="14" rx="3"/><circle cx="34" cy="34" r="7"/>')+'</svg>';
/* counts a system shows on its own menu (e.g. "Action Queue 24"), remembered whenever it is opened here */
const CK='tools:team-hq:mismo.teamhq.syscount';
let counts={}; try{ counts=JSON.parse(localStorage.getItem(CK)||'{}')||{}; }catch(e){}
function readNav(doc){ const out={}; try{ doc.querySelectorAll('.hq nav button, nav button').forEach(b=>{ const t=(b.textContent||'').replace(/\s+/g,' ').trim(); const m=/^(.*?)\s*(\d+)$/.exec(t); const label=(m?m[1]:t).trim(); if(label && label.length>1 && !/^(help|dark mode|light mode|theme|sign out|log out|menu|close)$/i.test(label)) out[label]=m?+m[2]:null; /* no number on the menu item means nothing to count, not zero */ }); }catch(e){} return out; }
/* the page that is showing, and the sections on it that say how many items they hold ("Dues Deals to Confirm · 10 items") */
function curNav(doc){ try{ const b=doc.querySelector('nav button[aria-current]:not([aria-current="false"]), nav a[aria-current]:not([aria-current="false"]), nav [role=tab][aria-selected="true"], button.navbtn[aria-selected="true"]') || [...doc.querySelectorAll('nav button, nav a, button.navbtn')].find(z=>/(^|\s)(on|active|is-active|current|sel|selected)(\s|$)/.test(z.className||'')); return b ? (b.textContent||'').replace(/\s+/g,' ').trim().replace(/\s*\d+$/,'') : ''; }catch(e){ return ''; } }
/* only what's actually on screen in the other system: a hidden tab can hold hundreds of thousands of
   elements, and looking through those is what made Team HQ freeze while it read a system */
const SIDE=/(^|\s)(side|sidebar|side-inner|side-foot|rail|hq-rail|masthead|hqtop|topbar|app-header)(\s|$)/;
function visList(doc){ const c=doc.__hqVis, now=performance.now(); if(c && now-c.t<400) return c.l; const l=[]; const b=doc.body; if(!b) return l;
  const vw=doc.defaultView; const w=doc.createTreeWalker(b, 1, {acceptNode(n){ const tg=n.tagName; if(tg==='SCRIPT'||tg==='STYLE'||tg==='NOSCRIPT'||tg==='TEMPLATE'||tg==='IFRAME'||tg==='ASIDE'||tg==='NAV') return 2;
    /* the system's own menu, side panel and top bar aren't part of the page (a sync note in a side panel once showed up as a tile) */
    if((tg==='HEADER' && n.parentElement===b) || SIDE.test(typeof n.className==='string' ? n.className : '')) return 2;
    if(!n.getClientRects().length){ try{ if(vw.getComputedStyle(n).display==='contents') return 1; }catch(e){} return 2; } return 1; }});
  let n; while((n=w.nextNode())) l.push(n); doc.__hqVis={t:performance.now(), l}; return l; }
function pick(doc, sel){ return visList(doc).filter(e=>e.matches(sel)); }
function readSecs(doc){ const out={}; try{ pick(doc,'h2,h3').forEach(hd=>{ if(hd.offsetParent===null) return; const name=(hd.textContent||'').replace(/\s+/g,' ').trim(); const nx=hd.nextElementSibling; if(!name || !nx) return; const m=/^(\d[\d,]*)\s+items?\b\s*(.*)$/i.exec((nx.textContent||'').replace(/\s+/g,' ').trim()); if(!m) return; out[name]={n:+m[1].replace(/,/g,''), x:m[2].replace(/^[·\-–—:\s]+/,'').trim().slice(0,60)}; }); }catch(e){} return out; }
/* scroll a page inside a frame to a section without moving Team HQ itself */
function scrollToSec(doc, sec){ const hd=[...doc.querySelectorAll('h2,h3')].find(z=>(z.textContent||'').replace(/\s+/g,' ').trim()===sec); if(!hd) return false;
  let el=hd.parentElement; const win=doc.defaultView;
  while(el && el!==doc.body && el!==doc.documentElement){ const cs=win.getComputedStyle(el); if(/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight>el.clientHeight+4){ el.scrollTop+=hd.getBoundingClientRect().top-el.getBoundingClientRect().top-8; return true; } el=el.parentElement; }
  const se=doc.scrollingElement||doc.documentElement; se.scrollTop+=hd.getBoundingClientRect().top-8; return true; }
const HIDECSS='.hqtop,body>header.mast,body>header.hqtop,body>.topbar>.masthead,body>.masthead,body>header.masthead{display:none!important}:root{--hq-h:0px!important;--mast-h:0px!important;--masthead-h:0px!important}body{padding-top:0!important}';
/* drive a frame: hide its masthead, open the tab, go to the section, keep its counts fresh */
function driveFrame(fr, k, go, sec, done){
  fr.addEventListener('load', ()=>{ let doc=null; try{ doc=fr.contentDocument; }catch(e){} if(!doc) return;
    try{ const st=doc.createElement('style'); st.textContent=HIDECSS+(fr.classList.contains('nx-minif')?'html,body{scrollbar-width:none}::-webkit-scrollbar{display:none}':''); doc.head.appendChild(st); }catch(e){}
    /* a scroll or click while the system is still loading doesn't count as choosing somewhere else —
       only clicking one of its tabs does, or anything at all once the tile's page is showing */
    let g=go, sc=sec, tries=0, user=false, reached=!go, streak=0; const stop=e=>{ const t=e && e.target; if(reached || (t && t.closest && t.closest('nav,[role=tab],.navbtn'))) user=true; }; fr._stopDrive=()=>{ user=true; }; try{ doc.addEventListener('pointerdown', stop, true); doc.addEventListener('keydown', stop, true); doc.addEventListener('wheel', stop, {capture:true, passive:true}); }catch(e){}
    const step=()=>{ tries++; if(!fr.isConnected && tries>2) return; if(user){ g=null; sc=null; }
      if(g){ const b=[...doc.querySelectorAll('.hq nav button, nav button, nav a, [role=tab]')].find(z=>(z.textContent||'').replace(/\s+/g,' ').trim().replace(/\s*\d+$/,'')===g);
        /* slow apps redraw once their data is in, so keep at it until the tab really is the one showing */
        if(b){ const on=b.getAttribute('aria-selected')==='true' || (b.hasAttribute('aria-current') && b.getAttribute('aria-current')!=='false') || /(^|\s)(on|active|is-active|current|selected)(\s|$)/.test(b.className||'');
          if(on){ reached=true; streak++; if(sc && scrollToSec(doc, sc) && streak>=8) sc=null; if(streak>=8) g=null; } else { streak=0; if(tries%2===1) b.click(); } } }
      else if(sc && tries>1 && scrollToSec(doc, sc) && tries>=30) sc=null;
      snapSys(k, doc);
      if(tries<150 && (g || sc || tries<8)) setTimeout(step, 700); else done && done();
      if(tries===8 && !g && !sc) done && done(); };
    step();
    const iv=setInterval(()=>{ if(!fr.isConnected){ clearInterval(iv); return; } if(!document.hidden){ snapSys(k, doc); if(sec) scrollToSec(doc, sec); } }, 90e3);
  }); }
/* ---------- system snapshots ----------
   The headline numbers, gauges and section counts on a system's tab, read in the background in a hidden
   copy of the page and kept in this browser, so a dashboard tile can show them the Team HQ way. */
const DK='tools:team-hq:mismo.teamhq.sysdata8';
let SD={}; try{ SD=JSON.parse(localStorage.getItem(DK)||'{}')||{}; }catch(e){}
/* carry over what this browser already read before (marked as due for a refresh) so tiles show numbers right away,
   then clear out the old copies */
try{ let added=false; ['sysdata7','sysdata6'].forEach(v=>{ const o=JSON.parse(localStorage.getItem('tools:team-hq:mismo.teamhq.'+v)||'{}')||{};
    Object.keys(o).forEach(k=>{ if(SD[k] || /\|My Approvals$/.test(k) || !o[k] || o[k].empty) return; SD[k]=Object.assign({}, o[k], {at:Date.now()-50*60e3}); added=true; }); });
  if(added) localStorage.setItem(DK, JSON.stringify(SD));
  ['','2','3','4','5','6','7'].forEach(v=>localStorage.removeItem('tools:team-hq:mismo.teamhq.sysdata'+v)); }catch(e){}
/* a page's trouble message, never a tile — and one already saved by an earlier read is cleared out and read again */
const BADT=/couldn.?t (load|reach|connect|open|read|save)|could not (load|reach|connect|open|read)|failed to (load|fetch)|check your connection|network error|save relay|try again|sign in again|session (has )?expired|not signed in|^error\b|something went wrong/i;
try{ let fixed=false; Object.keys(SD).forEach(k=>{ const d=SD[k]; if(!d || !Array.isArray(d.cards)) return; const keep=d.cards.filter(c=>!BADT.test(c.t||'') && !BADT.test(c.text||'') && !BADT.test(c.head||'') && !BADT.test(c.sub||''));
    if(keep.length!==d.cards.length){ d.cards=keep; d.at=Math.min(d.at||0, Date.now()-50*60e3); fixed=true; } });
  if(fixed) localStorage.setItem(DK, JSON.stringify(SD)); }catch(e){}
const sdKey=(k,go)=>k+'|'+(go||'');
const cleanT=x=>String(x||'').replace(/\s+/g,' ').trim();
/* the words in an element as written (not as styled — no ALL CAPS from CSS), with a space between pieces */
const SMALLW=/^(a|an|the|and|but|or|nor|for|so|yet|as|at|by|in|of|on|to|up|via|with|vs)$/;
function tcase(s){ return String(s).toLowerCase().split(' ').map((w,i,a)=>(i>0 && i<a.length-1 && SMALLW.test(w)) ? w : w.replace(/^[a-z]/,c=>c.toUpperCase())).join(' '); }
function words(el){ if(!el) return ''; const out=[]; const w=el.ownerDocument.createTreeWalker(el, 4); let n; while((n=w.nextNode())){ const p=n.parentElement; if(p && /^(SCRIPT|STYLE)$/.test(p.tagName)) continue; out.push(n.nodeValue); } return out.join(' '); }
/* a number as the page means it: counters that animate up carry their final value in data-count */
function numText(e){ const tx=cleanT(e && e.textContent); const dc=e && (e.getAttribute('data-count')||e.getAttribute('data-value')||e.getAttribute('data-target')||e.getAttribute('data-to'));
  if(dc!=null && /^-?[\d.,]+$/.test(dc)){ const n=Number(String(dc).replace(/,/g,'')); if(isFinite(n)){ const pre=(tx.match(/^[−\-+]?\$/)||[''])[0], suf=(tx.match(/\s?[%KMB]$/)||[''])[0]; return pre+(Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US',{maximumFractionDigits:1}))+suf; } }
  return tx; }
const VAL=/^[−\-+]?\(?\$?\s?\d[\d,]*(\.\d+)?\)?\s?[KMB]?%?$/;
/* the page's own little tiles and cards ("Needs You · 10 tasks", "New Members · 4 this month", a "Today" strip):
   each one's label, pill, big number, meter, line underneath and list rows, so Team HQ can draw its own version */
const clsOf=e=>String(e && e.className && e.className.baseVal!=null ? e.className.baseVal : (e && e.className) || '');
const hasTok=(e, re)=>clsOf(e).split(/\s+/).some(c=>re.test(c));
function readCards(doc){
  const win=doc.defaultView, out=[], seen=new Set(), used=[];
  const vis=e=>e && e.offsetParent!==null;
  const LAB=/(^|[-_])(lab|label|kicker|eyebrow|eb|ttl|title|name|hd|heading|cap)$/i;
  const labels=pick(doc,'span,div,b,small,h2,h3,h4,p,strong,em').filter(e=>{ const isLab=hasTok(e, LAB); if(!isLab && e.children.length) return false;
    const raw=e.textContent; if(!raw || raw.length>80 || !vis(e) || e.closest('nav,[role=tab],header.masthead,.masthead,.hqtop,table')) return false;
    const tx=cleanT(isLab ? words(e) : raw); if(tx.length>40 || tx.length<3 || VAL.test(tx)) return false;
    if(isLab) return true; const cs=win.getComputedStyle(e); return cs.textTransform==='uppercase' && parseFloat(cs.letterSpacing)>0.4 && parseFloat(cs.fontSize)<=14; });
  const cands=[];
  labels.forEach(lab=>{
    let card=lab.parentElement; if(card && (hasTok(card, /(^|[-_])(top|head|hd|bar|row|l)$/i) || card.children.length<=2 && cleanT(words(card)).length<60)) card=card.parentElement;
    for(let i=0;i<3 && card && card.parentElement && cleanT(words(card)).length<=cleanT(words(lab)).length+12;i++) card=card.parentElement;
    if(!card || !vis(card) || card===doc.body) return;
    const r=card.getBoundingClientRect(); if(r.width<120 || r.height<50 || r.height>700) return;
    cands.push({lab, card, area:r.width*r.height, y:r.top+(doc.scrollingElement||doc.documentElement).scrollTop, x:r.left}); });
  /* stat tiles built as value + key + small line (class "v" / "k" / "s" and the like) */
  pick(doc,'[class]').forEach(v=>{ if(!hasTok(v, /^(v|val|value|num|n|big|figure|count|stat-v|kpi-v)$/i) || v.children.length>2) return; const tv=numText(v); if(!VAL.test(tv) || !vis(v)) return;
    const card=v.parentElement; if(!card || !vis(card) || card.closest('nav,table')) return; const lab=[...card.children].find(z=>z!==v && hasTok(z, /^(k|key|lab|label|l|name|t|title|cap|lbl)$/i)) || [...card.children].find(z=>z!==v && cleanT(z.textContent) && !VAL.test(cleanT(z.textContent)) && cleanT(z.textContent).length<=40);
    if(!lab) return; const r=card.getBoundingClientRect(); if(r.width<80 || r.height<40 || r.height>500) return;
    if(cands.some(c=>c.card===card)) return; cands.push({lab, card, area:r.width*r.height, y:r.top+(doc.scrollingElement||doc.documentElement).scrollTop, x:r.left}); });
  /* the smallest box around each label wins, so a section heading never swallows the tiles inside it */
  cands.sort((a,b)=>a.area-b.area);
  const picked=[];
  cands.forEach(({lab, card, y, x})=>{ if(picked.length>=14) return;
    if(used.some(u=>u===card || u.contains(card) || card.contains(u))) return;
    const title=cleanT(words(lab)); if(seen.has(title)) return;
    const c={t:/[a-z]/.test(title) ? title : tcase(title), k:cleanT(card.style && card.style.getPropertyValue('--k') || win.getComputedStyle(card).getPropertyValue('--k')) || ''};
    const pillE=[...card.querySelectorAll('*')].find(e=>e!==lab && hasTok(e, /(^|[-_])(pill|badge|chip|tag|flag)s?$/i) && cleanT(e.textContent).length<=26 && vis(e));
    if(pillE){ c.pill=cleanT(words(pillE)); if(/hot|bad|late|warn|over|red/i.test(clsOf(pillE))) c.hot=1; }
    let bigE=[...card.querySelectorAll('*')].find(e=>hasTok(e, /(^|[-_])(big|n|num|count|value|val|figure|fig|stat)$|^v$/i) && /\d/.test(e.textContent) && vis(e));
    if(!bigE) bigE=[...card.querySelectorAll('b,strong,span,div')].find(e=>!e.children.length && VAL.test(cleanT(e.textContent)) && (parseFloat(win.getComputedStyle(e).fontSize)||0)>=24 && vis(e));
    if(bigE){ const num=[...bigE.querySelectorAll('*')].concat([bigE]).find(e=>!e.children.length && VAL.test(cleanT(e.textContent))) || bigE; const v=numText(num);
      if(VAL.test(v)){ c.big=v; const unitE=(num.parentElement||bigE).querySelector('small') || [...(num.parentElement||bigE).children].find(z=>z!==num && cleanT(z.textContent) && !VAL.test(cleanT(z.textContent))); if(unitE && unitE!==num) c.unit=cleanT(words(unitE)).slice(0,30); } }
    const mE=[...card.querySelectorAll('*')].find(e=>hasTok(e, /(^|[-_])(meter|bar|progress|track)$/i) || e.getAttribute('role')==='progressbar');
    if(mE){ const fill=mE.querySelector('[style*="width"]') || mE.firstElementChild; const pw=mE.getBoundingClientRect().width, fw=fill ? fill.getBoundingClientRect().width : 0; const av=+mE.getAttribute('aria-valuenow'); c.meter=isFinite(av) && mE.getAttribute('aria-valuenow')!=null ? av : (pw ? Math.round(fw/pw*100) : null); }
    const subE=[...card.querySelectorAll('*')].find(e=>hasTok(e, /(^|[-_])(sub|note|meta|caption|desc|foot)$|^s$/i) && vis(e) && cleanT(e.textContent).length<=120);
    if(subE) c.sub=cleanT(words(subE));
    const listE=[...card.querySelectorAll('*')].find(e=>hasTok(e, /(^|[-_])(list|names|rows|items|ul|lines)$/i) && e.children.length>=1) || card.querySelector('ul,ol');
    if(listE){ c.rows=[...listE.children].filter(vis).slice(0,6).map(row=>{ const parts=[...row.children].length ? [...row.children].map(z=>cleanT(words(z))).filter(Boolean) : [cleanT(words(row))]; return parts.slice(0,3); }).filter(z=>z.length && z[0]); if(!c.rows.length) delete c.rows; }
    if(!c.big && !c.rows){ /* a strip or a note: the date or headline next to the label, and the sentence beside it */
      const nxt=lab.nextElementSibling; if(nxt && cleanT(nxt.textContent).length<=40) c.head=cleanT(words(nxt));
      const body=[...card.querySelectorAll('div,p,span')].filter(e=>vis(e) && !e.contains(lab) && e!==nxt && !(nxt && nxt.contains(e))).map(e=>cleanT(words(e))).filter(x=>x.length>20 && x.length<=260).sort((a,b)=>b.length-a.length)[0];
      if(body) c.text=body; }
    if(!c.big && !c.rows && !c.text && !c.head) return;
    if(/^(opening|loading|reading|checking|fetching|getting)\b/i.test(c.t) || /^(opening|loading|reading|checking|fetching)\b/i.test(c.text||'') || /…$/.test(c.t)) return;
    /* a dated greeting or "Today · <date>" band: its number belongs to the line beside it, so it reads as Today */
    if(/welcome|good (morning|afternoon|evening)/i.test(c.t) || /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2}/i.test(c.t) || /^today\s*·/i.test(c.t)){ c.t='Today'; if(c.text && !c.rows){ delete c.big; delete c.unit; } }
    /* calendar day headings (Mon, Wed …) are not tiles; a dated greeting card becomes "At a Glance" */
    if(/^(sun|mon|tue|wed|thu|fri|sat)(day|sday|nesday|rsday|urday)?\b/i.test(c.t) || /^(today|tomorrow)$/i.test(c.t) && !c.text && !c.head){ if(c.text && c.text.length>40 && /^(sun|mon|tue|wed|thu|fri|sat)\w*,/i.test(c.t)) c.t='At a Glance'; else if(!/^(today)$/i.test(c.t)) return; }
    seen.add(title); used.push(card); c.y=y; c.x=x; picked.push(c); });
  picked.sort((a,b)=>(Math.round(a.y/30)-Math.round(b.y/30)) || (a.x-b.x)); picked.forEach(c=>{ delete c.y; delete c.x; out.push(c); });
  return out; }
/* Meeting Trackers' Today strip, read as what it is: the day, each meeting with its time, and
   when nothing is on, the next day that has something and which groups meet then */
function readMtToday(doc){
  const box=doc.querySelector('.today:not([hidden])'); if(!box) return null;
  const inr=box.querySelector('.td-in'); if(!inr) return null;
  const tx=e=>e ? cleanT(e.textContent||'') : '';
  const head=tx(inr.querySelector('.td-l b'));
  const mtg=[...box.querySelectorAll('.td-m .td-i')].slice(0,12).map(w=>({tm:tx(w.querySelector('.td-t')), n:tx(w.querySelector('.td-n')), x:/cancel/i.test(tx(w.querySelector('.td-st')))?1:0})).filter(m=>m.n);
  const none=box.querySelector('.td-m .td-none'); let nxt=null;
  if(none){ const all=tx(none), b=none.querySelector('b'), m=/\u2014\s*(\d+)\s+meetings?:\s*(.+)$/.exec(all);
    if(b) nxt={day:tx(b), n:m?+m[1]:0, names:m?m[2].replace(/\s+and\s+\d+\s+more\s*$/,'').split(/,\s*/).filter(Boolean):[]}; }
  if(!head && !mtg.length && !none) return null;
  const text=none ? tx(none) : mtg.map(m=>(m.tm?m.tm+' ':'')+m.n).join(' \u00b7 ');
  return {t:'Today', k:'', head, text, mtg, nxt, mt:1};
}
/* a page built around a list (Square Payments, invoices, requests …): what it is, how many, the money in it,
   where things stand, and the latest few rows */
function readTables(doc){ const out=[]; const vis=e=>e && e.offsetParent!==null;
  const money=s=>{ const m=/[−\-]?\$\s?[\d,]+(\.\d+)?/.exec(s||''); return m ? parseFloat(m[0].replace(/[^\d.\-−]/g,'').replace('−','-')) : null; };
  pick(doc,'table').filter(vis).slice(0,3).forEach(tb=>{
    const body=[...tb.querySelectorAll('tbody tr')].filter(r=>vis(r) && r.children.length>=2); if(body.length<2) return;
    const hr=[...tb.querySelectorAll('thead tr')].pop(); const hds=hr ? [...hr.children].map(c=>cleanT(words(c))) : [];
    /* what the list is called: the nearest heading above it */
    let title='', box=tb, sumLine='', countE=null;
    for(let i=0;i<6 && box && !title;i++){ let s=box.previousElementSibling; while(s && !title){ const hd=s.matches('h1,h2,h3,h4') ? s : s.querySelector('h1,h2,h3,h4'); if(hd && vis(hd)){ title=cleanT(words(hd)); countE=s; } s=s.previousElementSibling; } box=box.parentElement; }
    if(!title || title.length>50 || /^total|^net/i.test(title)) return;
    /* a count beside the heading ("3 open of 11") and a summary line under it */
    let big='', unit='';
    const near=countE ? [...(countE.parentElement||countE).querySelectorAll('span,small,div,p,b,em')].filter(e=>vis(e) && !e.closest('table,button,[role=button]') && e.children.length<=2).map(e=>{ const k=e.cloneNode(true); k.querySelectorAll('button,[role=button],input,select').forEach(z=>z.remove()); return cleanT(words(k)); }).filter(x=>x && x.length<=140) : [];
    const cm=near.map(x=>/^(\d[\d,]*)\s+([a-z].{0,28})$/i.exec(x)).find(Boolean); if(cm){ big=cm[1]; unit=cm[2]; }
    sumLine=near.find(x=>x!==title && x.indexOf(title)<0 && /\d/.test(x) && x.length>14 && x.length<=120 && !(cm && x===cm[0]) && !/^\d[\d,]*\s+[a-z]+(\s+of\s+\d[\d,]*)?$/i.test(x)) || '';
    if(!big){ big=String(body.length); unit=body.length===1?'row':'rows'; }
    /* which column is money, which says where each one stands */
    const cols=body[0].children.length; const cellT=(r,i)=>cleanT(words(r.children[i]||null));
    let mcol=-1; for(let i=1;i<cols;i++){ const n=body.filter(r=>money(cellT(r,i))!=null).length; if(n>=body.length*0.6){ mcol=i; break; } }
    let scol=-1; for(let i=cols-1;i>0;i--){ if(i===mcol) continue; const vals=body.map(r=>cellT(r,i)).filter(Boolean); const uniq=new Set(vals); if(vals.length>=body.length*0.6 && uniq.size<=Math.max(2, Math.ceil(body.length/2)) && [...uniq].every(v=>v.length<=40 && !/^\$/.test(v))){ scol=i; break; } }
    const c={t:/[a-z]/.test(title) ? title : tcase(title), big, unit, tbl:1};
    if(sumLine) c.sub=sumLine;
    if(mcol>=0){ const tot=body.reduce((a,r)=>a+(money(cellT(r,mcol))||0),0); c.total='$'+Math.round(tot).toLocaleString('en-US'); }
    if(scol>=0){ const g={}; body.forEach(r=>{ const v=cellT(r,scol); if(v) g[v]=(g[v]||0)+1; }); c.groups=Object.keys(g).map(k=>[k,g[k]]).sort((a,b)=>b[1]-a[1]).slice(0,5); }
    c.rows=body.slice(0,6).map(r=>{ const a=[cellT(r,0)]; if(mcol>=0) a.push(cellT(r,mcol)); if(scol>=0) a.push(cellT(r,scol)); else if(cols>1 && mcol<0) a.push(cellT(r,1)); return a.filter(Boolean).slice(0,3); }).filter(r=>r.length && r[0]);
    out.push(c); });
  return out; }
function extract(doc){
  const win=doc.defaultView; const out={figs:[], gauges:[], cards:[], secs:readSecs(doc), at:Date.now()}; try{ out.cards=readCards(doc); }catch(e){}
  /* a page's own trouble message ("Couldn't load", "couldn't reach the save relay", "Sign in") is never a tile:
     drop it, and if that was all there was, the read counts as failed so the last good numbers stay */
  const BAD=BADT;
  out.cards=out.cards.filter(c=>!BAD.test(c.t||'') && !BAD.test(c.text||'') && !BAD.test(c.head||'') && !BAD.test(c.sub||''));
  if(BAD.test(cleanT(((doc.querySelector('[role=alert],.err,.error,.errbox,.loaderr,.fail')||{}).textContent)||'')) && !out.cards.length) out.failed=1;
  try{ const mt=readMtToday(doc); if(mt){ out.cards=out.cards.filter(c=>c.t!=='Today'); out.cards.unshift(mt); } }catch(e){} try{ readTables(doc).forEach(c=>{ if(!out.cards.some(z=>z.t===c.t)) out.cards.unshift(c); }); }catch(e){}
  const vis=e=>e.offsetParent!==null;
  let GL=pick(doc,'[role=meter],[class*="gauge"]').filter(g=>g.getAttribute('role')==='meter' || String(g.className||'').split(/\s+/).some(c=>/^gauge([-_](card|box|item|tile))?$/.test(c)));
  if(!GL.length) GL=pick(doc,'[class*="gauge"]').filter(g=>!g.querySelector('[class*="gauge"]'));
  GL.forEach(g=>{ if(out.gauges.length>=8 || !vis(g)) return;
    const pick=re=>{ const e=[...g.querySelectorAll('*')].find(z=>re.test(String(z.className&&z.className.baseVal!=null?z.className.baseVal:z.className||''))); return e ? cleanT(e.textContent) : ''; };
    let pct=pick(/(^|\s|-)g?pct(n|-?num)?(\s|$)|percent/); let pm=/(-?\d+(?:\.\d+)?)/.exec(pct);
    if(!pm){ const am=/(-?\d+(?:\.\d+)?)\s*%/.exec(String(g.getAttribute('aria-label')||'')+' '+String(g.getAttribute('aria-valuenow')||'')); pm=am; }
    if(!pm && g.getAttribute('aria-valuenow')) pm=[0, g.getAttribute('aria-valuenow')];
    if(!pm) return;
    const nm=pick(/(^|\s|-)g?(name|title)(\s|$)/) || cleanT(String(g.getAttribute('aria-label')||'').split(',')[0]) || pick(/lab/);
    const v=pick(/(^|\s|-)g?val(ue)?(\s|$)/), b=pick(/(^|\s|-)g?bud(get)?(\s|$)|target|goal/);
    if(nm) out.gauges.push({n:nm.slice(0,40), p:+pm[1], v:VAL.test(v)?v:'', b:VAL.test(b)?b:''}); });
  const seen=new Set();
  const scan=minFs=>pick(doc,'b,strong,span,div,p,h1,h2,h3,h4,dd').forEach(e=>{ if(out.figs.length>=10 || e.children.length) return; const tv=numText(e); if(!tv || tv.length>16 || !VAL.test(tv) || !vis(e)) return;
    if(e.closest('[class*="gauge"],[role=meter],nav,table,button.navbtn,[role=tab],.hqtop,.masthead,time,[class*="cal"],[class*="countdown"],[class*="clock"],[class*="timer"],[class*="week"],[class*="date"]')) return;
    if((parseFloat(win.getComputedStyle(e).fontSize)||0)<minFs) return;
    const box=e.parentElement; if(!box) return; const tx=[...box.children].filter(z=>z!==e).map(z=>cleanT(words(z))).filter(z=>z && z.length<100 && !VAL.test(z));
    let label=tx[0]||''; const sub=tx[1]||''; if(!label){ const pl=box.previousElementSibling; label=pl ? cleanT(words(pl)) : ''; }
    if(!label || label.length>48 || label.length<3 || /^[a-z][a-z\s]{0,3}$/.test(label) || /^(today|tomorrow|yesterday|sun|mon|tue|wed|thu|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday|days?|hrs?|hours?|mins?|minutes?|secs?|seconds?|weeks?|months?)$/i.test(label)) return; const key=label+'|'+tv; if(seen.has(key)) return; seen.add(key);
    if(!/[a-z]/.test(label) || /^[a-z]/.test(label)) label=tcase(label);
    const cl=String(box.className||''); out.figs.push({n:label, v:tv, s:sub.slice(0,90), tone:/(^|\s)(good|ok|up|pos)(\s|$)/.test(cl)?'good':/(^|\s)(bad|warn|late|down|neg|over)(\s|$)/.test(cl)?'bad':''}); });
  scan(19); if(!out.figs.length) scan(15);
  /* pages built around a table: a summary line ("Revenue $3.9M · Expense $4.2M · Net …") and its Total / Net rows */
  const money=v=>{ v=cleanT(v).replace(/^-/,'−'); return /\.\d\d$/.test(v) && /\d{1,3},\d{3}/.test(v) ? v.replace(/\.\d\d$/,'') : v; };
  if(out.figs.length<6){ pick(doc,'table').filter(vis).slice(0,2).forEach(tb=>{
      const hr=[...tb.querySelectorAll('thead tr')].pop(); const hds=hr ? [...hr.children].map(c=>cleanT(c.textContent)) : [];
      const pref=['YTD ACTUAL','YEAR TO DATE','ACTUAL + REMAINING FORECAST','LIVE, FOR THE YEAR','FORECAST FOR THE YEAR','ACTUAL','TOTAL'];
      [...tb.querySelectorAll('tbody tr, tfoot tr')].forEach(tr=>{ if(out.figs.length>=6) return; const cells=[...tr.children]; const lab=cleanT(cells[0] && cells[0].textContent); if(!/^(total|net)\b/i.test(lab) || lab.length>40) return;
        const off=Math.max(0, cells.length-hds.length); let col=-1; for(const pk of pref){ const i=hds.findIndex(x=>x.toUpperCase().indexOf(pk)>=0); if(i>=0 && i+off>0 && cells[i+off] && /\$|\d/.test(cells[i+off].textContent)){ col=i+off; break; } }
        if(col<0) col=cells.findIndex((c,i)=>i>0 && /^[−\-(]?\$?[\d,]+/.test(cleanT(c.textContent)));
        if(col<0) return; const v=cleanT(cells[col].textContent).split(' ')[0]; if(!VAL.test(v.replace(/\.\d+$/,''))) return;
        const vv=money(v); if(!out.figs.some(f=>f.n===lab)) out.figs.push({n:lab.replace(/\b\w/g,c=>c.toUpperCase()).replace(/\B\w+/g,w=>w.toLowerCase()), v:(/\$/.test(vv)||!/\d,\d{3}/.test(vv)) ? vv : vv.replace(/^([−\-(]?)/,'$1$'), s:hds[col-off] ? hds[col-off].toLowerCase().replace(/^./,c=>c.toUpperCase()) : '', tone:/^[−\-(]/.test(v)?'bad':''}); }); }); }
  if(out.figs.length<3){ const RX=/([A-Z][A-Za-z’' ]{2,30}?)\s+([−\-]?\$[\d,]+(?:\.\d+)?)/g;
    pick(doc,'p,div,span,small,li').some(e=>{ if(!vis(e) || e.children.length>3) return false; const tx=String(e.innerText||e.textContent).replace(/[ \t]+/g,' '); if(tx.length>220 || !/[·|]/.test(tx)) return false; const m=[...tx.matchAll(RX)]; if(m.length<2) return false;
      m.slice(0,4).forEach(z=>{ const n=cleanT(String(z[1]).split(/\n/).pop()); if(!out.figs.some(f=>f.n===n)) out.figs.push({n, v:money(z[2]), s:'', tone:''}); }); return true; }); }
  /* every headline number can be its own tile too, when the page's tiles don't already carry it */
  out.figs.forEach(f=>{ if(out.cards.length>=24) return; if(out.cards.some(c=>c.t===f.n || (c.big===f.v && c.t && f.n && (c.t.toLowerCase().indexOf(f.n.toLowerCase())>=0 || f.n.toLowerCase().indexOf(c.t.toLowerCase())>=0)))) return; out.cards.push({t:f.n, big:f.v, sub:f.s||'', fig:1}); });
  return out; }
/* an app still on its own "Opening…" screen isn't ready to read yet */
function stillLoading(doc){ try{
  if(pick(doc,'[class]').some(e=>e.offsetParent!==null && hasTok(e, /(^|[-_])(loading|loader|boot|booting|splash|spinner|opening)$/i))) return true;
  return pick(doc,'div,p,span,h1,h2,h3,b,strong,small').some(e=>!e.children.length && e.offsetParent!==null && (e.textContent||'').length<140 && /^\s*(opening|loading|reading|fetching|getting)\b[^]*?(…|\.\.\.)/i.test(e.textContent||'')); }catch(e){ return false; } }
const hasData=d=>d && (d.figs.length || d.gauges.length || (d.cards||[]).length || Object.keys(d.secs||{}).length);
function keepData(k, go, d){ if(!hasData(d) || d.failed) return; SD[sdKey(k,go)]=d; try{ localStorage.setItem(DK, JSON.stringify(SD)); }catch(e){} try{ window.dispatchEvent(new Event('hq:counts')); }catch(e){} }
function sysData(k, go){ return SD[sdKey(k,go)]||null; }
const SQ=[], INF=new Set(); let sRun=0; const SMAX=2; /* two page reads at a time, so a new tile fills sooner */
function wantData(k, go, maxAge){ const d=SD[sdKey(k,go)]; if(d && Date.now()-d.at<(maxAge||20*60e3)) return; if(INF.has(sdKey(k,go)) || SQ.some(q=>q.k===k && q.go===(go||''))) return; SQ.push({k, go:go||'', miss:!(d && hasData(d))}); setTimeout(pump, 300); }
/* other systems are read in the background only once Team HQ has opened and settled, one at a time,
   and only when the browser has a free moment, so opening Team HQ never feels slow */
let pumpWait=null, lastAct=0, actWait=null;
['pointermove','pointerdown','wheel','keydown','touchstart','scroll'].forEach(ev=>window.addEventListener(ev, ()=>{ lastAct=Date.now(); }, {passive:true, capture:true}));
function pump(){
  /* while the opening screen is up nobody is clicking, so read the systems your tiles have no numbers for yet */
  /* a tile with no numbers at all (one you just added) is read as soon as you pause; refreshes wait for a longer quiet moment */
  const miss=SQ.some(q=>q.miss), quiet=miss ? 1200 : 4000;
  if(!document.hidden && Date.now()-lastAct<quiet){ clearTimeout(actWait); actWait=setTimeout(pump, miss ? 600 : 1500); return; }
  if(window.__hqBooted===false && !(miss && !document.getElementById('hqo'))){ if(!pumpWait){ pumpWait=()=>{ window.removeEventListener('hq:booted', pumpWait); pumpWait=null; pump(); }; window.addEventListener('hq:booted', pumpWait); } return; }
  const go=()=>{ SQ.sort((a,b)=>(b.miss?1:0)-(a.miss?1:0)); while(sRun<SMAX && SQ.length) pumpOne(); };
  if(window.requestIdleCallback) requestIdleCallback(go, {timeout:2500}); else setTimeout(go, 200); }
function pumpOne(){ const q0=SQ.shift(); const s=SYS.find(z=>z.k===q0.k); if(!s || !canOpen(s.k)) return; sRun++;
  /* every page wanted from this system, read in one visit: its home page first, then each tab */
  const list=[q0.go]; for(let i=SQ.length-1;i>=0;i--) if(SQ[i].k===q0.k){ if(list.indexOf(SQ[i].go)<0) list.push(SQ[i].go); SQ.splice(i,1); }
  list.sort((a,b)=>(a?1:0)-(b?1:0)); list.forEach(g=>INF.add(sdKey(q0.k,g)));
  const fr=h('iframe','hqx-bg'); fr.src=s.u; fr.setAttribute('aria-hidden','true'); fr.tabIndex=-1; fr.title=''; document.body.appendChild(fr);
  let idx=0, last='', stable=0, n=0, clicks=0;
  const store=(go, d)=>{ INF.delete(sdKey(q0.k,go)); if(d && !d.failed && hasData(d)) keepData(q0.k, go, d); else { const old=SD[sdKey(q0.k,go)]; if(old && hasData(old)) old.at=Date.now()-(d && d.failed ? 41 : 15)*60e3; else { SD[sdKey(q0.k,go)]={figs:[], gauges:[], cards:[], secs:{}, at:Date.now(), empty:true}; try{ localStorage.setItem(DK, JSON.stringify(SD)); }catch(e){} try{ window.dispatchEvent(new Event('hq:counts')); }catch(e){} } } };
  const next=()=>{ try{ fr._stopDrive && fr._stopDrive(); }catch(e){} idx++; last=''; stable=0; n=0; clicks=0; if(idx>=list.length){ list.forEach(g=>INF.delete(sdKey(q0.k,g))); fr.remove(); sRun=Math.max(0,sRun-1); setTimeout(pump, 500); return; } setTimeout(tick, 700); };
  driveFrame(fr, q0.k, list[0], '', null);
  const tick=()=>{ n++; const go=list[idx]; let doc=null; try{ doc=fr.contentDocument; }catch(e){}
    if(!doc || doc.readyState!=='complete'){ if(n<50) setTimeout(tick, 1000); else { store(go, null); next(); } return; }
    if(n<40 && stillLoading(doc)){ stable=0; setTimeout(tick, 1000); return; }
    const cur=curNav(doc);
    if(go && cur!==go && clicks<6 && n%2===1 && (idx>0 || n>=3)){ const b=[...doc.querySelectorAll('.hq nav button, nav button, nav a, [role=tab]')].find(z=>(z.textContent||'').replace(/\s+/g,' ').trim().replace(/\s*\d+$/,'')===go); if(b){ b.click(); clicks++; stable=0; } }
    const onTab=!go || cur===go || (n>14 && !cur);
    const quick=(doc.body ? doc.body.textContent.length : 0)+':'+doc.getElementsByTagName('*').length;
    if(quick!==fr._quick && n<40){ fr._quick=quick; stable=0; setTimeout(tick, 1000); return; }
    let d=null; try{ d=extract(doc); }catch(e){}
    /* numbers still at zero across the board usually means the app hasn't filled them in yet */
    const bigs=d ? (d.cards||[]).map(c=>c.big).filter(Boolean).concat(d.figs.map(f=>f.v)) : []; const zeroish=bigs.filter(v=>/^[−\-+]?\$?0(\.0+)?%?$/.test(String(v).trim()));
    if(n<32 && bigs.length>=2 && zeroish.length===bigs.length){ stable=0; setTimeout(tick, 1000); return; }
    if(onTab && hasData(d)){ const sg=JSON.stringify([d.figs, d.gauges, d.cards, d.secs]); if(sg===last) stable++; else { stable=0; last=sg; } if(stable>=2 && n>=6){ store(go, d); snapSys(q0.k, doc); next(); return; } }
    if(n<45 && (n<22 || hasData(d))) setTimeout(tick, 1000); else { store(go, onTab && hasData(d) ? d : null); next(); } };
  setTimeout(tick, 2500); }
document.addEventListener('visibilitychange', ()=>pump());
function snapSys(k, doc){ if(!doc) return; const nav=readNav(doc); const pg=curNav(doc), sc=readSecs(doc); const old=counts[k]||{}; const sec=Object.assign({}, old.sec||{}); if(pg && Object.keys(sc).length) sec[pg]=sc; if(!Object.keys(nav).length && !(pg && Object.keys(sc).length)) return; counts[k]={at:Date.now(), nav:Object.keys(nav).length ? nav : (old.nav||{}), sec}; try{ localStorage.setItem(CK, JSON.stringify(counts)); }catch(e){} try{ window.dispatchEvent(new Event('hq:counts')); }catch(e){} }
function storeCounts(k, nav){ if(!nav || !Object.keys(nav).length) return; counts[k]=Object.assign({}, counts[k]||{}, {at:Date.now(), nav}); try{ localStorage.setItem(CK, JSON.stringify(counts)); }catch(e){} try{ window.dispatchEvent(new Event('hq:counts')); }catch(e){} }
function countFor(k, go, sec){ const c=counts[k]; if(!c || !go) return null; if(sec){ const s=c.sec && c.sec[go] && c.sec[go][sec]; return s ? {n:s.n, x:s.x, at:c.at} : null; } if(!c.nav || !Object.prototype.hasOwnProperty.call(c.nav, go)) return null; return {n:c.nav[go], at:c.at}; }
function secsOf(k, go){ const c=counts[k]; return c && c.sec && c.sec[go] ? Object.keys(c.sec[go]).map(n=>({n, c:c.sec[go][n].n})) : []; }
function navOf(k){ const c=counts[k]; return c ? Object.keys(c.nav) : []; }
let pane=null;
function closeSys(){ if(!pane) return; const p=pane; pane=null; try{ const pd=p.fr.contentDocument; snapSys(p.k, pd); const cur=curNav(pd); const d=extract(pd); if(cur) keepData(p.k, cur, d); else keepData(p.k, p.go, d);
    /* opened at its home page and still on it: that's the tile's page too */
    if(cur && !p.go){ const nv=navOf(p.k); if(!nv.length || nv[0]===cur) keepData(p.k, '', d); } }catch(e){} p.el.classList.add('out'); setTimeout(()=>p.el.remove(), 200); document.removeEventListener('keydown', p.esc); document.documentElement.classList.remove('hqx-sys-on'); }
/* a new tab that lands on one page of a system: the system itself when it's the home page, otherwise
   Team HQ's small launcher (open.html), which opens the system full-size and takes it to that page */
function tabUrl(s, go, sec){ if(!s) return ''; if(!go && !sec) return s.u;
  let p=null; try{ p=new URL(s.u, document.baseURI); }catch(e){ return s.u; }
  let base=''; try{ base=new URL(document.baseURI).origin; }catch(e){}
  if(p.origin!==base) return s.u;
  return '/team-hq/open.html?u='+encodeURIComponent(p.pathname)+(go?'&go='+encodeURIComponent(go):'')+(sec?'&sec='+encodeURIComponent(sec):'')+'&n='+encodeURIComponent(s.n||''); }
function openSys(k, go, opt){
  opt=opt||{}; const s=typeof k==='object' ? k : SYS.find(x=>x.k===k); if(!s) return; let sec=opt.sec||null;
  if(pane) closeSys();
  const el=h('div','hqx-sys'); const scrim=h('div','hqx-scrim'); scrim.addEventListener('click', closeSys); el.appendChild(scrim);
  const box=h('div','hqx-pane'); box.setAttribute('role','dialog'); box.setAttribute('aria-label', s.n); box.style.setProperty('--k', s.c||'#74bfeb');
  const hd=h('div','hqx-ph'); const ic=h('span','ic'); ic.innerHTML=symbol(s.k); hd.appendChild(ic);
  const tt=h('div','tt'); tt.appendChild(h('b',null,s.n)); const sub=h('small',null, go ? go+(sec?' › '+sec:'') : (s.d||'')); tt.appendChild(sub); hd.appendChild(tt);
  if(opt.onPin){ const pin=h('button','hqx-pb','Make This a Dashboard Tile'); pin.type='button'; pin.addEventListener('click', ()=>{ let cur=''; try{ cur=curNav(pane.fr.contentDocument); }catch(e){} opt.onPin(s.k, cur); pin.textContent='On Your Dashboard ✓'; pin.disabled=true; }); hd.appendChild(pin); }
  const nt=h('a','hqx-pb ghost','Open in a New Tab'); nt.href=tabUrl(s, go||'', sec||''); nt.target='_blank'; nt.rel='noopener'; hd.appendChild(nt);
  /* whatever page of the system is showing right now is the one the new tab opens on */
  nt.addEventListener('click', ()=>{ let cur=''; try{ cur=curNav(pane && pane.fr && pane.fr.contentDocument); }catch(e){} nt.href=tabUrl(s, cur||go||'', cur && cur!==go ? '' : (sec||'')); });
  const x=h('button','hqx-px','×'); x.type='button'; x.setAttribute('aria-label','Close and go back to Team HQ'); x.title='Close (Esc)'; x.addEventListener('click', closeSys); hd.appendChild(x);
  box.appendChild(hd);
  const ld=h('div','hqx-load'); ld.appendChild(h('i')); ld.appendChild(h('span',null,'Opening '+s.n+'…')); box.appendChild(ld);
  const fr=h('iframe','hqx-fr'); fr.src=s.u; fr.title=s.n; box.appendChild(fr);
  el.appendChild(box); document.body.appendChild(el); document.documentElement.classList.add('hqx-sys-on');
  const esc=e=>{ if(e.key==='Escape') closeSys(); }; document.addEventListener('keydown', esc);
  pane={el, fr, k:s.k, esc, go:go||''};
  driveFrame(fr, s.k, go, sec, ()=>ld.remove()); setTimeout(()=>ld.classList.add('done'), 2400);
}
const css2=document.createElement('style'); css2.id='hqx-css2'; css2.textContent=`
.hqx-bg{position:fixed;left:-6000px;top:0;width:1366px;height:900px;border:0;pointer-events:none;opacity:0}
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

/* ---------- Do It in Outlook ----------
   Team HQ never touches Outlook itself. Flag, read, file, delete and book requests are saved with the
   person's own signed-in Team HQ settings (bset.hqActs). Their "Team HQ Actions – <name>" flow checks
   every couple of minutes, carries out only these kinds of requests on their own mailbox, and writes
   back "act-done-<id>" with each request's id and result. Delete always means Deleted Items. */
const ACT={on:false, at:0, sent:0, done:{}, busy:false};
const MAXQ=60;
const acts=()=>{ if(!S.bset) S.bset={}; if(!Array.isArray(S.bset.hqActs)) S.bset.hqActs=[]; return S.bset.hqActs; };
const rid=()=>'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fireActs=()=>{ try{ window.dispatchEvent(new Event('hq:acts')); }catch(e){} };
const saveActs=()=>{ try{ window.__saveMine && window.__saveMine(); }catch(e){} fireActs(); };
const okSt=s=>s>=200 && s<300;
const VERB={flag:'Flagging', unflag:'Unflagging', read:'Marking read', unread:'Marking unread', move:'Filing', del:'Deleting', book:'Booking', fold:'Getting folders'};
const DONEV={flag:'Flagged in Outlook', unflag:'Unflagged in Outlook', read:'Marked read in Outlook', unread:'Marked unread in Outlook', move:'Filed in Outlook', del:'Moved to Deleted Items', book:'Booked — invites sent'};
function toast(msg){ const old=document.querySelector('.hqx-toast'); if(old) old.remove(); const t=h('div','hqx-toast', msg); document.body.appendChild(t); setTimeout(()=>t.classList.add('out'), 3800); setTimeout(()=>t.remove(), 4300); }
function personEmail(id){ const p=(S.people||[]).find(x=>x.id===id); if(!p) return ''; if(p.email) return p.email; const n=String(p.name||'').toLowerCase().replace(/[^a-z\s-]/g,'').split(/\s+/).filter(Boolean); return n.length ? n[0][0]+n[n.length-1]+'@mismo.org' : ''; }
function enqueue(q){
  const L=acts(); if(L.filter(z=>!z.fin && !z.err).length>=MAXQ){ toast('Outlook has a lot waiting already — give it a few minutes.'); return null; }
  q.id=rid(); q.at=Date.now();
  /* a newer flag or read change on the same message replaces one that hasn't run yet */
  if(q.mid && (q.k==='flag'||q.k==='unflag'||q.k==='read'||q.k==='unread')){ const grp=(q.k==='flag'||q.k==='unflag')?/^(un)?flag$/:/^(un)?read$/; for(let i=L.length-1;i>=0;i--){ const z=L[i]; if(z.mid===q.mid && grp.test(z.k) && !z.fin && !z.err && !ACT.done[z.id]) L.splice(i,1); } }
  L.push(q); saveActs(); kick(); return q; }
const gid=id=>String(id).replace(/\//g,'%2F'); /* Graph ids are already URL-safe; only a stray slash needs escaping */
const msgUrl=id=>'/me/messages/'+gid(id);
function mailAct(m, k, extra){
  if(!m || !m.id || /^https?:/i.test(m.id)) return null;
  /* shared-mailbox mail is changed in Outlook itself: Do It in Outlook only works on your own mailbox */
  if(m.box) return null;
  const q={k, mid:m.id, subj:String(m.subject||'').slice(0,80)};
  if(k==='flag'||k==='unflag'){ q.method='PATCH'; q.url=msgUrl(m.id); q.body={flag:{flagStatus:k==='flag'?'flagged':'notFlagged'}}; }
  else if(k==='read'||k==='unread'){ q.method='PATCH'; q.url=msgUrl(m.id); q.body={isRead:k==='read'}; }
  else if(k==='del'){ q.method='POST'; q.url=msgUrl(m.id)+'/move'; q.body={destinationId:'deleteditems'}; }
  else if(k==='move'){ if(!extra || !extra.id) return null; q.method='POST'; q.url=msgUrl(m.id)+'/move'; q.body={destinationId:extra.id}; q.fname=extra.n||''; }
  else return null;
  const r=enqueue(q); if(r) toast((k==='del'?'Deleting':k==='move'?'Filing':VERB[k])+' — Outlook catches up in a couple of minutes.'); return r; }
/* what Outlook will look like once the waiting requests run */
function pendFor(mid){ return acts().filter(z=>z.mid===mid && !z.err && !(z.fin && MAIL.sent>z.fin)); }
function mailFx(list){ const out=[]; (list||[]).forEach(m=>{ const P=pendFor(m.id); if(!P.length){ out.push(m); return; } const c=Object.assign({}, m); let gone=false;
    P.forEach(z=>{ if(z.k==='del'||z.k==='move') gone=true; else if(z.k==='flag') c.flagged=true; else if(z.k==='unflag') c.flagged=false; else if(z.k==='read') c.unread=false; else if(z.k==='unread') c.unread=true; });
    const w=P.filter(z=>!z.fin); c.pend=w.length ? VERB[w[w.length-1].k]+'…' : ''; if(!gone) out.push(c); }); return out; }
/* the mail that counts: your own and any mailbox you haven't folded away */
function mailItems(){ return mailBoxes().filter(b=>!b.k || !boxShut(b.k)).reduce((a,b)=>a.concat(b.items),[]).sort((x,y)=>y.at-x.at); }
function lastErr(mid){ const z=acts().filter(q=>q.mid===mid && q.err).pop(); return z ? z : null; }
/* folders, fetched from Outlook through the same queue and kept with the person's settings */
const SKIPF=/^(deleted items|drafts|junk email|outbox|sent items|conversation history|sync issues|rss feeds|rss subscriptions|scheduled|snoozed|social activity notifications|yammer root|externalcontacts|files)$/i;
const folders=()=>{ const f=S.bset && S.bset.hqFolders; return f && Array.isArray(f.list) ? f.list : []; };
function folderPath(f){ const L=folders(); const parts=[f.n]; let p=f.p, guard=0; while(p && guard++<8){ const up=L.find(z=>z.id===p); if(!up) break; parts.unshift(up.n); p=up.p; } return parts.join(' › '); }
function wantFolders(force){
  const pend=acts().some(z=>z.k==='fold' && !z.fin && !z.err); if(pend) return;
  const f=S.bset && S.bset.hqFolders; if(!force && f && f.at && Date.now()-f.at<7*864e5) return;
  enqueue({k:'fold', method:'GET', url:'/me/mailFolders?$select=id,displayName,childFolderCount&$top=200', fp:''}); }
function gotFolders(q, val){
  if(!S.bset.hqFolders || !q.fp) S.bset.hqFolders={at:Date.now(), list:q.fp ? folders() : []};
  const L=S.bset.hqFolders.list; const parent=q.fp||'';
  (Array.isArray(val)?val:[]).forEach(v=>{ if(!v || !v.id) return; const i=L.findIndex(z=>z.id===v.id); const rec={id:v.id, n:String(v.displayName||'Folder'), p:parent, c:+v.childFolderCount||0}; if(i>=0) L[i]=rec; else L.push(rec);
    if(rec.c>0 && !SKIPF.test(rec.n) && L.length<400 && acts().filter(z=>z.k==='fold').length<40) acts().push({id:rid(), at:Date.now(), k:'fold', method:'GET', url:'/me/mailFolders/'+gid(v.id)+'/childFolders?$select=id,displayName,childFolderCount&$top=200', fp:v.id}); });
  S.bset.hqFolders.at=Date.now(); }
/* reconcile the queue with what the flow says it has done */
function settle(){
  const L=acts(); let ch=false; const now=Date.now();
  L.forEach(z=>{ const d=ACT.done[z.id]; if(!d || z.fin || z.err) return; ch=true;
    if(okSt(+d.status)){ z.fin=now; if(z.k==='fold') gotFolders(z, d.value); else if(DONEV[z.k] && now-z.at<20*60e3) toast(DONEV[z.k]+(z.k==='move'&&z.fname?' — '+z.fname:'')+(z.k==='book'&&z.subj?': '+z.subj:'')); }
    else { z.err=+d.status||1; z.fin=now; if(z.k!=='fold') toast('Outlook couldn’t '+({flag:'flag',unflag:'unflag',read:'mark read',unread:'mark unread',move:'file',del:'delete',book:'book'}[z.k]||'do')+' '+(z.subj?'“'+z.subj+'”':'that')+(z.err===404?' — it may already be gone.':'.')); } });
  for(let i=L.length-1;i>=0;i--){ const z=L[i];
    const drop = (z.k==='fold'||z.k==='book') ? !!z.fin
      : z.err ? now-z.fin>15*60e3
      : z.fin ? (MAIL.sent>z.fin || now-z.fin>45*60e3)
      : now-z.at>3*864e5;
    if(drop){ L.splice(i,1); ch=true; } }
  if(ch) saveActs(); }
function loadDone(){ const R=window.__hqRelay; if(!R || !R.readOther || !S.me || ACT.busy) return Promise.resolve(ACT); ACT.busy=true;
  return R.readOther('team-hq','act-done-'+S.me).then(d=>{ ACT.busy=false; ACT.at=Date.now();
    if(d && typeof d==='object'){ const was=ACT.on; ACT.on=true; const m={}; (Array.isArray(d.done)?d.done:[]).forEach(r=>{ if(r && r.id) m[r.id]=r; }); ACT.done=m; ACT.sent=Date.parse(d.at||'')||ACT.sent;
      settle(); if(!was){ wantFolders(false); fireActs(); } }
    return ACT; }).catch(()=>{ ACT.busy=false; ACT.at=Date.now(); return ACT; }); }
let actT=null;
function kick(){ clearTimeout(actT); const waiting=acts().some(z=>!z.fin && !z.err); actT=setTimeout(()=>{ if(!document.hidden) loadDone().then(()=>kick()); else kick(); }, waiting ? 40e3 : 4*60e3); }
const waitingCount=()=>acts().filter(z=>!z.fin && !z.err).length;
/* the File Into… picker */
function pickFolder(m){
  const ov=h('div','hqx-ov'); const box=h('div','hqx-box hqx-fold'); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','File Into a Folder');
  box.appendChild(h('h2',null,'File Into a Folder')); box.appendChild(h('p',null, m.subject||''));
  const q=h('input','hqx-in'); q.placeholder='Search your folders'; q.type='search'; box.appendChild(q);
  const list=h('div','hqx-fl'); box.appendChild(list);
  const close=()=>{ ov.remove(); document.removeEventListener('keydown', esc); window.removeEventListener('hq:acts', paintL); };
  const used=()=>Array.isArray(S.bset.hqFoldUse) ? S.bset.hqFoldUse : [];
  const paintL=()=>{ list.innerHTML=''; const F=folders().filter(f=>!SKIPF.test(f.n));
    if(!F.length){ const n=h('div','hqx-fe'); const fp=acts().some(z=>z.k==='fold' && !z.fin && !z.err); n.appendChild(h('b',null, fp ? 'Getting your folders from Outlook…' : 'No folders yet'));
      n.appendChild(h('span',null, fp ? 'The first time takes a couple of minutes. This list fills in on its own.' : 'Team HQ will ask Outlook for them now.')); list.appendChild(n); if(!fp) wantFolders(true); return; }
    const s=q.value.trim().toLowerCase(); const U=used();
    const rows=F.map(f=>({f, path:folderPath(f)})).filter(r=>!s || r.path.toLowerCase().indexOf(s)>=0).sort((a,b)=>{ const ua=U.indexOf(a.f.id), ub=U.indexOf(b.f.id); if(ua>=0||ub>=0) return (ua<0?99:ua)-(ub<0?99:ub); return a.path.localeCompare(b.path); });
    if(!s && U.length) list.appendChild(h('div','hqx-fh','Recent'));
    rows.slice(0,120).forEach((r,i)=>{ if(!s && U.length && i===rows.filter(x=>U.indexOf(x.f.id)>=0).length) list.appendChild(h('div','hqx-fh','All Folders'));
      const b=h('button','hqx-fb'); b.type='button'; const nm=h('span','n', r.f.n); b.appendChild(nm); if(r.path!==r.f.n) b.appendChild(h('small',null, r.path.slice(0, r.path.length-r.f.n.length-3)));
      b.addEventListener('click', ()=>{ mailAct(m,'move',r.f); S.bset.hqFoldUse=[r.f.id].concat(U.filter(z=>z!==r.f.id)).slice(0,6); saveActs(); close(); }); list.appendChild(b); });
    if(!rows.length) list.appendChild(h('div','hqx-fe', 'No folder matches “'+q.value+'”.'));
    const rf=h('button','hqx-fr2','Refresh the folder list from Outlook'); rf.type='button'; rf.addEventListener('click', ()=>{ wantFolders(true); toast('Asking Outlook for your folders — a couple of minutes.'); }); list.appendChild(rf); };
  q.addEventListener('input', paintL); window.addEventListener('hq:acts', paintL); paintL();
  const ft=h('div','hqx-ft'); const c=h('button','btn ghost','Cancel'); c.type='button'; c.addEventListener('click', close); ft.appendChild(c); box.appendChild(ft);
  ov.appendChild(box); ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
  const esc=e=>{ if(e.key==='Escape') close(); }; document.addEventListener('keydown', esc);
  document.body.appendChild(ov); setTimeout(()=>q.focus(), 30); }
/* Book It in Outlook: a real meeting with everyone invited and a Teams link */
function pad(n){ return String(n).padStart(2,'0'); }
const localDT=t=>{ const d=new Date(t); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes()); };
function bookDialog(o){
  o=o||{}; if(!ACT.on){ toast('Booking from Team HQ isn’t turned on for you yet.'); return; }
  let who=(o.who||[]).filter(id=>id && id!==S.me);
  const ov=h('div','hqx-ov'); const box=h('div','hqx-box hqx-book'); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','Book It in Outlook');
  box.appendChild(h('h2',null,'Book It in Outlook')); box.appendChild(h('p',null,'Puts it on your calendar and sends everyone the invite.'));
  const fld=(lab, el)=>{ const w=h('label','hqx-fld'); w.appendChild(h('span',null,lab)); w.appendChild(el); return w; };
  const ti=h('input','hqx-in'); ti.value=o.subject||'MISMO Meeting'; box.appendChild(fld('Title', ti));
  const row=h('div','hqx-r2'); const wh=h('input','hqx-in'); wh.type='datetime-local'; wh.value=localDT(o.start||Date.now()); row.appendChild(fld('When', wh));
  const du=h('select','hqx-in'); [15,30,45,60,90,120].forEach(n=>{ const op=h('option',null, n<60?n+' minutes':n===60?'1 hour':(n/60)+' hours'); op.value=n; if(n===(o.mins||30)) op.selected=true; du.appendChild(op); }); row.appendChild(fld('How Long', du)); box.appendChild(row);
  const wl=h('div','hqx-who'); const paintW=()=>{ wl.innerHTML=''; who.forEach(id=>{ const p=(S.people||[]).find(x=>x.id===id); const c=h('span','hqx-chip'); c.appendChild(h('span',null, p?p.name:id)); const x=h('button',null,'×'); x.type='button'; x.title='Take off the invite'; x.addEventListener('click', ()=>{ who=who.filter(z=>z!==id); paintW(); }); c.appendChild(x); wl.appendChild(c); });
    const add=h('select','hqx-add'); const o0=h('option',null,'+ Add someone'); o0.value=''; add.appendChild(o0); (S.people||[]).filter(p=>p.id!==S.me && who.indexOf(p.id)<0).forEach(p=>{ const op=h('option',null,p.name); op.value=p.id; add.appendChild(op); }); add.addEventListener('change', ()=>{ if(add.value){ who.push(add.value); paintW(); } }); wl.appendChild(add); };
  paintW(); box.appendChild(fld('Who', wl));
  const tm=h('label','hqx-ck'); const cb=h('input'); cb.type='checkbox'; cb.checked=o.teams!==false; tm.appendChild(cb); tm.appendChild(h('span',null,'Add a Teams meeting link')); box.appendChild(tm);
  const nt=h('textarea','hqx-in'); nt.rows=2; nt.placeholder='Optional note for the invite'; nt.value=o.note||''; box.appendChild(fld('Note', nt));
  const ft=h('div','hqx-ft'); const close=()=>{ ov.remove(); document.removeEventListener('keydown', esc); };
  const c=h('button','btn ghost','Cancel'); c.type='button'; c.addEventListener('click', close);
  const sv=h('button','btn','Book It'); sv.type='button'; sv.addEventListener('click', ()=>{
    const st=new Date(wh.value).getTime(); if(!st){ wh.focus(); return; } const en=st+(+du.value)*60e3; const subj=ti.value.trim()||'MISMO Meeting';
    const att=who.map(id=>{ const p=(S.people||[]).find(x=>x.id===id); const em=personEmail(id); return em ? {emailAddress:{address:em, name:p?p.name:em}, type:'required'} : null; }).filter(Boolean);
    const body={subject:subj, start:{dateTime:new Date(st).toISOString().slice(0,19), timeZone:'UTC'}, end:{dateTime:new Date(en).toISOString().slice(0,19), timeZone:'UTC'}, attendees:att};
    if(cb.checked){ body.isOnlineMeeting=true; body.onlineMeetingProvider='teamsForBusiness'; }
    if(nt.value.trim()) body.body={contentType:'text', content:nt.value.trim()};
    const r=enqueue({k:'book', method:'POST', url:'/me/events', body, subj}); if(r){ toast('Booking “'+subj+'” — on your calendar and in their inboxes in about two minutes.'); close(); } });
  ft.appendChild(c); ft.appendChild(sv); box.appendChild(ft); ov.appendChild(box);
  ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
  const esc=e=>{ if(e.key==='Escape') close(); }; document.addEventListener('keydown', esc);
  document.body.appendChild(ov); setTimeout(()=>ti.focus(), 30); }
const css3=document.createElement('style'); css3.id='hqx-css3'; css3.textContent=`
.hqx-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:450;max-width:min(560px,calc(100vw - 32px));padding:11px 16px;border-radius:8px;background:#0b2436;color:#fff;font-size:13px;font-weight:600;box-shadow:0 12px 30px rgba(6,32,47,.35);border-left:4px solid var(--sky,#74bfeb);animation:hqxFade .2s ease;transition:opacity .4s}
.hqx-toast.out{opacity:0}
.hqx-in{width:100%;box-sizing:border-box;height:36px;padding:0 10px;border:1px solid var(--border-strong);border-radius:6px;background:var(--surface);color:var(--ink);font:inherit;font-size:13.5px}
textarea.hqx-in{height:auto;padding:8px 10px;resize:vertical}
.hqx-in:focus{outline:2px solid var(--c1);outline-offset:-1px}
.hqx-fld{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;min-width:0;flex:1}.hqx-fld>span{font-size:11.5px;font-weight:700;color:var(--ink-2)}
.hqx-r2{display:flex;gap:10px;flex-wrap:wrap}.hqx-r2 .hqx-fld{min-width:180px}
.hqx-who{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.hqx-chip{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 4px 0 10px;border:1px solid var(--border);border-radius:4px;background:var(--surface-2);font-size:12.5px;font-weight:600;color:var(--ink)}
.hqx-chip button{width:22px;height:22px;border:0;background:transparent;color:var(--ink-3);font-size:16px;line-height:1;cursor:pointer;border-radius:3px}.hqx-chip button:hover{background:var(--surface-3);color:var(--bad)}
.hqx-add{height:28px;border:1px dashed var(--border-strong);border-radius:4px;background:var(--surface);color:var(--ink-2);font:inherit;font-size:12.5px;padding:0 6px}
.hqx-ck{display:flex;align-items:center;gap:8px;margin:2px 0 12px;font-size:13px;color:var(--ink)}.hqx-ck input{width:16px;height:16px;accent-color:var(--c1)}
.hqx-fold .hqx-in{margin-bottom:10px}
.hqx-fl{display:flex;flex-direction:column;max-height:min(52vh,420px);overflow:auto;border:1px solid var(--border);border-radius:8px}
.hqx-fh{position:sticky;top:0;padding:6px 12px;background:var(--surface-2);font-size:11px;font-weight:800;color:var(--ink-3);border-bottom:1px solid var(--rule)}
.hqx-fb{display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:9px 12px;border:0;border-bottom:1px solid var(--rule);background:var(--surface);font:inherit;text-align:left;color:var(--ink);cursor:pointer}
.hqx-fb:hover,.hqx-fb:focus-visible{background:var(--sky-wash)}.hqx-fb .n{font-size:13.5px;font-weight:600}.hqx-fb small{font-size:11.5px;color:var(--ink-3)}
.hqx-fe{display:flex;flex-direction:column;gap:4px;padding:22px 16px;font-size:13px;color:var(--ink-2)}.hqx-fe b{color:var(--ink)}
.hqx-fr2{padding:9px 12px;border:0;background:transparent;font:inherit;font-size:12px;font-weight:600;color:var(--c1);text-align:left;cursor:pointer}
`;
document.head.appendChild(css3);
loadDone().then(()=>kick());

loadMail(true);
const timer=setInterval(()=>{ if(!document.hidden) loadMail(true); }, 5*60e3);
window.__hqx={ version:'1.2', tabUrl, MAIL, loadMail, ACT, mailItems, mailBoxes, allMail, boxShut, setInbox, ibCfg, boxName, mailAct, pickFolder, bookDialog, personEmail, lastErr, waitingCount, loadDone, ago, myPeople, setMyPeople, pickPeople, statusOf, dayLoad, nextWorkday, SYS, SHORT, canOpen, figsFor, symbol, openSys, closeSys, countFor, secsOf, navOf, driveFrame, sysData, wantData, extract, sig:()=>MAIL.state+':'+MAIL.at+':'+MAIL.items.length+':'+JSON.stringify(ibCfg().shut||{})+':'+myPeople().join(',')+':'+ACT.on+':'+acts().map(z=>z.id+(z.fin?'f':'')+(z.err?'e':'')).join(','),
  destroy(){ clearInterval(timer); clearTimeout(actT); closeSys(); css.remove(); css2.remove(); css3.remove(); } };
})();
