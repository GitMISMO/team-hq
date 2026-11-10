/* Expense inbox — receipts emailed to expense@mismo.org.
   A Power Automate flow saves each email (who sent it, the subject, a short preview and any receipt photos or PDFs)
   into the expinbox file. Team HQ turns each one into an expense for the person who sent it, reads the receipt the
   same way a snapped one is read, and fills in what it can. The person still reviews and submits it.
   Jonna and Vanessa see everything that came in, including mail from someone who isn't on the team. */
(function(){
'use strict';
if(window.__expIn && window.__expIn.destroy) window.__expIn.destroy();
const S=window.__S, root=document.getElementById('app-expenses');
if(!S || !root) return;
const ADDR='expense@mismo.org';
let docs={}, lastRead=0, busy=false, timer=0, mo=null;
const h=(tag, cls, txt)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; };
const api=()=>window.__expApi;
const local=a=>String(a||'').toLowerCase().trim().split('@')[0];
const dom=a=>String(a||'').toLowerCase().trim().split('@')[1]||'';
const OURS=/^(mismo\.org|mba\.org)$/;
/* the person an email came from: their work address, at mismo.org or mba.org */
/* who an email is from: their work address first; from a personal address (Gmail …) the name on the email
   (“Jonna Critchley”, or “Critchley, Jonna”); or whoever Vanessa or Jonna picked for it */
const norm=t=>String(t||'').toLowerCase().replace(/["'()]/g,' ').replace(/\s+/g,' ').trim();
function byName(name){ let n=norm(name); if(!n) return null; if(n.indexOf(',')>0){ const [a,b]=n.split(','); n=norm(b+' '+a); }
  const ppl=S.people||[]; let p=ppl.find(z=>norm(z.name)===n); if(p) return p.id;
  const w=n.split(' '); if(w.length>=2){ p=ppl.filter(z=>{ const zw=norm(z.name).split(' '); return zw[0]===w[0] && zw[zw.length-1]===w[w.length-1]; }); if(p.length===1) return p[0].id; }
  return null; }
function whoFrom(addr, name, d){ if(d && d.assign) return d.assign;
  if(OURS.test(dom(addr))){ const l=local(addr); const p=(S.people||[]).find(p=>p.email && local(p.email)===l); if(p) return p.id; }
  return byName(name); }
const seesAll=()=>{ try{ return !!(api() && api().seesAll()); }catch(e){ return false; } };
const firstName=id=>{ const p=(S.people||[]).find(z=>z.id===id); return p ? String(p.name||'').split(' ')[0] : ''; };
const when=ms=>{ const d=new Date(ms); if(isNaN(d)) return ''; const n=new Date(); const same=d.toDateString()===n.toDateString();
  return same ? d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}) : d.toLocaleDateString([], {month:'short', day:'numeric'}); };
/* the email's text without MBA's “CAUTION: This email originated from outside…” banner */
const clean=t=>String(t||'').replace(/^\s*CAUTION:[\s\S]*?(content is safe\.?|is safe\.)\s*/i,'').replace(/\s+\n/g,'\n').trim();
const atOf=d=>{ const t=Date.parse(d.at||d.received||''); return isNaN(t) ? 0 : t; };

async function readAll(){ const R=window.__hqRelay; if(!R || !R.readOther) return null;
  try{ const f=await R.readOther('team-hq','expinbox'); return (f && f.docs) || {}; }catch(e){ return null; } }
function setDoc(id, d){ return S.db.collection('expinbox').doc(id).set(d); }

/* one email → one expense per receipt (or one expense from the email itself when nothing was attached) */
async function importOne(id, d, who){
  const A=api(); const now=Date.now();
  /* claim it first, so two open Team HQs don't both add it */
  const claim={by:S.me, at:now}; await setDoc(id, Object.assign({}, d, {claim}));
  await new Promise(r=>setTimeout(r, 2500));
  const fresh=await readAll(); const cur=fresh && fresh[id];
  if(!cur || cur.done || !cur.claim || cur.claim.by!==S.me || cur.claim.at!==now) return;
  const files=(Array.isArray(d.files) ? d.files : []).filter(f=>f && f.path);
  const note=String(d.subject||'').replace(/^\s*(fwd?|fw|re)\s*:\s*/i,'').trim();
  const via={id, from:d.from||'', subject:note, at:d.at||''};
  const text=clean(d.text||'') || clean(d.preview||'');
  const made=[];
  /* the same email sent through again updates the expense it already made, instead of adding a second one */
  const same=x=>x.viaEmail && !x.submitted && x.viaEmail.from===via.from && x.viaEmail.subject===via.subject;
  const again=(A.list()||[]).find(x=>same(x) && x.viaEmail.at===via.at)
    || (files.length ? null : (A.list()||[]).find(x=>same(x) && !x.asset && !x.amt && !x.rcptAmt));   /* a re-forward fills in one that came through blank */
  if(files.length){
    for(const f of files){
      const e={trip:'', who, by:S.me, cat:'', date:'', name:'', receipt:1, rcptAmt:'', amt:'', submitted:0,
        notes: note ? 'Emailed: '+note : 'Emailed receipt', asset:f.path, rcptName:f.name||'receipt', rcptType:f.type||'', at:Date.now(), reading:Date.now(), viaEmail:via};
      e.members=A.members(e);
      const eid=await A.put('expenses', e); made.push(eid);
      try{ const blob=await A.attBlob(f.path); if(blob && /^image\//.test(blob.type||f.type||'')) await A.readAndSave(eid, blob);
        else if(text && A.readText) await A.readText(eid, text);
        else { const x=Object.assign({}, A.expOf(eid)); x.reading=0; await A.put('expenses', x); } }
      catch(err){ try{ const x=Object.assign({}, A.expOf(eid)); x.reading=0; x.readFail=Date.now(); await A.put('expenses', x); }catch(e2){} }
    }
  } else {
    /* no attachment: the receipt is the email itself (an Uber or airline email, say) — read the email's text */
    let eid;
    const sent=(d.at||'').slice(0,10);
    /* the date comes from the receipt (the day of the ride or stay), not the day it was emailed — the email date is only the fallback */
    if(again){ eid=again.id; if(text && again.date===sent){ const x=Object.assign({}, A.expOf(eid)); x.date=''; await A.put('expenses', x); } }
    else { const e={trip:'', who, by:S.me, cat:'', date:text ? '' : sent, name:note.slice(0,80), receipt:0, rcptAmt:'', amt:'', submitted:0,
        notes:'Emailed: '+note, at:Date.now(), reading:text ? Date.now() : 0, viaEmail:via};
      e.members=A.members(e); eid=await A.put('expenses', e); }
    made.push(eid);
    if(text && A.readText){ try{ await A.readText(eid, text); }catch(err){} }
    try{ const x=A.expOf(eid); if(x && !x.date){ const y=Object.assign({}, x, {date:sent}); await A.put('expenses', y); } }catch(err){}
  }
  const fin=Object.assign({}, cur, {claim:null, done:Date.now(), doneBy:S.me, who, exp:made}); delete fin.text;   /* the full email text isn't kept once it's been read */
  await setDoc(id, fin);
}

/* ---------- contractors (5 Nov 2026) ----------
   A receipt from a contractor who claims expenses (anyone with Can Claim Expenses on in the Service Orders portal)
   is not a Team HQ expense. It goes to that person's own My Expenses in the Service Orders portal: the receipt is
   read here, the picture is filed with their company's records and the expense lands as a draft for them to check
   and submit with the rest. Who they are comes from each company's people list in the portal (the hours copy,
   which has no money in it), matched by email first, then by name. Only Jonna's or Vanessa's Team HQ does this,
   because only they can reach the companies' records. */
const SO_COS=[{key:'so-phoenix',slug:'phoenixteam'},{key:'so-actualize',slug:'actualize'},{key:'so-trex',slug:'trex'},
  {key:'so-falcon',slug:'falcon'},{key:'so-trudigital',slug:'trudigital'}];
const SO_CATS=['Airfare','Baggage Fees','Gasoline','Hotel/Lodging','Meal Trvl - Breakfast','Meal Trvl - Lunch','Meal Trvl - Dinner',
  'Meal Trvl - Snack','Membership Dues','Metro / Bus','Mileage','Parking','Taxi/Uber/Lyft','Tolls','Train'];
let roster=null, rosterAt=0;
const relayBase=()=>{ const R=window.__hqRelay; return (R && R.config && R.config.RELAY_URL) || ''; };
function soCall(proj, path, method, body){
  const RS=window.ResourcesSession, tok=RS && RS.token && RS.token();
  if(!tok) return Promise.reject({status:401});
  const headers={'Authorization':'Bearer '+tok}; if(body) headers['Content-Type']='application/json';
  return fetch(relayBase()+'/'+encodeURIComponent(proj)+path, {method, cache:'no-store', headers, body:body?JSON.stringify(body):undefined})
    .then(r=>r.json().catch(()=>({})).then(b=>{ if(r.ok) return b; const e=new Error((b&&b.message)||('HTTP '+r.status)); e.status=r.status; e.body=b; throw e; }));
}
const enc=p=>String(p).split('/').map(encodeURIComponent).join('/');
const b64json=b=>{ const bin=atob((b&&b.content)||''), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); const t=new TextDecoder('utf-8').decode(u); return t?JSON.parse(t):null; };
async function loadRoster(){
  if(roster && Date.now()-rosterAt<10*60e3) return roster;
  const out=[];
  await Promise.all(SO_COS.map(async c=>{
    try{ const F=b64json(await soCall(c.key, '/file/'+enc('orders-public/'+c.slug+'.json'), 'GET'));
      const now=new Date();
      (F && F.people || []).forEach(p=>{
        if(!p || !p.expenses) return;
        if(p.activeTo){ const m=/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(p.activeTo); if(m){ const y=+m[3]<100?2000+ +m[3]:+m[3]; if(new Date(y,+m[1]-1,+m[2],23,59)<now) return; } }
        out.push({key:c.key, slug:c.slug, company:F.company||c.slug, fy:F.fiscalYear||'FY 2027', pslug:p.slug, name:p.name||'', email:String(p.email||'').toLowerCase()});
      });
    }catch(e){ /* no access to that company: nothing to match there */ }
  }));
  roster=out; rosterAt=Date.now(); return roster;
}
/* the contractor an email came from, or null */
function contractorFor(d){
  if(!roster) return null;
  if(d && d.assignSo){ const [k,s]=String(d.assignSo).split('|'); return roster.find(r=>r.key===k && r.pslug===s) || null; }
  const a=String(d && d.from || '').toLowerCase().trim();
  let r=a && roster.find(x=>x.email && x.email===a); if(r) return r;
  /* a facilitator writing from their mismo.org alias: first initial and surname (Jonna: jcritchley@mismo.org) */
  if(OURS.test(dom(a))){ const l=local(a);
    r=roster.find(x=>{ const w=norm(x.name).replace(/[^a-z ]/g,'').split(' ').filter(Boolean); return w.length>1 && (w[0][0]+w[w.length-1])===l; });
    if(r) return r; }
  let n=norm(d && d.fromName); if(!n) return null; if(n.indexOf(',')>0){ const [x,y]=n.split(','); n=norm(y+' '+x); }
  r=roster.filter(x=>norm(x.name)===n); if(r.length===1) return r[0];
  const w=n.split(' '); if(w.length>=2){ r=roster.filter(x=>{ const zw=norm(x.name).split(' '); return zw[0]===w[0] && zw[zw.length-1]===w[w.length-1]; }); if(r.length===1) return r[0]; }
  return null;
}
/* What a receipt says, read the way Team HQ reads its own, in the portal's own categories. */
async function soRead(blob, text, who){
  const s=await claude.use('sample'); if(!s) return null;
  const prompt='You are reading a receipt for a contractor’s MISMO expense claim ('+(who||'a contractor')+'). '+
    (blob ? 'The attached file is a photo, screenshot or PDF of a receipt, invoice, hotel folio or ticket.' : 'There is no photo; the receipt is this email, as plain text.')+'\n'+
    'Return ONLY one JSON object, no other text: {"isReceipt":true,"merchant":"","date":"","total":null,"currency":"USD","type":"","description":""}\n'+
    '- date: the purchase date as YYYY-MM-DD (a hotel folio: the check-out date). Today is '+new Date().toISOString().slice(0,10)+'.\n'+
    '- total: the final amount paid, tax and tip included, as a number; null if unreadable. Never guess.\n'+
    '- type: exactly one of '+JSON.stringify(SO_CATS)+', or "". Meals by the time on the receipt: before 10:30 breakfast, to 16:00 lunch, after that dinner; coffee or under $10 is a snack.\n'+
    '- description: a few plain words, e.g. "Dinner at Blue Door", "Uber from airport to hotel", "2 nights, Jan 11-13".\n'+
    '- Anything not shown stays "" or null. Not a receipt at all: isReceipt false.'+
    (text ? '\n\nThe email:\n\n'+String(text).slice(0,6000) : '');
  const opts={modelTier:'default'}; if(blob) opts.images=[blob];
  const res=await s(prompt, opts);
  const t=String(res && res.text || ''), a=t.indexOf('{'), b=t.lastIndexOf('}');
  if(a<0 || b<a) return null;
  const r=JSON.parse(t.slice(a,b+1)); return r && r.isReceipt===false ? null : r;
}
function soDate(iso){ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||'')); return m ? m[2]+'/'+m[3]+'/'+m[1].slice(2) : ''; }
function soSummit(d){ const m=/^(\d{2})\/(\d{2})\/(\d{2})$/.exec(d||''); if(!m) return '';
  const mo=+m[1]-1, y=2000+ +m[3]; const S={0:['Winter',0],11:['Winter',1],5:['Spring',0],4:['Spring',0],8:['Fall',0],7:['Fall',0]}[mo];
  return S ? 'MISMO '+S[0]+' Summit '+(y+S[1]) : ''; }
