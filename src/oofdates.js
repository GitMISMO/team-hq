/* Out of office in Outlook → Out of Office key dates.
   Each stretch of out-of-office in someone's Outlook calendar (all day, or 4 hours or more) becomes an
   "Out of Office" key date with that person tagged, marked as coming from Outlook. Stretches that touch,
   or are only split by a weekend or a MISMO holiday, are one key date. Days that are only weekends or
   holidays make none (the holiday is already on everyone's calendar).
   - A key date someone added by hand (Travel or Out of Office, with that person tagged) always wins:
     no Outlook one is made over it.
   - Change it in Outlook and the key date follows; cancel it and the key date goes away. Only key dates
     this made (src:'outlook') are ever changed or removed, and only future ones inside the stretch of
     calendar Team HQ can see, so a calendar that didn't come through never wipes anything.
   - The id comes from the person and the first day, so two people's Team HQ doing this at the same
     moment write the same key date, not two. A pin or a note someone adds is kept. */
(function(){
'use strict';
if(window.__oofd && window.__oofd.stop) window.__oofd.stop();
const S=window.__S; if(!S) return;
const pad=n=>(n<10?'0':'')+n;
const isoD=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const ymd=s=>{ const p=String(s).split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); };
const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const ETD=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit'});
const etDay=ms=>ETD.format(new Date(ms));
/* all-day events come through as midnight UTC: their date is the UTC date, not the Eastern one */
const utcMid=ms=>ms%864e5===0;
const dayOf=ms=>utcMid(ms) ? new Date(ms).toISOString().slice(0,10) : etDay(ms);
function holiday(d){ try{ return !!(window.__t && window.__t.holidayOn(d)); }catch(e){ return false; } }
const off=d=>d.getDay()%6===0 || holiday(d);
const firstName=id=>{ const p=(S.people||[]).find(z=>z.id===id); return p && p.name ? p.name.split(' ')[0] : id; };
const overlap=(a1,b1,a2,b2)=>a1<=b2 && a2<=b1;

function runsFor(list){
  const ev=list.filter(e=>e && e.show==='oof' && e.e>e.s && (e.all || (utcMid(e.s) && utcMid(e.e)) || (e.e-e.s)>=4*3600e3));
  const spans=ev.map(e=>({a:dayOf(e.s), b:dayOf(e.e-1), t:String(e.t||'').trim()})).sort((x,y)=>x.a<y.a?-1:x.a>y.a?1:0);
  const runs=[];
  spans.forEach(sp=>{ const last=runs[runs.length-1];
    if(last){ let d=addD(ymd(last.b),1); let guard=0; while(isoD(d)<sp.a && off(d) && guard++<20) d=addD(d,1);
      if(sp.a<=isoD(d)){ if(sp.b>last.b) last.b=sp.b; if(sp.t && last.ts.indexOf(sp.t)<0) last.ts.push(sp.t); return; } }
    runs.push({a:sp.a, b:sp.b, ts:sp.t?[sp.t]:[]}); });
  return runs.map(r=>{ let a=ymd(r.a), b=ymd(r.b), g=0; while(a<=b && off(a) && g++<40) a=addD(a,1); g=0; while(b>=a && off(b) && g++<40) b=addD(b,-1);
    if(a>b) return null;
    /* subjects that are just a holiday's name say nothing about the person */
    const ts=r.ts.filter(t=>!/^(day after )?(thanksgiving|christmas|new year|veteran'?s|memorial|labor|independence|juneteenth|martin luther|president'?s|columbus|indigenous|office closed)/i.test(t)).slice(0,3);
    return {a:isoD(a), b:isoD(b), ts}; }).filter(Boolean);
}

let busy=false, lastSig='';
async function sync(){
  if(busy) return; const C=window.__cal && window.__cal.CAL; const by=(C && C.by)||{};
  if(!Array.isArray(S.dates) || !S.dates.length || !Array.isArray(S.people) || !S.people.length || !C || !C.at) return;
  if(Date.now()-C.at > 3*3600e3) return;   /* calendars this old aren't worth acting on */
  const sig=C.at+'|'+S.dates.length+'|'+S.dates.filter(d=>d.src==='outlook').map(d=>d.id+d.d+d.e).join(',');
  if(sig===lastSig) return; busy=true;
  try{
    let db=null; try{ db=await window.claude.use('db'); }catch(e){}
    if(!db || !db.collection) return;
    const col=db.collection('dates'); const today=etDay(Date.now()); let writes=0; const MAXW=40;
    for(const pid of Object.keys(by)){
      const list=by[pid]; if(!Array.isArray(list) || !list.length) continue;
      if(!(S.people||[]).some(p=>p.id===pid)) continue;
      const seen=dayOf(Math.max.apply(null, list.map(e=>e.e||0))-1);
      const runs=runsFor(list).filter(r=>r.b>=today);
      /* a key date added by hand wins: travel or time off, or a one-off MISMO meeting the person is going to
         (out of the office for an in-person team meeting isn't time off) */
      const manual=S.dates.filter(d=>d.src!=='outlook' && d.d && !d.rec && (d.who||[]).indexOf(pid)>=0 && (/travel|out of office|pto|vacation/i.test((d.k||'')+' '+(d.t||'')) || /meeting|summit/i.test(d.k||'')));
      const mine=S.dates.filter(d=>d.src==='outlook' && (d.who||[])[0]===pid);
      const want={};
      for(const r of runs){
        if(manual.some(m=>overlap(m.d, m.e||m.d, r.a, r.b))) continue;
        const id='oof-'+pid+'-'+r.a; const nm=firstName(pid);
        const doc={t:nm+' Out of Office', k:'Out of Office', d:r.a, e:r.b===r.a?'':r.b, who:[pid], src:'outlook',
          note:'From '+nm+'’s Outlook calendar'+(r.ts.length?': '+r.ts.join(', '):'')+'. Change it in Outlook and this follows.'};
        want[id]=1;
        const cur=S.dates.find(d=>d.id===id);
        if(writes>=MAXW) continue;
        if(!cur){ writes++; await col.doc(id).set(Object.assign({pin:0}, doc)).catch(()=>{}); }
        else if(cur.d!==doc.d || (cur.e||'')!==doc.e || cur.src!=='outlook' || (cur.k!==doc.k)){ writes++; await col.doc(id).update({d:doc.d, e:doc.e, k:doc.k, src:'outlook', who:doc.who}).catch(()=>{}); }
      }
      for(const m of mine){
        if(want[m.id] || writes>=MAXW) continue;
        const end=m.e||m.d; if(end<today || m.d>seen) continue;   /* the past stays; beyond what we can see stays */
        writes++; await col.doc(m.id).delete().catch(()=>{});
      }
    }
    lastSig=sig;
  } finally { busy=false; }
}
/* after Team HQ has opened, when the calendars are in, and then every 15 minutes while the page is open */
let t1=setTimeout(function tick(){ if(document.visibilityState==='visible' && window.__hqBooted!==false) sync().catch(()=>{}); t1=setTimeout(tick, 15*60e3); }, 20000);
let t2=setInterval(()=>{ const C=window.__cal && window.__cal.CAL; if(C && C.at && C.at!==window.__oofd.calAt){ window.__oofd.calAt=C.at; setTimeout(()=>sync().catch(()=>{}), 3000); } }, 30000);
window.__oofd={ stop(){ clearTimeout(t1); clearInterval(t2); }, sync, runsFor, calAt:0 };
})();
