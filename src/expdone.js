/* Expenses: "Done — Send to Vanessa" (13 Nov 2026).
   People don't enter their own expenses in DataBasics any more; Vanessa does. Each trip now has a button its owner
   taps once every expense for it is in. That marks the trip's expenses as sent (done, doneBy on each expense) and
   leaves Vanessa a nudge, which shows in her bell and under Asks for You. Her Expenses page lists the trips that
   are ready at the top, oldest first. When every expense in the trip is ticked "Entered and submitted", her nudge
   closes and the owner is told. An expense added after the trip was sent reopens it (Vanessa is told one more came
   in), and a trip whose last expense is a week old and still not sent gets one reminder for its owner.
   Who enters expenses: PROC. Nudges have fixed ids where they must only go once, so two open copies of Team HQ
   never send the same one twice. */
(function(){
'use strict';
if(window.__expDone && window.__expDone.destroy) window.__expDone.destroy();
const S=window.__S, root=document.getElementById('app-expenses');
if(!S || !root) return;
const PROC='vanessa', NOTRIP='No Trip Name Yet', DAY=864e5, MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const api=()=>window.__expApi;
const me=()=>S.me||'';
const person=id=>(S.people||[]).find(p=>p.id===id)||null;
const first=id=>{ const p=person(id); return p ? String(p.name||'').split(' ')[0] : 'Someone'; };
const procName=()=>first(PROC);
const slug=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'trip';
const money=n=>'$'+(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
const day=v=>{ const t=Date.parse(String(v||'').slice(0,10)+'T12:00:00'); return isNaN(t)?null:t; };
const fmt=t=>{ const d=new Date(t); return MON[d.getMonth()]+' '+d.getDate(); };
const seesAll=()=>{ try{ return !!(api() && api().seesAll()); }catch(e){ return false; } };
const h=(tag, cls, txt)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; };
const putExp=o=>api().put('expenses', o);
const putN=o=>window.__put ? window.__put('nudges', o) : Promise.resolve();

/* one person's expenses on one trip, and where the trip stands */
function tripOf(who, trip){
  const E=(S.expenses||[]).filter(x=>x.who===who && (x.trip||'')===trip);
  const open=E.filter(x=>!x.submitted), sent=open.filter(x=>x.done), fresh=open.filter(x=>!x.done);
  const state=!E.length ? 'none' : !open.length ? 'entered' : !sent.length ? 'adding' : fresh.length ? 'reopened' : 'sent';
  const when=sent.reduce((m,x)=>Math.max(m, x.done||0), 0);
  const last=E.reduce((m,x)=>{ const d=day(x.date); return d && d>m ? d : m; }, 0);
  return {who, trip, E, open, sent, fresh, state, when, last, sum:open.reduce((a,x)=>a+(Number(x.amt)||0),0)};
}
function allTrips(){ const seen={}, out=[];
  (S.expenses||[]).forEach(x=>{ if(!x.trip) return; const k=x.who+'|'+x.trip; if(seen[k]) return; seen[k]=1; out.push(tripOf(x.who, x.trip)); });
  return out; }

/* what still needs something before Vanessa can enter it (the same rules the expense list flags) */
function problems(E){ const out=[];
  E.forEach(x=>{ const amt=Number(x.amt)||0, meal=/^Meal Trvl/.test(x.cat||''), what=(x.name||x.cat||'An expense')+(amt?' ('+money(amt)+')':'');
    if(!x.cat || !x.date || !amt) out.push(what+': needs '+[!x.cat&&'a type', !x.date&&'a date', !amt&&'an amount'].filter(Boolean).join(', '));
    else if(x.cat!=='Mileage' && !x.receipt && !x.asset && amt>(meal?15:25)) out.push(what+': no receipt'); });
  return out; }

/* ---------- sending ---------- */
function dialog(title, build, okLabel, onOk){
  const ov=h('div','ed-ov'), bx=h('div','ed-dlg'); bx.setAttribute('role','dialog'); bx.setAttribute('aria-modal','true'); bx.setAttribute('aria-label', title);
  bx.appendChild(h('h2',null,title)); const body=h('div','ed-b'); bx.appendChild(body); build(body);
  const ft=h('div','ed-f'); const close=()=>{ ov.remove(); document.removeEventListener('keydown', esc); }; const esc=e=>{ if(e.key==='Escape') close(); };
  const no=h('button','btn ghost','Cancel'); no.type='button'; no.onclick=close; ft.appendChild(no);
  const ok=h('button','btn',okLabel); ok.type='button'; ok.onclick=async ()=>{ ok.disabled=true; no.disabled=true; ok.textContent='Sending…'; try{ await onOk(body); close(); }catch(e){ console.error(e); ok.disabled=false; no.disabled=false; ok.textContent=okLabel; toast('That didn’t send. Try again in a moment.'); } };
  ft.appendChild(ok); bx.appendChild(ft); ov.appendChild(bx); ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
  document.addEventListener('keydown', esc); document.body.appendChild(ov); setTimeout(()=>ok.focus(), 0);
}
let toastEl=null;
function toast(msg){ toastEl && toastEl.remove(); const t=toastEl=h('div','ed-toast',msg); document.body.appendChild(t); setTimeout(()=>{ t.remove(); if(toastEl===t) toastEl=null; }, 6000); }

function send(T){
  const L=T.state==='reopened' ? T.fresh : T.open, P=problems(L), again=T.state==='reopened', n=L.length;
  const other=T.who!==me(), your=other ? first(T.who)+'’s' : 'your';
  const title=again ? 'Send the New '+(n===1?'One':'Ones')+' to '+procName() : other ? 'Send '+first(T.who)+'’s '+T.trip+'?' : 'Done With '+T.trip+'?';
  dialog(title, b=>{
    b.appendChild(h('p',null, again
      ? n+(n===1?' expense was':' expenses were')+' added after '+(other?'this trip was':'you sent this trip')+' sent. '+(me()===PROC?'They will be marked ready to enter.':procName()+' will be told '+(n===1?'it is':'they are')+' ready to enter.')
      : (me()===PROC ? first(T.who)+'’s '+T.trip+' expenses will be marked ready to enter: ' : procName()+' will be told '+your+' '+T.trip+' expenses are ready to enter: ')+n+(n===1?' expense, ':' expenses, ')+money(T.sum)+'.'+(other ? ' '+first(T.who)+' sees it as sent by you.' : ' If more come in later, you can send those too.')));
    if(P.length){ const w=h('div','ed-warn'); w.appendChild(h('b',null, P.length===1 ? 'One still needs something:' : P.length+' still need something:'));
      const ul=h('ul'); P.slice(0,8).forEach(p=>ul.appendChild(h('li',null,p))); w.appendChild(ul);
      w.appendChild(h('small',null,'Cancel to fix '+(P.length===1?'it':'them')+' first, or send anyway and say why below.')); b.appendChild(w); }
    const lab=h('label','ed-note'); lab.appendChild(h('span',null,'Anything '+procName()+' should know? (Optional)'));
    const ta=h('textarea'); ta.rows=2; ta.id='ed-note'; lab.appendChild(ta); b.appendChild(lab);
  }, again ? 'Send to '+procName() : 'Send to '+procName(), async b=>{
    const note=String((b.querySelector('#ed-note')||{}).value||'').trim().slice(0,400), at=Date.now();
    await Promise.all(L.map(x=>putExp(Object.assign({}, api().expOf(x.id)||x, {done:at, doneBy:me()}))));
    (S.nudges||[]).filter(z=>/^exp-remind/.test(z.kind||'') && !z.done && z.who===T.who && z.trip===T.trip).forEach(z=>putN(Object.assign({}, z, {done:1})));
    if(T.who!==PROC && me()!==PROC){
      (S.nudges||[]).filter(z=>z.kind==='exp-ready' && !z.done && z.who===T.who && z.trip===T.trip).forEach(z=>putN(Object.assign({}, z, {done:1})));
      const tot=tripOf(T.who, T.trip);
      const m=again ? first(T.who)+' added '+n+' more to '+T.trip+': ready to enter ('+tot.open.length+' in all, '+money(tot.sum)+')'
                    : first(T.who)+'’s '+T.trip+' expenses are ready to enter ('+n+', '+money(T.sum)+')';
      await putN({id:'expready-'+T.who+'-'+slug(T.trip)+'-'+at.toString(36), to:PROC, by:T.who, k:'Expenses', kind:'exp-ready', who:T.who, trip:T.trip,
        m:m+(other ? ' (sent by '+first(me())+')' : '')+(note ? ' — “'+note+'”' : ''), note, go:'expenses', at});
    }
    toast(T.who===PROC || me()===PROC ? 'Marked ready to enter.' : other ? 'Sent to '+procName()+' for '+first(T.who)+'.' : procName()+' has it. You’ll see Entered on this trip once it’s in DataBasics.');
    paint(true);
  });
}
function remind(T){
  const at=Date.now();
  return putN({id:'expnudge-'+T.who+'-'+slug(T.trip)+'-'+at.toString(36), to:T.who, by:me(), k:'Expenses', kind:'exp-remind-by', who:T.who, trip:T.trip,
    m:first(me())+' asked: when your '+T.trip+' expenses are all in, tap Done — Send to '+procName()+' on the trip in Expenses.', go:'expenses', at})
    .then(()=>{ toast(first(T.who)+' will see it on the trip and in the bell.'); paint(true); }, ()=>toast('That didn’t send. Try again in a moment.'));
}
const asked=T=>(S.nudges||[]).filter(z=>z.kind==='exp-remind-by' && !z.done && z.who===T.who && z.trip===T.trip).sort((a,b)=>b.at-a.at)[0]||null;
function takeBack(T){
  dialog('Take '+T.trip+' Back?', b=>{ b.appendChild(h('p',null,'This trip goes back to you to keep adding to, and '+procName()+'’s reminder to enter it closes. Send it again when it’s ready.')); },
    'Take It Back', async ()=>{
      await Promise.all(T.sent.map(x=>{ return putExp(Object.assign({}, api().expOf(x.id)||x, {done:0, doneBy:''})); }));
      (S.nudges||[]).filter(z=>z.kind==='exp-ready' && !z.done && z.who===T.who && z.trip===T.trip).forEach(z=>putN(Object.assign({}, z, {done:1})));
      toast('Taken back. Send it again when it’s ready.'); paint(true); });
}

/* ---------- on the page ---------- */
function whoFor(box){
  let e=box.previousElementSibling;
  while(e){ if(e.classList && e.classList.contains('exppers')){ const b=e.querySelector('b'), nm=b ? b.textContent.trim() : ''; const p=(S.people||[]).find(z=>z.name===nm); return p ? p.id : null; } e=e.previousElementSibling; }
  return me();
}
function decorate(box){
  const head=box.querySelector(':scope > .triph'), tn=head && head.querySelector('.tn'); if(!tn) return;
  const trip=(tn.firstChild && tn.firstChild.nodeType===3 ? tn.firstChild.nodeValue : '').trim(); if(!trip || trip===NOTRIP) return;
  const who=whoFor(box); if(!who) return;
  const T=tripOf(who, trip), ask=asked(T), sig=T.state+':'+T.open.length+':'+T.fresh.length+':'+T.when+':'+(ask?ask.at:0);
  let bar=box.querySelector(':scope > .tripdone');
  if(bar && bar.dataset.sig===sig) return;
  if(bar) bar.remove();
  if(T.state==='entered' || T.state==='none') return;
  const mine=who===me(), proc=who===PROC;
  if(!mine && T.state==='adding' && !seesAll()) return;
  if(proc) return;                               /* Vanessa enters her own */
  bar=h('div','tripdone ed-'+T.state); bar.dataset.sig=sig;
  const txt=h('span','ed-t');
  if(T.state==='adding'){
    if(mine){ if(ask){ txt.appendChild(h('b',null, first(ask.by)+' asked you to send this when it’s all in. ')); txt.appendChild(document.createTextNode('Tap the button once every expense is here.')); }
      else txt.textContent='When every expense for this trip is in, send it to '+procName()+' to enter.';
      const b=h('button','btn sm ed-go','Done — Send to '+procName()); b.type='button'; b.onclick=e=>{ e.stopPropagation(); send(tripOf(who, trip)); }; bar.appendChild(txt); bar.appendChild(b); }
    else { txt.appendChild(h('b',null, first(who)+' is still adding.'));
      txt.appendChild(document.createTextNode(' '+first(who)+' sees a Done — Send to '+procName()+' button right here'+(ask ? '; '+(ask.by===me()?'you':first(ask.by))+' reminded them '+fmt(ask.at)+'.' : '.')));
      bar.appendChild(txt);
      const r=h('button','btn ghost sm',ask ? 'Remind Again' : 'Remind '+first(who)); r.type='button'; r.onclick=e=>{ e.stopPropagation(); r.disabled=true; remind(tripOf(who, trip)); }; bar.appendChild(r);
      const b=h('button','btn ghost sm','Send for '+first(who)); b.type='button'; b.onclick=e=>{ e.stopPropagation(); send(tripOf(who, trip)); }; bar.appendChild(b); }
  } else if(T.state==='sent'){
    txt.appendChild(h('b',null, mine ? 'With '+procName() : 'Ready to Enter'));
    txt.appendChild(document.createTextNode(' · sent '+fmt(T.when)+(mine ? '' : ' by '+first(who))));
    bar.appendChild(txt);
    if(mine){ const b=h('button','btn ghost sm','Take It Back'); b.type='button'; b.onclick=e=>{ e.stopPropagation(); takeBack(tripOf(who, trip)); }; bar.appendChild(b); }
  } else if(T.state==='reopened'){
    const n=T.fresh.length;
    txt.appendChild(h('b',null, n+(n===1?' expense':' expenses')+' added since '+(mine?'you sent it':'it was sent')));
    txt.appendChild(document.createTextNode(mine ? '' : ' · '+T.sent.length+' ready to enter'));
    bar.appendChild(txt);
    if(mine){ const b=h('button','btn sm ed-go','Send the New '+(n===1?'One':'Ones')+' to '+procName()); b.type='button'; b.onclick=e=>{ e.stopPropagation(); send(tripOf(who, trip)); }; bar.appendChild(b); }
    else if(seesAll()){ const r=h('button','btn ghost sm','Remind '+first(who)); r.type='button'; r.onclick=e=>{ e.stopPropagation(); r.disabled=true; remind(tripOf(who, trip)); }; bar.appendChild(r);
      const b=h('button','btn ghost sm','Send for '+first(who)); b.type='button'; b.onclick=e=>{ e.stopPropagation(); send(tripOf(who, trip)); }; bar.appendChild(b); }
  }
  head.after(bar);
}
/* Vanessa's list of trips ready to enter, oldest first, at the top of Expenses */
function readyStrip(){
  const old=root.querySelector('.ed-ready');
  if(!seesAll()){ old && old.remove(); return; }
  const L=allTrips().filter(T=>T.who!==PROC && (T.state==='sent' || T.state==='reopened')).sort((a,b)=>a.when-b.when);
  const firstBox=root.querySelector('.exppers, .trip'); if(!firstBox){ old && old.remove(); return; }
  const sig=L.map(T=>T.who+T.trip+T.state+T.open.length+T.when).join('|');
  if(old && old.dataset.sig===sig && old.nextElementSibling===firstBox) return;
  old && old.remove(); if(!L.length) return;
  const s=h('div','ed-ready'); s.dataset.sig=sig;
  const hd=h('div','ed-rh'); hd.appendChild(h('b',null,'Ready to Enter')); hd.appendChild(h('small',null, L.length+(L.length===1?' trip':' trips')+' sent by their owners, oldest first')); s.appendChild(hd);
  L.forEach(T=>{ const r=h('button','ed-row'); r.type='button';
    r.appendChild(h('span','ed-who', first(T.who)));
    const t=h('span','ed-trip', T.trip); if(T.state==='reopened') t.appendChild(h('small',null, ' · '+T.fresh.length+' added since')); r.appendChild(t);
    r.appendChild(h('span','ed-n', T.open.length+(T.open.length===1?' expense':' expenses')));
    r.appendChild(h('span','ed-sum money', money(T.sum)));
    r.appendChild(h('span','ed-when', 'sent '+fmt(T.when)));
    const nt=(S.nudges||[]).filter(z=>z.kind==='exp-ready' && z.who===T.who && z.trip===T.trip && z.note).sort((a,b)=>b.at-a.at)[0];
    if(nt) r.appendChild(h('span','ed-q','“'+nt.note+'”'));
    r.onclick=()=>jump(T); s.appendChild(r); });
  firstBox.parentNode.insertBefore(s, firstBox);
}
function jump(T){
  const boxes=[...root.querySelectorAll('.trip')].filter(b=>{ const tn=b.querySelector(':scope > .triph .tn'); return tn && tn.firstChild && tn.firstChild.nodeValue.trim()===T.trip && whoFor(b)===T.who; });
  const b=boxes[0];
  if(!b){ toast('Switch to Everyone or To Process to see '+first(T.who)+'’s expenses.'); return; }
  const head=b.querySelector(':scope > .triph'); const isOpen=b.querySelector('.exprow');
  if(!isOpen && head) head.click();
  setTimeout(()=>{ const nb=[...root.querySelectorAll('.trip')].find(x=>{ const tn=x.querySelector(':scope > .triph .tn'); return tn && tn.firstChild && tn.firstChild.nodeValue.trim()===T.trip && whoFor(x)===T.who; });
    (nb||b).scrollIntoView({block:'start', behavior:'smooth'}); }, 120);
}
let raf=0;
function paint(force){ if(force) root.querySelectorAll('.tripdone').forEach(b=>b.dataset.sig='');
  try{ root.querySelectorAll('.trip').forEach(decorate); readyStrip(); }catch(e){ console.error(e); } }
const mo=new MutationObserver(()=>{ if(!raf) raf=requestAnimationFrame(()=>{ raf=0; paint(false); }); });
mo.observe(root, {childList:true, subtree:true});

/* ---------- the sweeps: entered, and a week-old reminder ---------- */
function sweep(){
  if(!Array.isArray(S.expenses) || !Array.isArray(S.nudges) || !me() || !api()) return;
  const N=S.nudges, have=new Set(N.map(n=>n.id));
  /* every expense entered: close Vanessa's nudge and tell the owner */
  N.forEach(n=>{ if(n.kind!=='exp-ready' || n.done) return; const T=tripOf(n.who, n.trip); if(T.state!=='entered') return;
    putN(Object.assign({}, n, {done:1}));
    const id='expin-'+n.who+'-'+slug(n.trip);
    const prev=N.find(z=>z.id===id);
    if(!prev || prev.done) putN({id, to:n.who, by:PROC, k:'Expenses', kind:'exp-entered', who:n.who, trip:n.trip, m:'Your '+n.trip+' expenses are entered in DataBasics ('+money(T.E.reduce((a,x)=>a+(Number(x.amt)||0),0))+').', go:'expenses', at:Date.now()}); });
  /* my own trips: one reminder once the last expense is a week old and the trip still hasn't been sent */
  const now=Date.now();
  allTrips().forEach(T=>{ if(T.who!==me() || T.who===PROC || T.state!=='adding' || !T.last) return;
    if(now-T.last<7*DAY || now-T.last>60*DAY) return;
    const id='expremind-'+T.who+'-'+slug(T.trip); if(have.has(id)) return; have.add(id);
    putN({id, to:T.who, k:'Expenses', kind:'exp-remind', who:T.who, trip:T.trip, m:'Are your '+T.trip+' expenses all in? Tap Done — Send to '+procName()+' on the trip in Expenses.', go:'expenses', at:now}); });
}
const timer=setInterval(()=>{ sweep(); paint(false); }, 60000); setTimeout(sweep, 8000);

const css=h('style'); css.id='ed-style'; css.textContent=
  '.tripdone{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid var(--line,#dfe6ee);background:var(--surface-2,#f5f8fb);font-size:13px;color:var(--ink-2,#3b4a58)}'+
  '.tripdone .ed-t{flex:1 1 220px;min-width:0}.tripdone b{color:var(--ink,#0d314c)}.tripdone.ed-sent{background:#eaf5ee}.tripdone.ed-sent b{color:#1d6b3a}.tripdone.ed-reopened{background:#fdf4e3}'+
  '.tripdone .btn{border-radius:6px;white-space:nowrap}.tripdone .ed-go{min-height:36px}'+
  '.ed-ready{border:1px solid var(--line,#dfe6ee);border-left:4px solid #1d6b3a;border-radius:6px;background:var(--surface,#fff);margin:0 0 14px;overflow:hidden}'+
  '.ed-rh{display:flex;align-items:baseline;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line,#dfe6ee)}.ed-rh b{font-size:15px;color:var(--ink,#0d314c)}.ed-rh small{color:var(--ink-3,#5b6b7a);font-size:12.5px}'+
  '.ed-row{display:grid;grid-template-columns:90px minmax(0,1fr) auto auto auto;gap:4px 14px;align-items:center;width:100%;text-align:left;font:inherit;font-size:13.5px;padding:9px 14px;border:0;border-top:1px solid var(--line,#eef2f6);background:none;color:var(--ink,#0d314c);cursor:pointer}'+
  '.ed-row:first-of-type{border-top:0}.ed-row:hover{background:var(--surface-2,#f5f8fb)}.ed-who{font-weight:700}.ed-trip{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ed-trip small{color:#a15c00;font-weight:600}'+
  '.ed-n,.ed-when{color:var(--ink-3,#5b6b7a);font-size:12.5px;white-space:nowrap}.ed-sum{font-weight:700;white-space:nowrap}.ed-q{grid-column:2/-1;color:var(--ink-2,#3b4a58);font-size:12.5px;font-style:italic}'+
  '@media (max-width:620px){.ed-row{grid-template-columns:minmax(0,1fr) auto}.ed-who{grid-column:1}.ed-trip{grid-column:1/-1;white-space:normal}.ed-n,.ed-when{grid-column:auto}.ed-q{grid-column:1/-1}}'+
  '.ed-ov{position:fixed;inset:0;z-index:400;background:rgba(6,32,47,.45);display:flex;align-items:center;justify-content:center;padding:16px}'+
  '.ed-dlg{background:var(--surface,#fff);color:var(--ink,#0d314c);border-radius:8px;max-width:480px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 50px rgba(6,32,47,.35)}'+
  '.ed-dlg h2{font-size:18px;margin:0;padding:16px 18px 6px}.ed-b{padding:0 18px 6px;font-size:14px;line-height:1.45}.ed-b p{margin:6px 0 10px}'+
  '.ed-warn{border:1px solid #f0c36d;background:#fdf4e3;border-radius:6px;padding:8px 12px;margin:0 0 10px}.ed-warn ul{margin:4px 0 4px 18px;padding:0}.ed-warn small{color:#7a4a00}'+
  '.ed-note{display:block}.ed-note span{display:block;font-size:13px;font-weight:600;margin-bottom:4px}.ed-note textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;border:1px solid var(--line,#c9d6e2);border-radius:6px;padding:8px;background:var(--surface,#fff);color:inherit}'+
  '.ed-f{display:flex;justify-content:flex-end;gap:8px;padding:10px 18px 16px}.ed-f .btn{border-radius:6px;min-height:40px}'+
  '.ed-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:410;max-width:min(560px,calc(100vw - 32px));padding:10px 14px;background:var(--navy,#0d314c);color:#fff;border-radius:6px;box-shadow:0 10px 30px rgba(6,32,47,.35);font-size:13.5px;font-weight:600}';
document.head.appendChild(css);
paint(true);

window.__expDone={ version:'1.1', tripOf, allTrips, problems, sweep, paint,
  destroy(){ mo.disconnect(); clearInterval(timer); css.remove(); root.querySelectorAll('.tripdone,.ed-ready').forEach(e=>e.remove()); } };
})();