/* A phone photo is shrunk to fit the portal's limit (the same 1600px / 650 KB rule the portal uses). */
function soShrink(blob){
  return new Promise(res=>{
    if(!/^image\//.test(blob.type||'')) return res(null);
    const url=URL.createObjectURL(blob), im=new Image();
    im.onload=()=>{ const w=im.naturalWidth, h=im.naturalHeight, sc=Math.min(1, 1600/Math.max(w,h));
      const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(w*sc)); cv.height=Math.max(1,Math.round(h*sc));
      const x=cv.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,cv.width,cv.height); x.drawImage(im,0,0,cv.width,cv.height); URL.revokeObjectURL(url);
      let out=null; for(const q of [0.82,0.7,0.6,0.5,0.4]){ out=cv.toDataURL('image/jpeg',q).split(',')[1]||''; if(out.length<=650*1024) break; }
      res(out && out.length<=650*1024 ? {b64:out, ext:'jpg', shrunk:sc<1} : null); };
    im.onerror=()=>{ URL.revokeObjectURL(url); res(null); };
    im.src=url; });
}
const blobB64=b=>new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]||''); r.onerror=rej; r.readAsDataURL(b); });
/* The repository's head, the way the portal finds it: a save against an impossible parent is refused with the head. */
async function soHead(key){
  try{ await soCall(key, '/commit', 'POST', {message:'head probe', parentSha:'0000000000000000000000000000000000000000', files:[{path:'notify/.head-probe', content:'{}'}]}); return null; }
  catch(e){ return (e && e.status===409 && e.body && e.body.head) || null; }
}
/* One email -> one draft expense per receipt in the contractor's own file, saved in ONE commit against the
   head it read, so nothing the contractor saves at the same moment is overwritten (a clash re-reads and retries). */
