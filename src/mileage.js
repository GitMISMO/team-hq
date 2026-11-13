/* Mileage in the expense editor (13 Nov 2026).
   Choosing Mileage as the Expense Type asks for the miles driven and works out the amount at the IRS business
   rate for the expense date. The miles and the rate go into the notes ("Mileage: 42 miles at $0.76 a mile"),
   so they travel with the expense into DataBasics. Mileage needs no receipt: the miles stand in for one, so the
   receipt box reads "No receipt needed for mileage" and is ticked.
   The editor itself is in index.html; this only adds to it, by finding its fields by their labels. */
(function(){
'use strict';
if(window.__mileage && window.__mileage.destroy) window.__mileage.destroy();
/* the IRS business standard mileage rate, newest first: [first day it applies, dollars a mile] */
const RATES=[['2026-07-01',0.76],['2026-01-01',0.725],['2025-01-01',0.70],['2024-01-01',0.67]];
const CAT='Mileage';
function rateFor(d){ const s=String(d||'') || new Date().toISOString().slice(0,10);
  for(const [from, r] of RATES) if(s>=from) return r; return RATES[RATES.length-1][1]; }
const money=n=>'$'+Number(n).toFixed(2);
const rateTxt=r=>'$'+(Math.round(r*1000)%10 ? r.toFixed(3) : r.toFixed(2));
const LINE=/^\s*Mileage:\s*([\d.,]+)\s*miles?\b.*$/im;

/* the control under a field label in the open editor */
function ctl(root, label){
  for(const f of root.querySelectorAll('.f')){ const s=f.firstElementChild;
    if(s && s.tagName==='SPAN' && s.textContent.trim()===label) return f.querySelector('input,select,textarea,.rte'); }
  return null; }
function rcptBox(root){
  for(const l of root.querySelectorAll('label.chkrow')){ const s=l.querySelector('span');
    if(s && /I have the receipt|No receipt needed for mileage/.test(s.textContent)) return {cb:l.querySelector('input'), txt:s}; }
  return null; }
const fire=(n, t)=>n.dispatchEvent(new Event(t, {bubbles:true}));

function hook(root){
  const cat=ctl(root, 'Expense Type'); if(!cat || cat.__mi) return;
  const amt=ctl(root, 'Expense Amount'), ramt=ctl(root, 'Receipt Amount'), date=ctl(root, 'Expense Date'),
    name=ctl(root, 'Expense Name'), notes=ctl(root, 'Notes (Optional)'), rc=rcptBox(root);
  if(!amt) return;
  cat.__mi=1;
  const wrap=document.createElement('label'); wrap.className='f mi-f';
  const lab=document.createElement('span'); lab.textContent='Miles Driven';
  const mi=document.createElement('input'); mi.type='number'; mi.step='0.1'; mi.min='0'; mi.placeholder='0'; mi.inputMode='decimal';
  const hint=document.createElement('div'); hint.className='mi-hint';
  wrap.appendChild(lab); wrap.appendChild(mi); wrap.appendChild(hint);
  const catF=cat.closest('.f'); catF.parentNode.insertBefore(wrap, catF.nextSibling);
  const namePh=name ? name.placeholder : '';
  /* miles already in the notes (an expense saved earlier) */
  try{ const m=LINE.exec(String(notes && notes.value || '')); if(m) mi.value=m[1].replace(/,/g,''); }catch(e){}

  function writeNote(miles, r){
    if(!notes) return;
    try{ let t=String(notes.value||'').replace(LINE, '').replace(/^\s*\n/, '');
      const line=miles>0 ? 'Mileage: '+miles+' miles at '+rateTxt(r)+' a mile (IRS rate)' : '';
      notes.value=line ? (t.trim() ? line+'\n'+t : line) : t; }catch(e){}
  }
  function calc(alsoNote){
    const miles=Number(mi.value)||0, r=rateFor(date && date.value);
    if(miles>0){ const a=(Math.round(miles*r*100)/100).toFixed(2);
      if(amt.value!==a){ amt.value=a; fire(amt, 'input'); fire(amt, 'change'); }
      if(ramt && ramt.value!==a){ ramt.value=a; fire(ramt, 'input'); }
      hint.textContent=miles+' miles × '+rateTxt(r)+' a mile (the IRS rate on this date) = '+money(a);
    } else hint.textContent='The amount works out at '+rateTxt(r)+' a mile, the IRS rate on this date.';
    if(alsoNote) writeNote(miles, r);
  }
  function show(){
    const on=cat.value===CAT;
    wrap.style.display=on ? '' : 'none';
    if(name) name.placeholder=on ? 'From and to (for example, Office to Dulles)' : namePh;
    if(rc){ rc.txt.textContent=on ? 'No receipt needed for mileage' : 'I have the receipt';
      if(on && !rc.cb.checked){ rc.cb.checked=true; fire(rc.cb, 'change'); } }
    if(on) calc(false);
  }
  mi.addEventListener('input', ()=>calc(false));
  mi.addEventListener('change', ()=>calc(true));
  cat.addEventListener('change', show);
  if(date) date.addEventListener('change', ()=>{ if(cat.value===CAT){ calc(Number(mi.value)>0); } });
  show();
}

let raf=0;
const scan=()=>{ raf=0; const p=document.getElementById('panel'); if(p) hook(p); };
const mo=new MutationObserver(()=>{ if(!raf) raf=requestAnimationFrame(scan); });
mo.observe(document.body, {childList:true, subtree:true});
scan();

const st=document.createElement('style'); st.id='mi-style';
st.textContent='.mi-f .mi-hint{font-size:12px;color:var(--mut,#5b6b7a);margin-top:4px;line-height:1.35}';
document.head.appendChild(st);

window.__mileage={rateFor, destroy(){ mo.disconnect(); st.remove(); }};
})();
