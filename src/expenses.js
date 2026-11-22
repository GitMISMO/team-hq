/* Expenses, rebuilt as one module (started Nov 21, 2026).
   Replaces the original Expenses page in index.html (vExpenses, expRow, editExp) and its four add-ons
   (expinbox.js, mileage.js, exporg.js, expdone.js). Everything Expenses does is here: who sees what, the page,
   the editor with mileage, the MBA travel policy, trips, receipts snapped or emailed to expense@, sending a trip
   to whoever enters it, Ready to Enter, the downloads, and saving that waits out a lost signal.
   Until Jonna OKs it, it only runs when Team HQ is opened with ?exp=new (remembered for that tab; ?exp=old
   turns it off). Everyone else keeps the original page and add-ons, which step aside when this one is on.
   The rules, in plain words, are in DEVELOPING.md under "Expenses Rebuild". */
(function(){
'use strict';
const LIVE=false;                         /* true once Jonna OKs the new Expenses */
const GATE='tools:team-hq:exp2';
let on=LIVE;
try{ const q=new URLSearchParams(location.search).get('exp');
  if(q==='new') sessionStorage.setItem(GATE,'1'); else if(q==='old') sessionStorage.removeItem(GATE);
  if(sessionStorage.getItem(GATE)==='1') on=true; if(q==='old') on=false; }catch(e){}
window.__exp2={on:on, ready:false, version:'2.0'};
if(!on) return;
const S=window.__S, root=document.getElementById('app-expenses');
if(!S || !root) return;

/*LOGIC>*/
/* ---------- the rules (no page, no saving: these are tested on their own) ---------- */
const X=(function(){
  const CATS=['Airfare','Baggage Fees','Gasoline','Hotel/Lodging','Meal Trvl - Breakfast','Meal Trvl - Snack','Meal Trvl - Lunch',
    'Meal Trvl - Dinner','Membership Dues','Metro / Bus','Mileage','Parking','Taxi/Uber/Lyft','Tolls','Train'];   /* DataBasics categories */
  /* MBA travel policy, November 2026 */
  const MEAL_CAP={'Meal Trvl - Breakfast':25,'Meal Trvl - Lunch':40,'Meal Trvl - Dinner':60,'Meal Trvl - Snack':15};
  const DAY_CAP=140, RCPT_AT=15;
  /* IRS business mileage rate: [first day it applies, dollars a mile], newest first */
  const RATES=[['2026-07-01',0.76],['2026-01-01',0.725],['2025-01-01',0.70],['2024-01-01',0.67]];
  const NOTRIP='No Trip Name Yet', DAY=864e5, MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  /* who sees everyone's, and who enters whose: Jonna enters her own (Finalize) and Jonathan's; Vanessa the rest and her own */
  const SEE_ALL=['jonna','vanessa'], PROC='vanessa', ROUTE={jonathan:'jonna', jonna:'jonna'}, SELF_FIN={jonna:1};

  const num=v=>{ const n=Number(v); return isFinite(n) ? n : 0; };
  const money=n=>'$'+num(n).toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
  const isMeal=c=>/^Meal Trvl/.test(c||'');
  const day=v=>{ const s=String(v||'').slice(0,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; const t=Date.parse(s+'T12:00:00'); return isNaN(t) ? null : t; };
  const iso=t=>{ const d=new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  const short=t=>{ const d=new Date(t); return MON[d.getMonth()]+' '+d.getDate(); };
  const span=(a,b)=>!a ? '' : (!b || a===b) ? short(a) : short(a)+' – '+short(b);
  const slug=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'trip';

  function rateFor(d){ const s=day(d) ? String(d).slice(0,10) : iso(Date.now());
    for(const [from, r] of RATES) if(s>=from) return r; return RATES[RATES.length-1][1]; }
  const rateTxt=r=>'$'+(Math.round(r*1000)%10 ? r.toFixed(3) : r.toFixed(2));
  const mileAmt=(miles, d)=>Math.round(num(miles)*rateFor(d)*100)/100;
  const MILE_RE=/Mileage:\s*([\d.,]+)\s*miles?\b[^<\n]*/i;
  function milesOf(e){ if(num(e.miles)>0) return num(e.miles); const m=MILE_RE.exec(String(e.notes||'')); return m ? num(m[1].replace(/,/g,'')) : 0; }
  const mileLine=(miles, d)=>'Mileage: '+miles+' miles at '+rateTxt(rateFor(d))+' a mile (IRS rate)';
  /* the notes with the mileage line at the top (or taken out when miles is 0) */
  function withMileLine(notes, miles, d){
    let t=String(notes||'').replace(/<div>\s*Mileage:\s*[\d.,]+\s*miles?\b[^<]*<\/div>/i,'').replace(/(^|<br>|\n)\s*Mileage:\s*[\d.,]+\s*miles?\b[^<\n]*(<br>|\n)?/i,'$1').replace(/^(<br>|\s)+/,'');
    if(!(num(miles)>0)) return t;
    const html=/<[a-z][\s\S]*>/i.test(t);
    return mileLine(miles, d)+(t.trim() ? (html ? '<br>' : '\n')+t : '');
  }

  /* a receipt is there (a file, one waiting for a signal, or the box ticked); mileage needs none */
  const hasRcpt=e=>!!(e.asset || e.rcptPending || e.receipt);
  const needsRcpt=e=>e.cat!=='Mileage' && num(e.amt)>=RCPT_AT;
  /* what still has to be filled in before it can be entered */
  function missing(e){ const m=[];
    if(!e.name) m.push('Expense Name'); if(!e.cat) m.push('Expense Type'); if(!(num(e.amt)>0)) m.push('Amount'); if(!day(e.date)) m.push('Expense Date');
    return m; }
  /* every policy flag on one expense. Flags only: nothing is ever blocked. E = everyone's expenses, for the day's meal total */
  function checks(e, E){
    const out=[], amt=num(e.amt), cat=e.cat||'';
    if(isMeal(cat)){
      const cap=MEAL_CAP[cat];
      if(cap && amt>cap+0.004) out.push({lvl:'warn', k:'meal', m:'Over the '+cat.replace('Meal Trvl - ','').toLowerCase()+' guideline of '+money(cap)+'. Put the business reason in the notes.'});
      if(day(e.date)){ const tot=(E||[]).filter(x=>x.id!==e.id && x.who===e.who && x.date===e.date && isMeal(x.cat)).concat([e]).reduce((a,x)=>a+num(x.amt),0);
        if(tot>DAY_CAP+0.004) out.push({lvl:'warn', k:'day', m:'Meals on '+short(day(e.date))+' come to '+money(tot)+', over the '+money(DAY_CAP)+' a day guideline.'}); }
    }
    if(needsRcpt(e) && !hasRcpt(e)) out.push({lvl:'bad', k:'rcpt', m:'Anything '+money(RCPT_AT)+' or more needs a receipt.'});
    if(cat!=='Mileage' && (e.asset || e.receipt) && num(e.rcptAmt)>0 && amt>0 && Math.abs(num(e.rcptAmt)-amt)>0.009)
      out.push({lvl:'warn', k:'diff', m:'The receipt says '+money(e.rcptAmt)+' but the expense is '+money(amt)+'.'});
    return out;
  }
  const worst=(e, E)=>{ const c=checks(e, E); return c.some(x=>x.lvl==='bad') ? 'bad' : c.length ? 'warn' : 'ok'; };

  const procOf=who=>ROUTE[who]||PROC;
  const selfFin=who=>!!SELF_FIN[who];
  const entersOwn=who=>who===procOf(who) && !selfFin(who);      /* Vanessa: no sending, she just enters them */

  /* one person's expenses on one trip, and where the trip stands:
     adding (nothing sent) · sent (all open ones sent) · reopened (more came in after it was sent) · entered (all in DataBasics) */
  function tripOf(E, who, trip){
    const L=(E||[]).filter(x=>x.who===who && (x.trip||'')===(trip||''));
    const open=L.filter(x=>!x.submitted), sent=open.filter(x=>x.done), fresh=open.filter(x=>!x.done);
    const state=!L.length ? 'none' : !open.length ? 'entered' : !sent.length ? 'adding' : fresh.length ? 'reopened' : 'sent';
    const days=L.map(x=>day(x.date)).filter(Boolean);
    return {who, trip:trip||'', E:L, open, sent, fresh, state,
      when:sent.reduce((m,x)=>Math.max(m, num(x.done)),0),
      first:days.length ? Math.min(...days) : 0, last:days.length ? Math.max(...days) : 0,
      sum:open.reduce((a,x)=>a+num(x.amt),0), total:L.reduce((a,x)=>a+num(x.amt),0)};
  }
  /* a person's named trips, newest first */
  function tripsOf(E, who, skipId){
    const names=[]; (E||[]).forEach(x=>{ if(x.who===who && x.trip && x.id!==skipId && names.indexOf(x.trip)<0) names.push(x.trip); });
    const out=names.map(n=>tripOf((E||[]).filter(x=>x.id!==skipId), who, n));
    return out.sort((a,b)=>b.last-a.last || a.trip.localeCompare(b.trip));
  }
  /* the person's trips with an expense within 3 days of this one, closest first */
  function nearTrips(E, e){ const d=day(e.date); if(!d) return [];
    return tripsOf(E, e.who, e.id).map(t=>{ const g=t.E.map(x=>day(x.date)).filter(Boolean).map(x=>Math.abs(x-d)); return Object.assign(t, {gap:g.length ? Math.min(...g) : Infinity}); })
      .filter(t=>t.gap<=3*DAY).sort((a,b)=>a.gap-b.gap); }
  /* where a snapped or emailed receipt belongs: the person's own trip with an expense within 3 days of it.
     A trip the person picked is never moved; the reader's guess (a Key Date's name) gives way to theirs.
     Returns the trip name to use, or null to leave it as it is. */
  function placeTrip(E, e){
    if(e.submitted) return null;
    const auto=!!(e.auto && e.auto.trip);
    if(e.trip && !auto) return null;
    if(e.trip && tripsOf(E, e.who, e.id).some(t=>t.trip===e.trip)) return null;
    const N=nearTrips(E, e); if(!N.length) return null;
    if(e.trip) return N[0].trip===e.trip ? null : N[0].trip;
    if(N.length===1 || N[0].gap<N[1].gap) return N[0].trip;
    return null;
  }
  /* for expenses with no trip: the person's trips still open, closest in date to them first (at most 3) */
  function tripChoices(E, who){
    const loose=(E||[]).filter(x=>x.who===who && !x.trip && !x.submitted).map(x=>day(x.date)).filter(Boolean);
    return tripsOf(E, who).filter(t=>t.state!=='entered').map(t=>{
      const ds=t.E.map(x=>day(x.date)).filter(Boolean);
      const gap=loose.length && ds.length ? Math.min(...loose.map(a=>Math.min(...ds.map(b=>Math.abs(a-b))))) : Infinity;
      return Object.assign(t, {gap, best:false}); })
      .sort((a,b)=>a.gap-b.gap || b.last-a.last).slice(0,3).map((t,i)=>Object.assign(t, {best:i===0 && t.gap<=4*DAY}));
  }
  /* what still needs something before it can be entered (shown before sending; sending is never blocked) */
  function problems(L, E){ const out=[];
    L.forEach(x=>{ const amt=num(x.amt), what=(x.name||x.cat||'An expense')+(amt ? ' ('+money(amt)+')' : '');
      const m=missing(x).filter(k=>k!=='Expense Name');
      if(m.length) out.push(what+': needs '+m.map(k=>k==='Expense Type'?'a type':k==='Amount'?'an amount':'a date').join(', '));
      else if(needsRcpt(x) && !hasRcpt(x)) out.push(what+': no receipt'); });
    return out; }

  /* the DataBasics template's columns */
  const CSV_HEAD=['Trip Name','Consultant Name','Expense Type','Expense Date','Expense Name','Receipt (Yes/No)','Receipt Amount','Expense Amount','Invoice Submitted','Notes'];
  const cell=v=>{ const s=String(v==null?'':v); return /[",\n\r]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
  function csv(list, pname, plain){
    const rows=[CSV_HEAD.join(',')];
    list.slice().sort((a,b)=>String(pname(a.who)).localeCompare(String(pname(b.who))) || String(a.trip||'').localeCompare(String(b.trip||'')) || String(a.date||'').localeCompare(String(b.date||'')))
      .forEach(e=>rows.push([e.trip||'', pname(e.who), e.cat||'', e.date||'', e.name||'',
        (e.asset || e.rcptPending || (e.receipt && e.cat!=='Mileage')) ? 'Yes' : 'No',
        e.rcptAmt||'', e.amt||'', e.submitted ? 'Yes' : 'No', plain(e.notes||'')].map(cell).join(',')));
    return rows.join('\r\n');
  }
  /* a downloaded receipt's file name: First - Name - YYYY-MM-DD - $amount */
  const clean=s=>String(s||'').replace(/^\s*(\[[^\]]*\]\s*)+/,'').replace(/^\s*(fwd?|fw|re)\s*:\s*/i,'').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim();
  function receiptName(e, firstName, used){
    const m=/\.([A-Za-z0-9]{2,5})$/.exec(String(e.rcptName||'')), t=String(e.rcptType||'');
    const ext=m ? '.'+m[1].toLowerCase() : /pdf/.test(t) ? '.pdf' : /png/.test(t) ? '.png' : /heic/.test(t) ? '.heic' : /webp/.test(t) ? '.webp' : '.jpg';
    const amt=num(e.amt||e.rcptAmt);
    const base=[clean(firstName), clean(e.name).slice(0,60)||clean(e.cat)||'Receipt', day(e.date) ? String(e.date).slice(0,10) : '', amt ? '$'+amt.toFixed(2) : ''].filter(Boolean).join(' - ');
    let n=base+ext, i=2; used=used||{};
    while(used[n.toLowerCase()]) n=base+' ('+(i++)+')'+ext;
    used[n.toLowerCase()]=1; return n;
  }
  return {CATS, MEAL_CAP, DAY_CAP, RCPT_AT, RATES, NOTRIP, DAY, SEE_ALL, num, money, isMeal, day, iso, short, span, slug,
    rateFor, rateTxt, mileAmt, milesOf, mileLine, withMileLine, hasRcpt, needsRcpt, missing, checks, worst,
    procOf, selfFin, entersOwn, tripOf, tripsOf, nearTrips, placeTrip, tripChoices, problems, CSV_HEAD, csv, receiptName};
})();
/*<LOGIC*/

/* ---------- small helpers ---------- */
const TEST=!!window.__HQ_TEST;
const h=(tag, cls, txt)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; };
const btn=(cls, txt, fn, title)=>{ const b=h('button', cls, txt); b.type='button'; if(title) b.title=title; if(fn) b.addEventListener('click', e=>{ e.stopPropagation(); fn(e, b); }); return b; };
const svg=d=>{ const s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('viewBox','0 0 24 24'); s.innerHTML=d; return s; };
const IC={cam:'<path d="M3 8a2 2 0 012-2h2.5l1.3-2h6.4l1.3 2H21a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><circle cx="13" cy="13" r="3.6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', doc:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6"/>', pdf:'<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5M9 14h6M9 17h4"/>',
  none:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16h.01"/>', ok:'<path d="M5 12.5l4.5 4.5L19 7.5"/>', warn:'<path d="M12 3l9 16H3z"/><path d="M12 9.5v4M12 16.5h.01"/>',
  car:'<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="16" r="1.5"/><circle cx="16.5" cy="16" r="1.5"/>', wait:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
const me=()=>S.me||'';
const E=()=>Array.isArray(S.expenses) ? S.expenses : [];
const expOf=id=>E().find(x=>x.id===id)||null;
const P=id=>(S.people||[]).find(p=>p.id===id)||null;
const pnm=id=>{ const p=P(id); return p ? p.name : (id||'Someone'); };
const first=id=>{ const p=P(id); return p ? String(p.name||'').split(' ')[0] : 'Someone'; };
const seesAll=()=>X.SEE_ALL.indexOf(me())>=0;
const isPhone=()=>document.documentElement.classList.contains('app-exp') || !!(window.matchMedia && matchMedia('(max-width:640px)').matches);
const plain=v=>{ try{ return String(rtText(v||'')).replace(/\s+/g,' ').trim(); }catch(e){ return String(v||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); } };
const say=m=>{ try{ toast(m); }catch(e){} };
const sayUndo=(m, fn)=>{ try{ undoToast(m, fn); }catch(e){ say(m); } };
const pn=who=>first(X.procOf(who));
const goLabel=who=>X.selfFin(who) ? 'Finalize' : 'Done — Send to '+pn(who);
function members(e){ const out=[];
  [e.who, e.by, me()].forEach(id=>{ const p=P(id); const em=p && String(p.email||'').toLowerCase(); if(em && out.indexOf(em)<0) out.push(em); });
  try{ const m=String(window.__hqRelay && window.__hqRelay.myEmail && window.__hqRelay.myEmail()||'').toLowerCase(); if(m && out.indexOf(m)<0) out.push(m); }catch(x){}
  return out; }
/* every save goes through Team HQ's own save (the relay, merged with anyone else's change). It is never waited on,
   so the page carries on with no signal; the relay keeps the change on the device and saves it when the signal is back. */
function save(o, opened){ o.members=members(o); try{ const p=put('expenses', o, opened); if(p && p.catch) p.catch(()=>{}); }catch(e){ console.error(e); } return o.id; }
function change(id, fields){ const cur=expOf(id); if(!cur) return null; const o=Object.assign({}, cur, fields); save(o); return o; }
function nudge(o){ try{ const p=put('nudges', o); if(p && p.catch) p.catch(()=>{}); return p; }catch(e){ return Promise.resolve(); } }
const fileLoaded=()=>{ try{ const f=window.__hqRelay && window.__hqRelay.files && window.__hqRelay.files['team-hq:expenses']; return !window.__hqRelay || !f || !!f.loaded; }catch(e){ return true; } };

/* ================= the base page's handles =================
   index.html keeps its own functions to itself; add-ons get only what it hands out on window (__put, __drop, __show,
   __att, __expApi) and its #panel, #sheet and #toast. These are the small pieces Expenses needs, built on those. */
const $id=id=>document.getElementById(id);
const put=(col, o, opened)=>window.__put(col, o, opened);
const attUpload=(f, folder)=>window.__att.upload(f, folder);
const attBlob=id=>window.__expApi && window.__expApi.attBlob ? window.__expApi.attBlob(id) : window.__relayFile(id);
const attView=a=>window.__att.view(a);
const attDownload=a=>window.__att.download(a);
function vhead(r, h1, sub, right){ const v=h('div','vhead'), g=h('div','grow'); g.appendChild(h('h1',null,h1)); if(sub) g.appendChild(h('p',null,sub)); v.appendChild(g); if(right) v.appendChild(right); r.appendChild(v); return v; }
function emptyBox(title, line){ const e=h('div','empty'); e.appendChild(h('b',null,title)); e.appendChild(document.createTextNode(line)); return e; }
function fmtD(s){ const t=X.day(s); return t ? new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : ''; }
const dateList=()=>Array.isArray(S.dates) ? S.dates : [];
const dOf=d=>d && d.d || '';
let toastT=0;
function toast(msg, undo){ const t=$id('toast'); if(!t) return;
  t.textContent=''; t.appendChild(h('span',null,msg));
  if(undo){ const b=h('button','toast-undo','Undo'); b.type='button'; b.addEventListener('click', async ()=>{ clearTimeout(toastT); t.hidden=true; try{ await undo(); }catch(e){} toast('Put back.'); }); t.appendChild(b); }
  t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ t.hidden=true; }, undo ? 9000 : 3400); }
const undoToast=(m, fn)=>toast(m, fn);
function sheet(build){ const m=$id('sheet'), box=$id('sheet-box'); if(!m || !box) return; box.textContent=''; box.className='modal-box'; build(box);
  const hh=box.querySelector('h2'); if(hh) hh.id='sheet-t'; m.hidden=false; setTimeout(()=>{ const f=box.querySelector('textarea,input,select,button'); if(f) f.focus(); }, 60); }
function closeSheet(){ const m=$id('sheet'); if(m) m.hidden=true; }
/* the side panel: the page's own #panel (its × and Escape close it as usual) */
function panel(title, sub, build){ const p=$id('panel'), b=$id('panel-b'); if(!p || !b) return;
  $id('panel-t').textContent=title; const s=$id('panel-s'); s.textContent=sub||''; s.hidden=!sub; const bk=$id('panel-back'); if(bk) bk.hidden=true;
  b.textContent=''; b.className='pb'; build(b);
  p.classList.remove('off'); p.setAttribute('aria-hidden','false'); const sc=$id('scrim'); if(sc) sc.hidden=false;
  setTimeout(()=>{ const f=b.querySelector('input:not([type=file]),select,textarea'); if(f && window.innerWidth>800) f.focus(); }, 120); }
function closePanel(){ const p=$id('panel'); if(!p) return; p.classList.add('off'); p.setAttribute('aria-hidden','true'); const sc=$id('scrim'); if(sc) sc.hidden=true; }
function field(parent, label, node, wide){ const f=h(node.tagName==='DIV' ? 'div' : 'label', 'f'+(wide?' '+wide:'')); f.appendChild(h('span',null,label)); f.appendChild(node); parent.appendChild(f); return node; }
function sel(opts, val, blank){ const s=h('select'); if(blank) s.appendChild(new Option(blank, ''));
  opts.forEach(o=>{ const v=typeof o==='string' ? o : o.v, n=typeof o==='string' ? o : o.n; s.appendChild(new Option(n, v)); }); if(val!=null) s.value=String(val); return s; }
function inp(type, val, ph){ const i=h('input'); i.type=type||'text'; if(val!=null) i.value=val; if(ph) i.placeholder=ph; return i; }
const peopleOpts=()=>(S.people||[]).map(p=>({v:p.id, n:p.name}));
/* notes: kept as the page keeps them (plain text, or the simple formatting the page's own notes box writes) */
const OK_TAGS={B:1,STRONG:1,I:1,EM:1,U:1,BR:1,DIV:1,P:1,UL:1,OL:1,LI:1,SPAN:1,A:1};
const looksHTML=v=>/<(b|strong|i|em|u|br|div|p|ul|ol|li|span|a)\b[^>]*>/i.test(String(v||''));
const escT=t=>String(t).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function safeHTML(v){ const s=String(v||''); if(!s) return ''; if(!looksHTML(s)) return escT(s).replace(/\n/g,'<br>');
  const doc=new DOMParser().parseFromString('<div>'+s+'</div>','text/html'), out=document.createElement('div');
  const walk=(from, to)=>from.childNodes.forEach(n=>{ if(n.nodeType===3){ to.appendChild(document.createTextNode(n.nodeValue)); return; } if(n.nodeType!==1) return;
    if(!OK_TAGS[n.tagName]){ if(!/^(SCRIPT|STYLE|IFRAME|OBJECT)$/.test(n.tagName)) walk(n, to); return; }
    const c=document.createElement(n.tagName); if(n.tagName==='A'){ const hr=n.getAttribute('href')||''; if(/^(https?:|mailto:)/i.test(hr)){ c.setAttribute('href', hr); c.setAttribute('target','_blank'); c.setAttribute('rel','noopener'); } }
    walk(n, c); to.appendChild(c); });
  walk(doc.body.firstChild, out); return out.innerHTML; }
function rtText(v){ const s=String(v||''); if(!looksHTML(s)) return s;
  const d=new DOMParser().parseFromString('<div>'+safeHTML(s)+'</div>','text/html').body.firstChild;
  d.querySelectorAll('br').forEach(b=>b.replaceWith('\n')); d.querySelectorAll('div,p,li').forEach(b=>b.append('\n'));
  return d.textContent.replace(/\n{3,}/g,'\n\n').trim(); }
function rtEditor(val, ph){ const w=h('div','x2-rt'), ed=h('div','x2-rtx'); ed.contentEditable='true'; ed.setAttribute('role','textbox'); ed.setAttribute('aria-multiline','true');
  if(ph) ed.dataset.ph=ph; ed.innerHTML=safeHTML(val); w.appendChild(ed);
  Object.defineProperty(w, 'value', {get:()=>{ if(!ed.textContent.trim()) return ''; return looksHTML(ed.innerHTML) ? safeHTML(ed.innerHTML) : ed.textContent; }, set:v=>{ ed.innerHTML=safeHTML(v); }});
  ed.addEventListener('input', ()=>w.dispatchEvent(new Event('input', {bubbles:true})));
  ed.addEventListener('blur', ()=>w.dispatchEvent(new Event('change', {bubbles:true})));
  w.focus=()=>ed.focus(); return w; }
function dropUndo(col, id, what){ const rec=(S.expenses||[]).find(x=>x.id===id), kept=rec ? JSON.parse(JSON.stringify(rec)) : null;
  try{ const p=window.__drop(col, id); if(p && p.catch) p.catch(()=>{}); }catch(e){}
  if(kept) undoToast((what||'That')+' deleted.', ()=>put(col, kept)); else toast((what||'That')+' deleted.'); }

/* ================= receipts: reading them ================= */
let capsP=null;
function caps(){
  if(capsP) return capsP;
  capsP=(async()=>{ try{ const s=await window.claude.use('sample'); if(!s) return null; const L=s.limits ? await s.limits().catch(()=>null) : null;
    if(!L || !L.images) return null; return {s, types:L.images.mediaTypes||['image/jpeg','image/png','image/webp','image/gif']}; }catch(e){ return null; } })();
  capsP.then(c=>{ if(!c) setTimeout(()=>{ capsP=null; }, 4000); });
  return capsP;
}
const canRead=(c, type)=>!!c && c.types.indexOf(type||'')>=0;
function prompt(e){
  const who=P(e.who||me()), trips=X.tripsOf(E(), e.who||me()).map(t=>({trip:t.trip, from:t.first ? X.iso(t.first) : '', to:t.last ? X.iso(t.last) : ''}));
  let events=[]; try{ const lo=Date.now()-150*X.DAY, hi=Date.now()+30*X.DAY;
    events=dateList().filter(d=>{ const t=X.day(dOf(d)); return t && t>=lo && t<=hi; }).map(d=>({event:d.t, date:dOf(d), ends:d.e||'', where:d.loc||''})).slice(0,40); }catch(x){}
  return 'You are reading a receipt for MISMO’s expense system. The attached file is a photo, screenshot or PDF of a receipt, invoice, hotel folio or ticket.\n'+
    'Pull out what it shows and return ONLY one JSON object, with no other text:\n'+
    '{"isReceipt":true,"merchant":"","date":"","time":"","total":null,"currency":"USD","type":"","trip":"","description":"","guests":null,"city":"","readable":"good"}\n\n'+
    'Rules:\n'+
    '- merchant: the business name the way a person would say it (e.g. "Hilton Chicago", "Uber", "Starbucks"), not the legal entity, address or card processor.\n'+
    '- date: the purchase date as YYYY-MM-DD. For a hotel folio use the check-out date. If the year is missing, use the most recent such date that is not after today. Today is '+X.iso(Date.now())+'.\n'+
    '- time: the purchase time as 24-hour HH:MM if shown, else "".\n'+
    '- total: the final amount actually paid, as a number, including tax and tip (a handwritten tip and total count). If there are several totals, use the final paid one. null if you cannot read it. Never guess an amount.\n'+
    '- currency: the three-letter currency code shown, USD if it is in dollars.\n'+
    '- type: the closest of these expense types, exactly as written, or "" if none fits: '+JSON.stringify(X.CATS)+'.\n'+
    '  Meals: use the time on the receipt — before 10:30 is breakfast, 10:30 to 16:00 is lunch, after 16:00 is dinner; coffee or a small purchase under $10 is a snack. No time shown: judge from what was bought.\n'+
    '  Hotel folios are Hotel/Lodging. Uber, Lyft and taxis are Taxi/Uber/Lyft. Airline tickets, seat and upgrade fees are Airfare; checked bag fees are Baggage Fees. Amtrak and rail are Train. Fuel is Gasoline.\n'+
    '- trip: one of the trip or event names listed below, written exactly, ONLY when the receipt’s date (and city, if shown) clearly falls within it; otherwise "".\n'+
    '- description: a few plain words on what it was, e.g. "Dinner for 3", "2 nights, Mar 4–6", "Ride from O’Hare to hotel", "Checked bag, outbound".\n'+
    '- guests: on a meal receipt, the number of people (guests or covers) if shown, else null.\n'+
    '- city: the city the purchase was made in, if shown.\n'+
    '- readable: "good", "partial" (some parts unreadable) or "poor".\n'+
    '- Anything not shown or not readable stays "" or null. If the file is not a receipt or invoice at all, set isReceipt to false.\n\n'+
    'The person: '+(who ? who.name : 'a MISMO team member')+'.\n'+
    'Trips this person already has expenses under: '+JSON.stringify(trips)+'\n'+
    'MISMO events around now: '+JSON.stringify(events);
}
function parseJSON(text){ const s=String(text||''), a=s.indexOf('{'), b=s.lastIndexOf('}'); if(a<0 || b<a) throw {code:'invalid_json'}; return JSON.parse(s.slice(a,b+1)); }
async function readBlob(blob, e){
  const c=await caps(); if(!c) throw {code:'unavailable'};
  if(!canRead(c, blob && blob.type)) throw {code:'type'};
  const res=await c.s(prompt(e), {images:[blob], modelTier:'default'});
  const r=parseJSON(res && res.text); if(r && r.isReceipt===false) throw {code:'not_receipt'}; return r||{};
}
async function readText(text, e){
  const c=await caps(); if(!c) throw {code:'unavailable'};
  const res=await c.s(prompt(e)+'\n\nThere is no photo for this one. The receipt is this email, as plain text:\n\n'+String(text||'').slice(0,6000), {modelTier:'default'});
  const r=parseJSON(res && res.text); if(r && r.isReceipt===false) throw {code:'not_receipt'}; return r||{};
}
/* what was read, as field values (only what it is sure of) */
const RKEYS=['name','date','amt','rcptAmt','cat','trip','notes'];
const RLABEL={name:'Expense Name', date:'Expense Date', amt:'Expense Amount', rcptAmt:'Receipt Amount', cat:'Expense Type', trip:'Trip', notes:'Notes'};
function values(r){
  const v={}, name=String(r.merchant||'').trim(); if(name) v.name=name.slice(0,80);
  const d=String(r.date||'').trim(); if(X.day(d) && X.day(d)<=Date.now()+2*X.DAY) v.date=d;
  const tot=X.num(r.total), cur=String(r.currency||'USD').toUpperCase().trim()||'USD';
  if(tot>0){ v.rcptAmt=tot.toFixed(2); if(cur==='USD') v.amt=tot.toFixed(2); }
  if(X.CATS.indexOf(r.type)>=0) v.cat=r.type;
  const names=[...new Set(E().map(x=>x.trip).concat((S.dates||[]).map(x=>x.t)).filter(Boolean))];
  if(r.trip && names.indexOf(r.trip)>=0) v.trip=r.trip;
  const bits=[]; if(r.description) bits.push(String(r.description).trim());
  if(X.num(r.guests)>1 && !/\d/.test(String(r.description||''))) bits.push(r.guests+' people');
  if(r.city) bits.push(String(r.city).trim());
  if(cur!=='USD' && tot>0) bits.push('Paid in '+cur+' — '+tot.toFixed(2)+' '+cur+', not yet converted to dollars');
  if(r.readable==='poor' || r.readable==='partial') bits.push('Parts of the receipt were hard to read — check the amounts');
  if(bits.length) v.notes=bits.join(' · ');
  return v;
}
/* fill only what is still empty; returns the keys it filled */
function apply(e, v, skip){ const got=[];
  RKEYS.forEach(k=>{ if(v[k]==null || v[k]==='' || (skip && skip[k])) return; if(e[k]!=null && String(e[k]).trim()!=='') return; e[k]=v[k]; got.push(k); });
  e.auto=Object.assign({}, e.auto||{}); got.forEach(k=>e.auto[k]=1); e.readAt=Date.now(); e.reading=0; return got; }
const WHY={unavailable:'Reading receipts isn’t on here, so the details are filled in when it’s processed.',
  type:'This kind of file is kept but can’t be read here — a photo, screenshot or PDF can.',
  not_receipt:'That doesn’t look like a receipt, so nothing was filled in.',
  rate_limited:'Too many receipts at once. Give it a minute and try Fill In from the Receipt.',
  TOO_BIG:'That file is over 4 MB. Try a smaller photo or a screenshot of it.',
  image_rejected:'This file is kept but can’t be read — a photo, screenshot or PDF under 4 MB can.',
  images_unavailable:'This kind of file can’t be read here yet. It’s kept with the expense.'};
const why=(err, panelOpen)=>WHY[err && err.code] || (panelOpen ? 'The receipt couldn’t be read this time. Save it as is — the details are filled in when it’s processed.' : 'The receipt couldn’t be read this time. It’s saved — try Fill In from the Receipt later.');
/* read a saved expense's receipt and fill it in; the latest copy wins and only empty fields are filled */
async function readAndSave(id, blob, text){
  const base=expOf(id); if(!base) return {ok:false, err:{code:'gone'}};
  let v=null, err=null;
  try{ v=values(blob ? await readBlob(blob, base) : await readText(text, base)); }catch(x){ err=x; }
  const e=Object.assign({}, expOf(id)||base);
  if(err){ e.reading=0; if(err.code!=='unavailable') e.readFail=Date.now(); save(e); return {ok:false, err}; }
  const got=apply(e, v); e.readFail=0;
  const to=X.placeTrip(E().filter(x=>x.id!==e.id).concat([e]), e);
  if(to){ e.trip=to; e.auto=Object.assign({}, e.auto, {trip:1}); }
  e.tripFixed=1;
  save(e); return {ok:true, got};
}

/* ================= receipts: photos, PDFs, and a lost signal ================= */
/* phone photos are large; a receipt reads as well at 2,000 pixels and stays under the relay's 4 MB limit */
function shrink(file){
  return new Promise(res=>{
    if(!file || !/^image\/(jpeg|png|webp|heic|heif)/.test(file.type||'')) return res(file);
    const url=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{ const max=2000, w=im.naturalWidth, h0=im.naturalHeight;
      if(!w || !h0 || (Math.max(w,h0)<=max && file.size<1.5e6 && !/heic|heif/.test(file.type))){ URL.revokeObjectURL(url); return res(file); }
      const k=Math.min(1, max/Math.max(w,h0)), c=document.createElement('canvas'); c.width=Math.round(w*k); c.height=Math.round(h0*k);
      const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(im,0,0,c.width,c.height); URL.revokeObjectURL(url);
      c.toBlob(b=>{ if(!b) return res(file); const nm=String(file.name||'Receipt').replace(/\.[A-Za-z0-9]+$/,'')+'.jpg';
        try{ res(new File([b], nm, {type:'image/jpeg', lastModified:file.lastModified||Date.now()})); }catch(x){ b.name=nm; res(b); } }, 'image/jpeg', 0.86); };
    im.onerror=()=>{ URL.revokeObjectURL(url); res(file); };
    im.src=url; });
}
/* receipts taken with no signal wait on this device (IndexedDB) and upload when it's back */
const Q={ db:null,
  open(){ if(this.db) return this.db; this.db=new Promise((res,rej)=>{ try{ const r=indexedDB.open('tools:team-hq:exp-receipts', 1);
    r.onupgradeneeded=()=>r.result.createObjectStore('q'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e); } }); return this.db; },
  async tx(mode, fn){ const db=await this.open(); return new Promise((res,rej)=>{ const t=db.transaction('q', mode), st=t.objectStore('q'); const r=fn(st); t.oncomplete=()=>res(r && r.result); t.onerror=()=>rej(t.error); }); },
  add(key, v){ return this.tx('readwrite', st=>st.put(v, key)); },
  del(key){ return this.tx('readwrite', st=>st.delete(key)); },
  async all(){ const db=await this.open(); return new Promise((res,rej)=>{ const out=[]; const t=db.transaction('q','readonly'); const c=t.objectStore('q').openCursor();
    c.onsuccess=()=>{ const k=c.result; if(k){ out.push({key:k.key, v:k.value}); k.continue(); } else res(out); }; c.onerror=()=>rej(c.error); }); } };
const localPics={};   /* receipts waiting for a signal, shown from this device */
const offlineErr=err=>!navigator.onLine || !!(err && (err.code==='OFFLINE' || err.status===0 || /fetch|network/i.test(String(err.message||''))));
/* upload a receipt; with no signal it waits here and the expense says so. Resolves {asset, rcptName, rcptType} or {rcptPending} */
async function upload(f){
  if(navigator.onLine){ try{ const r=await attUpload(f, 'receipts'); return {asset:r.id||'', rcptName:r.name||f.name||'Receipt', rcptType:r.type||f.type||'', rcptPending:''}; }
    catch(err){ if(!offlineErr(err)) throw err; } }
  const key='rq-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  await Q.add(key, {blob:f, name:f.name||'Receipt.jpg', type:f.type||'', who:me(), at:Date.now()});
  try{ localPics[key]=URL.createObjectURL(f); }catch(e){}
  return {asset:'', rcptName:f.name||'Receipt.jpg', rcptType:f.type||'', rcptPending:key};
}
let flushing=false;
async function flushQueue(){
  if(flushing || !navigator.onLine || !me()) return; flushing=true;
  try{ let items=[]; try{ items=await Q.all(); }catch(e){ return; }
    for(const it of items){
      const x=E().find(z=>z.rcptPending===it.key);
      if(!x){ if(Date.now()-(it.v.at||0)>14*X.DAY) await Q.del(it.key).catch(()=>{}); continue; }   /* its expense isn't here (yet) */
      let r; try{ const f=it.v.blob instanceof File ? it.v.blob : new File([it.v.blob], it.v.name, {type:it.v.type}); r=await attUpload(f, 'receipts'); }
      catch(err){ if(offlineErr(err)) break; continue; }
      const cur=expOf(x.id); if(!cur) continue;
      const o=Object.assign({}, cur, {asset:r.id, rcptName:r.name||it.v.name, rcptType:r.type||it.v.type, rcptPending:'', receipt:1});
      const need=X.missing(o).length && !o.readAt; if(need) o.reading=Date.now();
      save(o); await Q.del(it.key).catch(()=>{});
      if(need){ const b=it.v.blob; const c=await caps(); if(c && canRead(c, b.type)) await readAndSave(o.id, b); else change(o.id, {reading:0}); }
    }
  } finally { flushing=false; }
}
window.addEventListener('online', ()=>setTimeout(flushQueue, 1500));
function picInto(img, e){ if(e.rcptPending && localPics[e.rcptPending]){ img.src=localPics[e.rcptPending]; return; }
  if(e.asset){ if(window.__relayBlob) window.__relayBlob(img, e.asset); else img.src='/_blob/'+e.asset; } }
const isPdf=e=>/pdf/.test(e.rcptType||'') || /\.pdf$/i.test(e.rcptName||'');
const rcptAtt=e=>({id:e.asset, name:X.receiptName(e, first(e.who)), type:e.rcptType||'', size:0});

/* snap one or more receipts: each is an expense, saved at once, then read */
async function snap(files){
  files=[...(files||[])].filter(Boolean); if(!files.length) return;
  if(!me()){ say('Team HQ doesn’t know who you are yet.'); return; }
  say(files.length===1 ? 'Saving the receipt…' : 'Saving '+files.length+' receipts…');
  const c=navigator.onLine ? await caps() : null, made=[];
  for(const f0 of files){
    const f=await shrink(f0); let up;
    try{ up=await upload(f); }catch(err){ say((err && err.message) || 'That receipt wouldn’t upload. Try a smaller photo.'); continue; }
    const read=!up.rcptPending && canRead(c, f.type);
    const e=Object.assign({trip:'', who:me(), by:me(), cat:'', date:'', name:'', receipt:1, rcptAmt:'', amt:'', submitted:0, notes:'', at:Date.now(), reading:read ? Date.now() : 0}, up);
    save(e); made.push({id:e.id, blob:f, read, queued:!!up.rcptPending});
  }
  if(!made.length) return;
  if(made.some(m=>!m.read)){ const w=made.filter(m=>!m.read).length;
    if(made.every(m=>!m.read)) say(made.some(m=>m.queued) ? (w===1 ? 'Saved on this phone. It uploads and fills in when you have a signal.' : w+' receipts saved on this phone. They upload when you have a signal.')
      : (w===1 ? 'Receipt saved. The details are filled in when it’s processed.' : w+' receipts saved. The details are filled in when they’re processed.')); }
  const toRead=made.filter(m=>m.read); if(!toRead.length) return;
  say(toRead.length===1 ? 'Receipt saved. Reading it now…' : toRead.length+' receipts saved. Reading them now…');
  let ok=0, last=null;
  for(const m of toRead){ const r=await readAndSave(m.id, m.blob); if(r.ok) ok++; else last=r.err; }
  if(ok===toRead.length) say(ok===1 ? 'Done — filled in from the receipt. Tap it to check.' : 'Done — all '+ok+' filled in from their receipts.');
  else if(ok) say(ok+' of '+toRead.length+' filled in. The rest are saved and filled in when processed.');
  else say(why(last));
}
/* Jonna and Vanessa: read every receipt that was saved but never read */
async function readUnread(){
  const c=await caps(); if(!c){ say(WHY.unavailable); return; }
  const L=unread().filter(x=>canRead(c, x.rcptType||'image/jpeg'));
  if(!L.length){ say('Every receipt here has been read.'); return; }
  say('Reading '+L.length+(L.length===1?' receipt…':' receipts…')); let ok=0;
  for(const x of L){ let b; try{ b=await attBlob(x.asset); if(!b.type && x.rcptType) b=new Blob([b], {type:x.rcptType}); }catch(err){ continue; }
    change(x.id, {reading:Date.now()}); const r=await readAndSave(x.id, b); if(r.ok) ok++; }
  say(ok+' of '+L.length+' filled in from their receipts.');
}
const reading=x=>!!x.reading && Date.now()-X.num(x.reading)<3*60e3;
const unread=()=>E().filter(x=>x.asset && !x.readAt && !reading(x) && !x.submitted && X.missing(x).length);

/* ================= the page ================= */
const UI={scope:null, scopeFor:null, fold:{}, pfold:{}, ent:{}, pend:false};
let drawing=false, mineNow=false, swallow=false;
function scopeNow(){ if(isPhone() || !seesAll()) return 'mine';
  if(!UI.scope || UI.scopeFor!==me()){ UI.scope='all'; UI.scopeFor=me(); } return UI.scope; }
function visible(){ const sc=scopeNow(), L=E();
  if(sc==='mine') return L.filter(x=>x.who===me());
  if(sc==='needs') return L.filter(x=>!x.submitted && (X.missing(x).length || X.worst(x, L)==='bad'));
  return L.slice(); }
/* trips start folded: open are No Trip Name Yet, each person's newest open trip from the last two weeks, and any trip that came back */
function isOpen(who, trip, T){ const k=who+'|'+trip; if(UI.fold[k]!==undefined) return UI.fold[k];
  if(trip===X.NOTRIP) return true;
  if(T && T.state==='reopened' && who===me()) return true;
  const newest=X.tripsOf(E(), who).find(t=>t.state!=='entered');
  return !!(newest && newest.trip===trip && Date.now()-newest.last<14*X.DAY); }
const tid=(who, trip)=>'x2-t-'+who+'-'+X.slug(trip)+'-'+Math.abs(hash(trip));
function hash(s){ let x=0; s=String(s||''); for(let i=0;i<s.length;i++){ x=((x<<5)-x+s.charCodeAt(i))|0; } return x; }

function draw(rootEl){
  const r=rootEl||root;
  /* someone is typing on this page: wait until they're done */
  const a=document.activeElement;
  const typing=a && r.contains(a) && (a.tagName==='TEXTAREA' || a.tagName==='SELECT' || (a.tagName==='INPUT' && /^(text|number|search|email|date)$/.test(a.type)));
  if(typing && r.childElementCount){
    if(!UI.pend){ UI.pend=true; a.addEventListener('blur', ()=>{ setTimeout(()=>{ if(UI.pend){ UI.pend=false; if(!r.hidden) draw(r); } }, 150); }, {once:true}); }
    return; }
  UI.pend=false;
  if(drawing) return; drawing=true;
  const y=window.scrollY;
  mineNow=true;
  try{ paint(r); }catch(e){ console.error('Expenses', e); try{ window.__hqCheckLive && window.__hqCheckLive({kind:'Page error', msg:'Expenses: '+e.message}); }catch(x){} }
  finally{ drawing=false; mineNow=false; }
  if(Math.abs(window.scrollY-y)>2) window.scrollTo(0, y);
  if(fileLoaded() && !window.__exp2.ready){ window.__exp2.ready=true; try{ window.dispatchEvent(new Event('exp2:ready')); }catch(e){} }
}

function paint(r){
  r.textContent=''; r.classList.add('x2');
  const right=h('div','rowflex');
  const nb=btn('btn ghost', null, ()=>edit(null), 'Add an expense without a receipt, or type the details yourself');
  nb.appendChild(svg(IC.plus)); nb.appendChild(h('span',null,'Add by Hand')); right.appendChild(nb);
  vhead(r, 'Expenses', 'Snap the receipt and it’s done: Team HQ reads it and fills in the details. When a trip is all in, send it to be entered in DataBasics.', right);
  if(!me()){ const bx=h('div','box'); bx.appendChild(emptyBox('Team HQ doesn’t know who you are yet.','Sign in and your expenses show up here.')); r.appendChild(bx); return; }
  const phone=isPhone(), all=seesAll() && !phone, sc=scopeNow();

  inboxBox(r);
  /* the one thing most people need: a big place to snap or drop receipts (its file input comes first: the phone app's Snap button uses it) */
  const zone=h('label','rcpt snapzone x2-snap'); const fi=h('input'); fi.type='file'; fi.accept='image/*,application/pdf'; fi.multiple=true; zone.appendChild(fi);
  const ph=h('div','ph'); ph.appendChild(svg(IC.cam)); ph.appendChild(h('span',null,'Snap a Receipt'));
  ph.appendChild(h('small',null,'Take a photo, or drop receipt pictures or PDFs here. The details fill themselves in.')); zone.appendChild(ph);
  fi.addEventListener('change', ()=>{ const fs=[...(fi.files||[])]; fi.value=''; snap(fs); });
  zone.addEventListener('dragover', ev=>{ ev.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', ()=>zone.classList.remove('over'));
  zone.addEventListener('drop', ev=>{ ev.preventDefault(); zone.classList.remove('over'); snap(ev.dataTransfer && ev.dataTransfer.files); });
  r.appendChild(zone);

  if(all){
    const bar=h('div','x2-bar0');
    const seg=h('div','x2-seg'); seg.setAttribute('role','group'); seg.setAttribute('aria-label','Whose expenses');
    [['all','Everyone'],['mine','Mine'],['needs','Needs Something']].forEach(([v,n])=>{ const b=btn(null, n, ()=>{ UI.scope=v; draw(); }); b.setAttribute('aria-pressed', sc===v?'true':'false'); seg.appendChild(b); });
    bar.appendChild(seg); bar.appendChild(h('span','x2-sp'));
    const u=unread().length; if(u) bar.appendChild(btn('btn ghost sm', 'Fill In from Receipts ('+u+')', readUnread, 'Read every receipt that hasn’t been read yet and fill in what it shows'));
    bar.appendChild(btn('btn ghost sm', 'Export for DataBasics', ()=>pickWho('csv'), 'A spreadsheet in the DataBasics template’s columns'));
    bar.appendChild(btn('btn ghost sm', 'Download the Receipts', ()=>pickWho('rc'), 'The receipt files, each named after its expense'));
    r.appendChild(bar);
  }

  const L=visible(), EA=E(), open=L.filter(x=>!x.submitted);
  /* numbers across the top */
  const g=h('div','x2-tiles');
  const tile=(n, l, c, money)=>{ const t=h('div','exptile'+(c?' '+c:'')); const b=h('b', money?'money':null, n); t.appendChild(b); t.appendChild(h('span',null,l)); g.appendChild(t); };
  tile(X.money(open.reduce((a,x)=>a+X.num(x.amt),0)), 'Not Yet Entered', '', true);
  const ready=all ? readyTrips() : [];
  if(all) tile(String(ready.length), ready.length===1?'Trip Ready to Enter':'Trips Ready to Enter', ready.length?'warn':'good');
  else { const ns=open.filter(x=>!x.done && !X.entersOwn(x.who)).length; tile(String(ns), 'Not Sent Yet', ns?'warn':'good'); }
  const need=open.filter(x=>X.missing(x).length).length; tile(String(need), 'Needs Details', need?'warn':'good');
  const noR=open.filter(x=>X.needsRcpt(x) && !X.hasRcpt(x)).length; tile(String(noR), 'Missing a Receipt', noR?'bad':'good');
  const fl=open.filter(x=>x.cat && X.checks(x, EA).some(c=>c.k==='meal'||c.k==='day')).length; tile(String(fl), 'Over a Meal Guideline', fl?'warn':'good');
  r.appendChild(g);

  if(all && ready.length) readyBox(r, ready);
  if(!L.length){ const bx=h('div','box'); bx.appendChild(emptyBox(sc==='needs' ? 'Nothing needs anything.' : 'Nothing here yet.', sc==='needs' ? 'Every expense that isn’t entered has its details and receipt.' : 'Snap a receipt above and it’s done.')); r.appendChild(bx); }
  else if(all && sc!=='mine'){
    const ppl=[...new Set(L.map(x=>x.who))].sort((a,b)=>(a===me()?-1:b===me()?1:0) || pnm(a).localeCompare(pnm(b)));
    if(ppl.length>1){ const j=h('div','x2-jump'); j.appendChild(h('span','x2-jl','Jump To'));
      ppl.forEach(w=>{ const n=EA.filter(x=>x.who===w && !x.submitted).length; const b=btn('x2-jb', null, ()=>{ UI.pfold[w]=false; draw(); const t=document.getElementById('x2-p-'+w); t && t.scrollIntoView({block:'start', behavior:'smooth'}); });
        b.appendChild(document.createTextNode(w===me() ? 'Mine' : first(w))); if(n) b.appendChild(h('small',null, n+' not entered')); j.appendChild(b); });
      r.appendChild(j); }
    ppl.forEach(w=>personBox(r, w, L.filter(x=>x.who===w), true));
  } else personBox(r, me(), L.filter(x=>x.who===me()), false);

  const c=h('div','callout x2-rules');
  c.innerHTML='<b>MBA travel policy, built in:</b> a receipt for anything '+X.money(X.RCPT_AT)+' or more (not mileage); meals up to '+X.money(25)+' breakfast, '+X.money(40)+' lunch, '+X.money(60)+' dinner, '+X.money(15)+' snacks, and '+X.money(X.DAY_CAP)+' a day for all meals. Anything outside it is flagged, never stopped — put the reason in the notes.';
  r.appendChild(c);
}

/* one person's trips (with a heading when Jonna or Vanessa sees everyone's) */
function personBox(r, who, rows, heading){
  const wrap=h('div','x2-pers'); wrap.id='x2-p-'+who; r.appendChild(wrap);
  const EA=E(), folded=heading && !!UI.pfold[who];
  if(heading){
    const open=EA.filter(x=>x.who===who && !x.submitted);
    const hd=h('div','x2-ph'); hd.setAttribute('role','button'); hd.tabIndex=0; hd.setAttribute('aria-expanded', folded?'false':'true'); hd.title='Fold or unfold '+first(who)+'’s trips';
    hd.appendChild(h('span','x2-chev', folded?'▸':'▾')); hd.appendChild(h('b',null, pnm(who)));
    hd.appendChild(h('small',null, rows.length+(rows.length===1?' expense':' expenses')+(open.length ? ' · '+open.length+' not entered' : '')));
    const dl=h('span','x2-pdl');
    dl.appendChild(btn('btn ghost sm','Report', ()=>exportFor(who, false), 'Download '+first(who)+'’s expenses that aren’t entered yet, in the DataBasics template'));
    dl.appendChild(btn('btn ghost sm','Receipts', ()=>receiptsFor(who, false), 'Download '+first(who)+'’s receipts for expenses that aren’t entered yet'));
    hd.appendChild(dl); hd.appendChild(open.length ? h('span','amt money', X.money(open.reduce((a,x)=>a+X.num(x.amt),0))) : h('span','x2-alldone','All Entered'));
    const t=()=>{ UI.pfold[who]=!folded; draw(); };
    hd.addEventListener('click', t); hd.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target===hd){ e.preventDefault(); t(); } });
    wrap.appendChild(hd);
    if(folded) return;
  }
  /* trips, newest first; No Trip Name Yet first of all */
  const names=[...new Set(rows.map(x=>x.trip||X.NOTRIP))];
  const T={}; names.forEach(n=>T[n]=n===X.NOTRIP ? null : X.tripOf(EA, who, n));
  const lastOf=n=>n===X.NOTRIP ? Infinity : (T[n].last||0);
  names.sort((a,b)=>lastOf(b)-lastOf(a) || a.localeCompare(b));
  const live=names.filter(n=>n===X.NOTRIP || T[n].state!=='entered'), done=names.filter(n=>n!==X.NOTRIP && T[n].state==='entered');
  live.forEach(n=>wrap.appendChild(tripBox(who, n, rows.filter(x=>(x.trip||X.NOTRIP)===n), T[n])));
  if(done.length){
    const k=who, isOpen2=!!UI.ent[k], tot=done.reduce((a,n)=>a+T[n].total,0);
    const f=h('div','x2-ent'); const b=btn('x2-enth', null, ()=>{ UI.ent[k]=!isOpen2; draw(); }); b.setAttribute('aria-expanded', isOpen2?'true':'false');
    b.appendChild(h('span','x2-chev', isOpen2?'▾':'▸')); b.appendChild(h('b',null,'Entered in DataBasics')); b.appendChild(h('small',null, done.length+(done.length===1?' trip':' trips')));
    b.appendChild(h('span','amt money', X.money(tot))); f.appendChild(b);
    if(isOpen2){ const body=h('div','x2-entb'); done.forEach(n=>body.appendChild(tripBox(who, n, rows.filter(x=>x.trip===n), T[n]))); f.appendChild(body); }
    wrap.appendChild(f);
  }
}

const STATE_CHIP=(T, who)=>{
  if(!T) return ['ch-soon','Needs a Trip'];
  const fin=X.selfFin(who), mine=who===me();
  if(T.state==='entered') return ['ch-dn','Entered'];
  if(X.entersOwn(who)) return ['ch-ns','To Enter'];
  if(T.state==='adding') return ['ch-ns', mine ? (fin ? 'Not Finalized' : 'Not Sent Yet') : 'Still Adding'];
  if(T.state==='sent') return ['ch-ip', fin ? 'Finalized' : mine ? 'With '+pn(who) : 'Ready to Enter'];
  return ['ch-soon', T.fresh.length+' Added Since'];
};
function tripBox(who, name, rows, T){
  const open=isOpen(who, name, T), box=h('div','trip x2-trip'); box.id=tid(who, name);
  const hd=btn('triph x2-th', null, ()=>{ UI.fold[who+'|'+name]=!open; draw(); }); hd.setAttribute('aria-expanded', open?'true':'false');
  hd.appendChild(h('span','x2-chev', open?'▾':'▸'));
  const tn=h('span','tn'); tn.appendChild(document.createTextNode(name));
  const n=(T ? T.E : rows).length, sp=T ? X.span(T.first, T.last) : '';
  tn.appendChild(h('small',null, (sp ? sp+' · ' : '')+n+(n===1?' expense':' expenses'))); hd.appendChild(tn);
  const [cc, ct]=STATE_CHIP(T, who); hd.appendChild(h('span','chip '+cc, ct));
  const flagged=rows.filter(x=>!x.submitted && (X.missing(x).length || X.worst(x, E())!=='ok')).length;
  if(flagged) hd.appendChild(h('span','chip ch-soon', flagged+(flagged===1?' needs a look':' need a look')));
  hd.appendChild(h('span','amt money', X.money((T ? (T.state==='entered' ? T.total : T.sum) : rows.reduce((a,x)=>a+X.num(x.amt),0)))));
  box.appendChild(hd);
  if(T) doneBar(box, T);
  else noTrip(box, who, rows);
  if(open){ const list=h('div','x2-rows');
    rows.slice().sort((a,b)=>String(b.date||'9').localeCompare(String(a.date||'9')) || (b.at||0)-(a.at||0)).forEach(x=>list.appendChild(row(x)));
    box.appendChild(list); }
  return box;
}
function row(e){
  const EA=E(), miss=X.missing(e), rd=reading(e), w=X.worst(e, EA);
  const r=btn('exprow x2-row'+(e.cat && w!=='ok' && !e.submitted ? ' flag' : ''), null, ()=>edit(expOf(e.id)||e));
  const rc=h('span','rc'+(X.hasRcpt(e) || e.cat==='Mileage' ? '' : X.needsRcpt(e) ? ' none' : ''));
  if((e.asset || e.rcptPending) && !isPdf(e)){ const im=h('img'); im.alt=''; im.loading='lazy'; picInto(im, e); rc.appendChild(im); }
  else rc.appendChild(svg(e.cat==='Mileage' ? IC.car : isPdf(e) ? IC.pdf : X.hasRcpt(e) ? IC.doc : X.needsRcpt(e) ? IC.none : IC.doc));
  r.appendChild(rc);
  const x=h('span','ex');
  x.appendChild(h('b',null, e.name || e.cat || (rd ? 'Reading the receipt…' : 'Receipt — details to come')));
  const bits=[e.cat||'No type yet', e.date ? fmtD(e.date) : 'no date'];
  if(e.cat==='Mileage' && X.milesOf(e)) bits.push(X.milesOf(e)+' miles');
  if(seesAll() && e.who!==me()) bits.push(first(e.who));
  x.appendChild(h('small',null, bits.join(' · '))); r.appendChild(x);
  const er=h('span','er');
  if(e.rcptPending) er.appendChild(h('span','chip ch-soon','Waiting for a Signal'));
  if(rd) er.appendChild(h('span','chip ch-ip','Reading…'));
  else if(!e.submitted && miss.length){ const ch=h('span','chip ch-soon','Needs Details'); ch.title='Still missing: '+miss.join(', '); er.appendChild(ch); }
  else if(!e.submitted && w==='bad'){ const ch=h('span','chip ch-od','No Receipt'); er.appendChild(ch); }
  else if(!e.submitted && w==='warn'){ const ch=h('span','chip ch-soon','Check'); ch.title=X.checks(e, EA).map(c=>c.m).join(' '); er.appendChild(ch); }
  er.appendChild(h('span','ea money', X.num(e.amt)>0 ? X.money(e.amt) : '—')); r.appendChild(er);
  return r;
}
/* expenses with no trip yet: one tap puts them on a trip the person already has (closest dates first), or name a new one */
function noTrip(box, who, rows){
  const L=rows.filter(x=>!x.submitted && (x.who===me() || seesAll())); if(!L.length) return;
  const wrap=h('div','x2-pick'), it=L.length===1 ? 'it' : 'them', choices=X.tripChoices(E(), who);
  const apply2=name=>{ L.forEach(x=>change(x.id, {trip:name, auto:Object.assign({}, x.auto||{}, {trip:0})})); UI.fold[who+'|'+name]=true; draw();
    say(L.length===1 ? 'Added to '+name+'.' : L.length+' added to '+name+'.'); };
  if(choices.length){ wrap.appendChild(h('div','x2-pl', 'Add '+it+' to '+(who===me()?'a trip you':first(who)+'’s trip they')+' already have:'));
    const bs=h('div','x2-pb');
    choices.forEach(t=>{ const b=btn('x2-pbt'+(t.best?' best':''), null, ()=>{ [...bs.querySelectorAll('button')].forEach(z=>z.disabled=true); apply2(t.trip); });
      b.appendChild(document.createTextNode(t.trip)); b.appendChild(h('small',null, (X.span(t.first, t.last)||'no dates yet')+(t.best ? ' · same dates' : ''))); bs.appendChild(b); });
    wrap.appendChild(bs); }
  const nt=h('div','x2-nt'); nt.appendChild(h('span','x2-pl', choices.length ? 'Or start a new trip:' : 'Name the trip '+(L.length===1 ? 'for it' : 'for all '+L.length)+':'));
  const inp2=h('input'); inp2.type='text'; inp2.placeholder='Trip name, e.g. MISMO Winter Summit 2027'; inp2.setAttribute('aria-label','New trip name');
  const go=btn('btn sm', choices.length ? 'Start This Trip' : 'Name This Trip', ()=>{ const v=inp2.value.trim(); if(!v){ inp2.focus(); return; } inp2.blur(); UI.pend=false; apply2(v); });
  inp2.addEventListener('keydown', ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); go.click(); } });
  nt.appendChild(inp2); nt.appendChild(go); wrap.appendChild(nt); box.appendChild(wrap);
}

