/* Industry Events (November 22, 2026)
   Amy's idea (Nov 6, 2026): one place for the industry events MISMO goes to — other organizations'
   conferences, trade shows and dinners, not MISMO's own Summits (Summit HQ has those).
   - Each event: where and when, our status and role, who's going and their travel dates, speaking
     opportunities, the promotion steps, the graphics the event gives us, and the people we meet there.
   - Kept in Team HQ's data (collection "events", one record per event). Everyone on the team can add
     and change events. Every editor has an explicit Save; nothing saves while you type.
   - Removing an event sets it aside (it can be brought back); nothing is deleted.
   - Graphics are uploaded right on the event (Team HQ's own file storage) and open in a new tab.
   - Nothing here ever sends an email or posts anything. "Ask MISMO Media" only opens MISMO Media's
     request form in a new tab.
   - An event someone is going to shows up as a trip choice in their Expenses (window.__hqEvents.tripsFor).
   - CN-023 (Nov 24, 2026): a Tasks tab (the event's own built-in dates listed, plus the team's own tasks: what, owner,
     due date, done; open ones show in Coming Up), and a Role on each contact (pick one or type your own).
     CN-024 (Nov 24, 2026): a Panels tab. Each panel (title, date, time, note) lists its people (name, role on the panel,
     title, company, email, member or not); "Find in Member 360" fills them in from Member 360's people list
     (member-360/data/peoplelist), read only with the signed-in person's own sign-in. The record key (k) and Aptify
     Company ID (cid) stay with the panelist so it can be matched again. Never writes to Member 360 or uses its flows
     or keys. With no Member 360 access (401, 403) or no list yet (404), the details are typed in. */