async function routeToContractor(id, d, c){
  const now=Date.now();
  const claim={by:S.me, at:now}; await setDoc(id, Object.assign({}, d, {claim}));
  await new Promise(r=>setTimeout(r, 2500));
  const fresh=await readAll(); const cur=fresh && fresh[id];
  if(!cur || cur.done || !cur.claim || cur.claim.by!==S.me || cur.claim.at!==now) return;
  const A=api();
  const note=String(d.subject||'').replace(/^\s*(fwd?|fw|re)\s*:\s*/i,'').trim();
  const via={id, from:d.from||'', subject:note, at:d.at||''};
  const text=clean(d.text||'') || clean(d.preview||'');
  const sent=soDate(String(d.at||'').slice(0,10));
  const files=(Array.isArray(d.files) ? d.files : []).filter(f=>f && f.path);
  const made=[];   /* {e, bin:{path,b64}|null} */
  const one=async (blob, f)=>{
    let r=null; try{ r=await soRead(blob, blob ? '' : text, c.name); }catch(e){ r=null; }
    const eid='x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const e={id:eid, date:'', cat:'', amt:'', desc:'', trip:'', tripAuto:false, receipt:false, state:'draft', viaEmail:via, at:new Date().toISOString()};
    const filled=[];
    if(r){ const dt=soDate(r.date); if(dt){ e.date=dt; filled.push('date'); }
      const tot=Number(r.total), usd=String(r.currency||'USD').toUpperCase()==='USD';
      if(tot>0){ e.rcptAmt=Math.round(tot*100)/100; if(usd){ e.amt=e.rcptAmt; filled.push('amt'); } }
      if(SO_CATS.indexOf(r.type)>=0){ e.cat=r.type; filled.push('cat'); }
      const ds=[r.merchant, r.description].map(x=>String(x||'').trim()).filter(Boolean);
      if(!usd && tot>0) ds.push('paid '+tot.toFixed(2)+' '+String(r.currency).toUpperCase()+', not yet in dollars');
      if(ds.length){ e.desc=ds.join(' — ').slice(0,140); filled.push('desc'); } }
    if(!e.date) e.date=sent;
    if(!e.desc) e.desc=note.slice(0,140);
    const tr=soSummit(e.date); if(tr){ e.trip=tr; e.tripAuto=true; }
    let bin=null;
    if(blob){
      let got=await soShrink(blob);
      if(!got && /pdf/i.test(blob.type||f.type||'')){ const b=await blobB64(blob); if(b.length<=650*1024) got={b64:b, ext:'pdf', shrunk:false}; }
      if(got){ const path='hours/receipts/'+c.pslug+'-'+eid+'.'+got.ext;
        bin={path, b64:got.b64};
        Object.assign(e, {receipt:true, receiptFile:path, receiptName:(f && f.name)||('receipt.'+got.ext), receiptBytes:got.b64.length, receiptShrunk:!!got.shrunk}); }
      else e.desc=(e.desc ? e.desc+' — ' : '')+'the emailed receipt was too large to attach; add a photo of it';
    } else if(text){ e.receipt=true; e.desc=e.desc||note; }   /* the email itself is the receipt (an Uber or airline email) */
    if(filled.length) e.readFrom={at:new Date().toISOString(), filled, by:'the emailed receipt'};
    made.push({e, bin});
  };
  if(files.length){ for(const f of files){ let blob=null; try{ blob=await A.attBlob(f.path); if(blob && !blob.type && f.type) blob=new Blob([blob],{type:f.type}); }catch(e){} await one(blob, f); } }
  else await one(null, null);
  const path='hours/'+c.pslug+'-fy'+String(c.fy).replace(/\D+/g,'')+'.json';
  for(let tries=0; tries<5; tries++){
    const head=await soHead(c.key);
    let file=null; try{ file=b64json(await soCall(c.key, '/file/'+enc(path), 'GET')); }catch(e){ if(e.status!==404) throw e; }
    file=file || {person:c.name, slug:c.pslug, email:c.email||null, fiscalYear:c.fy, draft:null, weeks:[]};
    const have=(file.expenses||[]).filter(x=>x && x.viaEmail && x.viaEmail.id===id);
    if(have.length){ made.length=0; have.forEach(x=>made.push({e:x, bin:null, had:true})); break; }   /* already there: never twice */
    file.expenses=(file.expenses||[]).concat(made.map(m=>m.e));
    const body={message:'emailed receipt for '+c.name+' (from expense@mismo.org)',
      files:made.filter(m=>m.bin).map(m=>({path:m.bin.path, content:m.bin.b64, encoding:'base64'})).concat([{path, content:JSON.stringify(file, null, 1)}])};
    if(head) body.parentSha=head;
    try{ await soCall(c.key, '/commit', 'POST', body); break; }
    catch(e){ if(e.status===409 && tries<4){ await new Promise(r=>setTimeout(r, 400+300*tries)); continue; } throw e; }
  }
  const fin=Object.assign({}, cur, {claim:null, done:Date.now(), doneBy:S.me,
    so:{key:c.key, company:c.company, slug:c.pslug, person:c.name}, exp:made.map(m=>m.e.id)}); delete fin.text;
  await setDoc(id, fin);
}