/* ================= sending a trip ================= */
const asked=T=>(S.nudges||[]).filter(z=>z.kind==='exp-remind-by' && !z.done && z.who===T.who && z.trip===T.trip).sort((a,b)=>b.at-a.at)[0]||null;
function doneBar(box, T){
  const who=T.who, mine=who===me(), fin=X.selfFin(who), go=goLabel(who);
  if(T.state==='entered' || T.state==='none' || X.entersOwn(who)) return;
  if(!mine && (!seesAll() || fin)) return;   /* Jonna finalizes her own: no one else gets buttons on her trips */
  const ask=asked(T), bar=h('div','tripdone x2-done ed-'+T.state), txt=h('span','ed-t');
  const sendBtn=(label, ghost)=>btn('btn sm'+(ghost?' ghost':' ed-go'), label, ()=>send(X.tripOf(E(), who, T.trip)));
  if(T.state==='adding'){
    if(mine){ if(ask){ txt.appendChild(h('b',null, first(ask.by)+' asked you to '+(fin?'finalize':'send')+' this when it’s all in. ')); txt.appendChild(document.createTextNode('Tap the button once every expense is here.')); }
      else txt.textContent=fin ? 'When every expense for this trip is in, finalize it; it then waits for you under Ready to Enter.' : 'When every expense for this trip is in, send it to '+pn(who)+' to enter.';
      bar.appendChild(txt); bar.appendChild(sendBtn(go)); }
    else { txt.appendChild(h('b',null, first(who)+' is still adding.'));
      txt.appendChild(document.createTextNode(' '+first(who)+' sees '+go+' here'+(ask ? '; '+(ask.by===me()?'you':first(ask.by))+' reminded them '+X.short(ask.at)+'.' : '.')));
      bar.appendChild(txt);
      bar.appendChild(btn('btn ghost sm', ask ? 'Remind Again' : 'Remind '+first(who), (e,b)=>{ b.disabled=true; remind(X.tripOf(E(), who, T.trip)); }));
      bar.appendChild(sendBtn((fin?'Finalize':'Send')+' for '+first(who), true)); }
  } else if(T.state==='sent'){
    txt.appendChild(h('b',null, fin ? 'Finalized' : mine ? 'With '+pn(who) : 'Ready to Enter'));
    txt.appendChild(document.createTextNode((fin?' · ':' · sent ')+X.short(T.when)+(mine || fin ? '' : ' by '+first(who))+(fin ? ', waiting under Ready to Enter' : '')));
    bar.appendChild(txt);
    if(mine) bar.appendChild(btn('btn ghost sm','Take It Back', ()=>takeBack(X.tripOf(E(), who, T.trip))));
  } else if(T.state==='reopened'){
    const n=T.fresh.length;
    txt.appendChild(h('b',null, n+(n===1?' expense':' expenses')+' added since '+(mine?'you '+(fin?'finalized':'sent')+' it':'it was '+(fin?'finalized':'sent'))));
    if(!mine) txt.appendChild(document.createTextNode(' · '+T.sent.length+' ready to enter'));
    bar.appendChild(txt);
    if(mine) bar.appendChild(sendBtn(fin ? 'Finalize the New '+(n===1?'One':'Ones') : 'Send the New '+(n===1?'One':'Ones')+' to '+pn(who)));
    else { bar.appendChild(btn('btn ghost sm','Remind '+first(who), (e,b)=>{ b.disabled=true; remind(X.tripOf(E(), who, T.trip)); }));
      bar.appendChild(sendBtn((fin?'Finalize':'Send')+' for '+first(who), true)); }
  }
  box.appendChild(bar);
}
function dialog(title, build, okLabel, onOk){
  sheet(box=>{
    box.classList.add('x2-dlg'); box.appendChild(h('h2',null,title)); const body=h('div','x2-db'); box.appendChild(body); build(body);
    const acts=h('div','modal-acts'); const no=btn('btn ghost','Cancel', ()=>closeSheet());
    const ok=btn('btn', okLabel, async ()=>{ ok.disabled=true; no.disabled=true; try{ await onOk(body); closeSheet(); }catch(e){ console.error(e); ok.disabled=false; no.disabled=false; say('That didn’t go through. Try again in a moment.'); } });
    acts.appendChild(no); acts.appendChild(ok); box.appendChild(acts); });
}
function send(T){
  const L=T.state==='reopened' ? T.fresh : T.open, PR=X.problems(L, E()), again=T.state==='reopened', n=L.length, sum=L.reduce((a,x)=>a+X.num(x.amt),0);
  if(!n) return;
  const other=T.who!==me(), your=other ? first(T.who)+'’s' : 'your', fin=X.selfFin(T.who), P0=X.procOf(T.who), toProc=me()===P0;
  const title=fin ? (again ? 'Finalize the New '+(n===1?'One':'Ones')+'?' : 'Finalize '+T.trip+'?')
    : again ? 'Send the New '+(n===1?'One':'Ones')+' to '+pn(T.who)+'?' : other ? 'Send '+first(T.who)+'’s '+T.trip+'?' : 'Done With '+T.trip+'?';
  dialog(title, b=>{
    b.appendChild(h('p',null, fin
      ? (again ? n+(n===1?' expense was':' expenses were')+' added after this trip was finalized. They join it, ready to submit in DataBasics.'
               : 'This marks '+your+' '+T.trip+' expenses finalized, ready to submit in DataBasics: '+n+(n===1?' expense, ':' expenses, ')+X.money(sum)+'. If more come in later, you can finalize those too.')
      : again ? n+(n===1?' expense was':' expenses were')+' added after this trip was sent. '+(toProc ? 'They’ll be marked ready to enter.' : pn(T.who)+' will be told '+(n===1?'it’s':'they’re')+' ready to enter.')
      : (toProc ? first(T.who)+'’s '+T.trip+' expenses will be marked ready to enter: ' : pn(T.who)+' will be told '+your+' '+T.trip+' expenses are ready to enter: ')+n+(n===1?' expense, ':' expenses, ')+X.money(sum)+'.'+(other ? ' '+first(T.who)+' sees it as sent by you.' : ' If more come in later, you can send those too.')));
    if(PR.length){ const w=h('div','callout warn x2-warn'); w.appendChild(h('b',null, PR.length===1 ? 'One still needs something:' : PR.length+' still need something:'));
      const ul=h('ul'); PR.slice(0,8).forEach(p=>ul.appendChild(h('li',null,p))); w.appendChild(ul);
      w.appendChild(h('small',null,'Cancel to fix '+(PR.length===1?'it':'them')+' first, or '+(fin?'finalize anyway':'send anyway and say why below')+'.')); b.appendChild(w); }
    if(!fin && !toProc){ const lab=h('label','x2-note'); lab.appendChild(h('span',null,'Anything '+pn(T.who)+' should know? (Optional)'));
      const ta=h('textarea'); ta.rows=2; ta.className='x2-note-t'; lab.appendChild(ta); b.appendChild(lab); }
  }, fin ? 'Finalize' : 'Send to '+pn(T.who), async b=>{
    const note=String((b.querySelector('.x2-note-t')||{}).value||'').trim().slice(0,400), at=Date.now();
    L.forEach(x=>change(x.id, {done:at, doneBy:me()}));
    (S.nudges||[]).filter(z=>/^exp-remind/.test(z.kind||'') && !z.done && z.who===T.who && z.trip===T.trip).forEach(z=>nudge(Object.assign({}, z, {done:1})));
    if(!fin && !toProc){
      (S.nudges||[]).filter(z=>z.kind==='exp-ready' && !z.done && z.who===T.who && z.trip===T.trip).forEach(z=>nudge(Object.assign({}, z, {done:1})));
      const tot=X.tripOf(E(), T.who, T.trip);
      const m=again ? first(T.who)+' added '+n+' more to '+T.trip+': ready to enter ('+tot.open.length+' in all, '+X.money(tot.sum)+')'
                    : first(T.who)+'’s '+T.trip+' expenses are ready to enter ('+n+', '+X.money(sum)+')';
      nudge({id:'expready-'+T.who+'-'+X.slug(T.trip)+'-'+at.toString(36), to:P0, by:T.who, k:'Expenses', kind:'exp-ready', who:T.who, trip:T.trip,
        m:m+(other ? ' (sent by '+first(me())+')' : '')+(note ? ' — “'+note+'”' : ''), note, go:'expenses', at});
    }
    say(fin ? 'Finalized. It’s under Ready to Enter.' : toProc ? 'Marked ready to enter.' : other ? 'Sent to '+pn(T.who)+' for '+first(T.who)+'.' : pn(T.who)+' has it. The trip says Entered once it’s in DataBasics.');
  });
}
function remind(T){ const at=Date.now();
  nudge({id:'expnudge-'+T.who+'-'+X.slug(T.trip)+'-'+at.toString(36), to:T.who, by:me(), k:'Expenses', kind:'exp-remind-by', who:T.who, trip:T.trip,
    m:first(me())+' asked: when your '+T.trip+' expenses are all in, tap '+goLabel(T.who)+' on the trip in Expenses.', go:'expenses', at});
  say(first(T.who)+' will see it on the trip and in the bell.'); }
