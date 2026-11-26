/* MyMISMO Attendee Reports (CN-041, Nov 25, 2026)
   Apple (App Review Guideline 1.2) requires a way for attendees to report offensive content and a timely response from
   the MISMO team. MyMISMO has Report on an attendee's profile and in conversations; the save relay keeps the reports in
   MyMISMO's own private data (relay request 15). Team HQ only shows them and closes or reopens them:
   - GET  <relay>/mymismo/staff/reports   (no summit: every summit's)
          -> { reports: [{ summit, id, about, aboutName, byName, reason, note, at, status: 'open'|'closed', action }], open }
   - POST <relay>/mymismo/staff/reports   { summit, id, status: 'closed'|'open', action }  -> { ok }
   Both with the signed-in person's own staff sign-in. The relay lets in only the people in the mymismo entry's
   alertSenders and answers 403 for anyone else, so Team HQ shows nothing at all (no menu item, no count) unless the
   GET answers 200. Read when Team HQ opens and every 5 minutes while the tab is in view. Team HQ keeps no copy, and
   nothing is emailed. In the Test Copy, Close and Reopen are held back (nothing is sent). */
(function(){
'use strict';
if(window.__hqReports && window.__hqReports.destroy) window.__hqReports.destroy();
const S=window.__S; if(!S) return;
const ROUTE='/mymismo/staff/reports';
const EVERY=5*60e3;
const REASON={harassment:'Harassment', spam:'Spam', inappropriate:'Inappropriate', other:'Other'};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/* state: '' not asked yet, 'loading', 'ok' (route answered 200), 'no' (403/401/404 or anything else: show nothing) */
const R={state:'', reports:[], open:0, at:0, timer:null, wait:null, listeners:[], filter:'open', closing:'', busy:'', err:''};

function h(t,c,x){ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function btn(c,x,f){ const b=h('button',c,x); b.type='button'; if(f) b.addEventListener('click', f); return b; }
const base=()=>{ const X=window.__hqRelay; return (X && X.config && X.config.RELAY_URL) || ''; };
const token=()=>{ const RS=window.ResourcesSession; try{ return (RS && RS.token && RS.token()) || ''; }catch(e){ return ''; } };
const str=(v,n)=>String(v==null?'':v).slice(0,n||300);
function when(at){ const d=new Date(at); if(isNaN(d)) return '';
  const t=d.toLocaleTimeString('en-US',{hour:'numeric', minute:'2-digit'});
  const n=new Date(); const same=d.toDateString()===n.toDateString(); const y=new Date(n); y.setDate(n.getDate()-1);
  if(same) return 'Today, '+t; if(d.toDateString()===y.toDateString()) return 'Yesterday, '+t;
  return MON[d.getMonth()]+' '+d.getDate()+(d.getFullYear()!==n.getFullYear()?', '+d.getFullYear():'')+', '+t; }
const reason=r=>REASON[String(r||'').toLowerCase()] || (r ? String(r).charAt(0).toUpperCase()+String(r).slice(1) : 'Other');
function tell(){ R.listeners.slice().forEach(f=>{ try{ f(); }catch(e){ console.error(e); } }); try{ window.dispatchEvent(new CustomEvent('hq:reports')); }catch(e){} }

function clean(L){ return (Array.isArray(L)?L:[]).filter(x=>x && x.id && x.summit).map(x=>({ summit:str(x.summit,31), id:str(x.id,20), about:str(x.about,60),
  aboutName:str(x.aboutName,120), byName:str(x.byName,120), reason:str(x.reason,40), note:str(x.note,500), at:str(x.at,40),
  status:x.status==='closed'?'closed':'open', action:str(x.action,300) }))
  .sort((a,b)=>String(b.at).localeCompare(String(a.at))); }

function load(){
  if(R.wait) return R.wait;
  const b=base(), t=token();
  if(!b || !t){ /* the sign-in or the relay isn't ready yet: try again shortly, a few times */
    if(R.state!=='ok' && (R.tries=(R.tries||0)+1)<=20) setTimeout(load, 3000); return Promise.resolve(R.state==='ok'); }
  if(!R.state) R.state='loading';
  R.wait=fetch(b+ROUTE, {method:'GET', cache:'no-store', headers:{'Authorization':'Bearer '+t}})
    .then(r=>{ if(r.status!==200){ /* 403: not one of the people the route lets in; 404: not live yet; anything else: hide */
        if(r.status===401 || r.status===403 || r.status===404 || R.state!=='ok'){ R.state='no'; R.reports=[]; R.open=0; }
        else R.err='Couldn’t get the reports just now. They’ll be checked again in a few minutes.';
        return; }
      return r.json().then(d=>{ if(!d || !Array.isArray(d.reports)){ if(R.state!=='ok') R.state='no'; return; } /* not the reports route's answer */
        R.reports=clean(d.reports); R.open=R.reports.filter(x=>x.status==='open').length; R.state='ok'; R.at=Date.now(); R.err=''; }); })
    .catch(e=>{ if(R.state!=='ok') R.state='no'; else R.err='Couldn’t reach the reports just now. They’ll be checked again in a few minutes.'; })
    .then(()=>{ R.wait=null; tell(); return R.state==='ok'; });
  return R.wait; }

function start(){ if(R.timer) return; load();
  R.timer=setInterval(()=>{ if(!document.hidden) load(); }, EVERY);
  document.addEventListener('visibilitychange', onVis); }
function onVis(){ if(!document.hidden && Date.now()-R.at>EVERY) load(); }

/* Close (with a short note of what was done) or Reopen */
function setStatus(x, status, action){
  if(window.__HQ_TEST){ toast('Test Copy: nothing is sent, so the report wasn’t '+(status==='closed'?'closed':'reopened')+'.'); R.closing=''; tell(); return Promise.resolve(false); }
  const b=base(), t=token(); if(!b || !t){ toast('Sign in again to change a report.'); return Promise.resolve(false); }
  R.busy=x.summit+'/'+x.id; tell();
  return fetch(b+ROUTE, {method:'POST', cache:'no-store', headers:{'Authorization':'Bearer '+t, 'Content-Type':'application/json'},
      body:JSON.stringify({summit:x.summit, id:x.id, status, action:str(action,300)})})
    .then(r=>{ if(!r.ok) throw new Error('status '+r.status);
      x.status=status; if(action || status==='closed') x.action=str(action,300); R.open=R.reports.filter(y=>y.status==='open').length; R.closing='';
      toast(status==='closed' ? 'Report closed.' : 'Report reopened.'); return true; })
    .catch(e=>{ console.error('Attendee report', e); toast('That didn’t save. Try again in a moment.'); return false; })
    .then(ok=>{ R.busy=''; tell(); if(ok) load(); return ok; }); }
function toast(m){ if(window.__nxToast) try{ window.__nxToast(m, null); return; }catch(e){} }

/* ---------- the page ---------- */
function page(){
  const pg=h('div','ar');
  if(R.state!=='ok'){ pg.appendChild(h('p','ar-empty', R.state==='loading'||!R.state ? 'Getting the reports…' : 'Attendee Reports aren’t available.')); return pg; }
  const L=R.reports, closed=L.length-R.open;
  const band=h('div','ar-band');
  const fig=(n, t, f)=>{ const b=btn('ar-fig'+(R.filter===f?' on':''), null, ()=>{ R.filter=f; R.closing=''; tell(); }); b.appendChild(h('b',null,String(n))); b.appendChild(h('span',null,t)); band.appendChild(b); };
  fig(R.open, R.open===1?'Open Report':'Open Reports', 'open'); fig(closed, 'Closed', 'closed'); fig(L.length, 'All Reports', 'all');
  const ab=h('div','ar-about'); ab.appendChild(h('b',null,'From MyMISMO')); ab.appendChild(h('span',null,'Attendees report someone from their profile or a conversation. Look into each one, then Close it with a short note of what was done.')); band.appendChild(ab);
  pg.appendChild(band);
  if(R.err) pg.appendChild(h('p','ar-err', R.err));
  const show=L.filter(x=>R.filter==='all' || x.status===R.filter);
  if(!show.length){ pg.appendChild(h('p','ar-empty', R.filter==='open' ? 'No open reports. Nothing is waiting on the team.' : R.filter==='closed' ? 'No closed reports yet.' : 'No reports yet.')); return pg; }
  const list=h('div','ar-list'); pg.appendChild(list);
  show.forEach(x=>list.appendChild(row(x)));
  return pg; }
function row(x){
  const key=x.summit+'/'+x.id, r=h('div','ar-row'+(x.status==='closed'?' done':''));
  const top=h('div','ar-top');
  top.appendChild(h('span','ar-st '+x.status, x.status==='closed'?'Closed':'Open'));
  top.appendChild(h('span','ar-rs', reason(x.reason)));
  top.appendChild(h('span','ar-sm', x.summit));
  top.appendChild(h('span','ar-at', when(x.at)));
  r.appendChild(top);
  const who=h('div','ar-who');
  const a=h('div'); a.appendChild(h('small',null,'About')); a.appendChild(h('b',null, x.aboutName || 'An attendee')); who.appendChild(a);
  const by=h('div'); by.appendChild(h('small',null,'Sent By')); by.appendChild(h('b',null, x.byName || 'An attendee')); who.appendChild(by);
  r.appendChild(who);
  r.appendChild(h('p','ar-note'+(x.note?'':' none'), x.note ? x.note : 'No note given.'));
  if(x.action) { const d=h('p','ar-did'); d.appendChild(h('b',null,'What Was Done: ')); d.append(x.action); r.appendChild(d); }
  const ac=h('div','ar-ac'); r.appendChild(ac);
  const busy=R.busy===key;
  if(x.status==='open' && R.closing===key){
    const f=h('div','ar-close'); const lb=h('label',null,'What Was Done'); const inp=h('input'); inp.type='text'; inp.maxLength=300; inp.placeholder='e.g. Spoke with the attendee; removed the message'; inp.setAttribute('aria-label','What was done');
    lb.appendChild(inp); f.appendChild(lb);
    const go=btn('ar-btn pri', busy?'Closing…':'Close Report', ()=>{ const v=inp.value.trim(); if(!v){ inp.focus(); inp.classList.add('need'); return; } setStatus(x, 'closed', v); });
    go.disabled=busy; f.appendChild(go); f.appendChild(btn('ar-btn', 'Cancel', ()=>{ R.closing=''; tell(); }));
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); go.click(); } });
    ac.appendChild(f); setTimeout(()=>{ if(inp.isConnected) inp.focus(); }, 0); }
  else if(x.status==='open') ac.appendChild(btn('ar-btn pri', 'Close…', ()=>{ R.closing=key; tell(); }));
  else { const b=btn('ar-btn', busy?'Reopening…':'Reopen', ()=>setStatus(x, 'open', x.action)); b.disabled=busy; ac.appendChild(b); }
  return r; }

