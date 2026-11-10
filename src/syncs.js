/* Sync Ups, refreshed: a header band with the next sync and the totals, each space with its own color,
   a countdown to its next meeting and a bar for what's past due, and lists that read like boards. */
(function(){
'use strict';
const V=document.getElementById('app-syncs'); if(!V) return;
const PAL=['#2477b8','#2bb673','#9b8cf0','#e8833a','#22b8cf','#e86f5a','#f2b134','#5aa9e6'];
const hash=s=>{ let x=0; for(const ch of String(s)) x=(x*31+ch.charCodeAt(0))|0; return Math.abs(x); };
const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
function nextOf(txt){ const m=/next\s+([A-Za-z]{3})[a-z]*\s+(\d{1,2}),\s*(\d{4})/i.exec(txt||''); if(!m) return null; const mo=MON[m[1].toLowerCase()]; if(mo==null) return null; return new Date(+m[3], mo, +m[2]); }
function daysTo(d){ const t=new Date(); t.setHours(0,0,0,0); return Math.round((d-t)/864e5); }
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const when=n=>n<0?'Past':n===0?'Today':n===1?'Tomorrow':'In '+n+' days';
const css=document.createElement('style'); css.id='sy-skin'; css.textContent=`
#app-syncs .sy-band{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(3,minmax(0,1fr));gap:10px;margin:0 0 16px;padding:16px 18px;border-radius:14px;color:#fff;background:radial-gradient(120% 120% at 100% 0%,rgba(116,191,235,.22),transparent 55%),linear-gradient(150deg,#10324a,#0b2436);box-shadow:0 14px 34px -22px rgba(6,32,47,.8)}
#app-syncs .sy-band .synx{display:flex;flex-direction:column;gap:3px;min-width:0}
#app-syncs .sy-band .eb{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#74bfeb}
#app-syncs .sy-band .nm{font-size:19px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#app-syncs .sy-band .wh{font-size:13px;color:rgba(255,255,255,.75)}
#app-syncs .sy-band .st{display:flex;flex-direction:column;justify-content:center;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(116,191,235,.18)}
#app-syncs .sy-band .st b{font-size:26px;font-weight:700;line-height:1.05}#app-syncs .sy-band .st span{font-size:11.5px;font-weight:600;color:rgba(255,255,255,.7)}
#app-syncs .sy-band .st.hot b{color:#ff9b8a}
@media(max-width:760px){#app-syncs .sy-band{grid-template-columns:repeat(3,minmax(0,1fr))}#app-syncs .sy-band .synx{grid-column:1/-1}}
#app-syncs .syspaces{display:flex;flex-direction:column;gap:12px;margin-top:0!important}
#app-syncs .syspace{--sa:#2477b8;border-radius:14px!important;border:1px solid var(--border)!important;border-left:4px solid var(--sa)!important;background:var(--surface)!important;box-shadow:0 1px 2px rgba(6,32,47,.06);overflow:hidden;transition:box-shadow .2s,transform .2s}
#app-syncs .syspace:not([open]):hover{transform:translateY(-2px);box-shadow:0 14px 28px -20px rgba(6,32,47,.55)}
#app-syncs .syspace > summary{padding:14px 16px!important;background:transparent!important}
#app-syncs .syspace[open] > summary{background:linear-gradient(90deg,color-mix(in srgb,var(--sa) 12%,transparent),transparent 70%)!important;border-bottom:1px solid var(--border)}
#app-syncs .syspace .pst{font-size:17px!important}
#app-syncs .sy-when{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:5px;font-size:12px;font-weight:700;color:var(--sa);background:color-mix(in srgb,var(--sa) 12%,transparent);white-space:nowrap}
#app-syncs .sy-when.now{color:#fff;background:var(--sa)}
#app-syncs .sy-when i{width:7px;height:7px;border-radius:50%;background:currentColor}
#app-syncs .sy-when.now i{animation:syPulse 1.6s ease-in-out infinite}
@keyframes syPulse{0%,100%{opacity:1}50%{opacity:.35}}
#app-syncs .sy-meter{flex:0 0 74px;height:6px;border-radius:3px;background:var(--surface-2,#eef4f9);overflow:hidden;display:flex}
#app-syncs .sy-meter b{display:block;height:100%;background:var(--sa)}#app-syncs .sy-meter b.od{background:#e5533d}
#app-syncs .sylist{border-radius:12px!important;border:1px solid var(--border)!important;border-top:3px solid var(--sa)!important;background:var(--surface-2,#f5f8fb)!important;box-shadow:none!important}
#app-syncs .sylhw .syln{font-size:12px!important;font-weight:800!important;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;overflow-wrap:normal!important;word-break:normal!important}
#app-syncs .sylhw .sylh{min-width:0}
#app-syncs .sylhw .cnt{border-radius:5px!important;background:color-mix(in srgb,var(--sa) 14%,transparent)!important;color:var(--sa)!important;font-weight:800}
#app-syncs .syc{border-radius:10px!important;background:var(--surface)!important;border:1px solid var(--border)!important;box-shadow:0 1px 2px rgba(6,32,47,.05);transition:transform .15s,box-shadow .15s,border-color .15s}
#app-syncs .syc:hover{transform:translateY(-1px);box-shadow:0 8px 18px -12px rgba(6,32,47,.45);border-color:color-mix(in srgb,var(--sa) 45%,var(--border))!important}
#app-syncs .syc:has(.ch-od){border-left:3px solid #e5533d!important}
#app-syncs .syc .pchk{transition:transform .15s}#app-syncs .syc .pchk:hover{transform:scale(1.12)}
#app-syncs .syc.sy-pop{animation:syPop .5s ease}
@keyframes syPop{0%{transform:scale(1)}35%{transform:scale(1.03);background:color-mix(in srgb,#2bb673 18%,var(--surface))}100%{transform:scale(1)}}
#app-syncs .syqa{border-radius:8px!important}
@media (prefers-reduced-motion:reduce){#app-syncs *{animation:none!important;transition:none!important}}
`;
document.head.appendChild(css);
let busy=false;
function paint(){ if(busy) return; busy=true; try{
  const spaces=[...V.querySelectorAll('.syspace')]; if(!spaces.length){ const b=V.querySelector('.sy-band'); if(b) b.remove(); return; }
  let open=0, late=0, best=null;
  spaces.forEach(sp=>{ const pst=sp.querySelector(':scope > summary .pst'); if(!pst) return; const name=(pst.firstChild && pst.firstChild.nodeType===3 ? pst.firstChild.nodeValue : pst.textContent).trim(); const small=(pst.querySelector('small')||{}).textContent||'';
    const col=PAL[hash(name)%PAL.length]; if(sp.style.getPropertyValue('--sa')!==col) sp.style.setProperty('--sa', col);
    const chips=[...sp.querySelectorAll(':scope > summary .chip')].map(c=>c.textContent); const o=+((chips.find(t=>/Open/i.test(t))||'').match(/\d+/)||[0])[0], l=+((chips.find(t=>/Past Due|Late/i.test(t))||'').match(/\d+/)||[0])[0]; open+=o; late+=l;
    const d=nextOf(small); const psr=sp.querySelector(':scope > summary .psr');
    if(psr){ let w=psr.querySelector('.sy-when'); if(d){ const n=daysTo(d); const txt=when(n); if(!w){ w=document.createElement('span'); w.className='sy-when'; w.innerHTML='<i></i><span></span>'; psr.insertBefore(w, psr.firstChild); } if(w.lastChild.textContent!==txt) w.lastChild.textContent=txt; w.classList.toggle('now', n<=1); w.title=WD[d.getDay()]+', '+MN[d.getMonth()]+' '+d.getDate(); if(n>=0 && (!best || d<best.d)) best={d, n, name}; } else if(w) w.remove();
      let m=psr.querySelector('.sy-meter'); if(o+l>0){ if(!m){ m=document.createElement('span'); m.className='sy-meter'; m.innerHTML='<b class="od"></b><b></b>'; psr.insertBefore(m, psr.querySelector('.syavs')); } const tot=o; const lp=tot ? Math.round(l/tot*100) : 0; m.firstChild.style.width=lp+'%'; m.lastChild.style.width=(100-lp)+'%'; m.title=l+' past due of '+o+' open'; } else if(m) m.remove(); } });
  let band=V.querySelector('.sy-band'); const host=V.querySelector('.syspaces');
  if(!band){ band=document.createElement('div'); band.className='sy-band'; band.innerHTML='<div class="synx"><span class="eb">Next Sync Up</span><span class="nm"></span><span class="wh"></span></div><div class="st"><b></b><span>Open Items</span></div><div class="st od"><b></b><span>Past Due</span></div><div class="st"><b></b><span>Spaces</span></div>'; host.parentNode.insertBefore(band, host); }
  const set=(sel,v)=>{ const e=band.querySelector(sel); if(e && e.textContent!==String(v)) e.textContent=String(v); };
  set('.nm', best ? best.name : 'Nothing scheduled'); set('.wh', best ? (WD[best.d.getDay()]+', '+MN[best.d.getMonth()]+' '+best.d.getDate()+' · '+when(best.n)) : 'Set a day in a space’s settings');
  set('.st:nth-child(2) b', open); set('.st.od b', late); band.querySelector('.st.od').classList.toggle('hot', late>0); set('.st:nth-child(4) b', spaces.length);
} finally { setTimeout(()=>{ busy=false; }, 0); } }
let t=null; const mo=new MutationObserver(()=>{ if(busy) return; clearTimeout(t); t=setTimeout(paint, 120); }); mo.observe(V, {childList:true, subtree:true, characterData:true});
V.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('.syc .pchk'); if(!b) return; const c=b.closest('.syc'); c.classList.remove('sy-pop'); void c.offsetWidth; c.classList.add('sy-pop'); }, true);
paint();
window.__sySkin={paint, destroy(){ mo.disconnect(); css.remove(); const b=V.querySelector('.sy-band'); if(b) b.remove(); }};
})();