async function tick(force){
  if(busy || !S.me || !S.db || !api()) return; if(!force && Date.now()-lastRead<60e3) return;
  busy=true;
  try{
    const all=await readAll(); if(!all) return; docs=all; lastRead=Date.now();
    const mineOrAll=seesAll();
    if(mineOrAll){ try{ await loadRoster(); }catch(e){} }
    for(const [id, d] of Object.entries(docs)){
      if(!d || d.done || d.skip) continue;
      const who=d.assignSo ? null : whoFrom(d.from, d.fromName, d);
      if(!who){
        /* a contractor's receipt goes to their own expense app in the Service Orders portal */
        const c=mineOrAll ? contractorFor(d) : null;
        if(c && !(d.claim && Date.now()-(d.claim.at||0)<120e3 && d.claim.by!==S.me)){
          try{ await routeToContractor(id, d, c); }catch(e){ console.warn('expense inbox (contractor)', e); }
        }
        continue;                     /* not someone on the team: Vanessa sees it below */
      }
      if(who!==S.me && !mineOrAll) continue;
      if(d.claim && Date.now()-(d.claim.at||0)<120e3 && d.claim.by!==S.me) continue;
      try{ await importOne(id, d, who); }catch(e){ console.warn('expense inbox', e); }
    }
    const again=await readAll(); if(again) docs=again;
  } finally { busy=false; paint(); }
}