function takeBack(T){ const fin=X.selfFin(T.who);
  dialog('Take '+T.trip+' Back?', b=>{ b.appendChild(h('p',null, fin ? 'This trip goes back to being worked on and leaves Ready to Enter. Finalize it again when it’s ready.' : 'This trip comes back to you to keep adding to, and '+pn(T.who)+'’s note to enter it closes. Send it again when it’s ready.')); },
    'Take It Back', async ()=>{ T.sent.forEach(x=>change(x.id, {done:0, doneBy:''}));
      (S.nudges||[]).filter(z=>z.kind==='exp-ready' && !z.done && z.who===T.who && z.trip===T.trip).forEach(z=>nudge(Object.assign({}, z, {done:1})));
      say('Taken back. '+(fin?'Finalize':'Send')+' it again when it’s ready.'); }); }

/* ================= Ready to Enter ================= */
/* the trips waiting for whoever enters them, oldest first: Vanessa's list is everyone else's; Jonna's is her own finalized ones and Jonathan's */
function readyTrips(){ const seen={}, out=[];
  E().forEach(x=>{ if(!x.trip) return; const k=x.who+'|'+x.trip; if(seen[k]) return; seen[k]=1;
    if(X.procOf(x.who)!==me() || (x.who===me() && !X.selfFin(x.who))) return;
    const T=X.tripOf(E(), x.who, x.trip); if(T.state==='sent' || T.state==='reopened') out.push(T); });
  return out.sort((a,b)=>a.when-b.when); }
