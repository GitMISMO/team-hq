/* Team HQ tour and help (November 7, 2026)
   - The Help button, and the ? key, open help for the page you're on.
   - New help sections for what was added this week.
   - A short guided tour the first time someone opens Team HQ (and any time from Help).
   - Empty task lists say what goes there and offer a button to start. */
(function(){
'use strict';
if(window.__hqTour && window.__hqTour.destroy) window.__hqTour.destroy();
const S=window.__S; if(!S) return;
const added=[];
function h(t,c,x){ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function btn(c,x,f){ const b=h('button',c,x); b.type='button'; if(f) b.addEventListener('click', f); return b; }

/* ---------- help for the page you're on ---------- */
const NX={day:'dash', inbox:'inbox', mine:'mytasks', cal:'calendar', people:'views', systems:'systems'};
const HQ={today:'today', rocks:'rocks', plans:'plans', dates:'dates', findtime:'findtime', agenda:'agenda', syncs:'syncs', expenses:'expenses', mine:'board'};
function helpFor(){ const on=document.querySelector('.hq.rail .on[data-nx], .hq.rail [data-nx][aria-current], .hq.rail .on[data-hq], .hq.rail [data-hq][aria-current]');
  if(on && on.dataset.nx) return NX[on.dataset.nx] || 'start';
  if(on && on.dataset.hq) return HQ[on.dataset.hq] || 'start';
  if(document.documentElement.classList.contains('nx-show')) return 'views';
  return HQ[S.tab] || 'start'; }
function openHelp(id){ S.helpOpen=id||helpFor(); if(window.__show) window.__show('help'); }
const hb=document.getElementById('help-btn');
const onHelp=e=>{ S.helpOpen=helpFor(); };
if(hb){ hb.addEventListener('click', onHelp, true); hb.title='Help for this page (?)'; }
const onKey=e=>{ if(e.key!=='?' || e.metaKey || e.ctrlKey || e.altKey) return; const t=e.target; if(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; e.preventDefault(); openHelp(); };
document.addEventListener('keydown', onKey);

/* ---------- new help sections ---------- */
const NEW=[
 {after:'mytasks', id:'collab', t:'Comments, @Mentions and the Bell', d:'Talk about a task right on it, bring people in, and see what needs you.', h:`
<p>Every task has a <b>comment thread</b> at the bottom of its side panel and of the full task editor. Type <b>@</b> and a name to bring someone in; they see it in their bell. <span class="hk">Ctrl</span> + <span class="hk">Enter</span> posts. Delete your own comment with <b>Delete</b> (and Undo if you change your mind). A task with comments shows a small speech-bubble count in its row.</p>
<h4>The Bell</h4>
<p>The bell at the top shows what needs you: <b>mentions</b>, <b>comments</b> on tasks you're doing, are accountable for or follow, tasks someone <b>handed you</b>, tasks that are <b>ready to start</b> because what they waited on is done, <b>reminders</b> from rules, and what's <b>due today or tomorrow</b>. A red dot means something is new. Click an item to open the task.</p>`},
 {after:'collab', id:'taskmore', t:'Subtasks, Waiting On, Repeating and Followers', d:'Break a task down, link what it depends on, and make it come back on its own.', h:`
<ul>
<li><b>Subtasks</b>: type one and press Enter; tick them off. The task's row shows how many are done (2/5).</li>
<li><b>Can't Start Until</b>: pick the tasks this one is waiting on. The other task shows <b>Holding up</b>. When everything it waits on is done, the people on it get <b>Ready to start</b> in their bell. An hourglass in the row means it's still waiting.</li>
<li><b>Repeats</b>: every week, every 2 weeks, monthly, every 3 months or yearly. Mark it done and the next one is added with the right date and its subtasks unticked.</li>
<li><b>Followers</b>: click <b>Follow</b> (or add someone) to get its comments and updates in the bell, like the people doing it.</li>
</ul>`},
 {after:'taskmore', id:'calview', t:'The Calendar View and Workload', d:'Tasks on a month, and how full everyone’s weeks are.', h:`
<p>My Tasks, a Team Project and a person's page have three views: <b>List</b>, <b>Board</b> and <b>Calendar</b>. Calendar shows the month with each task on its due date. <b>Drag a task to another day</b> to move it, or use the + on a day to add one. The tray underneath holds anything <b>past due from earlier</b> and anything with <b>no date</b>; drag those onto a day.</p>
<p><b>Workload</b> (a tab on Team Projects, and on the People page) counts each person's open hands-on tasks by the week they're due, for the next four weeks, plus past due and no date. Darker means fuller; 8 or more is marked heavy.</p>`},
 {after:'rocks', id:'projstatus', t:'Project Status, Templates and Rules', d:'Say where a project stands, reuse a plan, and set reminders that run themselves.', h:`
<h4>Status</h4>
<p>On a Team Project, <b>Update Status</b> sets <b>On Track</b>, <b>At Risk</b> or <b>Off Track</b> with a one-line reason and an optional weekly note. Anyone can post one. It shows on the project's card and page for 3 weeks; after that the status goes back to being worked out from the tasks. The <b>Status</b> tab on Team Projects is the roll-up: Off Track first, then At Risk, with who updated it and when (amber when it's been more than a week).</p>
<h4>Templates</h4>
<p>On a Team Project, <b>Save as Template</b> keeps its tasks with their dates as days from the first one, plus owners, notes, subtasks and repeats. On Team Projects, <b>Start From a Template</b> asks for a name, the first due date and who leads it, and makes every task with its dates moved to match.</p>
<h4>Rules</h4>
<p>On a Team Project, <b>Rules</b> adds a "when this, then that": <b>marked Done</b> → tell someone; <b>due in a few days and not started</b> → nudge the person doing it; <b>past due</b> → nudge the accountable person. Reminders land on My Tasks and in the bell, once each. Rules run whenever someone has Team HQ open.</p>`},
 {after:'trouble', id:'health', t:'System Health', d:'Whether saving, storage and the email and calendar flows are working.', h:`
<p><b>System Health</b> at the foot of the left menu checks every 5 minutes: <b>Saving</b>, <b>Storage</b> (how full the biggest files are), the <b>Email</b> flows, the <b>Outlook calendar</b> flows, the <b>Do It in Outlook</b> flow, and <b>errors on this page</b>. Its dot is green, amber or red, and a red bar appears across the top if something stops. The <b>Team Error Log</b> lists errors from anyone's screen in the last 7 days; <b>Copy Report</b> copies everything to send to whoever is fixing it.</p>`},
 {after:'health', id:'systems', t:'Connected Systems', d:'How MISMO’s systems fit together, what each one does, and what runs on its own.', h:`
<p><b>Connected Systems</b> (under Team in the left menu, or add its tile with <b>+ Add a Tile</b>) is the map of every MISMO system and the work that moves between them. Point at a box to light up everything it touches; select it for what it does, where it lives, what it replaced, and what it sends and receives. The area buttons show one part of the operation. A moving dot means the work moves automatically; a <b>dashed line</b> means a person copies it.</p>
<h4>Where It Comes From</h4>
<p>The MISMO Connections Map is the source of truth. The page's content is kept in Team HQ's private data (not in its public code) and shows the date it's <b>as of</b>. To bring it up to date, ask Team HQ's Claude to <b>refresh Connected Systems</b>; it reads the Connections Map and saves the latest.</p>
<h4>Edit Mode (Jonna)</h4>
<p>Click <b>Edit</b> at the top. Select a system to change its status, status note or details; <b>Add a System</b> or <b>Add a Connection</b>; drag a box to move it. Anything still to confirm shows an amber dot, only in Edit mode. <b>Set Aside</b> takes something off the map without deleting it, and <b>Set Aside (n)</b> brings it back. Every save updates the as-of date, and Undo is on the message that appears.</p>`}
];
function addHelp(){ const HELP_SECS=window.__helpSecs; try{ if(Array.isArray(HELP_SECS)){
  NEW.forEach(n=>{ if(HELP_SECS.some(s=>s.id===n.id)) return; const i=HELP_SECS.findIndex(s=>s.id===n.after); const sec={id:n.id, t:n.t, d:n.d, h:n.h};
    if(i>=0) HELP_SECS.splice(i+1, 0, sec); else HELP_SECS.push(sec); });
  const st=HELP_SECS.find(s=>s.id==='start'); if(st && st.h.indexOf('data-tour')<0) st.h='<p><button type="button" class="btn sm" data-tour="1">Take the 1-Minute Tour</button></p>'+st.h; } }catch(e){} }
addHelp();
const onTourBtn=e=>{ const b=e.target.closest && e.target.closest('[data-tour]'); if(b){ e.preventDefault(); startTour(); } };
document.addEventListener('click', onTourBtn);

/* ---------- the guided tour ---------- */
const STEPS=[
 {t:'Welcome to Team HQ', b:'The team’s one place for what everyone is working on. This takes about a minute; you can leave any time with Esc.'},
 {sel:'.hq.rail [data-nx="day"]', t:'My Dashboard', b:'Your front page: your day, your week, and tiles you choose — including numbers from MISMO’s other systems.'},
 {sel:'.hq.rail [data-nx="mine"]', t:'My Tasks', b:'Everything you’re doing. Click a task to work on it: comments, @mentions, subtasks, repeats. Switch between List, Board and Calendar at the top.'},
 {sel:'.hq.rail [data-hq="rocks"]', t:'Team Projects', b:'The big efforts everything rolls up to. Post a status update, see Workload, start from a template, or set rules that send reminders.'},
 {sel:'#rail-q', t:'Find Anything', b:'Search tasks, projects, people, dates and help here. Ctrl+K jumps to anything from anywhere.'},
 {sel:'#hq-bell', t:'The Bell', b:'Mentions, comments on your tasks, tasks handed to you, and what’s due soon. A red dot means something is new.'},
 {sel:'#help-btn', t:'Help', b:'Help for whatever page you’re on. Press ? any time. System Health, just above, shows whether everything is working.'}
];
let tour=null;
function tourKey(){ return 'hq.tour.'+(S.me||'-'); }
function endTour(done){ if(!tour) return; tour.ov.remove(); tour.ring.remove(); tour.card.remove(); document.removeEventListener('keydown', tour.key, true); window.removeEventListener('resize', tour.place); tour=null;
  try{ localStorage.setItem(tourKey(), done ? 'done' : 'skipped'); }catch(e){} }
function startTour(){ if(tour) endTour(false); const ov=h('div','hqt-ov'), ring=h('div','hqt-ring'), card=h('div','hqt-card');
  card.setAttribute('role','dialog'); card.setAttribute('aria-live','polite'); card.setAttribute('aria-label','Team HQ tour');
  document.body.appendChild(ov); document.body.appendChild(ring); document.body.appendChild(card);
  tour={i:0, ov, ring, card};
  tour.place=()=>{ const s=STEPS[tour.i], el=s.sel && document.querySelector(s.sel), r=el && el.getBoundingClientRect();
    const vis=r && r.width>0 && r.height>0;
    ring.hidden=!vis; if(vis){ ring.style.left=(r.left-6)+'px'; ring.style.top=(r.top-6)+'px'; ring.style.width=(r.width+12)+'px'; ring.style.height=(r.height+12)+'px'; }
    const cw=Math.min(340, innerWidth-24); card.style.width=cw+'px';
    if(vis){ let left=r.right+16, top=Math.max(12, Math.min(r.top-8, innerHeight-card.offsetHeight-12));
      if(left+cw>innerWidth-12){ left=Math.max(12, Math.min(r.left, innerWidth-cw-12)); top=r.bottom+14; if(top+card.offsetHeight>innerHeight-12) top=Math.max(12, r.top-card.offsetHeight-14); }
      card.style.left=left+'px'; card.style.top=top+'px'; }
    else { card.style.left=Math.max(12,(innerWidth-cw)/2)+'px'; card.style.top=Math.max(12, innerHeight*0.28)+'px'; } };
  tour.draw=()=>{ const s=STEPS[tour.i]; card.textContent='';
    card.appendChild(h('div','hqt-n', (tour.i+1)+' of '+STEPS.length)); card.appendChild(h('h3',null,s.t)); card.appendChild(h('p',null,s.b));
    const f=h('div','hqt-f'); f.appendChild(btn('hqt-skip', tour.i===STEPS.length-1?'':'Skip the tour', ()=>endTour(false)));
    const sp=h('span'); sp.style.flex='1'; f.appendChild(sp);
    if(tour.i>0) f.appendChild(btn('hqt-b','Back', ()=>{ tour.i--; tour.draw(); }));
    const nx=btn('hqt-b pri', tour.i===STEPS.length-1 ? 'Done' : tour.i===0 ? 'Show Me' : 'Next', ()=>{ if(tour.i===STEPS.length-1){ endTour(true); return; } tour.i++; tour.draw(); }); f.appendChild(nx);
    card.appendChild(f); requestAnimationFrame(tour.place); setTimeout(()=>nx.focus(), 0); };
  tour.key=e=>{ if(!tour) return; if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); endTour(false); }
    else if(e.key==='ArrowRight'){ e.preventDefault(); if(tour.i<STEPS.length-1){ tour.i++; tour.draw(); } else endTour(true); }
    else if(e.key==='ArrowLeft' && tour.i>0){ e.preventDefault(); tour.i--; tour.draw(); } };
  document.addEventListener('keydown', tour.key, true); window.addEventListener('resize', tour.place);
  ov.addEventListener('click', ()=>endTour(false)); tour.draw(); }
const css=h('style'); css.textContent=
 '.hqt-ov{position:fixed;inset:0;z-index:99970;background:rgba(6,32,47,.42)}'+
 '.hqt-ring{position:fixed;z-index:99971;border-radius:10px;box-shadow:0 0 0 3px #74bfeb,0 0 0 9999px rgba(6,32,47,.0);pointer-events:none;transition:all .2s ease}'+
 '.hqt-card{position:fixed;z-index:99972;background:var(--surface,#fff);color:var(--ink,#0d314c);border-radius:12px;padding:16px 18px 14px;box-shadow:0 18px 44px rgba(0,0,0,.28);font:14px/1.5 "IBM Plex Sans",system-ui,sans-serif}'+
 '.hqt-card h3{margin:2px 0 6px;font-size:17px}.hqt-card p{margin:0 0 12px;color:var(--ink-2,#414750)}.hqt-n{font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3,#71777F)}'+
 '.hqt-f{display:flex;align-items:center;gap:8px}.hqt-b{border:1px solid var(--border,#c9d6e2);background:transparent;color:inherit;border-radius:6px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}'+
 '.hqt-b.pri{background:var(--navy,#0d314c);border-color:transparent;color:#fff}.hqt-skip{border:0;background:none;color:var(--ink-3,#71777F);font:inherit;font-size:12.5px;cursor:pointer;padding:0;text-decoration:underline}.hqt-skip:empty{display:none}'+
 '.nx-empty .nx-empty-go{display:block;margin-top:8px}';
document.head.appendChild(css); added.push(css);
/* first visit: once per person, on a computer, not in the Expenses app */
function maybeAuto(n){ const H=document.documentElement;
  if(H.classList.contains('app-exp') || (window.matchMedia && matchMedia('(max-width:900px)').matches)) return;
  let seen=''; try{ seen=localStorage.getItem(tourKey())||''; }catch(e){ return; } if(seen) return;
  if(!S.ready || !S.me || !document.querySelector('.hq.rail [data-nx="day"]')){ if(n<60) setTimeout(()=>maybeAuto(n+1), 1000); return; }
  setTimeout(startTour, 2500); }
maybeAuto(0);
window.__hqTour={ start:startTour, help:openHelp, version:'1.0',
  destroy(){ if(tour) endTour(false); if(hb) hb.removeEventListener('click', onHelp, true); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onTourBtn); added.forEach(x=>x.remove()); } };
})();
