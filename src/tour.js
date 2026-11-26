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
const NX={day:'dash', inbox:'inbox', mine:'mytasks', cal:'calendar', people:'views', systems:'systems', events:'events', reports:'reports'};
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
 {after:'expenses', id:'expdone', t:'Sending a Trip to Vanessa, Mileage and Emailed Receipts', d:'Tell Vanessa a trip is ready to enter, claim mileage, and email in receipts.', h:`
<p>You don't enter your own expenses in DataBasics; Vanessa does. When every expense for a trip is in, tap <b>Done — Send to Vanessa</b> under the trip's name. If anything still needs a receipt or a detail, it says so first; fix it, or send anyway and add a note. Vanessa sees it in her bell and at the top of her Expenses under <b>Ready to Enter</b>. The trip shows <b>With Vanessa</b>, and <b>All Submitted</b> once she has entered it (you get a note in your bell).</p>
<ul>
<li><b>Who enters what:</b> Vanessa enters everyone's, except Jonathan's (his button says <b>Done — Send to Jonna</b>) and Jonna's own (hers says <b>Finalize</b>; finalized trips wait under her Ready to Enter).</li>
<li><b>Something came in later?</b> An expense added after you sent the trip shows <b>added since you sent it</b>; tap <b>Send the New One to Vanessa</b>.</li>
<li><b>Not done after all?</b> <b>Take It Back</b> returns the trip to you.</li>
<li><b>Forgot?</b> A week after a trip's last expense, if it hasn't been sent, you get one reminder.</li>
<li><b>Jonna and Vanessa</b> see the same bar on everyone's trips, with <b>Remind</b> (the person sees it on the trip and in their bell) and <b>Send for</b> them.</li>
<li><b>Trips:</b> pick the trip from the drop-down in the expense (New Trip… to start one). An industry event you’re going to (listed as going on <b>Industry Events</b>) is in the drop-down too, under its own heading. A snapped or emailed receipt joins your trip that has an expense within 3 days of it. Trips start folded; tap one to open it. Trips already entered fold into <b>Entered in DataBasics</b>.</li>
<li><b>Meal guidelines</b> (Nov 2026): breakfast $25, lunch $40, dinner $60, snacks $15, and no more than $140 a day for all meals. Anything $15 or more needs a receipt.</li>
<li><b>Vanessa:</b> each trip under <b>Ready to Enter</b> has <b>Entered and Submitted</b>, which ticks every sent expense on it at once (with Undo).</li>
<li><b>Mileage:</b> pick Mileage as the type and fill in <b>Miles Driven</b>. The amount is worked out at the IRS rate for the date, the miles go in the notes, and no receipt is needed.</li>
<li><b>Emailed receipts:</b> forward a receipt to expense@mismo.org. A receipt that is the email itself (Uber, airlines) is kept as a PDF and counts as the receipt.</li>
</ul>`},
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
<p><b>System Health</b> at the foot of the left menu checks every 5 minutes: <b>Saving</b>, <b>Storage</b> (how full the biggest files are), the <b>Email</b> flows, the <b>Outlook calendar</b> flows, the <b>Do It in Outlook</b> flow, and <b>errors on this page</b>. Its dot is green, amber or red, and a red bar appears across the top if something stops. The <b>Team Error Log</b> lists errors from anyone's screen in the last 7 days; <b>Copy Report</b> copies everything to send to whoever is fixing it.</p>
<p><b>Recent Changes</b> lists who changed what on the team’s tasks, Team Projects, key dates, plans and agenda in the last 7 days, with Open to go to the item. Each of those items also shows its own <b>History</b> at the foot of its panel (the last 90 days). Changes appear within the hour of being saved. Expenses, Sync Ups and notes are never included.</p>
`},
 {after:'expenses', id:'events', t:'Industry Events', d:'The conferences, trade shows and dinners MISMO goes to: who’s going, speaking, panels, promotion, tasks, graphics and contacts.', h:`
