/* ---------- one read per file ----------
   On opening, several parts of Team HQ ask for the same files (tasks, people, agenda …) within seconds of
   each other; each answer is now shared, so the page waits on half as many reads. A save to a file always
   clears it, so the next read after a save is fresh. */
(function(){
  if(window.__getShare) return; window.__getShare=true;
  var RE=/\.lambda-url\.[^\/]+\.on\.aws\/[^?#]+\/(data|file)\//, of=window.fetch.bind(window), C={};
  window.fetch=function(u,o){
    var url=String(u&&u.url||u), m=((o&&o.method)||(u&&u.method)||'GET').toUpperCase();
    if(!RE.test(url) || /\/data\/profiles(\?|$)/.test(url)) return of(u,o);   /* your own settings are always read fresh */
    var key=url.split('#')[0];
    if(m!=='GET'){ delete C[key]; return of(u,o).then(function(r){ delete C[key]; return r; }); }
    var hit=C[key]; if(hit && (!hit.done || Date.now()-hit.done<6000)) return hit.p.then(function(r){ return r.clone(); });
    var e={done:0}; C[key]=e;
    e.p=of(u,o).then(function(r){ e.done=Date.now(); if(!r.ok) delete C[key]; return r; }, function(err){ delete C[key]; throw err; });
    return e.p.then(function(r){ return r.clone(); }); };
})();
/* ---------- the opening screen ----------
   Team HQ loads your tasks, calendars and email before it can draw your dashboard. This card covers
   that, the same way Member 360 and MISMO Money do, and lifts once everything is in place. */
(function(){
  var D=document, H=D.documentElement, t0=Date.now(), KEY='tools:team-hq:boot2.ms', done=false;
  var appx=/[?&]app=expenses/.test(location.search) || H.classList.contains('app-exp');
  var est=4; try{ var v=+localStorage.getItem(KEY); if(v>1500 && v<15000) est=Math.max(3, Math.min(8, Math.round(v/1000))); }catch(e){}
  /* never cover the sign-in page */
  function signin(){ if(window.__S && window.__S.ready) return false; var pw=D.querySelector('input[type=password]'); return !!(pw && pw.offsetParent!==null); }
  window.__hqBooted=false;
  function release(){ H.classList.remove('hq-boot'); if(!window.__hqBooted) setTimeout(function(){ window.__hqBooted=true; try{ window.dispatchEvent(new Event('hq:booted')); }catch(e){} }, 3000); }
  if(signin()){ release(); return; }
  var css=D.createElement('style'); css.id='hq-boot-css'; css.textContent=
    '#hqo{position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;padding:16px;background:radial-gradient(120% 90% at 100% 0%,rgba(116,191,235,.18),transparent 55%),linear-gradient(160deg,#10324a,#0b2436);transition:opacity .35s;font-family:"IBM Plex Sans",system-ui,sans-serif}'+
    '#hqo.out{opacity:0;pointer-events:none}'+
    '#hqo .c{max-width:440px;width:100%;box-sizing:border-box;background:#fff;color:#0d314c;border-radius:12px;padding:26px 26px 22px;box-shadow:0 24px 60px rgba(0,0,0,.35)}'+
    ':root[data-theme="dark"] #hqo .c{background:#13283a;color:#e8f1f8}'+
    '#hqo .eb{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#5b7083;margin:0 0 6px}'+
    '#hqo h2{margin:0 0 10px;font-size:21px;font-weight:700;line-height:1.25}'+
    '#hqo p{margin:0 0 14px;font-size:14px;line-height:1.5;color:#4a5f72}:root[data-theme="dark"] #hqo p{color:#a9bccb}'+
    '#hqo .tm{display:flex;align-items:baseline;gap:8px;margin:0 0 8px}#hqo .tm b{font-size:32px;font-weight:700;letter-spacing:-.01em}#hqo .tm small{font-size:12.5px;color:#5b7083}'+
    '#hqo .bar{height:5px;border-radius:3px;background:#e6f2fb;overflow:hidden;margin:0 0 16px}#hqo .bar i{display:block;height:100%;width:3%;background:linear-gradient(90deg,#0d314c,#74bfeb);transition:width .4s}'+
    '#hqo ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}#hqo li{display:flex;align-items:center;gap:10px;font-size:13.5px;color:#4a5f72}:root[data-theme="dark"] #hqo li{color:#a9bccb}'+
    '#hqo li .s{width:16px;height:16px;flex:0 0 auto;border-radius:50%;border:2px solid #b9dcf3;border-top-color:transparent;animation:hqspin .8s linear infinite;box-sizing:border-box}'+
    '#hqo li.ok{color:#0d314c}:root[data-theme="dark"] #hqo li.ok{color:#e8f1f8}#hqo li.ok .s{animation:none;border:0;background:#2bb673;position:relative}#hqo li.ok .s::after{content:"";position:absolute;left:5px;top:2px;width:4px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}'+
    '@keyframes hqspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){#hqo li .s{animation:none}}';
  (D.head||H).appendChild(css);
  var steps=appx ? [['me','Signing You In'],['data','Your Expenses'],['dash','Getting Expenses Ready']]
                 : [['me','Signing You In'],['data','Tasks and Team Projects'],['cal','Team Calendars'],['mail','Your Email'],['dash','Your Dashboard']];
  var o=D.createElement('div'); o.id='hqo'; o.setAttribute('role','status'); o.setAttribute('aria-live','polite');
  o.innerHTML='<div class="c"><div class="eb">'+(appx?'Expenses':'Team HQ')+'</div><h2>Opening '+(appx?'Expenses':'Team HQ')+'…</h2>'+
    '<p>Getting your work, your team and your calendar in place so everything you see is ready to use. This usually takes about <b>'+est+'</b> seconds.</p>'+
    '<div class="tm"><b>0:00</b><small>of about '+est+'s</small></div><div class="bar"><i></i></div><ul>'+
    steps.map(function(s){ return '<li data-k="'+s[0]+'"><span class="s"></span><span>'+s[1]+'</span></li>'; }).join('')+'</ul></div>';
  function mount(){ if(D.body && !o.isConnected) D.body.appendChild(o); H.classList.remove('hq-boot'); }
  if(D.body) mount(); else D.addEventListener('DOMContentLoaded', mount);
  var got={}, calSeen=0, calQuiet=0;
  function mark(k){ if(got[k]) return; got[k]=1; var li=o.querySelector('li[data-k="'+k+'"]'); if(li) li.classList.add('ok'); }
  function check(){
    if(done) return;
    var S=window.__S, el=Date.now()-t0;
    if(signin()){ finish(true); return; }
    if(S && (S.me || S.uid)) mark('me');
    if(S && S.ready && S.tasks && S.tasks.length) mark('data');
    if(appx){ if(S && S.ready) mark('data'); var ex=D.getElementById('app-expenses'); if(got.data && ex && ex.offsetParent!==null) mark('dash'); }
    else {
      try{ var n=performance.getEntriesByType('resource').filter(function(e){ return e.name.indexOf('/team-hq/data/cal-')>=0 && e.responseEnd>0; }).length;
        if(n>calSeen){ calSeen=n; calQuiet=Date.now(); } if((calSeen && Date.now()-calQuiet>500) || el>4500) mark('cal'); }catch(e){ mark('cal'); }
      var X=window.__hqx; if((X && X.MAIL && /^(ok|none|off|err)$/.test(X.MAIL.state)) || el>4500) mark('mail');
      var g=D.querySelector('.nx-tiles'); if(got.data && ((g && g.children.length) || (window.__nx && el>5000))) mark('dash');
    }
    var need=appx ? ['me','data','dash'] : ['me','data','cal','mail','dash'];
    var have=need.filter(function(k){ return got[k]; }).length;
    var pct=Math.min(97, Math.max(have/need.length*100, Math.min(90, el/(est*1000)*90)));
    o.querySelector('.bar i').style.width=pct+'%';
    var s=Math.floor(el/1000); o.querySelector('.tm b').textContent=Math.floor(s/60)+':'+('0'+(s%60)).slice(-2);
    if(have===need.length || (got.data && got.dash && el>6000) || el>10000){ finish(false); return; }
    setTimeout(check, 150);
  }
  function finish(skip){
    if(done) return; done=true; var el=Date.now()-t0;
    if(!skip){ try{ localStorage.setItem(KEY, String(el)); }catch(e){} o.querySelector('.bar i').style.width='100%'; need().forEach(mark); }
    /* two frames so the dashboard is drawn before the card lifts */
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ o.classList.add('out'); setTimeout(function(){ o.remove(); css.remove(); }, 400); release(); }); });
  }
  function need(){ return appx ? ['me','data','dash'] : ['me','data','cal','mail','dash']; }
  check();
})();