function readyBox(r, L){
  const s=h('div','x2-ready'); const hd=h('div','x2-rh'); hd.appendChild(h('b',null,'Ready to Enter'));
  hd.appendChild(h('small',null, L.length+(L.length===1?' trip':' trips')+' sent or finalized, oldest first')); s.appendChild(hd);
  L.forEach(T=>{ const rw=h('div','x2-rr'); rw.setAttribute('role','button'); rw.tabIndex=0; rw.title='Open this trip below';
    rw.appendChild(h('span','x2-rw', first(T.who)));
    const t=h('span','x2-rt', T.trip); if(T.state==='reopened') t.appendChild(h('small',null,' · '+T.fresh.length+' added since')); rw.appendChild(t);
    rw.appendChild(h('span','x2-rn', T.sent.length+(T.sent.length===1?' expense':' expenses')));
    rw.appendChild(h('span','x2-rs money', X.money(T.sent.reduce((a,x)=>a+X.num(x.amt),0))));
    rw.appendChild(h('span','x2-rd', (X.selfFin(T.who)?'finalized ':'sent ')+X.short(T.when)));
    const n=T.sent.length;
    const b=btn('btn sm x2-re','Entered and Submitted', (e,bb)=>entered(T, bb), T.state==='reopened' ? 'Marks the '+n+' sent expenses entered in DataBasics; the '+T.fresh.length+' added since stay open' : 'Marks all '+n+' expenses entered in DataBasics');
    rw.appendChild(b);
    const nt=(S.nudges||[]).filter(z=>z.kind==='exp-ready' && z.who===T.who && z.trip===T.trip && z.note).sort((a,b)=>b.at-a.at)[0];
    if(nt) rw.appendChild(h('span','x2-rq','“'+nt.note+'”'));
    const go=()=>jump(T); rw.addEventListener('click', go); rw.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target===rw){ e.preventDefault(); go(); } });
    s.appendChild(rw); });
  r.appendChild(s);
}
/* every sent expense on the trip marked entered in one tap, with Undo */
function entered(T, b){
  const L=T.sent.slice(); if(!L.length) return; b.disabled=true;
  L.forEach(x=>change(x.id, {submitted:1}));
  sayUndo(first(T.who)+'’s '+T.trip+': '+L.length+(L.length===1?' expense':' expenses')+' marked entered.', async ()=>{ L.forEach(x=>change(x.id, {submitted:0})); });
}
function jump(T){ UI.pfold[T.who]=false; UI.fold[T.who+'|'+T.trip]=true; if(X.tripOf(E(), T.who, T.trip).state==='entered') UI.ent[T.who]=true;
  if(scopeNow()==='needs') UI.scope='all'; draw();
  setTimeout(()=>{ const b=document.getElementById(tid(T.who, T.trip)); if(b){ b.scrollIntoView({block:'start', behavior:'smooth'}); b.classList.add('x2-hit'); setTimeout(()=>b.classList.remove('x2-hit'), 1600); } }, 60); }