<p><b>Industry Events</b> (under Team Projects in the left menu, or add its tile with <b>+ Add a Tile</b>) is the list of other organizations’ events MISMO goes to or is thinking about. MISMO’s own Summits stay in Summit HQ. Everyone on the team can add and change events.</p>
<h4>The Page</h4>
<p>The boxes across the top show the next event we’re going to with a countdown, how many we’re going to, how many we’re still considering, speaking slots accepted, and what’s due in the next 30 days. Select a box to filter the list. Under them, filter by <b>Upcoming</b>, <b>Going</b>, <b>Considering</b>, <b>Speaking</b>, <b>Past</b>, <b>Not Going</b> or <b>Set Aside</b>, pick a person to see only their events, or search events, cities, people and contacts. Events are listed by month. On the right, <b>Coming Up</b> lists registration deadlines, speaking proposals due, promotion steps due, the event’s own tasks due and events starting in the next 60 days, and <b>Who’s Going Where</b> shows each person’s upcoming events.</p>
<h4>An Event</h4>
<p>Select an event (or <b>+ Add an Event</b>) to open it on the right. Nothing saves until you press <b>Save Changes</b>; if you close with changes not saved, it asks first. Its tabs:</p>
<p><b>Details</b>: name, who hosts it, kind, our status (Considering, Going, Not Going), dates, the registration deadline, city and venue, the event’s website, our role (Attending, Speaking, Exhibiting, Sponsoring), costs, the hotel or room block, the media kit or speaker portal link, and notes. Dates can be typed (3/15/27) or picked from the calendar button.<br>
<b>Who’s Going</b>: each person, their arrive and leave dates, and whether they’re registered and have a room. Once the event is set to Going, it shows as a trip choice in that person’s Expenses, so their receipts land on the right trip.<br>
<b>Speaking</b>: each session or topic, the speaker, when the proposal is due, where it stands (Idea, Submitted, Accepted, Confirmed, Declined, Done), and the session’s date and time.<br>
<b>Panels</b>: each panel (its title, date, time and a note) and who is on it: name, role on the panel (Moderator, Panelist, Keynote, Speaker, Other, or type your own), title, company, email and whether their company is a member. Type a name, company or email in <b>Find in Member 360</b> and pick the person to fill in their details; they’re marked <b>From Member 360</b>. If you don’t have Member 360, or it can’t be reached, it says so quietly and you type the details in.<br>
<b>Promotion</b>: the steps for telling people we’ll be there, each with a channel, due date, who and a link to the post. <b>Add the Usual Steps</b> adds five, dated from the event: MISMO Matters 30 days before, an announcement 21 days before, speaker graphics a week before, a post from the event, and a recap 3 days after. <b>Ask MISMO Media</b> opens MISMO Media’s request form in a new tab. Nothing is ever posted or sent from here.<br>
<b>Tasks</b>: <b>From the Event</b> lists the dates already on the event (registering, speaking proposals, promotion steps), oldest first; select one to change it on its own tab. Under it, <b>Our Own Tasks</b> are anything else to do: what, the owner, the due date and Done. Open tasks with a due date show in <b>Coming Up</b>, and the event card shows how many are done.<br>
<b>Graphics</b>: drop in the logos, speaker cards, banners and social posts the event gives us (up to 4 MB each). Each opens in a new tab.<br>
<b>Contacts</b>: the people we meet or need to reach there, their <b>Role</b> at the event (pick Speaker, Panelist, Moderator, Organizer, Sponsor Contact, Exhibitor, Attendee or Other, or type your own), who met them, and whether to follow up.</p>
<p><b>Set Aside</b> takes an event off the list without deleting it; bring it back from the <b>Set Aside</b> filter.</p>
<h4>Where It’s Kept</h4>
<p>In Team HQ’s own data (one record per event, collection <b>events</b>), saved through the save relay like everything else in Team HQ, with history. Graphics are kept in Team HQ’s file storage. <b>MISMO Media</b> reads each event’s graphics (with the signed-in person’s own sign-in) and keeps a copy in its Image Library; it only reads, and never changes anything in Team HQ. Panels look people up in <b>Member 360</b>’s people list with your own sign-in; Team HQ only reads it and never changes anything in Member 360. Contacts reaching Member 360 are on the Connections Map as a request.</p>
`},
 {after:'events', id:'reports', t:'Attendee Reports', d:'What MyMISMO attendees report about someone, for the MISMO team to look into and close.', h:`
