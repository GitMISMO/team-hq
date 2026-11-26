/* MyMISMO: MISMO Trivia (CN-043, Nov 25, 2026)
   Team HQ is MyMISMO's home for the MISMO team's year-round work. MyMISMO's save relay (relay request 15) keeps the
   trivia in MyMISMO's own private data. Team HQ only shows it and sets the quarterly championship's window:
   - GET  <relay>/mymismo/staff/trivia
          -> { month, quarter,
               boards:   [{ month, players, top: [{ rank, name, score, right }] }]      (this month and the three before, top 10)
               quarters: [{ quarter, finalists: [{ name, month }], standings: [{ name, total, played }] | null }]  (this quarter and the last)
               champ:    { quarter, opens, closes, minutes, open } | null }
   - POST <relay>/mymismo/staff/trivia   { champ: { quarter, opens, closes, minutes } }  (champ: null clears it)  -> { ok, champ }
   Both with the signed-in person's own staff sign-in. The relay lets in only the people in the mymismo entry's alertSenders
   (403 for anyone else; 404 until request 15 is deployed and trivia is switched on), so Team HQ shows nothing at all unless
   the GET answers 200. Read when Team HQ opens, every 15 minutes while the tab is in view, and when the page is opened.
   Team HQ keeps no copy, and nothing is emailed. In the Test Copy, Save and Clear are held back (nothing is sent). */