/* ================= downloads ================= */
function pool(includeEntered){ const L=seesAll() ? E() : E().filter(x=>x.who===me()); return includeEntered ? L : L.filter(x=>!x.submitted); }
async function exportFor(who, incl){
  let list=pool(incl).filter(x=>!who || x.who===who), allOf=false;
  if(!list.length && who && !incl){ list=pool(true).filter(x=>x.who===who); allOf=true; }
  if(!list.length){ say('Nothing to export'+(who ? ' for '+first(who) : '')+'.'); return; }
  let dl=null; try{ dl=await window.claude.use('downloads'); }catch(e){}
  if(!dl){ say('Downloads aren’t available here.'); return; }
  try{ await dl.save({filename:'MISMO Expenses - '+(who ? pnm(who) : 'Everyone')+' - '+X.iso(Date.now())+'.csv', data:X.csv(list, pnm, plain)});
    say((allOf ? 'Nothing of '+first(who)+'’s is waiting, so this is all '+list.length : 'Exported '+list.length)+(list.length===1?' expense':' expenses')+(who && !allOf ? ' for '+first(who) : '')+' — the DataBasics template’s columns.'); }
  catch(e){ if(!(e && e.code==='declined')) say('That didn’t download. Try again.'); }
}
async function receiptsFor(who, incl){
  let list=pool(incl).filter(x=>x.asset && (!who || x.who===who)), allOf=false;
  if(!list.length && who && !incl){ list=pool(true).filter(x=>x.asset && x.who===who); allOf=true; }
  if(!list.length){ say('No receipts attached'+(who ? ' for '+first(who) : '')+'.'); return; }
  let dl=null; try{ dl=await window.claude.use('downloads'); }catch(e){}
  if(!dl){ say('Downloads aren’t available here.'); return; }
  say('Downloading '+list.length+(list.length===1?' receipt':' receipts')+(who ? ' for '+first(who) : '')+(allOf ? ' (nothing is waiting, so all of them)' : '')+'…');
  const used={}; let bad=0;
  for(const e of list){ try{ const b=await attBlob(e.asset); const copy=new Blob([b], {type:b.type||e.rcptType||'application/octet-stream'});
      await dl.save({filename:X.receiptName(e, first(e.who), used), data:copy}); await new Promise(r=>setTimeout(r, 250)); }
    catch(err){ if(err && err.code==='declined') return; bad++; } }
  if(bad) say(bad+(bad===1?' receipt':' receipts')+' couldn’t be downloaded. Try again in a moment.');
}
/* the two buttons at the top ask whose, and whether to include what's already entered */
function pickWho(kind){
  const rc=kind==='rc', ppl=[...new Set(pool(true).map(x=>x.who))].sort((a,b)=>(a===me()?-1:b===me()?1:0) || pnm(a).localeCompare(pnm(b)));
  let incl=false;
  sheet(box=>{
    box.classList.add('x2-dlg'); box.appendChild(h('h2',null, rc ? 'Whose Receipts?' : 'Whose Report?'));
    const body=h('div','x2-who'); box.appendChild(body);
    const lab=h('label','chkrow x2-incl'); const cb=h('input'); cb.type='checkbox'; lab.appendChild(cb); lab.appendChild(h('span',null,'Include trips already entered in DataBasics'));
    const paintList=()=>{ body.textContent='';
      const n=w=>pool(incl).filter(x=>(!w || x.who===w) && (!rc || x.asset)).length;
      ppl.forEach(w=>{ const c=n(w); const b=btn('x2-wb', null, ()=>{ closeSheet(); rc ? receiptsFor(w, incl) : exportFor(w, incl); }); b.disabled=!c;
        b.appendChild(h('b',null, w===me() ? 'Mine' : pnm(w))); b.appendChild(h('small',null, c+(rc ? (c===1?' receipt':' receipts') : (c===1?' expense':' expenses')))); body.appendChild(b); });
      const c=n(''); const all=btn('x2-wb all', null, ()=>{ closeSheet(); rc ? receiptsFor('', incl) : exportFor('', incl); }); all.disabled=!c;
      all.appendChild(h('b',null,'Everyone')); all.appendChild(h('small',null, c+(rc ? (c===1?' receipt':' receipts') : (c===1?' expense':' expenses')))); body.appendChild(all); };
    cb.addEventListener('change', ()=>{ incl=cb.checked; paintList(); });
    paintList(); box.appendChild(lab);
    const acts=h('div','modal-acts'); acts.appendChild(btn('btn ghost','Cancel', ()=>closeSheet())); box.appendChild(acts);
  });
}