const css=h('style'); css.id='hq-reports';
css.textContent=`
.ar{font-size:14.5px;line-height:1.5;color:var(--ink);max-width:1200px;margin:0 auto;padding:16px clamp(16px,2.4vw,32px) 28px;box-sizing:border-box}
.ar-band{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(220px,2fr);gap:10px;padding:14px;border-radius:14px;color:#fff;background:linear-gradient(140deg,#06202f,#0d314c 55%,#14486e)}
.ar-fig{font:inherit;text-align:left;color:inherit;display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(116,191,235,.22);cursor:pointer}
.ar-fig:hover,.ar-fig.on{border-color:#74bfeb;background:rgba(116,191,235,.16)}
.ar-fig b{font-size:28px;font-weight:700;line-height:1.05;font-variant-numeric:tabular-nums}
.ar-fig span{font-size:12px;font-weight:600;color:rgba(255,255,255,.78);white-space:nowrap}
.ar-about{display:flex;flex-direction:column;justify-content:center;gap:2px;padding:6px 10px;font-size:12.5px;color:rgba(255,255,255,.8)}
.ar-about b{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#74bfeb}
.ar-list{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.ar-row{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:12px 14px}
.ar-row.done{opacity:.85}
.ar-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-2)}
.ar-st{font-weight:700;font-size:11.5px;padding:2px 8px;border-radius:4px;background:#fde7e4;color:#a1281a}
.ar-st.closed{background:var(--surface-2,#eef2f5);color:var(--ink-2)}
.ar-rs{font-weight:700;color:var(--ink)}
.ar-at{margin-left:auto}
.ar-who{display:flex;gap:28px;flex-wrap:wrap;margin-top:8px}
.ar-who small{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
.ar-who b{font-size:15px}
.ar-note{margin:8px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.ar-note.none{color:var(--ink-2);font-style:italic}
.ar-did{margin:6px 0 0;font-size:13.5px;color:var(--ink-2);overflow-wrap:anywhere}.ar-did b{color:var(--ink)}
.ar-ac{display:flex;justify-content:flex-end;margin-top:8px}
.ar-close{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;width:100%}
.ar-close label{flex:1 1 260px;display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:700;color:var(--ink-2)}
.ar-close input{font:inherit;font-size:14px;height:34px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);padding:0 10px;min-width:0}
.ar-close input.need{border-color:var(--bad,#b42318)}
.ar-btn{display:inline-flex;align-items:center;height:34px;border:1px solid var(--border);background:var(--surface);color:var(--ink);font:inherit;font-size:12.5px;font-weight:700;padding:0 12px;border-radius:6px;cursor:pointer;white-space:nowrap}
.ar-btn.pri{background:var(--navy,#0d314c);border-color:var(--navy,#0d314c);color:#fff}
:root[data-theme="dark"] .ar-btn.pri{background:#74bfeb;border-color:#74bfeb;color:#06202f}
.ar-btn:disabled{opacity:.6;cursor:default}
.ar-empty{color:var(--ink-2);margin:18px 0}
.ar-err{color:var(--bad,#b42318);font-weight:600;margin:10px 0 0}
@media (max-width:760px){ .ar-band{grid-template-columns:repeat(3,minmax(0,1fr))} .ar-about{grid-column:1/-1} .ar-at{margin-left:0;width:100%} }
`;
document.head.appendChild(css);

window.__hqReports={ version:'1.0', page, start, load,
  ok:()=>R.state==='ok', get state(){ return R.state; }, get open(){ return R.state==='ok' ? R.open : 0; }, get list(){ return R.reports.slice(); },
  onChange(f){ R.listeners.push(f); return ()=>{ R.listeners=R.listeners.filter(x=>x!==f); }; },
  _set(L){ R.reports=clean(L); R.open=R.reports.filter(x=>x.status==='open').length; R.state='ok'; tell(); },
  destroy(){ css.remove(); if(R.timer) clearInterval(R.timer); R.timer=null; document.removeEventListener('visibilitychange', onVis); R.listeners=[]; } };
start();
})();