(function(){
'use strict';
if(window.__hqTrivia && window.__hqTrivia.destroy) window.__hqTrivia.destroy();
const S=window.__S; if(!S) return;
const ROUTE='/mymismo/staff/trivia';
const EVERY=15*60e3;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/* state: '' not asked yet, 'loading', 'ok' (route answered 200), 'no' (403/401/404 or anything else: show nothing) */
const T={state:'', d:null, at:0, timer:null, wait:null, listeners:[], busy:false, err:'', formErr:'', form:null};

function h(t,c,x){ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function btn(c,x,f){ const b=h('button',c,x); b.type='button'; if(f) b.addEventListener('click', f); return b; }
const base=()=>{ const X=window.__hqRelay; return (X && X.config && X.config.RELAY_URL) || ''; };
const token=()=>{ const RS=window.ResourcesSession; try{ return (RS && RS.token && RS.token()) || ''; }catch(e){ return ''; } };
const str=(v,n)=>String(v==null?'':v).slice(0,n||120);
const num=v=>{ const n=Number(v); return isFinite(n) ? n : 0; };
const MONTH=/^\d{4}-(0[1-9]|1[0-2])$/, QUARTER=/^\d{4}-Q[1-4]$/;
function tell(){ T.listeners.slice().forEach(f=>{ try{ f(); }catch(e){ console.error(e); } }); try{ window.dispatchEvent(new CustomEvent('hq:trivia')); }catch(e){} }

/* 2026-11 -> November 2026; 2026-Q4 -> Q4 2026 */
const monthName=m=>MONTH.test(m) ? MONTHS[Number(m.slice(5))-1]+' '+m.slice(0,4) : str(m,20);
const monthShort=m=>MONTH.test(m) ? MON[Number(m.slice(5))-1]+' '+m.slice(0,4) : str(m,20);
const qName=q=>QUARTER.test(q) ? q.slice(5)+' '+q.slice(0,4) : str(q,20);
const prevQ=q=>{ const y=Number(q.slice(0,4)), k=Number(q.slice(6)); return k===1 ? (y-1)+'-Q4' : y+'-Q'+(k-1); };
const nextQ=q=>{ const y=Number(q.slice(0,4)), k=Number(q.slice(6)); return k===4 ? (y+1)+'-Q1' : y+'-Q'+(k+1); };
function when(iso){ const d=new Date(iso); if(isNaN(d)) return '';
  return d.toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric', year:'numeric'})+', '+d.toLocaleTimeString('en-US',{hour:'numeric', minute:'2-digit'}); }
/* an ISO time -> the value a datetime-local box wants, in this computer's time */
function local(iso){ const d=new Date(iso); if(isNaN(d)) return ''; const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes()); }

function clean(d){
  if(!d || typeof d!=='object' || !Array.isArray(d.boards)) return null;
  const boards=d.boards.filter(b=>b && MONTH.test(b.month)).map(b=>({ month:b.month, players:Math.max(0, Math.round(num(b.players))),
    top:(Array.isArray(b.top)?b.top:[]).filter(x=>x && x.name).slice(0,10).map((x,i)=>({ rank:Math.round(num(x.rank))||i+1, name:str(x.name,80), score:Math.round(num(x.score)), right:Math.round(num(x.right)) })) }))
    .sort((a,b)=>b.month.localeCompare(a.month));
  const quarters=(Array.isArray(d.quarters)?d.quarters:[]).filter(q=>q && QUARTER.test(q.quarter)).map(q=>({ quarter:q.quarter,
    finalists:(Array.isArray(q.finalists)?q.finalists:[]).filter(f=>f && f.name).map(f=>({ name:str(f.name,80), month:MONTH.test(f.month)?f.month:'' })),
    standings:Array.isArray(q.standings) ? q.standings.filter(s=>s && s.name).map(s=>({ name:str(s.name,80), total:Math.round(num(s.total)), played:!!s.played })).sort((a,b)=>b.total-a.total) : null }))
    .sort((a,b)=>b.quarter.localeCompare(a.quarter));
  const c=d.champ, champ=c && QUARTER.test(c.quarter) && !isNaN(new Date(c.opens)) && !isNaN(new Date(c.closes))
    ? { quarter:c.quarter, opens:String(c.opens), closes:String(c.closes), minutes:Math.round(num(c.minutes)), open:!!c.open } : null;
  const month=MONTH.test(d.month) ? d.month : (boards[0] && boards[0].month) || '';
  const quarter=QUARTER.test(d.quarter) ? d.quarter : (month ? month.slice(0,4)+'-Q'+Math.ceil(Number(month.slice(5))/3) : '');
  return { month, quarter, boards, quarters, champ }; }

function load(){
  if(T.wait) return T.wait;
  const b=base(), t=token();
  if(!b || !t){ /* the sign-in or the relay isn't ready yet: try again shortly, a few times */
    if(T.state!=='ok' && (T.tries=(T.tries||0)+1)<=20) setTimeout(load, 3000); return Promise.resolve(T.state==='ok'); }
  if(!T.state) T.state='loading';
  T.wait=fetch(b+ROUTE, {method:'GET', cache:'no-store', headers:{'Authorization':'Bearer '+t}})
    .then(r=>{ if(r.status!==200){ /* 403: not one of the people the route lets in; 404: not live yet; anything else: hide */
        if(r.status===401 || r.status===403 || r.status===404 || T.state!=='ok'){ T.state='no'; T.d=null; }
        else T.err='Couldn’t get MISMO Trivia just now. It will be checked again in a few minutes.';
        return; }
      return r.json().then(d=>{ const c=clean(d); if(!c){ if(T.state!=='ok') T.state='no'; return; } /* not the trivia route's answer */
        T.d=c; T.state='ok'; T.at=Date.now(); T.err=''; }); })
    .catch(e=>{ if(T.state!=='ok') T.state='no'; else T.err='Couldn’t reach MISMO Trivia just now. It will be checked again in a few minutes.'; })
    .then(()=>{ T.wait=null; tell(); return T.state==='ok'; });
  return T.wait; }

function start(){ if(T.timer) return; load();
  T.timer=setInterval(()=>{ if(!document.hidden) load(); }, EVERY);
  document.addEventListener('visibilitychange', onVis); }
function onVis(){ if(!document.hidden && Date.now()-T.at>EVERY) load(); }
function fresh(){ if(T.state==='ok' && Date.now()-T.at>60e3) load(); }
function toast(m){ if(window.__nxToast) try{ window.__nxToast(m, null); return; }catch(e){} }

/* Set (or clear, with null) the championship window */
function setChamp(c){
  if(window.__HQ_TEST){ toast('Test Copy: nothing is sent, so the championship wasn’t '+(c?'saved':'cleared')+'.'); return Promise.resolve(false); }
  const b=base(), t=token(); if(!b || !t){ toast('Sign in again to set the championship.'); return Promise.resolve(false); }
  T.busy=true; T.formErr=''; tell();
  return fetch(b+ROUTE, {method:'POST', cache:'no-store', headers:{'Authorization':'Bearer '+t, 'Content-Type':'application/json'}, body:JSON.stringify({champ:c})})
    .then(r=>r.json().catch(()=>({})).then(d=>{ if(!r.ok){ const p=d && Array.isArray(d.problems) && d.problems[0]; throw new Error(p || ('status '+r.status)); } return d; }))
    .then(d=>{ if(T.d) T.d.champ=d && d.champ ? clean({boards:[], champ:d.champ}).champ : null; T.form=null; toast(c ? 'Championship saved.' : 'Championship cleared.'); return true; })
    .catch(e=>{ console.error('MISMO Trivia', e); T.formErr=/^status /.test(e.message) ? 'That didn’t save. Try again in a moment.' : e.message; return false; })
    .then(ok=>{ T.busy=false; tell(); if(ok) load(); return ok; }); }

/* ---------- the page ---------- */
function page(){
  const pg=h('div','tv'); fresh();
  if(T.state!=='ok' || !T.d){ pg.appendChild(h('p','tv-empty', T.state==='loading'||!T.state ? 'Getting MISMO Trivia…' : 'MISMO Trivia isn’t available.')); return pg; }
  const D=T.d, now=D.boards.find(b=>b.month===D.month), done=D.boards.filter(b=>b.month!==D.month);
  const thisQ=D.quarters.find(q=>q.quarter===D.quarter), lastQ=D.quarters.find(q=>q.quarter!==D.quarter);
  /* the figures */
  const band=h('div','tv-band');
  const fig=(n, t)=>{ const b=h('div','tv-fig'); b.appendChild(h('b',null,String(n))); b.appendChild(h('span',null,t)); band.appendChild(b); };
  fig(now ? now.players : 0, 'Players in '+(MONTHS[Number(D.month.slice(5))-1]||'This Month'));
  const lw=done[0] && done[0].top[0]; fig(lw ? lw.name : 'None', (done[0] ? MONTHS[Number(done[0].month.slice(5))-1] : 'Last Month')+' Winner');
  fig(thisQ ? thisQ.finalists.length+' of 3' : '0 of 3', qName(D.quarter)+' Finalists');
  fig(D.champ ? (D.champ.open ? 'Open Now' : qName(D.champ.quarter)) : 'Not Set', 'Championship');
  const ab=h('div','tv-about'); ab.appendChild(h('b',null,'From MyMISMO')); ab.appendChild(h('span',null,'Ten questions a round, scored on right answers and speed. Each month’s #1 is that month’s winner; the quarter’s three monthly winners play the championship.')); band.appendChild(ab);
  pg.appendChild(band);
  if(T.err) pg.appendChild(h('p','tv-err', T.err));

  /* Monthly Winners: each finished month's #1, then its top 10 */
  pg.appendChild(h('h2','tv-h','Monthly Winners'));
  const wins=h('div','tv-wins'); pg.appendChild(wins);
  done.forEach(b=>{ const c=h('div','tv-win'+(b.top[0]?'':' none'));
    c.appendChild(h('small',null,monthName(b.month)));
    c.appendChild(h('b',null, b.top[0] ? b.top[0].name : 'No winner'));
    c.appendChild(h('span',null, b.top[0] ? b.top[0].score.toLocaleString('en-US')+' points, '+b.top[0].right+' of 10 right' : 'Nobody played'));
    wins.appendChild(c); });
  if(!done.length) wins.appendChild(h('p','tv-empty','No finished months yet.'));

  pg.appendChild(h('h2','tv-h','Top 10 Each Month'));
  const boards=h('div','tv-boards'); pg.appendChild(boards);
  D.boards.forEach(b=>boards.appendChild(board(b, b.month===D.month)));

  /* the championship: this quarter's finalists and, once played, the standings */
  pg.appendChild(h('h2','tv-h','Quarterly Championship'));
  const qs=h('div','tv-qs'); pg.appendChild(qs);
  [thisQ, lastQ].forEach(q=>{ if(q) qs.appendChild(quarter(q, q.quarter===D.quarter)); });
  if(!D.quarters.length) qs.appendChild(h('p','tv-empty','No finalists yet.'));

  pg.appendChild(champForm(D));
  return pg; }

function board(b, live){
  const c=h('div','tv-board');
  const top=h('div','tv-bt'); top.appendChild(h('b',null,monthName(b.month))); top.appendChild(h('span',null,(live?'So far · ':'')+b.players+(b.players===1?' player':' players'))); c.appendChild(top);
  if(!b.top.length){ c.appendChild(h('p','tv-none','Nobody has played yet.')); return c; }
  const t=h('table','tv-t'); const hd=h('tr'); ['#','Name','Points','Right'].forEach(x=>hd.appendChild(h('th',null,x))); const th=h('thead'); th.appendChild(hd); t.appendChild(th);
  const tb=h('tbody'); b.top.forEach(x=>{ const r=h('tr', x.rank===1 && !live ? 'win' : ''); r.appendChild(h('td',null,String(x.rank))); r.appendChild(h('td',null,x.name));
    r.appendChild(h('td',null,x.score.toLocaleString('en-US'))); r.appendChild(h('td',null,x.right+'/10')); tb.appendChild(r); });
  t.appendChild(tb); c.appendChild(t); return c; }

function quarter(q, current){
  const c=h('div','tv-q');
  const top=h('div','tv-bt'); top.appendChild(h('b',null,qName(q.quarter)+' Championship')); top.appendChild(h('span',null,current?'This quarter':'Last quarter')); c.appendChild(top);
  c.appendChild(h('small','tv-sub','Finalists'));
  if(!q.finalists.length) c.appendChild(h('p','tv-none', current ? 'None yet. Each month’s winner joins when the month ends.' : 'No finalists.'));
  else { const ul=h('ul','tv-fin'); q.finalists.forEach(f=>{ const li=h('li'); li.appendChild(h('b',null,f.name)); li.appendChild(h('span',null, f.month ? monthName(f.month)+' winner' : 'Finalist')); ul.appendChild(li); }); c.appendChild(ul); }
  c.appendChild(h('small','tv-sub','Standings'));
  if(!q.standings) c.appendChild(h('p','tv-none','Not played yet.'));
  else { const t=h('table','tv-t'); const hd=h('tr'); ['#','Name','Total',''].forEach(x=>hd.appendChild(h('th',null,x))); const th=h('thead'); th.appendChild(hd); t.appendChild(th);
    const tb=h('tbody'); q.standings.forEach((s,i)=>{ const r=h('tr', i===0 && s.played ? 'win' : ''); r.appendChild(h('td',null,String(i+1))); r.appendChild(h('td',null,s.name));
      r.appendChild(h('td',null,s.total.toLocaleString('en-US'))); r.appendChild(h('td','tv-pl', s.played?'Played':'Hasn’t played')); tb.appendChild(r); });
    t.appendChild(tb); c.appendChild(t); }
  return c; }

function champForm(D){
  const c=h('div','tv-set'); c.appendChild(h('h2','tv-h','Set the Championship'));
  const cur=D.champ;
  const p=h('p','tv-now');
  if(cur){ p.appendChild(h('b',null,qName(cur.quarter)+': ')); p.append('opens '+when(cur.opens)+', closes '+when(cur.closes)+', '+cur.minutes+' minutes to play. ');
    p.appendChild(h('b',null, cur.open ? 'Open now.' : (Date.now()<Date.parse(cur.opens) ? 'Not open yet.' : 'Closed.'))); }
  else p.append('No championship is set. Pick the quarter, when finalists can start, when it closes and how long each finalist has to play.');
  c.appendChild(p);
  if(!T.form) T.form={ quarter:cur ? cur.quarter : prevQ(D.quarter), opens:cur ? local(cur.opens) : '', closes:cur ? local(cur.closes) : '', minutes:cur ? String(cur.minutes) : '15' };
  const F=T.form, f=h('form','tv-form'); f.setAttribute('autocomplete','off');
  const field=(label, el)=>{ const l=h('label',null,label); l.appendChild(el); f.appendChild(l); return el; };
  const qs=h('select'); const opts=[prevQ(D.quarter), D.quarter, nextQ(D.quarter)]; if(cur && opts.indexOf(cur.quarter)<0) opts.unshift(cur.quarter);
  opts.forEach(q=>{ const o=h('option',null,qName(q)+(q===D.quarter?' (this quarter)':q===prevQ(D.quarter)?' (last quarter)':q===nextQ(D.quarter)?' (next quarter)':'')); o.value=q; qs.appendChild(o); });
  qs.value=F.quarter; qs.addEventListener('change', ()=>{ F.quarter=qs.value; }); field('Quarter', qs);
  const op=h('input'); op.type='datetime-local'; op.value=F.opens; op.addEventListener('input', ()=>{ F.opens=op.value; }); field('Opens', op);
  const cl=h('input'); cl.type='datetime-local'; cl.value=F.closes; cl.addEventListener('input', ()=>{ F.closes=cl.value; }); field('Closes', cl);
  const mn=h('input'); mn.type='number'; mn.min='1'; mn.max='120'; mn.step='1'; mn.value=F.minutes; mn.addEventListener('input', ()=>{ F.minutes=mn.value; }); field('Minutes to Play', mn);
  const go=btn('tv-btn pri', T.busy ? 'Saving…' : 'Save Championship'); go.type='submit'; go.disabled=T.busy; f.appendChild(go);
  if(cur){ const clr=btn('tv-btn', 'Clear', ()=>{ if(confirm('Clear the '+qName(cur.quarter)+' championship? Finalists won’t be able to play until it’s set again.')) setChamp(null); }); clr.disabled=T.busy; f.appendChild(clr); }
  f.addEventListener('submit', e=>{ e.preventDefault();
    const o=new Date(op.value), cz=new Date(cl.value), m=Number(mn.value);
    [op,cl,mn].forEach(x=>x.classList.remove('need'));
    let bad='';
    if(!op.value || isNaN(o)){ bad='Pick when it opens.'; op.classList.add('need'); }
    else if(!cl.value || isNaN(cz)){ bad='Pick when it closes.'; cl.classList.add('need'); }
    else if(cz<=o){ bad='It has to close after it opens.'; cl.classList.add('need'); }
    else if(!(m>=1 && m<=120 && Math.round(m)===m)){ bad='Minutes to play is a whole number from 1 to 120.'; mn.classList.add('need'); }
    if(bad){ T.formErr=bad; const er=c.querySelector('.tv-err'); if(er) er.textContent=bad; else c.appendChild(h('p','tv-err',bad)); return; }
    setChamp({ quarter:qs.value, opens:o.toISOString(), closes:cz.toISOString(), minutes:m }); });
  c.appendChild(f);
  c.appendChild(h('p','tv-hint','Times are in this computer’s time zone. Each finalist plays once, on their own phone, any time the championship is open.'));
  if(T.formErr) c.appendChild(h('p','tv-err', T.formErr));
  return c; }

const css=h('style'); css.id='hq-trivia';
css.textContent=`
.tv{font-size:14.5px;line-height:1.5;color:var(--ink);max-width:1200px;margin:0 auto;padding:16px clamp(16px,2.4vw,32px) 28px;box-sizing:border-box}
.tv-band{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) minmax(220px,1.6fr);gap:10px;padding:14px;border-radius:14px;color:#fff;background:linear-gradient(140deg,#06202f,#0d314c 55%,#14486e)}
.tv-fig{display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(116,191,235,.22)}
.tv-fig b{font-size:22px;font-weight:700;line-height:1.15;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tv-fig span{font-size:12px;font-weight:600;color:rgba(255,255,255,.78);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-about{display:flex;flex-direction:column;justify-content:center;gap:2px;padding:6px 10px;font-size:12.5px;color:rgba(255,255,255,.8)}
.tv-about b{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#74bfeb}
.tv-h{font-size:16px;font-weight:700;margin:20px 0 8px}
.tv-wins{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.tv-win{border:1px solid var(--border);border-left:4px solid #E8833A;border-radius:10px;background:var(--surface);padding:10px 14px;display:flex;flex-direction:column;gap:1px;min-width:0}
.tv-win.none{border-left-color:var(--border)}
.tv-win small,.tv-sub{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
.tv-win b{font-size:18px;overflow-wrap:anywhere}.tv-win span{font-size:12.5px;color:var(--ink-2)}
.tv-boards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.tv-qs{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}
.tv-board,.tv-q{border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:10px 14px;min-width:0}
.tv-bt{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px}.tv-bt b{font-size:15px}.tv-bt span{font-size:12px;color:var(--ink-2)}
.tv-sub{margin-top:8px}
.tv-t{width:100%;border-collapse:collapse;font-size:13.5px;font-variant-numeric:tabular-nums}
.tv-t th{text-align:left;font-size:11px;font-weight:700;color:var(--ink-2);padding:3px 6px;border-bottom:1px solid var(--border)}
.tv-t td{padding:3px 6px;border-bottom:1px solid var(--border);overflow-wrap:anywhere}
.tv-t td:first-child,.tv-t th:first-child{width:28px;white-space:nowrap;color:var(--ink-2)}
.tv-t tr.win td{font-weight:700;background:rgba(232,131,58,.1)}
.tv-pl{font-size:12px;color:var(--ink-2)}
.tv-fin{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:3px}
.tv-fin li{display:flex;justify-content:space-between;gap:10px}.tv-fin span{font-size:12.5px;color:var(--ink-2)}
.tv-none{margin:4px 0;color:var(--ink-2);font-style:italic;font-size:13px}
.tv-set{margin-top:6px}
.tv-now{margin:0 0 8px}
.tv-form{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:12px 14px}
.tv-form label{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:700;color:var(--ink-2)}
.tv-form select,.tv-form input{font:inherit;font-size:14px;height:34px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);padding:0 8px;min-width:0;box-sizing:border-box}
.tv-form input[type=number]{width:90px}
.tv-form .need{border-color:var(--bad,#b42318)}
.tv-btn{display:inline-flex;align-items:center;height:34px;border:1px solid var(--border);background:var(--surface);color:var(--ink);font:inherit;font-size:12.5px;font-weight:700;padding:0 12px;border-radius:6px;cursor:pointer;white-space:nowrap}
.tv-btn.pri{background:var(--navy,#0d314c);border-color:var(--navy,#0d314c);color:#fff}
:root[data-theme="dark"] .tv-btn.pri{background:#74bfeb;border-color:#74bfeb;color:#06202f}
.tv-btn:disabled{opacity:.6;cursor:default}
.tv-hint{font-size:12.5px;color:var(--ink-2);margin:6px 0 0}
.tv-empty{color:var(--ink-2);margin:18px 0}
.tv-err{color:var(--bad,#b42318);font-weight:600;margin:8px 0 0}
@media (max-width:900px){ .tv-band{grid-template-columns:repeat(2,minmax(0,1fr))} .tv-about{grid-column:1/-1} .tv-qs{grid-template-columns:1fr} }
`;
document.head.appendChild(css);

window.__hqTrivia={ version:'1.0', page, start, load,
  ok:()=>T.state==='ok', get state(){ return T.state; }, get data(){ return T.d; },
  onChange(f){ T.listeners.push(f); return ()=>{ T.listeners=T.listeners.filter(x=>x!==f); }; },
  _set(d){ T.d=clean(d); T.state=T.d?'ok':'no'; T.at=Date.now(); tell(); },
  destroy(){ css.remove(); if(T.timer) clearInterval(T.timer); T.timer=null; document.removeEventListener('visibilitychange', onVis); T.listeners=[]; } };
start();
})();