/* ================= the editor ================= */
function edit(e0, tripName){
  const isNew=!e0, all=seesAll();
  const e=e0 ? Object.assign({}, e0) : {trip:tripName||'', who:me(), by:me(), cat:'', date:X.iso(Date.now()), name:'', receipt:0, rcptAmt:'', amt:'', submitted:0, notes:'', asset:'', at:Date.now()};
  const opened=e0 ? JSON.stringify(expOf(e0.id)||e0) : null;
  const touched={}; let dateDefault=isNew, lastBlob=null, busy=false;
  panel(isNew ? 'Add an Expense' : 'Edit Expense', e.name||e.cat||'', body=>{
    body.classList.add('x2-ed');
    /* the receipt first: it's what people have in their hand */
    const lab=h('label','rcpt'+(X.hasRcpt(e)?' has':'')); const fi=h('input'); fi.type='file'; fi.accept='image/*,application/pdf';
    const paintR=()=>{ lab.textContent=''; lab.appendChild(fi); lab.className='rcpt'+(e.asset||e.rcptPending?' has':'');
      if((e.asset||e.rcptPending) && isPdf(e)){ const p2=h('div','ph'); p2.appendChild(svg(IC.pdf)); p2.appendChild(h('span',null, e.rcptName||'Receipt (PDF)')); lab.appendChild(p2); }
      else if(e.asset||e.rcptPending){ const im=h('img'); im.alt='Receipt'; if(lastBlob){ try{ im.src=URL.createObjectURL(lastBlob); }catch(x){ picInto(im, e); } } else picInto(im, e); lab.appendChild(im); }
      else { const p2=h('div','ph'); p2.appendChild(svg(IC.cam)); p2.appendChild(h('span',null, cat.value==='Mileage' ? 'No Receipt Needed for Mileage' : 'Add the Receipt'));
        p2.appendChild(h('small',null, cat.value==='Mileage' ? 'You can add a map or anything else if you like.' : 'Take a photo, or drag an image or PDF here. The details fill themselves in.')); lab.appendChild(p2); } };
    const take=async file=>{ if(!file) return; const f=await shrink(file); say('Adding the receipt…');
      try{ const up=await upload(f); Object.assign(e, up, {receipt:1, readAt:0}); cbR.checked=true; lastBlob=f; paintR(); paintRA(); sync();
        if(up.rcptPending){ status('No signal: the receipt is kept on this device and uploads when you’re back online.'); return; }
        fillIn(f, true); }
      catch(err){ say((err && err.message) || 'That receipt wouldn’t upload. Try a smaller photo.'); } };
    fi.addEventListener('change', ()=>take(fi.files && fi.files[0]));
    lab.addEventListener('dragover', ev=>{ ev.preventDefault(); lab.classList.add('over'); });
    lab.addEventListener('dragleave', ()=>lab.classList.remove('over'));
    lab.addEventListener('drop', ev=>{ ev.preventDefault(); lab.classList.remove('over'); take(ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]); });
    body.appendChild(lab);
    const racts=h('div','rowflex x2-ra'); body.appendChild(racts);
    const rstat=h('div','rcptstat'); rstat.hidden=true; body.appendChild(rstat);
    function status(msg, kind){ rstat.textContent=''; rstat.hidden=!msg; if(!msg) return; rstat.className='rcptstat'+(kind?' '+kind:''); rstat.appendChild(document.createTextNode(msg)); }
    function paintRA(){ racts.textContent=''; if(!e.asset && !e.rcptPending) return;
      if(e.asset){ racts.appendChild(btn('btn ghost sm','Look at the Receipt', ()=>attView(rcptAtt(e))));
        racts.appendChild(btn('btn ghost sm','Download the Receipt', ()=>attDownload(rcptAtt(e))));
        racts.appendChild(btn('btn ghost sm','Fill In from the Receipt', async ()=>{ let b=lastBlob;
          if(!b){ try{ b=await attBlob(e.asset); if(!b.type && e.rcptType) b=new Blob([b], {type:e.rcptType}); }catch(x){ say('The receipt couldn’t be opened.'); return; } }
          fillIn(b, false); }, 'Read the receipt and fill in any empty field')); }
      racts.appendChild(btn('btn ghost sm','Remove the Receipt', ()=>{ e.asset=''; e.rcptName=''; e.rcptType=''; e.rcptPending=''; lastBlob=null; cbR.checked=false; status(''); paintR(); paintRA(); sync(); })); }

    /* the fields */
    const g=h('div','fields');
    /* the trip: a real drop-down (a suggestion list doesn't open on iPhones) */
    const tripF=h('div','x2-tripf'); const tsel=h('select'); tsel.setAttribute('aria-label','Trip'); const tnew=h('input'); tnew.type='text'; tnew.placeholder='Name the new trip, e.g. MBA Annual 2026'; tnew.hidden=true;
    tripF.appendChild(tsel); tripF.appendChild(tnew); field(g, 'Trip', tripF, 'w2');
    const NEW='\u0000new';
    const tripVal=()=>tsel.value===NEW ? tnew.value.trim() : tsel.value;
    function fillTrips(v){ const who=(fWho && fWho.value) || e.who || me(); tsel.textContent='';
      tsel.appendChild(new Option('No trip yet', ''));
      const L=X.tripsOf(E(), who), names=L.map(t=>t.trip);
      if(L.length){ const og=document.createElement('optgroup'); og.label=(who===me() ? 'Your' : first(who)+'’s')+' trips';
        L.forEach(t=>og.appendChild(new Option(t.trip+(X.span(t.first,t.last) ? '  ·  '+X.span(t.first,t.last) : '')+(t.state==='entered' ? '  ·  entered' : ''), t.trip))); tsel.appendChild(og); }
      if(v && names.indexOf(v)<0) tsel.appendChild(new Option(v, v));
      tsel.appendChild(new Option('New Trip…', NEW)); tsel.value=v||''; tnew.hidden=true; }
    tsel.addEventListener('change', ()=>{ touched.trip=1; tag('trip', false);
      if(tsel.value===NEW){ tnew.hidden=false; tnew.value=''; tnew.focus(); } else tnew.hidden=true; sync(); });
    tnew.addEventListener('input', ()=>{ touched.trip=1; });
    const fWho=all ? field(g, 'Whose Expense', sel(peopleOpts(), e.who, 'Pick a Person')) : null;
    const cat=field(g, 'Expense Type', sel(X.CATS, e.cat, 'Pick a Type'));
    const fDate=field(g, 'Expense Date', inp('date', e.date));
    const miW=h('label','f x2-mi'); miW.appendChild(h('span',null,'Miles Driven')); const fMi=h('input'); fMi.type='number'; fMi.step='0.1'; fMi.min='0'; fMi.inputMode='decimal'; fMi.placeholder='0';
    const miH=h('div','x2-mih'); miW.appendChild(fMi); miW.appendChild(miH); g.appendChild(miW);
    const fName=field(g, 'Expense Name', inp('text', e.name, 'Company or restaurant name'), 'w4');
    const fAmt=field(g, 'Expense Amount', inp('number', e.amt, '0.00')); fAmt.step='0.01'; fAmt.min='0'; fAmt.inputMode='decimal';
    const fRAmt=field(g, 'Receipt Amount', inp('number', e.rcptAmt, '0.00')); fRAmt.step='0.01'; fRAmt.min='0'; fRAmt.inputMode='decimal';
    body.appendChild(g);
    fillTrips(e.trip);
    if(fWho) fWho.addEventListener('change', ()=>{ const v=tripVal(); fillTrips(v); sync(); });
    /* the two amounts start out the same: whichever is typed first fills in the other, until the other is changed by hand */
    let linked=String(e.amt||'')===String(e.rcptAmt||''), lead=null;
    const mirror=(src, dst, w)=>()=>{ if(!linked) return; if(lead===null) lead=w; if(lead===w) dst.value=src.value; else linked=false; };
    fAmt.addEventListener('input', mirror(fAmt, fRAmt, 'amt')); fRAmt.addEventListener('input', mirror(fRAmt, fAmt, 'rcpt'));

    const g2=h('div','fields');
    const rw=h('div','f'); rw.appendChild(h('span',null,'Receipt')); const lR=h('label','chkrow'); const cbR=h('input'); cbR.type='checkbox'; cbR.checked=!!(e.receipt||e.asset||e.rcptPending);
    const lRt=h('span',null,'I have the receipt'); lR.appendChild(cbR); lR.appendChild(lRt); rw.appendChild(lR); g2.appendChild(rw);
    let cbS=null;
    if(all){ const sw=h('div','f'); sw.appendChild(h('span',null,'In DataBasics')); const lS=h('label','chkrow'); cbS=h('input'); cbS.type='checkbox'; cbS.checked=!!e.submitted;
      lS.appendChild(cbS); lS.appendChild(h('span',null,'Entered and submitted')); sw.appendChild(lS); g2.appendChild(sw); }
    else if(e.submitted){ const sw=h('div','f'); sw.appendChild(h('span',null,'In DataBasics')); sw.appendChild(h('div','x2-ro','Entered')); g2.appendChild(sw); }
    else if(e.done && !X.entersOwn(e.who)){ const sw=h('div','f'); sw.appendChild(h('span',null,'Sent')); sw.appendChild(h('div','x2-ro', X.selfFin(e.who) ? 'Finalized '+X.short(e.done) : 'Sent to '+pn(e.who)+' '+X.short(e.done))); g2.appendChild(sw); }
    body.appendChild(g2);
    const g3=h('div','fields');
    const fNotes=field(g3, 'Notes (Optional)', rtEditor(e.notes||'', 'Business reason, who was there, anything that would otherwise have to be asked', 3), 'w4');
    body.appendChild(g3);

    /* mileage: miles driven × the IRS rate for the date; the miles go into the notes; no receipt needed */
    const namePh=fName.placeholder;
    fMi.value=X.milesOf(e) || '';
    function mileage(writeNote){ const onM=cat.value==='Mileage'; miW.style.display=onM?'':'none';
      fName.placeholder=onM ? 'From and to (for example, Office to Dulles)' : namePh;
      lRt.textContent=onM ? 'No receipt needed for mileage' : 'I have the receipt'; cbR.disabled=onM && !e.asset;
      if(!onM) return;
      const miles=X.num(fMi.value), rate=X.rateFor(fDate.value);
      if(miles>0){ const a=X.mileAmt(miles, fDate.value).toFixed(2); if(fAmt.value!==a){ fAmt.value=a; touched.amt=1; } if(fRAmt.value!==a) fRAmt.value=a;
        miH.textContent=miles+' miles × '+X.rateTxt(rate)+' a mile (the IRS rate on this date) = '+X.money(a); }
      else miH.textContent='Works out at '+X.rateTxt(rate)+' a mile, the IRS rate on this date.';
      if(writeNote){ fNotes.value=X.withMileLine(fNotes.value, miles, fDate.value); touched.notes=1; } }
    fMi.addEventListener('input', ()=>{ mileage(false); sync(); }); fMi.addEventListener('change', ()=>{ mileage(true); sync(); });
    cat.addEventListener('change', ()=>{ mileage(X.num(fMi.value)>0); paintR(); });
    fDate.addEventListener('change', ()=>{ if(cat.value==='Mileage') mileage(X.num(fMi.value)>0); });

    /* a small "From the Receipt" tag beside what the receipt filled in, until it's changed */
    const IN={trip:tsel, cat, date:fDate, name:fName, amt:fAmt, rcptAmt:fRAmt, notes:fNotes};
    function tag(k, onn){ const f=(k==='trip' ? tripF : IN[k]).closest('.f'); const lb=f && f.firstElementChild; if(!lb) return;
      let t=lb.querySelector('.fromrcpt'); if(onn && !t){ t=h('em','fromrcpt','From the Receipt'); lb.appendChild(t); } if(!onn && t) t.remove(); }
    Object.keys(IN).forEach(k=>{ if(e.auto && e.auto[k]) tag(k, true);
      const mark=()=>{ touched[k]=1; if(k==='date') dateDefault=false; if(e.auto && e.auto[k]){ delete e.auto[k]; tag(k, false); } };
      if(k!=='trip'){ IN[k].addEventListener('input', mark); IN[k].addEventListener('change', mark); } });

    async function fillIn(blob, auto){
      if(busy) return;
      const c=await caps();
      if(!c){ status(auto ? 'Receipt added. Save it as is if you like — the details are filled in when it’s processed.' : WHY.unavailable); return; }
      if(!canRead(c, blob && blob.type)){ status(WHY.type); return; }
      busy=true; status('Reading the receipt…', 'busy');
      try{ read();
        const v=values(await readBlob(blob, e));
        /* fill what's empty or was only put there for them (today's date) */
        const cur={trip:tripVal(), cat:cat.value, date:(touched.date || !dateDefault) ? fDate.value : '', name:fName.value, amt:'', rcptAmt:'', notes:fNotes.value};
        if(touched.amt || touched.rcptAmt || X.num(fAmt.value)>0){ cur.amt=fAmt.value; cur.rcptAmt=fRAmt.value; }
        const probe=Object.assign({}, cur, {auto:{}}), got=apply(probe, v, touched);
        /* the reader's trip guess gives way to the person's own trip with an expense within 3 days */
        if(!touched.trip){ const pe=Object.assign({}, e, {trip:probe.trip, date:probe.date||fDate.value, auto:{trip:got.indexOf('trip')>=0?1:0}});
          const to=X.placeTrip(E().filter(x=>x.id!==e.id), pe); if(to){ probe.trip=to; if(got.indexOf('trip')<0) got.push('trip'); } }
        got.forEach(k=>{ if(k==='trip'){ fillTrips(probe.trip); } else IN[k].value=probe[k]; tag(k, true); });
        if(got.indexOf('date')>=0) dateDefault=false;
        if(got.indexOf('amt')>=0 || got.indexOf('rcptAmt')>=0) linked=String(fAmt.value)===String(fRAmt.value);
        e.auto=Object.assign({}, e.auto||{}); got.forEach(k=>e.auto[k]=1); e.readAt=Date.now(); e.readFail=0;
        mileage(false); sync();
        status(got.length ? 'Filled in from the receipt: '+got.map(k=>RLABEL[k]).join(', ')+'. Change anything that’s off.' : 'Read the receipt — everything it shows is already filled in.', 'ok'); }
      catch(err){ status(why(err, true)); }
      busy=false;
    }

    const pol=h('div','policy'); body.appendChild(pol);
    function read(){ e.trip=tripVal(); if(fWho) e.who=fWho.value||e.who; e.cat=cat.value; e.date=fDate.value; e.name=fName.value.trim(); e.amt=fAmt.value; e.rcptAmt=fRAmt.value;
      e.receipt=(cbR.checked && !(cat.value==='Mileage' && !e.asset)) || !!e.asset || !!e.rcptPending ? 1 : 0;
      if(cbS) e.submitted=cbS.checked ? 1 : 0; e.notes=fNotes.value.trim();
      if(e.cat==='Mileage'){ const m=X.num(fMi.value); if(m>0) e.miles=m; else delete e.miles; } else delete e.miles; }
    function sync(){ read(); pol.textContent=''; if(!e.cat) return;
      const cs=X.checks(e, E());
      if(!cs.length){ const l=h('div','pl ok'); l.appendChild(svg(IC.ok)); l.appendChild(document.createTextNode(e.cat==='Mileage' ? 'Mileage: no receipt needed. Inside policy.' : 'Inside policy. Nothing to chase.')); pol.appendChild(l); return; }
      cs.forEach(c=>{ const l=h('div','pl'+(c.lvl==='bad'?' bad':'')); l.appendChild(svg(IC.warn)); l.appendChild(document.createTextNode(c.m)); pol.appendChild(l); }); }
    [tsel,tnew,cat,fDate,fName,fAmt,fRAmt,cbR].concat(fWho?[fWho]:[]).concat(cbS?[cbS]:[]).forEach(x=>x.addEventListener('change', sync));
    fAmt.addEventListener('input', sync);
    paintR(); paintRA(); mileage(false); sync();
    if(!isNew && reading(e)) status('Still reading this receipt — the details fill in by themselves in a moment.', 'busy');
    else if(!isNew && e.rcptPending) status('This receipt is waiting for a signal on the phone it was taken on.');
    else if(!isNew && e.readFail) status('The receipt couldn’t be read last time. Try Fill In from the Receipt, or type the details.');

    const acts=h('div','rowacts');
    if(!isNew){ const del=btn('btn danger','Delete', ()=>{ if(del.dataset.c){ closePanel(); dropUndo('expenses', e.id, 'Expense'); } else { del.dataset.c='1'; del.textContent='Tap Again to Delete'; } });
      acts.appendChild(del); acts.appendChild(h('span','spacer')); }
    acts.appendChild(btn('btn ghost','Cancel', ()=>closePanel()));
    acts.appendChild(btn('btn','Save', ()=>{
      read(); if(cat.value==='Mileage'){ mileage(true); read(); }
      if(!e.asset && !e.rcptPending && !e.name && !e.cat && !(X.num(e.amt)>0)){ say('Add the receipt or a few details first.'); return; }
      if(!e.who) e.who=me(); if(!e.by) e.by=me();
      if(touched.trip && e.auto) e.auto.trip=0;
      e.reading=0;
      /* saved as it is: anything the policy flags is flagged, never stopped */
      save(e, opened); closePanel();
      const miss=X.missing(e);
      say(!miss.length ? (isNew ? 'Expense added.' : 'Saved.') : 'Saved. Still missing: '+miss.join(', ')+'.');
    }));
    body.appendChild(acts);
  });
}

/* ================= emailed receipts (expense@mismo.org) =================
   A Power Automate flow saves each email (who sent it, the subject, its text and any receipt photos or PDFs) into the
   expinbox file. Team HQ turns each into a draft expense for the person who sent it, reads it the same way a snapped
   receipt is read, and the person reviews it. A receipt that is the email itself (Uber, airlines) is kept as a PDF.
   Jonna and Vanessa see emails from someone Team HQ can't match, and pick whose they are; a contractor's receipt goes to
   their own expenses in the Service Orders portal. */