(function(){
'use strict';
if(window.__hqEvents && window.__hqEvents.destroy) window.__hqEvents.destroy();
const S=window.__S; if(!S) return;
const COLL='events';
const REQUEST_FORM='https://resources.mismo.org/forms/request/';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const KINDS=['Conference','Trade Show','Webinar','Meeting or Dinner','Other'];
const STATUS=['Considering','Going','Not Going'];
const ROLES=['Attending','Speaking','Exhibiting','Sponsoring'];
const TALK=['Idea','Submitted','Accepted','Confirmed','Declined','Done'];
const CHAN=['LinkedIn','MISMO Matters','Website','Email','Event App','Other'];
const GUSE=['Logo','Speaker Card','Banner','Social Post','Booth','Other'];
const PROLE=['Panelist','Moderator','Keynote','Speaker','Other'];
const CROLE=['Speaker','Panelist','Moderator','Organizer','Sponsor Contact','Exhibitor','Attendee','Other'];
const PAL=['#2477b8','#2bb673','#9b8cf0','#e8833a','#22b8cf','#e86f5a','#f2b134','#5aa9e6','#1baf7a','#d6336c'];
const M={list:null, sub:false, listeners:[]};
const P={el:null, filter:'up', q:'', who:'', panel:null};

/* ---------- small helpers ---------- */
function h(t,c,x){ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function btn(c,x,f){ const b=h('button',c,x); b.type='button'; if(f) b.addEventListener('click', f); return b; }
const me=()=>S.me||'';
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=p=>(p||'e')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const pd=s=>{ const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||''); return m ? new Date(+m[1], m[2]-1, +m[3]) : null; };
const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const daysTo=s=>{ const d=pd(s); return d ? Math.round((d-today())/864e5) : null; };
const fmt=s=>{ const d=pd(s); return d ? MON[d.getMonth()]+' '+d.getDate() : ''; };
const fmtY=s=>{ const d=pd(s); return d ? MON[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear() : ''; };
function span(a,b){ const A=pd(a), B=pd(b); if(!A) return ''; if(!B || +A===+B) return fmtY(a);
  if(A.getFullYear()!==B.getFullYear()) return fmtY(a)+' – '+fmtY(b);
  if(A.getMonth()===B.getMonth()) return MON[A.getMonth()]+' '+A.getDate()+'–'+B.getDate()+', '+A.getFullYear();
  return fmt(a)+' – '+fmt(b)+', '+A.getFullYear(); }
const when=n=>n==null?'':n<0?(n===-1?'Yesterday':-n+' days ago'):n===0?'Today':n===1?'Tomorrow':'In '+n+' days';
/* typed dates: 9/30/26, 9/30/2026, 2026-09-30, Sep 30 2026, Sep 30 (the next one) */
function parseDate(s){ s=String(s||'').trim(); if(!s) return '';
  let m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s); if(m) return ok(+m[1], +m[2], +m[3]);
  m=/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/.exec(s); if(m){ let y=m[3]?+m[3]:null; if(y!=null && y<100) y+=2000; return ok(y, +m[1], +m[2]); }
  m=/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?(?:\s+(\d{2,4}))?$/.exec(s);
  if(m){ const mo=MON.findIndex(x=>x.toLowerCase()===m[1].slice(0,3).toLowerCase()); if(mo<0) return null; let y=m[3]?+m[3]:null; if(y!=null && y<100) y+=2000; return ok(y, mo+1, +m[2]); }
  return null;
  function ok(y, mo, d){ if(mo<1||mo>12||d<1||d>31) return null; if(y==null){ const t=today(); y=t.getFullYear(); if(new Date(y, mo-1, d)<addD(t,-30)) y++; }
    const x=new Date(y, mo-1, d); return x.getMonth()===mo-1 ? iso(x) : null; } }
function person(id){ return (S.people||[]).find(p=>p.id===id) || null; }
function pname(id){ const p=person(id); return p ? p.name : (id||''); }
function first(id){ return pname(id).split(' ')[0]; }
function initials(id){ const n=pname(id).split(/\s+/).filter(Boolean); return ((n[0]||'?')[0]+((n[1]||'')[0]||'')).toUpperCase(); }
function pcolor(id){ const p=person(id); const i=p && p.color!=null ? +p.color : [...String(id)].reduce((a,c)=>a+c.charCodeAt(0),0); return PAL[i%PAL.length]; }
function avatar(id, sz){ const a=h('span','ev-av', initials(id)); a.style.background=pcolor(id); if(sz){ a.style.width=a.style.height=sz+'px'; a.style.fontSize=Math.round(sz*.4)+'px'; } a.title=pname(id); return a; }
function team(){ return (S.people||[]).slice().sort((a,b)=>(a.ord||0)-(b.ord||0)); }
function toast(msg, undo){ const t=window.__nxToast; if(t) t(msg, undo); }
const safeUrl=u=>{ u=String(u||'').trim(); if(!u) return ''; if(!/^https?:\/\//i.test(u)) u='https://'+u; try{ const x=new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; }catch(e){ return ''; } };

/* ---------- the data: one record per event ---------- */
function start(){ if(M.sub || !S.db || !S.db.collection) return; M.sub=true;
  try{ S.db.collection(COLL).onSnapshot(snap=>{ const L=[]; (snap && snap.docs ? snap.docs : []).forEach(d=>{ let v=null; try{ v=JSON.parse(JSON.stringify(d.data()||{})); }catch(e){} if(v && v.name){ v.id=v.id||d.id; fix(v); L.push(v); } });
      M.list=L; notify(); }, e=>{ console.error('Industry Events', e); if(!M.list){ M.list=[]; notify(); } }); }catch(e){ console.error(e); M.list=M.list||[]; } }
function fix(v){ ['people','talks','promo','graphics','contacts','roles','tasks','panels'].forEach(k=>{ if(!Array.isArray(v[k])) v[k]=[]; }); v.panels.forEach(p=>{ if(!Array.isArray(p.people)) p.people=[]; }); if(STATUS.indexOf(v.status)<0) v.status='Considering'; return v; }
function save(ev, msg, undoTo){ ev=fix(clone(ev)); ev.by=me(); ev.at=Date.now(); if(!ev.created){ ev.created=ev.at; ev.createdBy=me(); }
  const L=(M.list||[]).filter(x=>x.id!==ev.id); L.push(ev); M.list=L; notify();
  return Promise.resolve().then(()=>S.db.collection(COLL).doc(ev.id).set(ev)).then(()=>{ if(msg) toast(msg, undoTo ? ()=>save(undoTo, 'Put back the way it was.') : null); return true; },
    e=>{ console.error(e); toast('That didn’t save. Try again in a moment.'); return false; }); }
let drawWait=null;
function notify(){ M.listeners.forEach(f=>{ try{ f(); }catch(e){ console.error(e); } });
  if(P.el && P.el.isConnected){ clearTimeout(drawWait); drawWait=setTimeout(draw, 30); } }
const live=()=>(M.list||[]).filter(e=>!e.gone);
const endOf=e=>e.end||e.start||'';
const upcoming=e=>{ const n=daysTo(endOf(e)); return n==null || n>=0; };
const byStart=(a,b)=>(a.start||'9999').localeCompare(b.start||'9999') || a.name.localeCompare(b.name);

/* what's due: registration deadlines, speaking proposals, promotion steps, and the events themselves */
function dueItems(L, days){ const out=[]; const add=(d, t, ev, k)=>{ const n=daysTo(d); if(n==null || n<-3 || n>days) return; out.push({d, n, t, ev, k}); };
  L.forEach(ev=>{ if(ev.status==='Not Going') return;
    if(ev.regBy) add(ev.regBy, 'Register for '+ev.name, ev, 'reg');
    ev.talks.forEach(t=>{ if(t.due && (t.status==='Idea' || !t.status)) add(t.due, 'Speaking proposal due: '+(t.title||ev.name), ev, 'talk'); });
    ev.promo.forEach(p=>{ if(p.due && !p.done) add(p.due, (p.t||'Promotion step')+' · '+ev.name, ev, 'promo'); });
    ev.tasks.forEach(t=>{ if(t.due && !t.done) add(t.due, (t.t||'Task')+' · '+ev.name+(t.who?' ('+first(t.who)+')':''), ev, 'task'); });
    if(ev.status==='Going' && ev.start) add(ev.start, ev.name+' starts', ev, 'start'); });
  return out.sort((a,b)=>a.d.localeCompare(b.d)); }

/* ---------- the styles (Team HQ's colors, light and dark; squared corners, no pills) ---------- */
const css=h('style'); css.id='hq-events';
css.textContent=`
.ev{font-size:14.5px;line-height:1.5;color:var(--ink);max-width:1680px;margin:0 auto;padding:16px clamp(16px,2.4vw,32px) 28px;box-sizing:border-box}
.ev h3{margin:0;font-size:15px;letter-spacing:-.01em}
.ev-band{display:grid;grid-template-columns:minmax(220px,1.8fr) repeat(4,minmax(0,1fr));gap:10px;padding:14px;border-radius:14px;color:#fff;background:radial-gradient(120% 140% at 100% 0%,rgba(116,191,235,.24),transparent 55%),linear-gradient(140deg,#06202f,#0d314c 55%,#14486e);box-shadow:0 14px 34px -22px rgba(6,32,47,.8)}
.ev-fig{font:inherit;text-align:left;color:inherit;display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(116,191,235,.22);cursor:pointer;transition:border-color .2s,background .2s}
.ev-fig:hover,.ev-fig.on{border-color:#74bfeb;background:rgba(116,191,235,.16)}
.ev-fig b{font-size:28px;font-weight:700;line-height:1.05;font-variant-numeric:tabular-nums}
.ev-fig span{font-size:12px;font-weight:600;color:rgba(255,255,255,.75);white-space:nowrap}
.ev-fig.next span:not(.k):not(.cd){overflow:hidden;text-overflow:ellipsis}
.ev-fig.next b{font-size:20px;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ev-fig.next .k{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#74bfeb}
.ev-fig.next .cd{display:inline-block;margin-top:4px;font-size:12px;font-weight:700;color:#0d314c;background:#74bfeb;border-radius:4px;padding:2px 8px;align-self:flex-start;border:0;box-shadow:none}.ev-fig.next .cd::before,.ev-fig.next .cd::after{content:none;display:none}
.ev-fig span{border:0;box-shadow:none}
.ev-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0 12px}
.ev-seg{display:inline-flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:var(--surface)}
.ev-seg button{font:inherit;font-size:12.5px;font-weight:700;border:0;border-right:1px solid var(--border);background:transparent;color:var(--ink-2);padding:0 12px;height:32px;cursor:pointer;white-space:nowrap}
.ev-seg button:last-child{border-right:0}.ev-seg button.on{background:var(--navy,#0d314c);color:#fff}
:root[data-theme="dark"] .ev-seg button.on{background:#74bfeb;color:#06202f}
.ev-bar input[type=search],.ev-bar select{font:inherit;font-size:13px;height:32px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);padding:0 10px}
.ev-bar input[type=search]{flex:1 1 200px;min-width:160px}
.ev-btn{display:inline-flex;align-items:center;gap:6px;height:32px;border:1px solid var(--border);background:var(--surface);color:var(--ink);font:inherit;font-size:12.5px;font-weight:700;padding:0 12px;border-radius:6px;cursor:pointer;white-space:nowrap;min-width:max-content;text-decoration:none}
.ev-btn:hover{border-color:var(--border-strong)}
.ev-btn.pri{background:var(--navy,#0d314c);border-color:var(--navy,#0d314c);color:#fff}.ev-btn.pri:hover{background:var(--navy-mid,#14486e)}
:root[data-theme="dark"] .ev-btn.pri{background:#74bfeb;border-color:#74bfeb;color:#06202f}
.ev-btn.warn{color:var(--bad,#b42318)}
.ev-btn:disabled{opacity:.5;cursor:default}
.ev-cols{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
.ev-mon{font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin:14px 0 6px}
.ev-left>.ev-mon:first-child{margin-top:0;line-height:17px}.ev-empty.ev-none{padding:16px 18px;border-radius:8px}.ev-empty.ev-none p{margin:4px 0 0}.ev-cols:has(.ev-left>.ev-mon:first-child)>.ev-right{margin-top:23px}
.ev-mon:first-child{margin-top:0}
.ev-list{display:flex;flex-direction:column;gap:8px}
.ev-card{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 14px;border:1px solid var(--border);border-left:4px solid var(--ea,#74bfeb);border-radius:10px;background:var(--surface);cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%;transition:box-shadow .2s,transform .2s}
.ev-card:hover,.ev-card:focus-visible{box-shadow:0 12px 26px -18px rgba(6,32,47,.55);transform:translateY(-1px);outline:none}
.ev-card.dim{opacity:.6}
.ev-date{display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;background:var(--surface-2);padding:6px 4px;line-height:1.1}
.ev-date small{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ea,#2477b8)}
.ev-date b{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}.ev-date b.rg{font-size:18px}
.ev-date em{font-style:normal;font-size:11px;color:var(--ink-3)}
.ev-main{min-width:0;display:flex;flex-direction:column;gap:4px}
.ev-main .nm{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-main .sub{font-size:13px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-tags{display:flex;gap:6px;flex-wrap:wrap}
.ev-tag{display:inline-flex;align-items:center;font-size:11.5px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--surface-2);color:var(--ink-2);white-space:nowrap}
.ev-tag.going{background:var(--good-soft,#e3f6ec);color:var(--good,#067647)}
.ev-tag.considering{background:var(--warn-soft,#fef0c7);color:var(--warn,#93370d)}
.ev-tag.notgoing{background:var(--surface-3);color:var(--ink-3)}
.ev-tag.ex{background:#efedff;color:#5b3fd1}
:root[data-theme="dark"] .ev-tag.ex{background:rgba(155,140,240,.2);color:#c9bfff}
.ev-tag.role{background:var(--sky-wash,#e8f4fb);color:var(--navy-mid,#14486e)}
:root[data-theme="dark"] .ev-tag.role{color:#a9d8f3}
.ev-side2{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.ev-avs{display:flex}.ev-avs .ev-av{margin-left:-6px;border:2px solid var(--surface)}.ev-avs .ev-av:first-child{margin-left:0}
.ev-av{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;color:#fff;font-size:11px;font-weight:700;flex:none}
.ev-cnt{display:grid;grid-template-columns:repeat(2,max-content);gap:3px 14px;font-size:12px;color:var(--ink-3);white-space:nowrap;justify-content:end}
.ev-gn{font-size:11.5px;font-weight:700;color:var(--ink-2)}
.ev-left{container-type:inline-size}
.ev-card .ev-side2{min-width:170px;padding-left:14px;border-left:1px solid var(--border);align-self:stretch;justify-content:center}
@container (max-width:600px){.ev-card{grid-template-columns:72px minmax(0,1fr)}.ev-card .ev-side2{grid-column:2;min-width:0;padding:8px 0 0;border-left:0;border-top:1px solid var(--border);flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}.ev-cnt{justify-content:start}}.ev-cnt b{color:var(--ink);font-variant-numeric:tabular-nums}
.ev-box{border:1px solid var(--border);border-radius:12px;background:var(--surface);padding:14px;display:flex;flex-direction:column;gap:8px}
.ev-box+.ev-box{margin-top:12px}
.ev-box .hint{font-size:12.5px;color:var(--ink-3);margin:0}
.ev-due{display:grid;grid-template-columns:62px minmax(0,1fr);gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--border);cursor:pointer;font:inherit;text-align:left;background:none;border-left:0;border-right:0;border-bottom:0;color:inherit;width:100%}
.ev-due:first-of-type{border-top:0}
.ev-due .dd{font-size:12px;font-weight:700;color:var(--ink-2);font-variant-numeric:tabular-nums}
.ev-due .dd.late{color:var(--bad,#b42318)}.ev-due .dd.soon{color:var(--warn,#93370d)}
.ev-due .tx{font-size:13px;min-width:0}.ev-due .tx small{display:block;color:var(--ink-3);font-size:11.5px}
.ev-who{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--border)}
.ev-who:first-of-type{border-top:0}.ev-who .tx{font-size:13px;min-width:0}.ev-who .tx b{display:block}.ev-who .tx span{color:var(--ink-3);font-size:12px}
.ev-empty{border:1px dashed var(--border-strong);border-radius:12px;padding:22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;background:var(--surface)}
.ev-empty b{font-size:16px}.ev-empty p{margin:2px 0 0;color:var(--ink-2)}
@media(max-width:1100px){.ev-band{grid-template-columns:repeat(2,minmax(0,1fr))}.ev-fig.next{grid-column:1/-1}.ev-cols{grid-template-columns:minmax(0,1fr)}.ev-cols>.ev-right{margin-top:0!important}}


/* the right-hand panel: three quarters of the screen, full width on a phone */
.ev-scrim{position:fixed;inset:0;background:rgba(6,32,47,.38);z-index:9400;animation:evFade .2s ease}
.ev-pn{position:fixed;top:0;right:0;bottom:0;width:75vw;max-width:100vw;z-index:9401;background:var(--ground,var(--surface));color:var(--ink);display:flex;flex-direction:column;box-shadow:-24px 0 60px -30px rgba(6,32,47,.7);animation:evIn .25s cubic-bezier(.2,.7,.2,1);font-size:14.5px}
@media(max-width:900px){.ev-pn{width:100vw}}
@keyframes evIn{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}
@keyframes evFade{from{opacity:0}to{opacity:1}}
.ev-ph{padding:18px 22px 0;background:linear-gradient(140deg,#06202f,#0d314c 60%,#14486e);color:#fff;border-bottom:3px solid var(--ea,#74bfeb)}
.ev-ph .top{display:flex;align-items:flex-start;gap:12px}
.ev-ph .tt{flex:1;min-width:0}.ev-ph .tt small{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#74bfeb}
.ev-ph h2{margin:2px 0 4px;font-size:22px;line-height:1.2;color:#fff}
.ev-ph .meta{font-size:13px;color:#bfe2f6}
.ev-x{flex:none;width:34px;height:34px;border-radius:50%;border:1px solid rgba(116,191,235,.45);background:transparent;color:#fff;font-size:20px;line-height:1;cursor:pointer}.ev-x:hover{background:rgba(116,191,235,.2)}
.ev-tabs{display:flex;gap:2px;margin-top:14px;overflow-x:auto;scrollbar-width:none}
.ev-tabs button{font:inherit;font-size:13px;font-weight:700;color:#bfe2f6;background:transparent;border:0;border-radius:6px 6px 0 0;padding:8px 14px;cursor:pointer;white-space:nowrap}
.ev-tabs button.on{background:var(--ground,var(--surface));color:var(--ink)}
.ev-tabs button i{font-style:normal;font-weight:600;opacity:.75;margin-left:5px;font-variant-numeric:tabular-nums}
.ev-pb{flex:1;overflow:auto;padding:18px 22px 24px}
.ev-pf{display:flex;align-items:center;gap:8px;padding:12px 22px;border-top:1px solid var(--border);background:var(--surface)}
.ev-pf .sp{flex:1}.ev-pf .msg{font-size:12.5px;color:var(--ink-3)}.ev-pf .msg.dirty{color:var(--warn,#93370d);font-weight:700}
.ev-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 14px}
.ev-f{display:flex;flex-direction:column;gap:4px;min-width:0}.ev-f.w2{grid-column:span 2}.ev-f.w4{grid-column:1/-1}
.ev-f>span{font-size:12px;font-weight:700;color:var(--ink-2)}
.ev-f input,.ev-f select,.ev-f textarea,.ev-row input,.ev-row select{font:inherit;font-size:13.5px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);padding:0 10px;height:36px;min-width:0;width:100%;box-sizing:border-box}
.ev-f textarea{height:auto;min-height:70px;padding:8px 10px;resize:vertical}
.ev-dt{display:flex;gap:4px}.ev-dt input[type=text]{flex:1}
.ev-dt .cal{flex:none;width:36px;height:36px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink-2);cursor:pointer;position:relative;padding:0;display:inline-flex;align-items:center;justify-content:center}
.ev-dt .cal svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8}
.ev-dt .cal input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:0;padding:0}
.ev-dt input.bad{border-color:var(--bad,#b42318)}
.ev-chks{display:flex;gap:14px;flex-wrap:wrap;align-items:center;min-height:36px}
.ev-chk{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;cursor:pointer;line-height:1}
.ev-chk input{width:16px;height:16px;margin:0;flex:none}
.ev-sec{margin:20px 0 8px;display:flex;align-items:center;gap:10px}.ev-sec:first-child{margin-top:0}
.ev-sec h3{flex:1}.ev-sec .hint{font-size:12.5px;color:var(--ink-3)}
.ev-rows{display:flex;flex-direction:column;gap:8px}
.ev-row{display:grid;gap:8px;align-items:end;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}
.ev-row .ev-f>span{font-size:11px}
.ev-row .rm{align-self:end;height:36px;width:36px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink-3);cursor:pointer;font-size:18px;line-height:1}
.ev-row .rm:hover{color:var(--bad,#b42318);border-color:var(--bad,#b42318)}
.ev-pb{container-type:inline-size}
/* rows and the details grid fit the panel's own width: one line per row when there's room, two columns when there isn't */
.ev-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.ev-row.ppl,.ev-row.talk,.ev-row.promo,.ev-row.con,.ev-row.task{grid-template-columns:repeat(2,minmax(0,1fr))}
.ev-row .rm{justify-self:end}
.ev-row .ckc{display:flex;align-items:center;height:36px;white-space:nowrap}
.ev-row .note{grid-column:1/-1}
@container (min-width:740px){
  .ev-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
  .ev-row.ppl{grid-template-columns:minmax(130px,1.3fr) minmax(118px,1fr) minmax(118px,1fr) auto auto minmax(100px,1fr) 36px}
  .ev-row.talk{grid-template-columns:minmax(150px,2fr) minmax(120px,1fr) minmax(118px,1fr) minmax(100px,1fr) minmax(118px,1fr) minmax(80px,.8fr) 36px}
  .ev-row.promo{grid-template-columns:auto minmax(150px,2.6fr) minmax(110px,1fr) minmax(118px,1fr) minmax(100px,.9fr) minmax(100px,1fr) 36px}
  .ev-row.con{grid-template-columns:repeat(5,minmax(0,1fr)) 36px}.ev-row.con .rm{grid-column:6;grid-row:1}
  .ev-row.task{grid-template-columns:auto minmax(180px,2.6fr) minmax(120px,1fr) minmax(118px,1fr) 36px}
  .ev-pan .hd{grid-template-columns:minmax(200px,2.4fr) minmax(118px,1fr) minmax(90px,.8fr) minmax(160px,1.6fr) auto}
  .ev-pan .hd .ev-f.w2{grid-column:auto}
  .ev-row.pp{grid-template-columns:minmax(0,1.2fr) minmax(0,.9fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr) auto 36px}
  .ev-row.pp .rm{grid-column:7;grid-row:2}
}
.ev-pan{border:1px solid var(--border);border-radius:10px;background:var(--surface-2);padding:12px;display:flex;flex-direction:column;gap:10px}
.ev-pan+.ev-pan{margin-top:12px}
.ev-pan .hd{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:end}
.ev-pan .hd .ev-f.w2{grid-column:1/-1}
.ev-pan .ev-f input{font:inherit;font-size:13.5px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);padding:0 10px;height:36px;min-width:0;width:100%;box-sizing:border-box}
.ev-pan .ac{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ev-row.pp{grid-template-columns:repeat(2,minmax(0,1fr))}
.ev-row.pp .fd{grid-column:1/-1;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ev-find{position:relative;flex:1 1 260px;min-width:0}
.ev-find input{font:inherit;font-size:13.5px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);padding:0 10px;height:34px;width:100%;box-sizing:border-box}
.ev-res{position:absolute;left:0;right:0;top:100%;margin-top:2px;z-index:5;background:var(--surface);border:1px solid var(--border-strong);border-radius:8px;box-shadow:0 14px 30px -18px rgba(6,32,47,.6);max-height:300px;overflow:auto;display:none}
.ev-res.open{display:block}
.ev-res button{display:block;width:100%;text-align:left;font:inherit;font-size:13px;background:none;border:0;border-top:1px solid var(--border);padding:7px 10px;cursor:pointer;color:var(--ink)}
.ev-res button:first-child{border-top:0}.ev-res button.on,.ev-res button:hover{background:var(--sky-wash,#e8f4fb)}
:root[data-theme="dark"] .ev-res button.on,:root[data-theme="dark"] .ev-res button:hover{background:rgba(116,191,235,.16)}
.ev-res button small{display:block;color:var(--ink-3);font-size:11.5px}
.ev-res p{margin:0;padding:8px 10px;font-size:12.5px;color:var(--ink-3)}
.ev-m360{font-size:12px;color:var(--ink-3)}
.ev-lk{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--good-soft,#e3f6ec);color:var(--good,#067647)}
.ev-lk button{border:0;background:none;color:inherit;font:inherit;cursor:pointer;padding:0 2px}
.ev-bi{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:4px 12px}
.ev-bi .ev-due.done .tx{color:var(--ink-3);text-decoration:line-through}
.ev-drop{border:2px dashed var(--border-strong);border-radius:10px;padding:18px;text-align:center;color:var(--ink-2);background:var(--surface);cursor:pointer;transition:border-color .2s,background .2s}
.ev-drop.over{border-color:#74bfeb;background:var(--sky-wash,#e8f4fb)}
.ev-drop b{color:var(--ink)}
.ev-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:10px}
.ev-g{border:1px solid var(--border);border-radius:8px;background:var(--surface);overflow:hidden;display:flex;flex-direction:column}
.ev-g .th{height:120px;background:var(--surface-2) center/contain no-repeat;display:flex;align-items:center;justify-content:center;color:var(--ink-3);font-size:12px;font-weight:700;cursor:pointer;border:0;width:100%;font-family:inherit}
.ev-g .bd{padding:8px;display:flex;flex-direction:column;gap:6px}
.ev-g .bd input,.ev-g .bd select{font:inherit;font-size:12.5px;height:30px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);padding:0 8px;min-width:0}
.ev-g .ac{display:flex;gap:6px}.ev-g .ac .ev-btn{height:28px;font-size:12px;padding:0 9px}
.ev-up{font-size:12.5px;color:var(--ink-3);margin-top:6px}
/* the dashboard tile */
.ev-tile{display:flex;flex-direction:column;gap:8px;min-height:0}
.ev-tile .nx{display:flex;flex-direction:column;gap:2px}
.ev-tile .nx b{font-size:17px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-tile .nx span{font-size:12.5px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-tile .cd{font-size:30px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.ev-tile .cd small{font-size:13px;font-weight:600;opacity:.8;margin-left:4px}
.ev-tile .ls{display:flex;flex-direction:column;gap:4px;min-height:0;overflow:hidden}
.ev-tile .ls div{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;font-size:12.5px}
.ev-tile .ls div b{font-variant-numeric:tabular-nums}
.ev-tile .ls div span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;
document.head.appendChild(css);

/* ---------- a typeable date with the calendar on a button beside it ---------- */
function dateField(val){ const w=h('div','ev-dt'); const t=h('input'); t.type='text'; t.placeholder='e.g. 3/15/27'; t.value=val ? fmtNum(val) : ''; t.dataset.iso=val||'';
  const cb=h('label','cal'); cb.title='Pick from a calendar'; cb.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
  const pk=h('input'); pk.type='date'; pk.tabIndex=-1; pk.value=val||''; pk.setAttribute('aria-label','Pick a date'); cb.appendChild(pk);
  pk.addEventListener('click', e=>{ try{ pk.showPicker && pk.showPicker(); }catch(x){} });
  pk.addEventListener('change', ()=>{ t.value=pk.value ? fmtNum(pk.value) : ''; t.dataset.iso=pk.value||''; t.classList.remove('bad'); t.dispatchEvent(new Event('input', {bubbles:true})); });
  t.addEventListener('blur', ()=>{ const v=parseDate(t.value); if(v===null){ t.classList.add('bad'); t.title='Type a date like 3/15/27'; return; } t.classList.remove('bad'); t.title=''; t.dataset.iso=v; t.value=v ? fmtNum(v) : ''; pk.value=v; });
  w.appendChild(t); w.appendChild(cb);
  w.get=()=>{ const v=parseDate(t.value); return v===null ? (t.dataset.iso||'') : v; };
  w.input=t; return w; }
function fmtNum(s){ const d=pd(s); return d ? (d.getMonth()+1)+'/'+d.getDate()+'/'+String(d.getFullYear()).slice(2) : ''; }
/* a plain input sits in a <label>; anything holding its own labels (dates, tick boxes) sits in a <div> so labels never nest */
function field(parent, label, el, cls){ const plain=/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName); const f=h(plain?'label':'div','ev-f'+(cls?' '+cls:'')); const sp=h('span',null,label); f.appendChild(sp);
  if(!plain){ const fi=el.querySelector && el.querySelector('input[type=text]'); if(fi && label.trim()) fi.setAttribute('aria-label', label); }
  f.appendChild(el); parent.appendChild(f); return el; }
function inp(type, val, ph){ const i=h('input'); i.type=type; if(val!=null) i.value=val; if(ph) i.placeholder=ph; return i; }
function sel(opts, val, blank){ const s=h('select'); if(blank!=null) s.appendChild(new Option(blank, '')); opts.forEach(o=>{ const v=typeof o==='string'?o:o.v, t=typeof o==='string'?o:o.t; s.appendChild(new Option(t, v)); }); s.value=val||''; return s; }
const teamOpts=()=>team().map(p=>({v:p.id, t:p.name}));
function chk(label, on){ const l=h('label','ev-chk'); const c=h('input'); c.type='checkbox'; c.checked=!!on; l.appendChild(c); l.appendChild(document.createTextNode(label)); l.box=c; return l; }

/* ---------- the page ---------- */
function page(){ start(); const el=h('div','ev'); P.el=el; draw(); return el; }
function draw(){ const el=P.el; if(!el || !el.isConnected && el.childNodes.length) return; el.textContent='';
  if(M.list==null){ el.appendChild(h('div','ev-box','Getting Industry Events…')); return; }
  const L=live(), Up=L.filter(upcoming).sort(byStart);
  /* the figure boxes */
  const band=h('div','ev-band'); el.appendChild(band);
  const nextEv=Up.find(e=>e.status==='Going') || Up.find(e=>e.status==='Considering');
  const nf=btn('ev-fig next', null, ()=>{ if(nextEv) openPanel(nextEv.id); else openNew(); });
  nf.appendChild(h('span','k', nextEv && nextEv.status!=='Going' ? 'Next Event (Considering)' : 'Next Event'));
  nf.appendChild(h('b',null, nextEv ? nextEv.name : 'Nothing on the list yet'));
  nf.appendChild(h('span',null, nextEv ? [span(nextEv.start, nextEv.end), nextEv.city].filter(Boolean).join(' · ') : 'Add the first one to get started'));
  if(nextEv && nextEv.start){ const n=daysTo(nextEv.start); nf.appendChild(h('span','cd', n>0 ? n+' day'+(n===1?'':'s')+' away' : n===0 ? 'Starts today' : 'Happening now')); }
  band.appendChild(nf);
  const going=Up.filter(e=>e.status==='Going'), cons=Up.filter(e=>e.status==='Considering');
  const talks=Up.reduce((a,e)=>a+e.talks.filter(t=>t.status==='Accepted'||t.status==='Confirmed').length, 0), talksAll=Up.reduce((a,e)=>a+e.talks.filter(t=>t.status!=='Declined').length, 0);
  const due=dueItems(L, 30);
  [[going.length,'Going','going'],[cons.length,'Considering','considering'],[talks+(talksAll>talks?' of '+talksAll:''),'Speaking Slots','speaking'],[due.length,'Due in 30 Days','due']].forEach(x=>{
    const b=btn('ev-fig'+(P.filter===x[2]?' on':''), null, ()=>{ if(x[2]==='due'){ const d=el.querySelector('.ev-dues'); if(d) d.scrollIntoView({block:'start', behavior:'smooth'}); return; } P.filter=P.filter===x[2]?'up':x[2]; draw(); });
    b.appendChild(h('b',null,String(x[0]))); b.appendChild(h('span',null,x[1])); band.appendChild(b); });
  /* the filters */
  const bar=h('div','ev-bar'); el.appendChild(bar);
  const seg=h('div','ev-seg'); [['up','Upcoming'],['going','Going'],['considering','Considering'],['speaking','Speaking'],['past','Past'],['no','Not Going'],['aside','Set Aside']].forEach(f=>{ const b=btn(P.filter===f[0]?'on':'', f[1], ()=>{ P.filter=f[0]; draw(); }); seg.appendChild(b); }); bar.appendChild(seg);
  const who=sel([{v:'', t:'Everyone'}].concat(teamOpts()), P.who); who.setAttribute('aria-label','Who’s going'); who.addEventListener('change', ()=>{ P.who=who.value; draw(); }); bar.appendChild(who);
  const q=h('input'); q.type='search'; q.placeholder='Search events, cities, people, contacts…'; q.value=P.q; q.addEventListener('input', ()=>{ P.q=q.value; clearTimeout(q._t); q._t=setTimeout(()=>{ drawList(); }, 150); }); bar.appendChild(q);
  bar.appendChild(btn('ev-btn pri', '+ Add an Event', openNew));
  const cols=h('div','ev-cols'); el.appendChild(cols);
  const left=h('div','ev-left'); cols.appendChild(left); P.left=left;
  const right=h('div','ev-right'); cols.appendChild(right);
  drawList();
  /* what's due */
  const db=h('div','ev-box ev-dues'); db.appendChild(h('h3',null,'Coming Up'));
  const D=dueItems(L, 60);
  if(D.length) D.slice(0,12).forEach(x=>{ const r=btn('ev-due', null, ()=>openPanel(x.ev.id, x.k==='talk'?'talks':x.k==='promo'?'promo':x.k==='task'?'tasks':'details')); const dd=h('span','dd'+(x.n<0?' late':x.n<=7?' soon':''), x.n<0 ? 'Past due' : x.n===0 ? 'Today' : fmt(x.d)); r.appendChild(dd);
    const tx=h('span','tx', x.t); tx.appendChild(h('small',null, when(x.n))); r.appendChild(tx); db.appendChild(r); });
  else { const nx=Up[0]; db.appendChild(h('p','hint', nx ? 'Nothing due in the next 60 days. Next on the list: '+nx.name+(nx.start?' ('+fmtY(nx.start)+')':'')+'.' : 'Registration deadlines, speaking proposals and promotion steps show here as they come up.')); }
  right.appendChild(db);
  /* who's going where */
  const wb=h('div','ev-box'); wb.appendChild(h('h3',null,'Who’s Going Where'));
  const rows=team().map(p=>({p, L:going.filter(e=>e.people.some(x=>x.who===p.id))})).filter(r=>r.L.length);
  if(rows.length) rows.forEach(r=>{ const w=h('div','ev-who'); w.appendChild(avatar(r.p.id)); const tx=h('div','tx'); tx.appendChild(h('b',null,r.p.name)); tx.appendChild(h('span',null, r.L.slice(0,3).map(e=>e.name+(e.start?' ('+fmt(e.start)+')':'')).join(' · ')+(r.L.length>3?' · +'+(r.L.length-3)+' more':''))); w.appendChild(tx); wb.appendChild(w); });
  else wb.appendChild(h('p','hint','Add people to an event you’re going to and they show here, with the event in their Expenses trips.'));
  right.appendChild(wb);
  const mb=h('div','ev-box'); mb.appendChild(h('h3',null,'Promoting an Event')); mb.appendChild(h('p','hint','Each event has a Promotion list. To have the Strategic Growth team make a post or graphic, send a request to MISMO Media.'));
  const ra=h('a','ev-btn', 'Ask MISMO Media'); ra.href=REQUEST_FORM; ra.target='_blank'; ra.rel='noopener'; mb.appendChild(ra); right.appendChild(mb);
}
function matches(e){ const q=P.q.trim().toLowerCase(); if(P.who && !e.people.some(p=>p.who===P.who) && !e.talks.some(t=>t.who===P.who)) return false; if(!q) return true;
  const hay=[e.name, e.host, e.city, e.venue, e.kind, e.notes].concat(e.people.map(p=>pname(p.who))).concat(e.contacts.map(c=>[c.name,c.company,c.title,c.role].join(' '))).concat(e.talks.map(t=>t.title)).concat(e.tasks.map(t=>t.t)).concat(e.panels.map(p=>[p.title].concat(p.people.map(x=>[x.name,x.company,x.title].join(' '))).join(' '))).join(' ').toLowerCase();
  return q.split(/\s+/).every(w=>hay.indexOf(w)>=0); }
function pick(){ const A=(M.list||[]); const f=P.filter;
  const L= f==='aside' ? A.filter(e=>e.gone) : A.filter(e=>!e.gone);
  if(f==='past') return L.filter(e=>!upcoming(e) && e.status!=='Not Going').sort((a,b)=>byStart(b,a));
  if(f==='no') return L.filter(e=>e.status==='Not Going').sort(byStart);
  if(f==='aside') return L.sort(byStart);
  const U=L.filter(upcoming);
  if(f==='going') return U.filter(e=>e.status==='Going').sort(byStart);
  if(f==='considering') return U.filter(e=>e.status==='Considering').sort(byStart);
  if(f==='speaking') return U.filter(e=>e.talks.some(t=>t.status!=='Declined')||e.roles.indexOf('Speaking')>=0).sort(byStart);
  return U.filter(e=>e.status!=='Not Going').sort(byStart); }
function drawList(){ const left=P.left; if(!left) return; left.textContent='';
  const all=pick(), L=all.filter(matches);
  if(!(M.list||[]).some(e=>!e.gone)){ const em=h('div','ev-empty'); const tx=h('div'); tx.appendChild(h('b',null,'No industry events yet')); tx.appendChild(h('p',null,'Use + Add an Event above for the conferences, trade shows and dinners MISMO is going to or thinking about.')); em.appendChild(tx); left.appendChild(em); return; } /* one Add an Event button: the one in the toolbar */
  if(!L.length){ /* nothing in this view: show the upcoming list instead of an empty space */
    const E={up:['Nothing coming up','Use + Add an Event for the next conference, trade show or dinner.'], going:['No upcoming events marked Going','Open an event and set it to Going once MISMO decides to attend.'], considering:['Nothing being considered','Events marked Considering show here until they’re decided.'], speaking:['No upcoming talks','Events where MISMO is speaking, or has a talk proposed, show here.'], past:['No past events yet','An event moves here the day after it ends.'], no:['Nothing marked Not Going','Events MISMO decides to skip show here, so the decision isn’t lost.'], aside:['Nothing set aside','Set Aside keeps an event out of the lists without deleting it.']}[P.filter] || ['Nothing here',''];
    const em=h('div','ev-empty ev-none'); const tx=h('div'); tx.appendChild(h('b',null, all.length ? 'Nothing matches “'+(P.q||first(P.who))+'”' : E[0])); tx.appendChild(h('p',null, all.length ? 'Try another word, or Everyone in the people list.' : E[1])); em.appendChild(tx); left.appendChild(em); return; }
  cards(left, L); }
function cards(left, L){
  /* grouped by month */
  const groups=[]; L.forEach(e=>{ const d=pd(e.start); const mk=d ? MONL[d.getMonth()]+' '+d.getFullYear() : 'Dates to Be Set'; let g=groups.find(x=>x.k===mk); if(!g){ g={k:mk, L:[]}; groups.push(g); } g.L.push(e); });
  left.textContent=''; if(P.q || P.who){ const n=h('p','ev-up', L.length+' event'+(L.length===1?'':'s')+(P.who?' with '+first(P.who):'')+(P.q?' matching “'+P.q+'”':'')); left.appendChild(n); }
  groups.forEach(g=>{ left.appendChild(h('div','ev-mon', g.k)); const ls=h('div','ev-list'); g.L.forEach(e=>ls.appendChild(card(e))); left.appendChild(ls); }); }
function accent(e){ return e.status==='Going' ? '#2bb673' : e.status==='Considering' ? '#f2b134' : '#98a2b3'; }
function card(e){ const c=btn('ev-card'+(e.status==='Not Going'||e.gone?' dim':'')); c.style.setProperty('--ea', accent(e)); c.addEventListener('click', ()=>openPanel(e.id));
  const d=pd(e.start), d2=pd(e.end); const db=h('div','ev-date');
  if(d){ db.appendChild(h('small',null,MON[d.getMonth()])); { const rg=d2 && +d2!==+d && d2.getMonth()===d.getMonth(); db.appendChild(h('b', rg?'rg':null, String(d.getDate())+(rg ? '–'+d2.getDate() : ''))); } db.appendChild(h('em',null, d2 && d2.getMonth()!==d.getMonth() ? 'to '+fmt(e.end) : WD[d.getDay()])); }
  else { db.appendChild(h('small',null,'Date')); db.appendChild(h('b',null,'?')); }
  c.appendChild(db);
  const m=h('div','ev-main'); m.appendChild(h('div','nm', e.name));
  const sub=[e.host, [e.city, e.venue].filter(Boolean).join(' · '), e.kind && e.kind!=='Conference' ? e.kind : ''].filter(Boolean).join(' · '); if(sub) m.appendChild(h('div','sub', sub));
  const tg=h('div','ev-tags'); if(e.example) tg.appendChild(h('span','ev-tag ex','Example')); tg.appendChild(h('span','ev-tag '+e.status.toLowerCase().replace(/\s+/g,''), e.gone ? 'Set Aside' : e.status)); e.roles.filter(r=>r!=='Attending').forEach(r=>tg.appendChild(h('span','ev-tag role', r)));
  if(e.regBy && e.status!=='Not Going'){ const n=daysTo(e.regBy); if(n!=null && n>=0 && n<=30) tg.appendChild(h('span','ev-tag considering','Register by '+fmt(e.regBy))); }
  m.appendChild(tg); c.appendChild(m);
  const s2=h('div','ev-side2'); const av=h('div','ev-avs'); e.people.filter(p=>p.who).slice(0,6).forEach(p=>av.appendChild(avatar(p.who))); if(av.childNodes.length) s2.appendChild(av);
  /* the right side: who's going and the counts, stacked; under the tags when the list is narrow */
  const n0=e.people.filter(p=>p.who).length; if(n0) s2.appendChild(h('small','ev-gn', n0+' going'));
  const cn=h('div','ev-cnt'); const pr=e.promo.length; const add=(n,l)=>{ if(!n && n!==0) return; const s=h('span'); s.appendChild(h('b',null,String(n))); s.append(' '+l); cn.appendChild(s); };
  if(e.talks.length) add(e.talks.length, e.talks.length===1?'talk':'talks'); if(pr) add(e.promo.filter(p=>p.done).length+'/'+pr, 'promoted'); if(e.graphics.length) add(e.graphics.length, e.graphics.length===1?'graphic':'graphics'); if(e.tasks.length) add(e.tasks.filter(t=>t.done).length+'/'+e.tasks.length, 'tasks done'); if(e.panels.length) add(e.panels.length, e.panels.length===1?'panel':'panels'); if(e.contacts.length) add(e.contacts.length, e.contacts.length===1?'contact':'contacts');
  if(cn.childNodes.length) s2.appendChild(cn); if(s2.childNodes.length) c.appendChild(s2);
  return c; }

/* ---------- the right-hand panel: one event, every part of it, with one Save ---------- */
const TABS=[['details','Details'],['people','Who’s Going'],['talks','Speaking'],['panels','Panels'],['promo','Promotion'],['tasks','Tasks'],['graphics','Graphics'],['contacts','Contacts']];
function openNew(){ const ev=fix({id:uid('ev'), name:'', status:'Considering', kind:'Conference', roles:['Attending']}); openPanel(null, 'details', ev); }
function openPanel(id, tab, fresh){ closePanel();
  const src=fresh || (M.list||[]).find(e=>e.id===id); if(!src) return;
  const st={orig:fresh ? null : clone(src), ev:clone(src), tab:tab||'details', dirty:false, isNew:!!fresh};
  const scrim=h('div','ev-scrim'); const pn=h('div','ev-pn'); pn.setAttribute('role','dialog'); pn.setAttribute('aria-modal','true');
  pn.style.setProperty('--ea', accent(src));
  st.scrim=scrim; st.pn=pn; P.panel=st;
  scrim.addEventListener('click', ()=>tryClose());
  document.body.appendChild(scrim); document.body.appendChild(pn);
  paintPanel(); setTimeout(()=>{ const f=pn.querySelector('.ev-pb input'); if(f && st.isNew) f.focus(); }, 60); }
function tryClose(){ const st=P.panel; if(!st) return; if(st.dirty && !confirmLeave()) return; closePanel(); }
function confirmLeave(){ return window.confirm('You have changes that aren’t saved. Close without saving them?'); }
function closePanel(){ const st=P.panel; if(!st) return; st.scrim.remove(); st.pn.remove(); P.panel=null; }
const onKey=e=>{ if(e.key==='Escape' && P.panel){ const r=P.panel.pn.querySelector('.ev-res.open'); if(r){ e.stopPropagation(); r.classList.remove('open'); return; } e.stopPropagation(); tryClose(); } };
document.addEventListener('keydown', onKey, true);
function markDirty(){ const st=P.panel; if(!st) return; st.dirty=true; const m=st.pn.querySelector('.ev-pf .msg'); if(m){ m.textContent='Changes not saved yet'; m.className='msg dirty'; } }
function paintPanel(){ const st=P.panel; if(!st) return; const ev=st.ev, pn=st.pn; pn.textContent='';
  const ph=h('div','ev-ph'); const top=h('div','top'); const tt=h('div','tt');
  tt.appendChild(h('small',null, st.isNew ? 'New Industry Event' : (ev.example ? 'Example · ' : '')+(ev.gone ? 'Set Aside · ' : '')+(ev.kind||'Industry Event')));
  tt.appendChild(h('h2',null, ev.name || 'Name the Event'));
  tt.appendChild(h('div','meta', [span(ev.start, ev.end), [ev.city, ev.venue].filter(Boolean).join(' · '), ev.status].filter(Boolean).join('  ·  ') || 'Add the dates and where it is'));
  top.appendChild(tt); const x=btn('ev-x', '×', tryClose); x.setAttribute('aria-label','Close'); top.appendChild(x); ph.appendChild(top);
  const tabs=h('div','ev-tabs'); TABS.forEach(t=>{ const n={people:ev.people.length, talks:ev.talks.length, panels:ev.panels.length, promo:ev.promo.length, tasks:ev.tasks.filter(x=>!x.done).length, graphics:ev.graphics.length, contacts:ev.contacts.length}[t[0]];
    const b=btn(st.tab===t[0]?'on':'', t[1], ()=>{ collect(); st.tab=t[0]; paintPanel(); }); if(n) b.appendChild(h('i',null,String(n))); tabs.appendChild(b); }); ph.appendChild(tabs);
  pn.appendChild(ph);
  const body=h('div','ev-pb'); pn.appendChild(body); st.body=body; st.get=null;
  ({details:pDetails, people:pPeople, talks:pTalks, panels:pPanels, promo:pPromo, tasks:pTasks, graphics:pGraphics, contacts:pContacts}[st.tab]||pDetails)(body, ev);
  body.addEventListener('input', markDirty); body.addEventListener('change', markDirty);
  const pf=h('div','ev-pf');
  const sv=btn('ev-btn pri', st.isNew ? 'Save the Event' : 'Save Changes', doSave); pf.appendChild(sv);
  pf.appendChild(btn('ev-btn', st.dirty ? 'Discard Changes' : 'Close', ()=>{ if(st.dirty){ if(!window.confirm('Throw away the changes you haven’t saved?')) return; } closePanel(); }));
  pf.appendChild(h('span','msg'+(st.dirty?' dirty':''), st.dirty ? 'Changes not saved yet' : st.isNew ? 'Nothing is saved until you press Save' : ev.at ? 'Last saved '+new Date(ev.at).toLocaleDateString('en-US',{month:'short', day:'numeric'})+(ev.by?' by '+first(ev.by):'') : ''));
  pf.appendChild(h('span','sp'));
  if(!st.isNew) pf.appendChild(ev.gone ? btn('ev-btn', 'Bring Back', ()=>{ const prev=clone(st.orig); const nx=clone(st.orig); delete nx.gone; save(nx, 'It’s back on the list.', prev); closePanel(); })
    : btn('ev-btn warn', 'Set Aside', ()=>{ if(!window.confirm('Set “'+ev.name+'” aside? It comes off the list, and you can bring it back from Set Aside.')) return; const prev=clone(st.orig); const nx=clone(st.orig); nx.gone=Date.now(); save(nx, 'Set aside.', prev); closePanel(); }));
  pn.appendChild(pf); }
function collect(){ const st=P.panel; if(st && st.get){ try{ st.get(st.ev); }catch(e){ console.error(e); } } }
function doSave(){ const st=P.panel; if(!st) return; collect(); const ev=st.ev;
  ev.name=String(ev.name||'').trim(); if(!ev.name){ st.tab='details'; paintPanel(); toast('Give the event a name first.'); const f=st.pn.querySelector('.ev-pb input'); if(f) f.focus(); return; }
  if(ev.start && ev.end && ev.end<ev.start){ st.tab='details'; paintPanel(); toast('The end date is before the start date.'); return; }
  ev.people=ev.people.filter(p=>p.who); ev.talks=ev.talks.filter(t=>t.title||t.who); ev.promo=ev.promo.filter(p=>p.t); ev.contacts=ev.contacts.filter(c=>c.name||c.company||c.email); ev.tasks=ev.tasks.filter(t=>t.t);
  ev.panels=ev.panels.map(p=>Object.assign(p, {people:(p.people||[]).filter(x=>x.name||x.email)})).filter(p=>p.title||p.people.length);
  const prev=st.orig; save(ev, st.isNew ? '“'+ev.name+'” is on the list.' : 'Saved.', prev).then(ok=>{ if(!ok) return; st.orig=clone(ev); st.ev=clone(ev); st.dirty=false; st.isNew=false; paintPanel(); }); }

/* Details */
function pDetails(b, ev){ const g=h('div','ev-grid'); b.appendChild(g);
  const nm=field(g, 'Event Name', inp('text', ev.name, 'e.g. MBA Annual Convention & Expo 2027'), 'w2');
  const host=field(g, 'Hosted By', inp('text', ev.host, 'e.g. MBA'));
  const kind=field(g, 'Kind of Event', sel(KINDS, ev.kind||'Conference'));
  const status=field(g, 'Our Status', sel(STATUS, ev.status));
  const s=field(g, 'Starts', dateField(ev.start)); const e=field(g, 'Ends', dateField(ev.end));
  const reg=field(g, 'Register By', dateField(ev.regBy));
  const city=field(g, 'City', inp('text', ev.city, 'e.g. Philadelphia, PA')); const venue=field(g, 'Venue', inp('text', ev.venue, 'e.g. Pennsylvania Convention Center'));
  const url=field(g, 'Event Website', inp('url', ev.url, 'https://'), 'w2');
  const rw=h('div','ev-chks'); const R={}; ROLES.forEach(r=>{ const c=chk(r, ev.roles.indexOf(r)>=0); R[r]=c.box; rw.appendChild(c); }); field(g, 'Our Role', rw, 'w2');
  const cost=field(g, 'Registration Cost (Each)', inp('number', ev.cost, '0.00')); cost.step='0.01'; cost.min='0'; cost.inputMode='decimal';
  const scost=field(g, 'Booth or Sponsorship Cost', inp('number', ev.scost, '0.00')); scost.step='0.01'; scost.min='0'; scost.inputMode='decimal';
  const hotel=field(g, 'Hotel or Room Block', inp('text', ev.hotel, 'Hotel name, block code or rate'), 'w2');
  const kit=field(g, 'Media Kit or Speaker Portal Link', inp('url', ev.kit, 'https://'), 'w2');
  const notes=field(g, 'Notes', h('textarea'), 'w4'); notes.value=ev.notes||''; notes.placeholder='Anything else the team should know';
  const lk=h('div','ev-chks'); [['Event Website',ev.url],['Media Kit',ev.kit]].forEach(x=>{ const u=safeUrl(x[1]); if(!u) return; const a=h('a','ev-btn', 'Open '+x[0]+' ↗'); a.href=u; a.target='_blank'; a.rel='noopener'; lk.appendChild(a); }); if(lk.childNodes.length) b.appendChild(lk), lk.style.marginTop='12px';
  P.panel.get=ev2=>{ ev2.name=nm.value.trim(); ev2.host=host.value.trim(); ev2.kind=kind.value; ev2.status=status.value; ev2.start=s.get(); ev2.end=e.get()||''; ev2.regBy=reg.get();
    ev2.city=city.value.trim(); ev2.venue=venue.value.trim(); ev2.url=url.value.trim(); ev2.roles=ROLES.filter(r=>R[r].checked);
    ev2.cost=cost.value; ev2.scost=scost.value; ev2.hotel=hotel.value.trim(); ev2.kit=kit.value.trim(); ev2.notes=notes.value; };
  s.input.addEventListener('blur', ()=>{ if(!e.input.value && s.get()){ e.input.value=fmtNum(s.get()); e.input.dataset.iso=s.get(); } }); }

/* rows: each part of an event is a list of rows, edited in place and saved with the event */
function rowsSec(b, title, hint, addLabel, list, make, blank){ const hd=h('div','ev-sec'); hd.appendChild(h('h3',null,title)); if(hint) hd.appendChild(h('span','hint',hint)); b.appendChild(hd);
  const box=h('div','ev-rows'); b.appendChild(box); const getters=[];
  const put=(item)=>{ const r=make(item); const rm=btn('rm','×', ()=>{ const i=getters.indexOf(r.get); if(i>=0) getters.splice(i,1); r.el.remove(); markDirty(); }); rm.title='Remove'; rm.setAttribute('aria-label','Remove'); r.el.insertBefore(rm, r.note||null); box.appendChild(r.el); getters.push(r.get); return r; };
  list.forEach(put);
  const ab=btn('ev-btn', '+ '+addLabel, ()=>{ const r=put(blank()); markDirty(); const f=r.el.querySelector('input,select'); if(f) f.focus(); }); ab.style.marginTop='8px'; b.appendChild(ab);
  return ()=>getters.map(g=>g()); }
function pPeople(b, ev){
  const get=rowsSec(b, 'Who’s Going', 'Their travel dates, and whether they’re registered and have a room. The event shows as a trip in their Expenses.', 'Add a Person', ev.people, p=>{ const r=h('div','ev-row ppl');
    const who=field(r, 'Person', sel(teamOpts(), p.who, 'Pick a Person')); const a=field(r, 'Arrives', dateField(p.from||ev.start)); const l=field(r, 'Leaves', dateField(p.to||ev.end||ev.start));
    const c1=h('div','ckc'); const rg=chk('Registered', p.reg); c1.appendChild(rg); field(r, ' ', c1); const c2=h('div','ckc'); const ht=chk('Room Booked', p.room); c2.appendChild(ht); field(r, ' ', c2);
    const nt=field(r, 'Note', inp('text', p.note, 'e.g. speaking Tuesday'));
    return {el:r, get:()=>({who:who.value, from:a.get(), to:l.get(), reg:rg.box.checked, room:ht.box.checked, note:nt.value.trim()})}; }, ()=>({who:'', from:ev.start||'', to:ev.end||ev.start||''}));
  P.panel.get=ev2=>{ ev2.people=get(); }; }
function pTalks(b, ev){
  const get=rowsSec(b, 'Speaking Opportunities', 'Calls for speakers, panels and sessions, and where each one stands.', 'Add a Speaking Opportunity', ev.talks, t=>{ const r=h('div','ev-row talk');
    const ti=field(r, 'Session or Topic', inp('text', t.title, 'e.g. Panel: AI in the Mortgage Process')); const who=field(r, 'Speaker', sel(teamOpts(), t.who, 'Pick a Person'));
    const due=field(r, 'Proposal Due', dateField(t.due)); const s=field(r, 'Status', sel(TALK, t.status||'Idea')); const d=field(r, 'Session Date', dateField(t.date)); const tm=field(r, 'Time', inp('text', t.time, 'e.g. 10:30 AM'));
    const nt=h('label','ev-f note'); nt.appendChild(h('span',null,'Note')); const ni=inp('text', t.note, 'Co-speakers, the room, what to send them'); nt.appendChild(ni); r.appendChild(nt);
    return {el:r, note:nt, get:()=>({id:t.id||uid('t'), title:ti.value.trim(), who:who.value, due:due.get(), status:s.value, date:d.get(), time:tm.value.trim(), note:ni.value.trim()})}; }, ()=>({id:uid('t'), status:'Idea'}));
  P.panel.get=ev2=>{ ev2.talks=get(); }; }
function usualSteps(ev){ const s=pd(ev.start), e=pd(ev.end)||s; const d=(x,n)=>x ? iso(addD(x,n)) : '';
  return [{t:'List It in MISMO Matters (Where We’ll Be)', ch:'MISMO Matters', due:d(s,-30)},{t:'Announce We’ll Be There', ch:'LinkedIn', due:d(s,-21)},{t:'Share Our Speaker Graphics', ch:'LinkedIn', due:d(s,-7)},{t:'Post From the Event', ch:'LinkedIn', due:d(s,0)},{t:'Recap After the Event', ch:'LinkedIn', due:d(e,3)}].map(x=>Object.assign({id:uid('p'), done:false}, x)); }
function pPromo(b, ev){
  const top=h('div','ev-chks'); const ra=h('a','ev-btn', 'Ask MISMO Media ↗'); ra.href=REQUEST_FORM; ra.target='_blank'; ra.rel='noopener'; ra.title='Opens MISMO Media’s request form in a new tab';
  const us=btn('ev-btn', 'Add the Usual Steps', ()=>{ collect(); const have=new Set(P.panel.ev.promo.map(p=>p.t)); const add=usualSteps(P.panel.ev).filter(p=>!have.has(p.t)); if(!add.length){ toast('The usual steps are already on the list.'); return; } P.panel.ev.promo=P.panel.ev.promo.concat(add); markDirty(); paintPanel(); });
  top.appendChild(us); top.appendChild(ra); b.appendChild(top); top.style.marginBottom='12px';
  const get=rowsSec(b, 'Promotion', 'How we’re telling people we’ll be there, and what’s done.', 'Add a Step', ev.promo, p=>{ const r=h('div','ev-row promo');
    const c=h('div','ckc'); const dn=chk('Done', p.done); c.appendChild(dn); field(r, ' ', c);
    const t=field(r, 'Step', inp('text', p.t, 'e.g. Announce we’ll be there')); const ch=field(r, 'Channel', sel(CHAN, p.ch||'LinkedIn')); const due=field(r, 'Due', dateField(p.due));
    const who=field(r, 'Who', sel(teamOpts(), p.who, 'Anyone')); const lk=field(r, 'Link to the Post', inp('url', p.link, 'https://'));
    return {el:r, get:()=>({id:p.id||uid('p'), done:dn.box.checked, t:t.value.trim(), ch:ch.value, due:due.get(), who:who.value, link:lk.value.trim()})}; }, ()=>({id:uid('p'), ch:'LinkedIn', done:false}));
  P.panel.get=ev2=>{ ev2.promo=get(); }; }
function pContacts(b, ev){
  const dl=h('datalist'); dl.id='ev-crole-list'; CROLE.forEach(x=>dl.appendChild(new Option(x))); b.appendChild(dl);
  const get=rowsSec(b, 'Contacts', 'People we meet or need to reach at this event.', 'Add a Contact', ev.contacts, c=>{ const r=h('div','ev-row con');
    const n=field(r, 'Name', inp('text', c.name)); const ro=field(r, 'Role', inp('text', c.role, 'Pick or type')); ro.setAttribute('list', dl.id); ro.autocomplete='off'; const co=field(r, 'Company', inp('text', c.company)); const ti=field(r, 'Title', inp('text', c.title)); const em=field(r, 'Email', inp('email', c.email));
    const ph=field(r, 'Phone', inp('tel', c.phone)); const by=field(r, 'Met By', sel(teamOpts(), c.by, 'Pick a Person'));
    const cc=h('div','ckc'); const fu=chk('Follow Up', c.follow); cc.appendChild(fu); field(r, ' ', cc);
    const nt=h('label','ev-f note'); nt.appendChild(h('span',null,'Note')); const ni=inp('text', c.note, 'What you talked about, what they asked for'); nt.appendChild(ni); r.appendChild(nt);
    return {el:r, note:nt, get:()=>({id:c.id||uid('c'), name:n.value.trim(), company:co.value.trim(), title:ti.value.trim(), email:em.value.trim(), role:ro.value.trim(), phone:ph.value.trim(), by:by.value, follow:fu.box.checked, note:ni.value.trim()})}; }, ()=>({id:uid('c'), by:me()}));
  P.panel.get=ev2=>{ ev2.contacts=get(); }; }

/* Tasks (CN-023): the event's built-in dates, listed (each changes on its own tab), and the team's own tasks */
function builtIns(ev){ const L=[];
  if(ev.regBy) L.push({d:ev.regBy, t:'Register for the event', tab:'details'});
  ev.talks.forEach(t=>{ if(t.due) L.push({d:t.due, t:'Speaking proposal due: '+(t.title||'a session'), tab:'talks', done:!!t.status && t.status!=='Idea'}); });
  ev.promo.forEach(p=>{ if(p.t) L.push({d:p.due||'', t:p.t, tab:'promo', done:!!p.done, who:p.who}); });
  return L.sort((a,b)=>(a.d||'9999').localeCompare(b.d||'9999')); }
function pTasks(b, ev){
  const B=builtIns(ev);
  if(B.length){ const hd=h('div','ev-sec'); hd.appendChild(h('h3',null,'From the Event')); hd.appendChild(h('span','hint','Registration, speaking proposals and promotion steps. Change these on their own tabs.')); b.appendChild(hd);
    const bx=h('div','ev-bi'); B.forEach(x=>{ const r=btn('ev-due'+(x.done?' done':''), null, ()=>{ collect(); P.panel.tab=x.tab; paintPanel(); }); const n=daysTo(x.d);
      r.appendChild(h('span','dd'+(!x.done && n!=null && n<0?' late':!x.done && n!=null && n<=7?' soon':''), x.done ? 'Done' : x.d ? fmt(x.d) : 'No date'));
      const tx=h('span','tx', x.t); tx.appendChild(h('small',null, [x.who ? first(x.who) : '', x.done || !x.d ? '' : when(n)].filter(Boolean).join(' · '))); r.appendChild(tx); bx.appendChild(r); });
    b.appendChild(bx); }
  const get=rowsSec(b, 'Our Own Tasks', 'Anything else to do for this event. Open ones with a due date show in Coming Up.', 'Add a Task', ev.tasks, t=>{ const r=h('div','ev-row task');
    const c=h('div','ckc'); const dn=chk('Done', t.done); c.appendChild(dn); field(r, ' ', c);
    const w=field(r, 'Task', inp('text', t.t, 'e.g. Order booth carpet')); const who=field(r, 'Owner', sel(teamOpts(), t.who, 'Anyone')); const due=field(r, 'Due', dateField(t.due));
    return {el:r, get:()=>({id:t.id||uid('k'), t:w.value.trim(), who:who.value, due:due.get(), done:dn.box.checked})}; }, ()=>({id:uid('k'), who:me(), done:false}));
  P.panel.get=ev2=>{ ev2.tasks=get(); }; }

/* Panels (CN-024): who is on each panel, filled in from Member 360's people list.
   Member 360 keeps member-360/data/peoplelist for this (read only here): {updated, companies:[{k, n, cid, m, l, p:[[name, title, email]]}]}.
   Read with the signed-in person's own sign-in; never written to, and none of Member 360's flows or keys are used.
   401, 403 (no Member 360 access) or 404 (not written yet): the details are typed in instead. */
const PL={state:'', list:null, at:0, wait:null};
function peopleList(){
  if(PL.state==='ok' && Date.now()-PL.at<30*60e3) return Promise.resolve(PL.list);
  if(PL.state==='none') return Promise.resolve(null);
  if(PL.wait) return PL.wait;
  const R=window.__hqRelay, RS=window.ResourcesSession, tok=RS && RS.token && RS.token(), base=R && R.config && R.config.RELAY_URL;
  if(!base || !tok){ PL.state='none'; return Promise.resolve(null); }
  PL.state='loading';
  PL.wait=fetch(base+'/member-360/data/peoplelist', {method:'GET', cache:'no-store', headers:{'Authorization':'Bearer '+tok}})
    .then(r=>{ if(r.status===401 || r.status===403 || r.status===404){ PL.state='none'; return null; }
      if(!r.ok){ PL.state='error'; return null; }
      return r.json().then(b=>{ const d=b && b.data; const L=[];
        ((d && d.companies)||[]).forEach(c=>{ if(!c) return; (c.p||[]).forEach(x=>{ if(!Array.isArray(x) || !x[0]) return;
          const o={name:String(x[0]||''), title:String(x[1]||''), email:String(x[2]||''), company:String(c.n||''), member:c.m===1, level:String(c.l||''), k:c.k==null?'':String(c.k), cid:c.cid==null?'':String(c.cid)};
          o.hay=[o.name, o.company, o.email, o.title].join(' ').toLowerCase(); L.push(o); }); });
        PL.list=L; PL.at=Date.now(); PL.state='ok'; return L; }); })
    .catch(e=>{ console.error('Member 360 people list', e); PL.state='error'; return null; })
    .then(L=>{ PL.wait=null; return L; });
  return PL.wait; }
function findPeople(q){ const W=String(q||'').toLowerCase().trim().split(/\s+/).filter(Boolean); if(!W.length || !PL.list) return [];
  const out=[]; for(const o of PL.list){ if(W.every(w=>o.hay.indexOf(w)>=0)){ out.push(o); if(out.length>200) break; } }
  const n=W.join(' '); return out.sort((a,b)=>(b.name.toLowerCase().startsWith(n)-a.name.toLowerCase().startsWith(n)) || a.name.localeCompare(b.name)).slice(0,8); }
function m360Note(){ return PL.state==='none' ? 'Member 360 isn’t available, so type the details in.' : PL.state==='error' ? 'Couldn’t reach Member 360 just now, so type the details in.' : PL.state==='loading' ? 'Getting Member 360’s people list…' : ''; }
function pPanels(b, ev){ const st=P.panel;
  const hd=h('div','ev-sec'); hd.appendChild(h('h3',null,'Panels')); hd.appendChild(h('span','hint','Who is on each panel. Find someone in Member 360 to fill in their details, or type them in.')); b.appendChild(hd);
  const note=h('p','ev-m360', m360Note()); b.appendChild(note);
  const dl=h('datalist'); dl.id='ev-prole-list'; PROLE.forEach(x=>dl.appendChild(new Option(x))); b.appendChild(dl);
  const pg=[];
  const redo=fn=>{ collect(); fn(st.ev); st.dirty=true; paintPanel(); };
  ev.panels.forEach((pa, pi)=>{ const box=h('div','ev-pan'); b.appendChild(box);
    const top=h('div','hd'); box.appendChild(top);
    const ti=field(top, 'Panel', inp('text', pa.title, 'e.g. AI in the Mortgage Process'), 'w2'); const dt=field(top, 'Date', dateField(pa.date)); const tm=field(top, 'Time', inp('text', pa.time, 'e.g. 10:30 AM'));
    const nt=field(top, 'Note', inp('text', pa.note, 'The room, the track, who to contact'));
    const rmp=btn('ev-btn warn', 'Remove Panel', ()=>{ if((pa.people||[]).length && !window.confirm('Remove this panel and its people?')) return; redo(E=>{ E.panels.splice(pi,1); }); }); top.appendChild(rmp);
    const rows=h('div','ev-rows'); box.appendChild(rows); const getters=[];
    (pa.people||[]).forEach(x=>{ const r=panRow(x, ()=>{ const i=getters.indexOf(r.get); if(i>=0) getters.splice(i,1); r.el.remove(); markDirty(); }); rows.appendChild(r.el); getters.push(r.get); });
    const ac=h('div','ac'); ac.appendChild(btn('ev-btn', '+ Add a Person', ()=>redo(E=>{ E.panels[pi].people.push({id:uid('pp'), role:E.panels[pi].people.length ? 'Panelist' : 'Moderator'}); }))); box.appendChild(ac);
    pg.push(()=>({id:pa.id||uid('pn'), title:ti.value.trim(), date:dt.get(), time:tm.value.trim(), note:nt.value.trim(), people:getters.map(g=>g())})); });
  const ab=btn('ev-btn', '+ Add a Panel', ()=>redo(E=>{ E.panels.push({id:uid('pn'), title:'', date:'', time:'', people:[{id:uid('pp'), role:'Moderator'}]}); })); ab.style.marginTop='10px'; b.appendChild(ab);
  st.get=ev2=>{ ev2.panels=pg.map(g=>g()); };
  if(ev.panels.length && PL.state!=='ok' && PL.state!=='none') peopleList().then(()=>{ note.textContent=m360Note(); }); }
function panRow(x, onRemove){ const r=h('div','ev-row pp'); let link={k:x.k||'', cid:x.cid||''};
  const fd=h('div','fd'); r.appendChild(fd);
  const fw=h('div','ev-find'); const q=h('input'); q.type='search'; q.placeholder='Find in Member 360: name, company or email'; q.setAttribute('aria-label','Find in Member 360'); q.autocomplete='off';
  const res=h('div','ev-res'); res.setAttribute('role','listbox'); fw.appendChild(q); fw.appendChild(res); fd.appendChild(fw);
  const lk=h('span','ev-lk'); fd.appendChild(lk);
  const n=field(r, 'Name', inp('text', x.name)); const ro=field(r, 'Role on the Panel', inp('text', x.role, 'Pick or type')); ro.setAttribute('list','ev-prole-list'); ro.autocomplete='off';
  const ti=field(r, 'Title', inp('text', x.title)); const co=field(r, 'Company', inp('text', x.company)); const em=field(r, 'Email', inp('email', x.email));
  const cc=h('div','ckc'); const mb=chk('Member', x.member); cc.appendChild(mb); field(r, ' ', cc);
  const rm=btn('rm','×', onRemove); rm.title='Remove'; rm.setAttribute('aria-label','Remove'); r.appendChild(rm);
  function showLink(){ lk.textContent=''; if(!link.k){ lk.hidden=true; return; } lk.hidden=false; lk.appendChild(document.createTextNode('From Member 360'));
    const u=btn(null,'×', ()=>{ link={k:'', cid:''}; showLink(); markDirty(); }); u.title='No longer linked to Member 360 (keeps the details)'; u.setAttribute('aria-label','Unlink from Member 360'); lk.appendChild(u); }
  showLink();
  let hits=[], on=-1;
  function paint(){ res.textContent=''; const v=q.value.trim(); if(!v){ res.classList.remove('open'); return; } res.classList.add('open');
    if(PL.state!=='ok'){ res.appendChild(h('p',null, m360Note() || 'Getting Member 360’s people list…')); return; }
    hits=findPeople(v); if(!hits.length){ res.appendChild(h('p',null,'No one in Member 360 matches. Type the details in below.')); return; }
    hits.forEach((o,i)=>{ const b=btn(i===on?'on':'', o.name); b.setAttribute('role','option'); b.appendChild(h('small',null,[o.title, o.company, o.member?'Member':o.level].filter(Boolean).join(' · ')));
      b.addEventListener('mousedown', e=>e.preventDefault()); b.addEventListener('click', ()=>pickIt(o)); res.appendChild(b); }); }
  function pickIt(o){ n.value=o.name; ti.value=o.title; co.value=o.company; em.value=o.email; mb.box.checked=o.member; link={k:o.k, cid:o.cid};
    q.value=''; res.classList.remove('open'); showLink(); markDirty(); ro.focus(); }
  q.addEventListener('focus', ()=>{ if(PL.state!=='ok' && PL.state!=='none') peopleList().then(paint); });
  ['input','change'].forEach(k=>q.addEventListener(k, e=>e.stopPropagation())); /* searching isn't a change to the event */
  q.addEventListener('input', ()=>{ on=-1; if(PL.state==='ok') paint(); else { paint(); peopleList().then(paint); } });
  q.addEventListener('keydown', e=>{ if(!res.classList.contains('open') || !hits.length) return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); on=(on+(e.key==='ArrowDown'?1:-1)+hits.length)%hits.length; paint(); }
    else if(e.key==='Enter'){ e.preventDefault(); pickIt(hits[on<0?0:on]); } });
  q.addEventListener('blur', ()=>setTimeout(()=>res.classList.remove('open'), 150));
  return {el:r, get:()=>({id:x.id||uid('pp'), name:n.value.trim(), role:ro.value.trim(), title:ti.value.trim(), company:co.value.trim(), email:em.value.trim(), member:mb.box.checked, k:link.k, cid:link.cid})}; }

/* Graphics: uploaded right here; each opens in a new tab */
const thumbs={};
function pGraphics(b, ev){ const st=P.panel;
  const hd=h('div','ev-sec'); hd.appendChild(h('h3',null,'Graphics From the Event')); hd.appendChild(h('span','hint','Logos, speaker cards, banners and social posts the event gives us.')); b.appendChild(hd);
  const dz=h('div','ev-drop'); dz.tabIndex=0; dz.setAttribute('role','button'); const fi=h('input'); fi.type='file'; fi.multiple=true; fi.accept='image/*,application/pdf,.zip,.ppt,.pptx,.ai,.eps,.svg'; fi.hidden=true;
  dz.appendChild(h('b',null,'Drop graphics here')); dz.appendChild(document.createTextNode(' or click to choose files'));
  const up=h('div','ev-up'); b.appendChild(dz); b.appendChild(fi); b.appendChild(up);
  dz.addEventListener('click', ()=>fi.click()); dz.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fi.click(); } });
  ['dragenter','dragover'].forEach(k=>dz.addEventListener(k, e=>{ e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave','drop'].forEach(k=>dz.addEventListener(k, e=>{ e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e=>{ const F=[...((e.dataTransfer && e.dataTransfer.files)||[])]; if(F.length) upload(F); });
  fi.addEventListener('change', ()=>{ const F=[...fi.files]; fi.value=''; if(F.length) upload(F); });
  const gal=h('div','ev-gal'); b.appendChild(gal); const getters=[];
  function put(g){ const c=h('div','ev-g'); const th=btn('th', /\.pdf$/i.test(g.name) ? 'PDF' : (g.name.split('.').pop()||'File').toUpperCase(), ()=>view(g)); th.title='Open '+g.name+' in a new tab'; c.appendChild(th);
    if(/^image\//.test(g.type||'') || /\.(png|jpe?g|gif|webp|svg)$/i.test(g.name)) thumb(g, th);
    const bd=h('div','bd'); const nm=inp('text', g.label||g.name); nm.setAttribute('aria-label','Name'); const us=sel(GUSE, g.use||'Other'); us.setAttribute('aria-label','What it’s for');
    bd.appendChild(nm); bd.appendChild(us); const ac=h('div','ac'); ac.appendChild(btn('ev-btn', 'Open ↗', ()=>view(g)));
    ac.appendChild(btn('ev-btn warn', 'Remove', ()=>{ const i=getters.indexOf(get); if(i>=0) getters.splice(i,1); c.remove(); markDirty(); })); bd.appendChild(ac); c.appendChild(bd); gal.appendChild(c);
    const get=()=>Object.assign({}, g, {label:nm.value.trim()||g.name, use:us.value}); getters.push(get); }
  ev.graphics.forEach(put);
  async function upload(F){ if(!window.__att || !window.__att.upload){ toast('Uploading isn’t available here.'); return; }
    let n=0; for(const f of F){ if(f.size>4*1024*1024){ toast(f.name+' is over 4 MB. Make it smaller, or ask the event for a smaller copy.'); continue; }
      up.textContent='Uploading '+f.name+'…';
      /* MISMO Media reads these (CN-011): it accepts only file ids under receipts/ or attachments/ ('events' isn't a
         storage folder, so they land under receipts/). Keep the graphics fields as they are (add, never rename); if they
         ever move to another folder, post a Change Notice for MISMO Media first. */
      try{ const a=await window.__att.upload(f, 'events'); const g=Object.assign(a, {use:/logo/i.test(f.name)?'Logo':/speaker/i.test(f.name)?'Speaker Card':/banner/i.test(f.name)?'Banner':'Other', label:f.name.replace(/\.[^.]+$/,'')}); put(g); n++; markDirty(); }
      catch(e){ console.error(e); toast('Couldn’t upload '+f.name+'. '+((e && e.message)||'Try again.')); } }
    up.textContent=n ? n+' file'+(n===1?'':'s')+' added. Press Save Changes to keep '+(n===1?'it':'them')+' on the event.' : ''; }
  st.get=ev2=>{ ev2.graphics=getters.map(g=>g()); }; }
function view(g){ try{ if(window.__att && window.__att.view) window.__att.view(g); }catch(e){ toast('Couldn’t open that file.'); } }
async function thumb(g, el){ try{ let u=thumbs[g.id]; if(!u){ const api=window.__expApi; if(!api || !api.attBlob) return; const bl=await api.attBlob(g.id); u=URL.createObjectURL(bl); thumbs[g.id]=u; }
  el.style.backgroundImage='url("'+u+'")'; el.textContent=''; }catch(e){} }

/* ---------- the dashboard tile ---------- */
function tile(el, size){ start(); const box=h('div','ev-tile'); el.appendChild(box);
  if(M.list==null){ box.appendChild(h('div','st-sub','Getting Industry Events…')); return; }
  const Up=live().filter(upcoming).filter(e=>e.status!=='Not Going').sort(byStart); const nx=Up.find(e=>e.status==='Going') || Up[0];
  if(!nx){ box.appendChild(h('div','st-sub','No industry events yet. Open it to add the first one.')); return; }
  const n=daysTo(nx.start); const cd=h('div','cd', n==null ? '—' : n>0 ? String(n) : n===0 ? 'Today' : 'Now'); if(n!=null && n>0) cd.appendChild(h('small',null, n===1?'day':'days')); box.appendChild(cd);
  const t=h('div','nx'); t.appendChild(h('b',null,nx.name)); t.appendChild(h('span',null,[span(nx.start,nx.end), nx.city, nx.status==='Going' ? (nx.people.length ? nx.people.length+' going' : 'Going') : 'Considering'].filter(Boolean).join(' · '))); box.appendChild(t);
  const tall=size==='t'||size==='b', wide=size==='w'||size==='b';
  if(tall || wide){ const ls=h('div','ls'); Up.filter(e=>e!==nx).slice(0, size==='b'?6:tall?4:2).forEach(e=>{ const r=h('div'); r.appendChild(h('b',null, e.start ? fmt(e.start) : 'TBD')); r.appendChild(h('span',null, e.name+(e.status==='Considering'?' (considering)':''))); ls.appendChild(r); }); if(ls.childNodes.length) box.appendChild(ls); }
  const due=dueItems(live(), 30).length; box.appendChild(h('div','st-next', (due ? due+' thing'+(due===1?'':'s')+' due in the next 30 days' : Up.length+' upcoming event'+(Up.length===1?'':'s'))+' · open the list')); }

/* ---------- for Expenses: the events a person is going to, as trips ---------- */
function tripsFor(who){ return live().filter(e=>!e.example && e.status==='Going' && e.people.some(p=>p.who===who)).filter(e=>{ const n=daysTo(endOf(e)); return n==null || n>=-60; })
  .sort(byStart).map(e=>{ const p=e.people.find(x=>x.who===who)||{}; return {trip:e.name, from:p.from||e.start||'', to:p.to||e.end||e.start||''}; }); }

window.__hqEvents={ version:'1.2', page, tile, start, tripsFor, open:openPanel,
  get list(){ return M.list; },
  onChange(f){ M.listeners.push(f); return ()=>{ M.listeners=M.listeners.filter(x=>x!==f); }; },
  redraw: draw,
  _parseDate: parseDate,
  destroy(){ css.remove(); document.removeEventListener('keydown', onKey, true); closePanel(); M.listeners=[]; } };
start();
})();