<p>Apple and Google require MyMISMO, MISMO’s summit app, to let attendees report someone (from that person’s profile or a conversation) and the MISMO team to respond quickly. <b>Attendee Reports</b> (under Team in the left menu) is where those reports come in. Only the people MyMISMO lets see them (the people who send its alerts) have it; for everyone else it isn’t there at all.</p>
<h4>Seeing What’s Open</h4>
<p>When any report is open, <b>My Dashboard</b> says so at the top and puts it first under <b>On Your Plate</b>; select it to go to the reports. The boxes at the top of the page count the <b>Open Reports</b>, <b>Closed</b> and <b>All Reports</b>; select one to list just those.</p>
<h4>A Report</h4>
<p>Each report shows the summit, who it’s about, who sent it, the reason (Harassment, Spam, Inappropriate or Other), the attendee’s note and when it was sent, newest first. Look into it, then select <b>Close…</b>, type a short note of what was done and press <b>Close Report</b>. A closed report keeps that note; <b>Reopen</b> puts it back on the open list.</p>
<h4>Where It’s Kept</h4>
<p>The reports stay in MyMISMO’s own data. Team HQ reads them with your own sign-in when it opens and every 5 minutes while it’s open, keeps no copy, and only changes whether a report is open or closed and its note. Nothing is emailed. In the Test Copy, Close and Reopen are held back.</p>
`},
 {after:'health', id:'systems', t:'Connected Systems', d:'How MISMO’s systems fit together, what each one does, and what runs on its own.', h:`
<p><b>Connected Systems</b> (under Team in the left menu, or add its tile with <b>+ Add a Tile</b>) is the map of every MISMO system and the work that moves between them. Point at a box to light up everything it touches; select it for what it does, where it lives, what it replaced, and what it sends and receives. The area buttons show one part of the operation. A moving dot means the work moves automatically; a <b>dashed line</b> means a person copies it.</p>
<h4>Where It Comes From</h4>
<p>The MISMO Connections Map is the source of truth. The page's content is kept in Team HQ's private data (not in its public code) and shows the date it's <b>as of</b>. To bring it up to date, ask Team HQ's Claude to <b>refresh Connected Systems</b>; it reads the Connections Map and saves the latest.</p>
<h4>Change Notices</h4>
<p>The <b>Change Notices</b> tab shows what each system is waiting on. When one system changes something another uses (a name, an address, a route, a data shape), its Claude posts a notice for every system that has to act, in GitHub (GitMISMO/mismo-connections), where every system’s Claude can reach it, including Perry’s and Vanessa’s. Each system’s Claude checks for its own at the start of every session and on its daily check, makes the matching change in its own system, and marks it Done (or Not Needed, with the reason). Only notices marked <b>Needs Jonna</b> come to you; they’re listed first. The tab is brought up to date with each refresh.</p>
<h4>Failures</h4>
<p>The <b>Failures</b> tab is the log of GitHub jobs that failed. Every 30 minutes the Failure Watcher looks for failed jobs across MISMO’s systems, the system each one belongs to reruns or fixes it, and Jonna gets one email. Newest first, with the ones marked <b>Needs Jonna</b> listed first and counted in the figure boxes at the top of the page (and on the tab). Each row shows when it failed, the system, the job (select it to open it in GitHub in a new tab), what happened (Resolved, Needs Jonna, Passed On or Fixed Itself), what went wrong and what was done; a Needs Jonna row also says what she needs to do, with a link. Select a box above the list to see just those. The Failure Watcher keeps the log up to date on its own; it isn’t edited here.</p>
<h4>Edit Mode (Jonna, and Vanessa as Backup)</h4>
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