const ADDR='expense@mismo.org';
let docs={}, lastRead=0, ibusy=false;
const local=a=>String(a||'').toLowerCase().trim().split('@')[0];
const dom=a=>String(a||'').toLowerCase().trim().split('@')[1]||'';
const OURS=/^(mismo\.org|mba\.org)$/;
const norm=t=>String(t||'').toLowerCase().replace(/["'()]/g,' ').replace(/\s+/g,' ').trim();
function byName(name){ let n=norm(name); if(!n) return null; if(n.indexOf(',')>0){ const [a,b]=n.split(','); n=norm(b+' '+a); }
  const ppl=S.people||[]; let p=ppl.find(z=>norm(z.name)===n); if(p) return p.id;
  const w=n.split(' '); if(w.length>=2){ const m=ppl.filter(z=>{ const zw=norm(z.name).split(' '); return zw[0]===w[0] && zw[zw.length-1]===w[w.length-1]; }); if(m.length===1) return m[0].id; }
  return null; }
function whoFrom(addr, name, d){ if(d && d.assign) return d.assign;
  if(OURS.test(dom(addr))){ const l=local(addr); const p=(S.people||[]).find(p=>p.email && local(p.email)===l); if(p) return p.id; }
  return byName(name); }
const clean=t=>String(t||'').replace(/^\s*CAUTION:[\s\S]*?(content is safe\.?|is safe\.)\s*/i,'').replace(/\s+\n/g,'\n').trim();
const atOf=d=>{ const t=Date.parse(d.at||d.received||''); return isNaN(t) ? 0 : t; };
async function readAll(){ const R=window.__hqRelay; if(!R || !R.readOther) return null; try{ const f=await R.readOther('team-hq','expinbox'); return (f && f.docs) || {}; }catch(e){ return null; } }
function setDoc(id, d){ return S.db.collection('expinbox').doc(id).set(d); }

/* the email itself as the receipt: its text as a one-file PDF */
const LAT={'‘':"'",'’':"'",'‚':"'",'“':'"','”':'"','–':'-','—':'-','•':'*','…':'...',' ':' ',' ':' ','​':'','‌':'','‍':'','﻿':'','™':'(TM)','€':'EUR '};
const latin=t=>String(t||'').replace(/[^\x09\x0a\x20-\x7e\xa1-\xff]/g, c=>LAT[c]!=null ? LAT[c] : '');
function receiptLines(text){
  let t=clean(text).replace(/\r/g,'').replace(/\[\s*(https?|cid|mailto):[^\]]*\]/gi,'').replace(/<\s*(https?|mailto):[^>]*>/gi,'').replace(/^\s*https?:\/\/\S+\s*$/gim,'');
  t=latin(t).split('\n').map(l=>l.replace(/[ \t]+/g,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim();
  const out=[]; for(const raw of t.split('\n')){ let l=raw; if(!l){ out.push(''); continue; }
    while(l.length>92){ let k=l.lastIndexOf(' ', 92); if(k<40) k=92; out.push(l.slice(0,k)); l=l.slice(k).trim(); } out.push(l); }
  return out.slice(0, 52*8);
}
function pdfBlob(title, sub, lines){
  const W=612, H=792, M=54, LH=13, PER=Math.floor((H-2*M)/LH)-3;
  const esc=s=>latin(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const pages=[]; for(let i=0;i<Math.max(1,lines.length);i+=PER) pages.push(lines.slice(i,i+PER));
  const objs=[]; const add=s=>{ objs.push(s); return objs.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>'); add('');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids=[];
  pages.forEach((pg, n)=>{
    let c='BT /F2 12 Tf '+M+' '+(H-M)+' Td ('+esc(title)+') Tj ET\n';
    c+='BT /F1 9 Tf '+M+' '+(H-M-15)+' Td ('+esc(sub+(pages.length>1 ? '   Page '+(n+1)+' of '+pages.length : ''))+') Tj ET\n';
    c+='BT /F1 10 Tf '+LH+' TL '+M+' '+(H-M-3*LH)+' Td\n'+pg.map(l=>'('+esc(l)+') Tj T*').join('\n')+'\nET';
    const cs=add('<< /Length '+c.length+' >>\nstream\n'+c+'\nendstream');
    kids.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+cs+' 0 R >>')); });
  objs[1]='<< /Type /Pages /Kids ['+kids.map(k=>k+' 0 R').join(' ')+'] /Count '+kids.length+' >>';
  let out='%PDF-1.4\n'; const off=[];
  objs.forEach((o,i)=>{ off.push(out.length); out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'; });
  const x=out.length;
  out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('');
  out+='trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF';
  const b=new Uint8Array(out.length); for(let i=0;i<out.length;i++) b[i]=out.charCodeAt(i)&255;
  return new Blob([b], {type:'application/pdf'});
}
async function emailReceipt(eid, text, via){
  if(TEST) return false;
  const x=expOf(eid); if(!x || x.asset) return false;
  const lines=receiptLines(text); if(lines.join('').length<40) return false;
  const a=await window.claude.use('assets'); if(!a) return false;
  const subj=String((via && via.subject) || x.name || 'Emailed receipt').replace(/^\s*\[[^\]]*\]\s*/,'');
  const nm=('Receipt - '+subj).replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,90)+'.pdf';
  const when=via && via.at ? new Date(via.at) : null;
  const sub='Emailed to '+ADDR+(via && via.from ? ' by '+via.from : '')+(when && !isNaN(when) ? ' on '+when.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '');
  const r=await a.upload(new File([pdfBlob(subj, sub, lines)], nm, {type:'application/pdf'}), {folder:'receipts'}); if(!r || !r.id) return false;
  change(eid, {asset:r.id, rcptName:nm, rcptType:'application/pdf', receipt:1}); return true;
}
/* one email: one expense per receipt (or one from the email itself when nothing is attached). The same email sent again
   updates what it already made instead of adding it twice. */
async function importOne(id, d, who){
  const now=Date.now(), claim={by:me(), at:now};
  await setDoc(id, Object.assign({}, d, {claim})); await new Promise(r=>setTimeout(r, 2500));
  const fresh=await readAll(), cur=fresh && fresh[id];
  if(!cur || cur.done || !cur.claim || cur.claim.by!==me() || cur.claim.at!==now) return;   /* another open Team HQ has it */
  const files=(Array.isArray(d.files) ? d.files : []).filter(f=>f && f.path);
  const note=String(d.subject||'').replace(/^\s*(fwd?|fw|re)\s*:\s*/i,'').trim();
  const via={id, from:d.from||'', subject:note, at:d.at||''};
  const text=clean(d.text||'') || clean(d.preview||''), sent=(d.at||'').slice(0,10), made=[];
  const same=x=>x.viaEmail && !x.submitted && x.who===who && x.viaEmail.from===via.from && x.viaEmail.subject===via.subject;
  if(files.length){
    for(const f of files){
      let blob=null; try{ blob=await attBlob(f.path); if(blob && !blob.type && f.type) blob=new Blob([blob], {type:f.type}); }catch(err){}
      const twin=E().find(x=>same(x) && (x.rcptName===(f.name||'receipt') || x.asset===f.path));
      let eid;
      if(twin){ eid=twin.id; if(twin.asset!==f.path) change(eid, {asset:f.path, rcptType:f.type||twin.rcptType, viaEmail:via}); if(!X.missing(twin).length){ made.push(eid); continue; } }
      else { const e={trip:'', who, by:me(), cat:'', date:'', name:'', receipt:1, rcptAmt:'', amt:'', submitted:0, notes:note ? 'Emailed: '+note : 'Emailed receipt',
          asset:f.path, rcptName:f.name||'receipt', rcptType:f.type||'', at:Date.now(), reading:Date.now(), viaEmail:via}; eid=save(e); }
      made.push(eid);
      try{ if(blob && /^image\/|pdf/i.test(blob.type||f.type||'')) await readAndSave(eid, blob);
        else if(text) await readAndSave(eid, null, text);
        else change(eid, {reading:0}); }
      catch(err){ change(eid, {reading:0, readFail:Date.now()}); }
    }
  } else {
    /* no attachment: the receipt is the email itself */
    const again=E().find(x=>same(x) && (x.viaEmail.at===via.at || !x.asset));
    let eid;
    if(again){ eid=again.id; if(text && again.date===sent && !again.readAt) change(eid, {date:''}); }
    else eid=save({trip:'', who, by:me(), cat:'', date:text ? '' : sent, name:note.slice(0,80), receipt:0, rcptAmt:'', amt:'', submitted:0,
      notes:'Emailed: '+note, at:Date.now(), reading:text ? Date.now() : 0, viaEmail:via});
    made.push(eid);
    if(text){ try{ await readAndSave(eid, null, text); }catch(err){} }
    if(d.text){ try{ await emailReceipt(eid, d.text, via); }catch(err){} }
    const x=expOf(eid); if(x && !x.date) change(eid, {date:sent});
  }
  const fin=Object.assign({}, cur, {claim:null, done:Date.now(), doneBy:me(), who, exp:made}); delete fin.text;
  await setDoc(id, fin);
}
/* contractors who claim expenses (Can Claim Expenses in the Service Orders portal): their receipts go there */
const SO_COS=[{key:'so-phoenix',slug:'phoenixteam'},{key:'so-actualize',slug:'actualize'},{key:'so-trex',slug:'trex'},{key:'so-falcon',slug:'falcon'},{key:'so-trudigital',slug:'trudigital'}];
let roster=null, rosterAt=0;
const relayBase=()=>{ const R=window.__hqRelay; return (R && R.config && R.config.RELAY_URL) || ''; };
function soCall(proj, path, method, body){
  const RS=window.ResourcesSession, tok=RS && RS.token && RS.token(); if(!tok) return Promise.reject({status:401});
  const headers={'Authorization':'Bearer '+tok}; if(body) headers['Content-Type']='application/json';
  return fetch(relayBase()+'/'+encodeURIComponent(proj)+path, {method, cache:'no-store', headers, body:body?JSON.stringify(body):undefined})
    .then(r=>r.json().catch(()=>({})).then(b=>{ if(r.ok) return b; const e=new Error((b&&b.message)||('HTTP '+r.status)); e.status=r.status; e.body=b; throw e; }));
}
const enc=p=>String(p).split('/').map(encodeURIComponent).join('/');
const b64json=b=>{ const bin=atob((b&&b.content)||''), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); const t=new TextDecoder('utf-8').decode(u); return t?JSON.parse(t):null; };
async function loadRoster(){
  if(roster && Date.now()-rosterAt<10*60e3) return roster;
  const out=[];
  await Promise.all(SO_COS.map(async c=>{ try{ const F=b64json(await soCall(c.key, '/file/'+enc('orders-public/'+c.slug+'.json'), 'GET')), now=new Date();
    (F && F.people || []).forEach(p=>{ if(!p || !p.expenses) return;
      if(p.activeTo){ const m=/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(p.activeTo); if(m){ const y=+m[3]<100?2000+ +m[3]:+m[3]; if(new Date(y,+m[1]-1,+m[2],23,59)<now) return; } }
      out.push({key:c.key, slug:c.slug, company:F.company||c.slug, fy:F.fiscalYear||'FY 2027', pslug:p.slug, name:p.name||'', email:String(p.email||'').toLowerCase()}); }); }catch(e){} }));
  roster=out; rosterAt=Date.now(); return roster;
}
function contractorFor(d){
  if(!roster) return null;
  if(d && d.assignSo){ const [k,s]=String(d.assignSo).split('|'); return roster.find(r=>r.key===k && r.pslug===s) || null; }
  const a=String(d && d.from || '').toLowerCase().trim();
  let r=a && roster.find(x=>x.email && x.email===a); if(r) return r;
  if(OURS.test(dom(a))){ const l=local(a); r=roster.find(x=>{ const w=norm(x.name).replace(/[^a-z ]/g,'').split(' ').filter(Boolean); return w.length>1 && (w[0][0]+w[w.length-1])===l; }); if(r) return r; }
  let n=norm(d && d.fromName); if(!n) return null; if(n.indexOf(',')>0){ const [x,y]=n.split(','); n=norm(y+' '+x); }
  r=roster.filter(x=>norm(x.name)===n); if(r.length===1) return r[0];
  const w=n.split(' '); if(w.length>=2){ r=roster.filter(x=>{ const zw=norm(x.name).split(' '); return zw[0]===w[0] && zw[zw.length-1]===w[w.length-1]; }); if(r.length===1) return r[0]; }
  return null;
}
const SO_CATS=X.CATS.slice();
async function soRead(blob, text, who){
  const s=await window.claude.use('sample'); if(!s) return null;
  const pr='You are reading a receipt for a contractor’s MISMO expense claim ('+(who||'a contractor')+'). '+
    (blob ? 'The attached file is a photo, screenshot or PDF of a receipt, invoice, hotel folio or ticket.' : 'There is no photo; the receipt is this email, as plain text.')+'\n'+
    'Return ONLY one JSON object, no other text: {"isReceipt":true,"merchant":"","date":"","total":null,"currency":"USD","type":"","description":""}\n'+
    '- date: the purchase date as YYYY-MM-DD (a hotel folio: the check-out date). Today is '+X.iso(Date.now())+'.\n'+
    '- total: the final amount paid, tax and tip included, as a number; null if unreadable. Never guess.\n'+
    '- type: exactly one of '+JSON.stringify(SO_CATS)+', or "". Meals by the time on the receipt: before 10:30 breakfast, to 16:00 lunch, after that dinner; coffee or under $10 is a snack.\n'+
    '- description: a few plain words, e.g. "Dinner at Blue Door", "Uber from airport to hotel", "2 nights, Jan 11-13".\n'+
    '- Anything not shown stays "" or null. Not a receipt at all: isReceipt false.'+(text ? '\n\nThe email:\n\n'+String(text).slice(0,6000) : '');
  const opts={modelTier:'default'}; if(blob) opts.images=[blob];
  const res=await s(pr, opts); const r=parseJSON(res && res.text); return r && r.isReceipt===false ? null : r;
}
function soDate(isoD){ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoD||'')); return m ? m[2]+'/'+m[3]+'/'+m[1].slice(2) : ''; }
function soSummit(d){ const m=/^(\d{2})\/(\d{2})\/(\d{2})$/.exec(d||''); if(!m) return '';
  const mo=+m[1]-1, y=2000+ +m[3]; const SS={0:['Winter',0],11:['Winter',1],5:['Spring',0],4:['Spring',0],8:['Fall',0],7:['Fall',0]}[mo];
  return SS ? 'MISMO '+SS[0]+' Summit '+(y+SS[1]) : ''; }
function soShrink(blob){
  return new Promise(res=>{ if(!/^image\//.test(blob.type||'')) return res(null);
    const url=URL.createObjectURL(blob), im=new Image();
    im.onload=()=>{ const w=im.naturalWidth, h0=im.naturalHeight, sc=Math.min(1, 1600/Math.max(w,h0));
      const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(w*sc)); cv.height=Math.max(1,Math.round(h0*sc));
      const x=cv.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,cv.width,cv.height); x.drawImage(im,0,0,cv.width,cv.height); URL.revokeObjectURL(url);
      let out=null; for(const q of [0.82,0.7,0.6,0.5,0.4]){ out=cv.toDataURL('image/jpeg',q).split(',')[1]||''; if(out.length<=650*1024) break; }
      res(out && out.length<=650*1024 ? {b64:out, ext:'jpg', shrunk:sc<1} : null); };
    im.onerror=()=>{ URL.revokeObjectURL(url); res(null); }; im.src=url; });
}
const blobB64=b=>new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]||''); r.onerror=rej; r.readAsDataURL(b); });
async function soHead(key){ try{ await soCall(key, '/commit', 'POST', {message:'head probe', parentSha:'0000000000000000000000000000000000000000', files:[{path:'notify/.head-probe', content:'{}'}]}); return null; }
  catch(e){ return (e && e.status===409 && e.body && e.body.head) || null; } }
async function routeToContractor(id, d, c){
  if(TEST) return;
  const now=Date.now(), claim={by:me(), at:now}; await setDoc(id, Object.assign({}, d, {claim})); await new Promise(r=>setTimeout(r, 2500));
  const fresh=await readAll(), cur=fresh && fresh[id];
  if(!cur || cur.done || !cur.claim || cur.claim.by!==me() || cur.claim.at!==now) return;
  const note=String(d.subject||'').replace(/^\s*(fwd?|fw|re)\s*:\s*/i,'').trim(), via={id, from:d.from||'', subject:note, at:d.at||''};
  const text=clean(d.text||'') || clean(d.preview||''), sent=soDate(String(d.at||'').slice(0,10));
  const files=(Array.isArray(d.files) ? d.files : []).filter(f=>f && f.path), made=[];
  const one=async (blob, f)=>{
    let r=null; try{ r=await soRead(blob, blob ? '' : text, c.name); }catch(e){ r=null; }
    const eid='x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const e={id:eid, date:'', cat:'', amt:'', desc:'', trip:'', tripAuto:false, receipt:false, state:'draft', viaEmail:via, at:new Date().toISOString()}, filled=[];
    if(r){ const dt=soDate(r.date); if(dt){ e.date=dt; filled.push('date'); }
      const tot=Number(r.total), usd=String(r.currency||'USD').toUpperCase()==='USD';
      if(tot>0){ e.rcptAmt=Math.round(tot*100)/100; if(usd){ e.amt=e.rcptAmt; filled.push('amt'); } }
      if(SO_CATS.indexOf(r.type)>=0){ e.cat=r.type; filled.push('cat'); }
      const ds=[r.merchant, r.description].map(x=>String(x||'').trim()).filter(Boolean);
      if(!usd && tot>0) ds.push('paid '+tot.toFixed(2)+' '+String(r.currency).toUpperCase()+', not yet in dollars');
      if(ds.length){ e.desc=ds.join(' — ').slice(0,140); filled.push('desc'); } }
    if(!e.date) e.date=sent; if(!e.desc) e.desc=note.slice(0,140);
    const tr=soSummit(e.date); if(tr){ e.trip=tr; e.tripAuto=true; }
    let bin=null;
    if(blob){ let got=await soShrink(blob);
      if(!got && /pdf/i.test(blob.type||f.type||'')){ const b=await blobB64(blob); if(b.length<=650*1024) got={b64:b, ext:'pdf', shrunk:false}; }
      if(got){ const path='hours/receipts/'+c.pslug+'-'+eid+'.'+got.ext; bin={path, b64:got.b64};
        Object.assign(e, {receipt:true, receiptFile:path, receiptName:(f && f.name)||('receipt.'+got.ext), receiptBytes:got.b64.length, receiptShrunk:!!got.shrunk}); }
      else e.desc=(e.desc ? e.desc+' — ' : '')+'the emailed receipt was too large to attach; add a photo of it'; }
    else if(text){ e.receipt=true; e.desc=e.desc||note; }
    if(filled.length) e.readFrom={at:new Date().toISOString(), filled, by:'the emailed receipt'};
    made.push({e, bin}); };
  if(files.length){ for(const f of files){ let blob=null; try{ blob=await attBlob(f.path); if(blob && !blob.type && f.type) blob=new Blob([blob],{type:f.type}); }catch(e){} await one(blob, f); } }
  else await one(null, null);
  const path='hours/'+c.pslug+'-fy'+String(c.fy).replace(/\D+/g,'')+'.json';
  for(let tries=0; tries<5; tries++){
    const head=await soHead(c.key);
    let file=null; try{ file=b64json(await soCall(c.key, '/file/'+enc(path), 'GET')); }catch(e){ if(e.status!==404) throw e; }
    file=file || {person:c.name, slug:c.pslug, email:c.email||null, fiscalYear:c.fy, draft:null, weeks:[]};
    const have=(file.expenses||[]).filter(x=>x && x.viaEmail && x.viaEmail.id===id);
    if(have.length){ made.length=0; have.forEach(x=>made.push({e:x, bin:null})); break; }
    file.expenses=(file.expenses||[]).concat(made.map(m=>m.e));
    const body={message:'emailed receipt for '+c.name+' (from expense@mismo.org)',
      files:made.filter(m=>m.bin).map(m=>({path:m.bin.path, content:m.bin.b64, encoding:'base64'})).concat([{path, content:JSON.stringify(file, null, 1)}])};
    if(head) body.parentSha=head;
    try{ await soCall(c.key, '/commit', 'POST', body); break; }
    catch(e){ if(e.status===409 && tries<4){ await new Promise(r=>setTimeout(r, 400+300*tries)); continue; } throw e; }
  }
  const fin=Object.assign({}, cur, {claim:null, done:Date.now(), doneBy:me(), so:{key:c.key, company:c.company, slug:c.pslug, person:c.name}, exp:made.map(m=>m.e.id)}); delete fin.text;
  await setDoc(id, fin);
}
async function tick(force){
  if(ibusy || !me() || !S.db) return; if(!force && Date.now()-lastRead<60e3) return;
  ibusy=true;
  try{ const all=await readAll(); if(!all) return; docs=all; lastRead=Date.now();
    const sa=seesAll(); if(sa){ try{ await loadRoster(); }catch(e){} }
    for(const [id, d] of Object.entries(docs)){
      if(!d || d.done || d.skip) continue;
      const who=d.assignSo ? null : whoFrom(d.from, d.fromName, d);
      const busyElse=d.claim && Date.now()-(d.claim.at||0)<120e3 && d.claim.by!==me();
      if(!who){ const c=sa ? contractorFor(d) : null; if(c && !busyElse){ try{ await routeToContractor(id, d, c); }catch(e){ console.warn('expense inbox (contractor)', e); } } continue; }
      if(who!==me() && !sa) continue;
      if(busyElse) continue;
      try{ await importOne(id, d, who); }catch(e){ console.warn('expense inbox', e); }
    }
    const again=await readAll(); if(again) docs=again;
  } finally { ibusy=false; if(S.tab==='expenses' && !root.hidden) draw(); }
}
/* Jonna and Vanessa: an emailed receipt from someone Team HQ can't match waits here for them to pick whose it is */
function inboxBox(r){
  if(!seesAll() || isPhone()) return;
  const L=Object.entries(docs).map(([id,d])=>Object.assign({id}, d)).filter(d=>!d.done && !d.skip && !d.so && !(d.claim && Date.now()-(d.claim.at||0)<120e3))
    .filter(d=>!whoFrom(d.from, d.fromName, d) && !contractorFor(d)).sort((a,b)=>atOf(b)-atOf(a));
  if(!L.length) return;
  const box=h('div','x2-in'); const hd=h('div','x2-inh');
  hd.appendChild(h('b',null, L.length===1 ? 'An Emailed Receipt Needs a Person' : L.length+' Emailed Receipts Need a Person'));
  hd.appendChild(h('small',null,'Sent to '+ADDR+' from an address Team HQ doesn’t know. Pick whose it is and it goes into their expenses.')); box.appendChild(hd);
  const ul=h('ul');
  L.slice(0,8).forEach(d=>{ const li=h('li');
    li.appendChild(h('span','w', d.fromName ? d.fromName+' ('+d.from+')' : (d.from||'Someone')));
    const n=Array.isArray(d.files) ? d.files.length : 0;
    li.appendChild(h('span','s', (d.subject||'(no subject)')+(n ? ' · '+n+(n===1?' receipt':' receipts') : ' · the email is the receipt')+(atOf(d) ? ' · '+X.short(atOf(d)) : '')));
    const s=h('select','asg'); s.setAttribute('aria-label','Whose expense is this?'); s.appendChild(new Option('Whose is it?',''));
    (S.people||[]).forEach(p=>s.appendChild(new Option(p.name, p.id)));
    if(roster && roster.length){ const og=document.createElement('optgroup'); og.label='Contractors (Service Orders)';
      roster.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>og.appendChild(new Option(c.name+' · '+c.company, 'so|'+c.key+'|'+c.pslug))); s.appendChild(og); }
    s.addEventListener('change', async ()=>{ if(!s.value) return; s.disabled=true;
      try{ const cur=Object.assign({}, docs[d.id]||{}); if(s.value.indexOf('so|')===0){ cur.assignSo=s.value.slice(3); delete cur.assign; } else { cur.assign=s.value; delete cur.assignSo; }
        await setDoc(d.id, cur); docs[d.id]=cur; say('Adding it for '+(s.value.indexOf('so|')===0 ? 'them' : first(s.value))+'…'); await tick(true); }
      catch(e){ s.disabled=false; say('That didn’t save. Try again in a moment.'); } });
    li.appendChild(s); ul.appendChild(li); });
  box.appendChild(ul); if(L.length>8) box.appendChild(h('div','x2-more','+'+(L.length-8)+' more'));
  r.appendChild(box);
}