/* ---------- what came in, on the Expenses page ---------- */
const css=h('style'); css.id='expin-css'; css.textContent=`
.expin{margin:0 0 14px;padding:12px 14px;border:1px solid var(--border);border-left:3px solid var(--sky,#74bfeb);border-radius:8px;background:var(--surface)}
.expin-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.expin-h b{font-size:14.5px;color:var(--ink)}
.expin-h small{font-size:12.5px;color:var(--ink-2)}.expin-h .x{margin-left:auto;font-size:12px;color:var(--ink-3)}
.expin ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.expin li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px 9px;border-radius:6px;background:var(--surface-2,rgba(0,0,0,.03));font-size:13px}
.expin li .w{font-weight:700;color:var(--ink);white-space:nowrap}.expin li .s{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-2)}
.expin li .st{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:2px 7px;border-radius:5px;white-space:nowrap}
.expin li.has-asg{grid-template-columns:auto minmax(0,1fr) auto auto}.expin li .asg{font:inherit;font-size:12.5px;padding:3px 6px;border:1px solid var(--border);border-radius:5px;background:var(--surface);color:var(--ink)}
.expin li .st.ok{background:rgba(43,182,115,.14);color:#1d8a56}.expin li .st.wait{background:rgba(232,163,58,.16);color:#a46a10}.expin li .st.who{background:rgba(240,96,122,.14);color:#b8354f}
.expin .more{margin-top:6px;font-size:12px;color:var(--ink-3)}
:root[data-theme="dark"] .expin li .st.ok{color:#5fd59b}:root[data-theme="dark"] .expin li .st.wait{color:#f2c46b}:root[data-theme="dark"] .expin li .st.who{color:#f59aab}
`;
document.head.appendChild(css);
function paint(){
  if(mo) mo.disconnect();
  try{
    const old=root.querySelector(':scope > .expin'); if(old) old.remove();
    if(!S.me) return;
    const all=seesAll(); const cut=Date.now()-21*864e5;
    let L=Object.entries(docs).map(([id,d])=>Object.assign({id}, d)).filter(d=>atOf(d)>=cut || (!d.done && !d.skip));
    L=L.map(d=>Object.assign(d, {who:d.so ? null : (d.who||whoFrom(d.from, d.fromName, d))}));
    L.forEach(d=>{ if(!d.who && !d.so){ const c=contractorFor(d); if(c) d.soc=c; } });
    /* only the ones waiting on a decision: a receipt from someone Team HQ couldn't match */
    L=all ? L.filter(d=>!d.done && !d.skip && !d.so && !d.soc && !d.who) : [];
    if(!L.length) return;
    L.sort((a,b)=>atOf(b)-atOf(a));
    const box=h('div','expin');
    const hd=h('div','expin-h'); hd.appendChild(h('b', null, L.length===1 ? 'An Emailed Receipt Needs a Person' : L.length+' Emailed Receipts Need a Person'));
    hd.appendChild(h('small', null, 'Pick whose it is and it goes into their expenses'));
    box.appendChild(hd);
    if(L.length){ const ul=h('ul');
      L.slice(0, 8).forEach(d=>{ const li=h('li');
        const cn=d.so ? d.so.person : d.soc ? d.soc.name : '';
        li.appendChild(h('span','w', d.who ? (firstName(d.who)||d.fromName||d.from) : cn ? cn : (d.fromName ? d.fromName+' ('+d.from+')' : (d.from||'Someone'))));
        const n=(Array.isArray(d.files)?d.files.length:0);
        li.appendChild(h('span','s', (d.subject||'(no subject)')+(n ? ' · '+n+(n===1?' receipt':' receipts') : ' · no receipt attached')+' · '+when(atOf(d))));
        const st=d.so ? h('span','st ok','To Service Orders') : d.done ? h('span','st ok','Added') : d.soc ? h('span','st wait','Coming in') : !d.who ? h('span','st who','Not on the team') : h('span','st wait','Coming in');
        if(d.so) st.title='In '+d.so.person+'\u2019s My Expenses in the Service Orders portal ('+d.so.company+')';
        if(!d.who) st.title='Sent from '+(d.from||'an unknown address')+' — pick whose expense it is.';
        li.appendChild(st);
        /* not matched to anyone: Jonna or Vanessa picks who it belongs to, and it's added for them */
        if(!d.who && !d.so && !d.soc && all && !d.done){ const sel=h('select','asg'); sel.setAttribute('aria-label','Whose expense is this?'); sel.appendChild(new Option('Whose is it?',''));
          (S.people||[]).forEach(p=>sel.appendChild(new Option(p.name, p.id)));
          /* contractors who claim expenses: theirs goes to the Service Orders portal */
          if(roster && roster.length){ const g=document.createElement('optgroup'); g.label='Contractors (Service Orders)';
            roster.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(r=>g.appendChild(new Option(r.name+' \u00b7 '+r.company, 'so|'+r.key+'|'+r.pslug)));
            sel.appendChild(g); }
          sel.addEventListener('change', async ()=>{ if(!sel.value) return; sel.disabled=true; try{ const cur=Object.assign({}, docs[d.id]||{});
            if(sel.value.indexOf('so|')===0){ cur.assignSo=sel.value.slice(3); delete cur.assign; } else cur.assign=sel.value;
            await setDoc(d.id, cur); docs[d.id]=cur; await tick(true); }catch(e){ sel.disabled=false; } });
          li.appendChild(sel); li.classList.add('has-asg'); }
        ul.appendChild(li); });
      box.appendChild(ul);
      if(L.length>8) box.appendChild(h('div','more', '+'+(L.length-8)+' more'));
    }
    const vh=root.querySelector(':scope > .vhead');
    const after=root.querySelector(':scope > .exp-install') || vh;
    if(after) after.after(box); else root.prepend(box);
  } finally { if(mo) mo.observe(root, {childList:true}); }
}
mo=new MutationObserver(()=>{ if(!root.querySelector(':scope > .expin')) paint(); });
mo.observe(root, {childList:true});
const vis=new MutationObserver(()=>{ if(!root.hidden) tick(false); }); vis.observe(root, {attributes:true, attributeFilter:['hidden']});
const start=()=>{ if(S.ready && S.me && api() && window.__hqRelay){ tick(true); timer=setInterval(()=>{ if(!document.hidden) tick(false); }, 120e3); } else setTimeout(start, 1000); };
setTimeout(start, 4000);
window.__expIn={ version:'1.1', tick:()=>tick(true), docs:()=>docs, whoFrom, contractorFor, loadRoster,
  destroy(){ clearInterval(timer); mo && mo.disconnect(); vis.disconnect(); css.remove(); const b=root.querySelector(':scope > .expin'); b && b.remove(); } };
})();