/* ================= the sweeps: entered, a week-old reminder, and trips for receipts read elsewhere ================= */
function sweep(){
  if(!Array.isArray(S.nudges) || !me() || !fileLoaded()) return;
  const N=S.nudges, have=new Set(N.map(n=>n.id)), EA=E();
  /* every expense entered: close the "ready to enter" note and tell the owner */
  N.forEach(n=>{ if(n.kind!=='exp-ready' || n.done) return; const T=X.tripOf(EA, n.who, n.trip); if(T.state!=='entered') return;
    nudge(Object.assign({}, n, {done:1}));
    const id='expin-'+n.who+'-'+X.slug(n.trip), prev=N.find(z=>z.id===id);
    if(n.who!==X.procOf(n.who) && (!prev || prev.done)) nudge({id, to:n.who, by:X.procOf(n.who), k:'Expenses', kind:'exp-entered', who:n.who, trip:n.trip,
      m:'Your '+n.trip+' expenses are entered in DataBasics ('+X.money(T.total)+').', go:'expenses', at:Date.now()}); });
  /* my own trips: one reminder once the last expense is a week old and the trip still hasn't been sent */
  const now=Date.now();
  X.tripsOf(EA, me()).forEach(T=>{ if(X.entersOwn(me()) || T.state!=='adding' || !T.last) return;
    if(now-T.last<7*X.DAY || now-T.last>60*X.DAY) return;
    const id='expremind-'+T.who+'-'+X.slug(T.trip); if(have.has(id)) return; have.add(id);
    nudge({id, to:T.who, k:'Expenses', kind:'exp-remind', who:T.who, trip:T.trip, m:'Are your '+T.trip+' expenses all in? Tap '+goLabel(T.who)+' on the trip in Expenses.', go:'expenses', at:now}); });
  /* my receipts from the last 3 days that were read on another device: put them on my trip nearby */
  EA.forEach(e=>{ if(e.submitted || e.tripFixed || (e.who!==me() && e.by!==me()) || reading(e) || !e.at || now-e.at>3*X.DAY || !e.readAt) return;
    const to=X.placeTrip(EA, e); const o={tripFixed:1}; if(to){ o.trip=to; o.auto=Object.assign({}, e.auto||{}, {trip:1}); } change(e.id, o); });
}

/* ================= look ================= */
const css=h('style'); css.id='x2-css'; css.textContent=`
#app-expenses.x2{gap:12px}
.x2 .x2-snap{margin:0}
.x2 .x2-snap{display:flex;align-items:center;justify-content:center;min-height:110px;border:2px dashed var(--sky);background:var(--sky-wash);border-radius:8px}
.x2 .x2-snap .ph{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.x2 .x2-snap .ph span{font-size:16px;font-weight:700;color:var(--ink)}.x2 .x2-snap .ph small{font-size:12.5px;color:var(--ink-2);max-width:440px}
.x2 .x2-snap svg{width:32px;height:32px;fill:none;stroke:var(--navy);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
:root[data-theme="dark"] .x2 .x2-snap svg{stroke:var(--sky)}
.x2 .x2-snap.over{background:var(--surface-3)}
.x2-bar0{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.x2-sp{flex:1 1 auto}
.x2-seg{display:inline-flex;border:1px solid var(--border-strong);border-radius:5px;overflow:hidden}
.x2-seg button{font:inherit;font-size:13px;font-weight:600;padding:6px 12px;border:0;border-right:1px solid var(--border-strong);background:var(--surface);color:var(--ink);cursor:pointer;min-height:32px}
.x2-seg button:last-child{border-right:0}.x2-seg button[aria-pressed="true"]{background:var(--navy);color:#fff}
:root[data-theme="dark"] .x2-seg button[aria-pressed="true"]{background:var(--sky);color:var(--navy-deep)}
.x2-tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.x2-tiles .exptile{border-radius:6px;padding:11px 13px}.x2-tiles .exptile b{font-size:21px}
.x2-ready{border:1px solid var(--border);border-left:4px solid var(--good);border-radius:6px;background:var(--surface);overflow:hidden;box-shadow:var(--shadow)}
.x2-rh{display:flex;align-items:baseline;gap:10px;padding:10px 14px;border-bottom:1px solid var(--rule)}.x2-rh b{font-size:15px}.x2-rh small{color:var(--ink-3);font-size:12.5px}
.x2-rr{display:grid;grid-template-columns:90px minmax(0,1fr) auto auto auto auto;gap:4px 14px;align-items:center;padding:9px 14px;border-top:1px solid var(--rule);font-size:13.5px;cursor:pointer}
.x2-rh + .x2-rr{border-top:0}.x2-rr:hover{background:var(--surface-2)}.x2-rw{font-weight:700}.x2-rt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.x2-rt small{color:var(--warn);font-weight:600}
.x2-rn,.x2-rd{color:var(--ink-3);font-size:12.5px;white-space:nowrap}.x2-rs{font-weight:700;white-space:nowrap}.x2-rq{grid-column:2/-1;color:var(--ink-2);font-size:12.5px;font-style:italic}.x2-re{white-space:nowrap}
.x2-jump{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.x2-jl{font-size:12.5px;font-weight:700;color:var(--ink-3);margin-right:4px}
.x2-jb{font:inherit;font-size:13.5px;font-weight:600;border:1px solid var(--border-strong);background:var(--surface);color:var(--ink);border-radius:5px;padding:6px 10px;cursor:pointer;display:inline-flex;align-items:baseline;gap:6px;min-height:34px}
.x2-jb small{font-weight:600;font-size:11.5px;color:var(--warn)}.x2-jb:hover{border-color:var(--navy)}
.x2-pers{display:flex;flex-direction:column;gap:8px}
.x2-ph{display:flex;align-items:center;gap:10px;margin:6px 0 0;padding:0 2px 6px;border-bottom:2px solid var(--navy);cursor:pointer}
:root[data-theme="dark"] .x2-ph{border-bottom-color:var(--sky)}
.x2-ph b{font-size:16px}.x2-ph small{font-size:12.5px;color:var(--ink-3)}.x2-ph .amt{font-weight:700;white-space:nowrap}.x2-pdl{display:inline-flex;gap:6px;margin-left:auto}.x2-alldone{font-size:12.5px;font-weight:600;color:var(--good);white-space:nowrap}
.x2-chev{display:inline-block;width:14px;color:var(--ink-3);font-size:12px;flex:0 0 auto}
.x2-trip{border-radius:6px}.x2-trip.x2-hit{box-shadow:0 0 0 3px var(--sky)}
.x2 .x2-th{width:100%;font:inherit;text-align:left;border:0;cursor:pointer;color:var(--ink)}
.x2 .x2-th .tn{flex:1 1 200px}
.x2 .x2-done{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 15px;border-bottom:1px solid var(--rule);background:var(--surface-2);font-size:13px;color:var(--ink-2)}
.x2 .x2-done .ed-t{flex:1 1 220px;min-width:0}.x2 .x2-done b{color:var(--ink)}.x2 .x2-done.ed-sent{background:var(--good-soft)}.x2 .x2-done.ed-sent b{color:var(--good)}.x2 .x2-done.ed-reopened{background:var(--warn-soft)}
.x2 .x2-done .btn{white-space:nowrap}.x2 .x2-done .ed-go{min-height:34px}
.x2-rows .exprow{width:100%;font:inherit;text-align:left;border-left:0;border-right:0;border-top:0;background:var(--surface);color:var(--ink);cursor:pointer}
.x2-rows .exprow.flag{background:var(--warn-soft)}
.x2 .exprow .rc svg{width:15px;height:15px;fill:none;stroke:var(--ink-3);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.x2 .exprow .rc.none svg{stroke:var(--bad)}
.chip.ch-od{background:var(--bad-soft);color:var(--bad)}
.x2-pick{display:grid;gap:8px;padding:10px 15px;border-bottom:1px solid var(--rule);background:var(--surface)}
.x2-pl{font-size:13px;font-weight:600;color:var(--ink)}.x2-pb{display:flex;flex-wrap:wrap;gap:6px}
.x2-pbt{font:inherit;font-size:14px;font-weight:600;text-align:left;border:1px solid var(--border-strong);background:var(--surface);color:var(--ink);border-radius:5px;padding:8px 12px;cursor:pointer;min-height:44px}
.x2-pbt small{display:block;font-weight:500;font-size:12px;color:var(--ink-3)}.x2-pbt.best{border-color:var(--navy);box-shadow:inset 0 0 0 1px var(--navy)}.x2-pbt:disabled{opacity:.6}
.x2-nt{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.x2-nt .x2-pl{flex-basis:100%}
.x2-nt input{flex:1 1 220px;min-width:0;min-height:40px;font:inherit;font-size:16px;padding:6px 10px;border:1px solid var(--border-strong);border-radius:5px;background:var(--surface);color:var(--ink)}
.x2-nt .btn{min-height:40px;white-space:nowrap}
.x2-ent{border:1px solid var(--border);border-radius:6px;background:var(--surface);overflow:hidden}
.x2-enth{display:flex;align-items:center;gap:10px;width:100%;font:inherit;font-size:14px;text-align:left;padding:11px 15px;border:0;background:var(--surface-2);color:var(--ink);cursor:pointer}
.x2-enth small{color:var(--ink-3);font-size:12.5px}.x2-enth .amt{margin-left:auto;font-weight:700}.x2-entb{display:flex;flex-direction:column;gap:10px;padding:10px}
.x2-in{padding:12px 14px;border:1px solid var(--border);border-left:3px solid var(--sky);border-radius:6px;background:var(--surface)}
.x2-inh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.x2-inh b{font-size:14.5px}.x2-inh small{font-size:12.5px;color:var(--ink-2)}
.x2-in ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.x2-in li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px 9px;border-radius:5px;background:var(--surface-2);font-size:13px}
.x2-in li .w{font-weight:700;white-space:nowrap}.x2-in li .s{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-2)}
.x2-in li .asg{font:inherit;font-size:12.5px;padding:3px 6px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--ink)}.x2-more{margin-top:6px;font-size:12px;color:var(--ink-3)}
.x2-rules{font-size:12.5px}
.x2-dlg .x2-db{font-size:14px;line-height:1.45}.x2-dlg .x2-db p{margin:6px 0 10px}.x2-warn ul{margin:4px 0 4px 18px;padding:0}.x2-warn small{display:block}
.x2-note{display:block}.x2-note span{display:block;font-size:13px;font-weight:600;margin-bottom:4px}
.x2-note textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;border:1px solid var(--border-strong);border-radius:5px;padding:8px;background:var(--surface);color:inherit}
.x2-who{display:grid;gap:6px;margin:6px 0 10px}
.x2-wb{display:flex;align-items:baseline;justify-content:space-between;gap:10px;width:100%;font:inherit;font-size:14px;text-align:left;border:1px solid var(--border-strong);background:var(--surface);color:var(--ink);border-radius:5px;padding:10px 12px;cursor:pointer;min-height:44px}
.x2-wb small{color:var(--ink-3);font-size:12.5px}.x2-wb:hover{border-color:var(--navy)}.x2-wb.all{background:var(--surface-2)}.x2-wb:disabled{opacity:.5;cursor:default}
.x2-incl{margin:0 0 6px}
.x2-ed .x2-tripf{display:flex;flex-direction:column;gap:6px}.x2-ed .x2-tripf select,.x2-ed .x2-tripf input{width:100%;box-sizing:border-box}
.x2-ed .x2-mih{font-size:12px;color:var(--ink-2);margin-top:4px;line-height:1.35}.x2-ed .x2-ro{font-size:13.5px;padding:7px 0;color:var(--ink)}
.x2-ed .rcpt.over{border-color:var(--c1)}
@media (max-width:900px){.x2-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.x2-tiles .exptile:last-child{grid-column:1/-1}}
@media (max-width:640px){
  .x2 .x2-snap{min-height:150px}.x2-ph{flex-wrap:wrap}.x2-pdl{margin-left:0}
  .x2-rr{grid-template-columns:minmax(0,1fr) auto}.x2-rt{grid-column:1/-1;white-space:normal}.x2-re{grid-column:1/-1;justify-self:start}.x2-rq{grid-column:1/-1}
  .x2 .x2-th .amt{margin-left:auto}.x2-in li{grid-template-columns:1fr}
}
html.app-exp .x2 .x2-snap{min-height:170px}
`;
document.head.appendChild(css);

/* ================= taking over from the original page ================= */
/* The original page draws Expenses with its own function, which add-ons can't replace. It always starts by clearing
   the Expenses area; that moment draws this page instead, and whatever the original adds in the same go is dropped. */
const TC=Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
Object.defineProperty(root, 'textContent', {configurable:true, get(){ return TC.get.call(this); },
  set(v){ if(mineNow){ TC.set.call(this, v); return; } swallow=true; Promise.resolve().then(()=>{ swallow=false; }); draw(); }});
['appendChild','insertBefore','append','prepend','replaceChildren'].forEach(m=>{ const o=root[m]; root[m]=function(){ if(swallow && !mineNow) return arguments[0]; return o.apply(this, arguments); }; });
Object.assign(window.__exp2, {X, draw, edit, snap, send, sweep, tick:()=>tick(true), flushQueue, readyTrips, exportFor, receiptsFor, pickWho, placeTrip:e=>X.placeTrip(E(), e), docs:()=>docs, UI});
if(S.tab==='expenses'){ try{ window.__show('expenses'); }catch(e){} }
/* The base page can still open its own expense editor (its search, and the link to claim expenses for a trip).
   When it does, this editor opens in its place: the same expense (matched by name, date and amount), or a new one on that trip. */
(function(){ const pb=$id('panel-b'), pt=$id('panel-t'); if(!pb || !pt) return;
  new MutationObserver(()=>{ if(pb.classList.contains('x2-ed')) return; const t=pt.textContent; if(t!=='Edit Expense' && t!=='Add an Expense') return;
    const val=l=>{ const f=[...pb.querySelectorAll('.f')].find(x=>x.firstElementChild && x.firstElementChild.textContent.trim()===l); const c=f && f.querySelector('input,select'); return c ? String(c.value||'').trim() : ''; };
    if(!pb.querySelector('.f')) return;
    if(t==='Add an Expense'){ edit(null, val('Trip Name')); return; }
    const nm=val('Expense Name'), d=val('Expense Date'), a=val('Expense Amount');
    const x=E().find(z=>String(z.name||'').trim()===nm && String(z.date||'')===d && String(z.amt||'')===a); if(x) edit(x); }).observe(pb, {childList:true});
})();
/* the opening cover waits for this in the Expenses app; mark ready once the expenses file is in */
(function waitReady(n){ if(window.__exp2.ready) return; if(fileLoaded() && S.tab==='expenses' && !root.hidden){ draw(); return; } if(fileLoaded() && S.tab!=='expenses'){ window.__exp2.ready=true; return; } if(n<300) setTimeout(()=>waitReady(n+1), 100); })(0);
setTimeout(sweep, 8000); setInterval(()=>{ try{ sweep(); }catch(e){ console.error(e); } }, 60000);
const startIn=()=>{ if(S.ready && me() && window.__hqRelay){ tick(true); setInterval(()=>{ if(!document.hidden) tick(false); }, 120e3); } else setTimeout(startIn, 1000); };
setTimeout(startIn, 4000);
setTimeout(flushQueue, 5000); setInterval(()=>{ if(navigator.onLine) flushQueue(); }, 60000);
new MutationObserver(()=>{ if(!root.hidden) tick(false); }).observe(root, {attributes:true, attributeFilter:['hidden']});
})();
