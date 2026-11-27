# Working on Team HQ

Read this before changing anything in Team HQ, whether you are a person or a Claude. It says where everything
lives, how a change goes live, how to roll back, what Team HQ connects to, and the rules Jonna has set.
`CHANGELOG.md` says what changed and when. Help inside Team HQ (the ? at the foot of the left menu) is for the
people who use it; this file is for whoever changes it. When a feature changes, update both in the same change.

## What Team HQ Is

MISMO's team hub at **https://resources.mismo.org/team-hq/**, behind the one MISMO sign-in. Everyone on staff uses
it: My Dashboard (tiles, including a tile for every other MISMO system), Inbox (flagged Outlook mail), My Tasks,
Calendar, My Board, Today, Team Projects, Plans, Key Dates, Find a Time, Team Meeting, Sync Ups, Expenses (also
an installable phone app), System Health and Connected Systems. Jonna owns it.

## Where Everything Lives

| What | Where |
| --- | --- |
| The page (public, code only) | This repository, `GitMISMO/team-hq`, served by GitHub Pages |
| The base app | `index.html`: the original tool and its "door" to the save relay. Changed rarely, by hand, and checked (see Checks) |
| Everything added since | `upgrades.js`, built from `src/` by `build.py`, loaded by `index.html` as `upgrades.js?v=<version>` |
| Every saved version | `releases/upgrades-<version>.js` (the Test Copy and Publish a Version read these) |
| Offline copy | `sw.js` (always network first; opens the last copy with no signal) |
| Team data (private) | `GitMISMO/team-hq-data`, only through the save relay, project key `team-hq` |
| Connected Systems, view only | `connected-systems/index.html`, at /team-hq/connected-systems/ (Nov 24, 2026): its own page, not part of `upgrades.js`. It reads `team-hq-data` `data/connected-systems/systemsmap.json` (written by that repository's `connected-systems.yml`) with the relay key `connected-systems`, or with `team-hq` for Team HQ people who weren't given Connected Systems on its own (CN-027), draws it with `src/systems.js` and saves nothing. It goes live when pushed to `main`; no version needed |
| Private plan notes (private) | `GitMISMO/team-hq-private-data`, relay key `team-hq-private`, only for people given *Team HQ Private Notes* |
| Sign-in and who can open what | `/assets/session.js` on resources.mismo.org, and People & Access in the admin console |

**Never put team data, a key, a token or a password in this repository.** It is public. The checks look for keys
on every change. The Connected Systems page's content (systems, connections, stories, requests, the standards
prompt) lives only in the private `systemsmap` collection, never in this code.

## The Source

`src/` holds every piece of `upgrades.js`. `build.py` joins them, in this order, each inside its own
`MODS.push(function(){ ... })` so a failure in one part leaves the rest of Team HQ working:

| File | What it is |
| --- | --- |
| `frame-head.js`, `frame-tail.js` | The wrapper: the shared helpers, the module list and `boot()` |
| `guard.js` | Version stamp (`BUILD`), the Test Copy and Run Check, the team error log |
| `bootscreen.js` | The opening cover while Team HQ loads |
| `hqx.js` | Shared extras the other parts use |
| `skin.js` | The MISMO Media look, My Board styling, Expenses on phones |
| `projects-v2.js` | Team Projects: Board, Timeline, Who's on What, Status, Workload, templates and rules |
| `hub.js` | My Hub and the system tiles |
| `findtime.js` | Find a Time |
| `plans-v2.js` | Plans |
| `today.js` | Today: Counting Down and the Next Four Weeks |
| `meeting.js` | Team Meeting run of show and Put It on the Screen |
| `mobile.js` | Phone layout and bottom tab bar |
| `syncs.js` | Sync Ups |
| `systems.js` | Connected Systems (the page; its content comes from the private record), including the Change Notices and Failures tabs |
| `events.js` | Industry Events: the page, the event panel, its dashboard tile, and `tripsFor` for the Expenses trip list (Nov 22, 2026). Each event's own tasks (`tasks`: id, t, who, due, done) and each contact's `role` were added Nov 24, 2026 (CN-023); its Panels (`panels`: id, title, date, time, note, people: id, name, role, title, company, email, member, k, cid) Nov 24, 2026 (CN-024) |
| `next.js` | The current Team HQ shell: My Dashboard, Inbox, My Tasks, Calendar, System Health and more |
| `oofdates.js` | Out of Office key dates from Outlook automatic replies |
| `expenses.js` | Expenses: the whole page, editor, mileage, policy, trips, expense@ inbox, sending, Ready to Enter, downloads (live Nov 21, 2026; `?exp=old` turns it off for a tab) |
| `expinbox.js` | The expense@ inbox: emailed receipts become draft expenses |
| `mileage.js` | Mileage in the expense editor: miles driven × the IRS rate for the date |
| `exporg.js` | Expenses: receipts join the person's nearby trip, the trip drop-down, folded trips and the Entered fold |
| `expdone.js` | Expenses: Done — Send to Vanessa per trip, her Ready to Enter list, entered and reminder notes |
| `history.js` | Change History: a History section on each item's panel and Recent Changes in System Health, read from `data/history.json` |
| `tour.js` | The guided tour and page help |
| `design.js` | The design layer: readable muted text, focus ring, reduced motion |

## How a Change Goes Live

1. **Before you start**, open this repository's commits page and check nobody else has changed Team HQ since the
   copy you are working from. If they have, start from theirs and add only your changes.
2. **Change the files in `src/`.** Never edit `upgrades.js` or a file in `releases/` by hand.
3. **Build:** `python3 build.py <version>`. Versions are the date plus a letter: `20261109b`, then `20261109c`; after
   `z` comes `za`, `zb`. This writes `releases/upgrades-<version>.js`.
4. **Upload** the changed `src/` files and the new release file, and add a line to `CHANGELOG.md` for anything
   people would notice. The Team HQ Checks run on every upload.
   GitHub Pages usually puts an upload on the site within a minute or two. Now and then its deploy hangs; if the
   Test Copy says the version isn't saved after five minutes, any later upload restarts the deploy.
5. **Try it in the Test Copy:** `https://resources.mismo.org/team-hq/?try=<version>&check=1`. The Test Copy reads
   the real data but saves and sends nothing. `check=1` runs Run Check: every page and every tile size, looking
   for errors, empty pages, broken values and anything wider than the screen. It must say **Check Passed**.
6. **Publish:** Actions › Publish a Version › Run workflow, with the version. It runs the checks again and refuses
   to publish the newest version unless `src/` builds it exactly, then makes it live. Browsers pick it up within
   about ten minutes.
7. **Roll back:** run Publish a Version with the earlier version. Every version ever built is kept in `releases/`.

## Checks

`tools/check.mjs`, run by `.github/workflows/checks.yml` on every change and by Publish a Version before anything
goes live:

- the version's script parses and says inside which version it is;
- no keys or tokens in anything published;
- `index.html` still sets up the Test Copy, so a Test Copy can never save for real;
- the live page and `upgrades.js` are the same version;
- every source file parses on its own, and `src/` builds the newest version exactly;
- `CHANGELOG.md` is here.

`tools/back.test.mjs` (also in Team HQ Checks) is the first browser test on made-up records that runs on GitHub:
the browser's Back button (see below). `tools/mymismo.test.mjs` (also in Team HQ Checks, CN-062) opens the newest version the same way with MyMISMO's staff routes answering 200 with made-up reports and trivia, and checks Team HQ leaves them alone: it never calls them, there is no MyMISMO menu item, My Dashboard and On Your Plate say nothing about attendee reports, an old `?page=reports` link opens My Dashboard, and the MyMISMO tile is still in + Add a Tile: `node tools/mymismo.test.mjs` after the same `npm i`. Run Check in the Test Copy is the browser check on every page and tile.

## The Browser's Back Button (CN-033, Nov 25, 2026)

Back and Forward come from MISMO's shared `/assets/back.js` (owned by Forms and shared pages), loaded in
`index.html`'s `<head>` right after `session.js`. **Never copy back.js into this repository and never add a
`history.pushState` or change the address for Back**; Team HQ's own phone-Back code in `next.js` was removed for it.
Team HQ's part is in `src/next.js` (search `CN-033`):

- **Pages:** `MismoBack.pages({current: pageNow, go: pageGo})`. A page is one of ours (`ui.view`: `day`, `inbox`,
  `p:<project>`, `u:<person>` …) or a classic one (`c:` + its `data-hq` menu button, or `c:help`). Only what a person
  does makes a step. Our menu buttons also carry `data-back-page` and `aria-current`; Help carries
  `data-back-page="help"`.
- **Layers:** everything open on top (`#panel`, `#sheet`, the Team Projects and Industry Events panels, dialogs,
  menus, the phone's left menu; the list is `LAYERS`) counts, newest on top, as eight "at least this many open"
  layers, so Back closes one at a time the way its own × or Cancel does (unsaved-changes questions included). A new
  panel or pop-up needs nothing more if it has `role="dialog"` and a × or Cancel button; otherwise add its class to
  `LAYERS` (and to `closeLayer` if it closes another way).
- **Check:** `tools/back.test.mjs` (in Team HQ Checks) opens the newest version as a Test Copy in headless Chrome
  with made-up records and the live back.js (`MISMO_BACK=<file>` tries a local copy): two menu pages and Back,
  Forward, Inbox and My Tasks, a record's panel closed by Back, a panel closed with its × then Back, Help, a
  project's panel, and no page errors. Run it with `npm i --no-save playwright-core@1.63.0 && node tools/back.test.mjs`.

## Masthead (CN-053, Nov 26, 2026)

The top bar (`.hqtop` in `index.html`) matches Certification Management's (resources.mismo.org/cms/) to the pixel, as the
brand standard says: `--hq-h:68px`, padding 13px 22px; `.logoplate` 9px 13px, 5px corners, box-shadow
`0 1px 0 rgba(80,164,219,.35)`, logo 24px tall; `.mastrule` 1px × 42px in rgba(80,164,219,.4) with 14px either side;
`.hqname` 16px, weight 500, #94c8e9. Everything that sits under the bar (the left menu, `#panel`, the Team Projects
panel, the new-shell pages, the hover pane in `hqx.js`, the System Health bar in `guard.js`) reads `var(--hq-h)`, never a
number, so a height change is one line. Phones keep their own smaller logo (`src/mobile.js`), and a phone turned
sideways keeps its 44px bar. The older December hat (`.santa`, `#mismo-hat`, `data-season`, the `season()` script) was
removed; the shared `/assets/holiday.js`, loaded by session.js, puts the hat on in December.

## Browser Tab Icon (CN-030, Nov 25, 2026)

Every page here (`index.html`, so the Test Copy too; `open.html`; `connected-systems/index.html`) has exactly one tab
icon line in its `<head>`, pointing at MISMO's shared copy:
`<link rel="icon" type="image/png" sizes="48x48" href="https://resources.mismo.org/assets/favicon-48x48.png">`.
Never copy the image into this repository or add another `rel="icon"` (by hand or by script); a new page gets the same
line. The home-screen icons (`*.webmanifest`, `apple-touch-icon`, the `hq-icon-*` and `expenses-icon-*` files) are
separate and stay as they are. The page safety list's `img-src` already allows `https:`.

## Page Safety List

`index.html` carries a Content-Security-Policy: code only from Team HQ's own address, fonts from Google Fonts, and
data only to its own address, the save relay and `api.resources.mismo.org` (the relay's planned mismo.org
address). The checks fail if it goes missing. Before changing it, copy `index.html` to a test page with the new
list, open it as a Test Copy (`?try=<version>`), run Run Check and watch for blocked requests, then change the
real page and delete the test page.

## Saving and Data

- Every save goes through the save relay and is one commit to `team-hq-data`, so everything has history.
- Saves merge into the newest copy instead of overwriting a teammate's change. Settings are never saved before
  the saved copy has been read, and newer settings win. The calendar waits for the team list instead of saving an
  empty calendar.
- Collections in `team-hq-data` include the team's tasks, projects, plans and dates, plus `comments`,
  `templates`, `rules`, `syncs` and `syncitems`, `expinbox` (emailed receipts), `errors` (the team error log) and
  `systemsmap` (Connected Systems: `current` and `requests`; `current.notices` holds the Change Notices from
  GitMISMO/mismo-connections CHANGE-NOTICES.md, one row per system that has to act, brought in with each refresh; `current.failures` holds the Failure Watcher's log, newest 100, written straight into the
  record by GitMISMO/mismo-connections `tools/failures-to-teamhq.mjs` (CN-019); the page only reads it and `keepFeeds()`
  in `systems.js` carries the newest copy through every save, so a save or a refresh never drops it) and `events` (Industry Events, one record per event,
  graphics in Team HQ's file storage; they land under `receipts/`, since `events` isn't a storage folder).
- **Change History:** the `Team HQ Change History` job in `team-hq-data` (`tools/history.mjs`, every hour) reads each save and keeps 90 days of who changed what on tasks, Team Projects, key dates, plans, plan items and agenda items in `data/history.json`. Expenses, Sync Ups and notes are never read. Like Recently Deleted (`tools/trash.mjs`), it only writes its own file.
- Team HQ reads other systems' headline numbers for their dashboard tiles through the relay, and each system's
  own tiles are drawn Team HQ style.

## Expenses Rebuild (started Nov 21, 2026)

Expenses is drawn by the original page (`vExpenses` in `index.html`) with four add-ons on top (`expinbox.js`,
`mileage.js`, `exporg.js`, `expdone.js`). It is being rebuilt as one module, `src/expenses.js`, that replaces all
five. The new one goes live only after it does everything on this list, checked in the Test Copy against real trips:

- **Who sees what:** each person sees only their own expenses; Jonna and Vanessa see everyone's, grouped by person,
  then trip. On a phone, Jonna and Vanessa see only their own; everyone's stays on the desktop.
- **Phone app:** Expenses opens straight to its own page (Add to Home Screen works the same on iPhone and Android);
  the opening cover stays up until Expenses is ready; works offline and saves when the signal is back.
- **The editor:** Expense Name, Type (DataBasics categories), Date, Amount, Receipt Amount, Notes, the receipt
  photo or PDF, and the trip drop-down (works on iPhones). Mileage asks for miles driven and works out the amount at
  the IRS rate for the date (0.76 from Jul 1, 2026; 0.725 from Jan 1, 2026; 0.70 in 2025; 0.67 in 2024), writes
  the miles into the notes, and needs no receipt.
- **MBA travel policy** (`/topics/mba-travel-expense-policy` in Jonna's notes): breakfast $25, lunch $40, dinner $60,
  snacks $15, $140 a day for all meals; a receipt for anything $15 or more (mileage excepted). Flag, never block.
- **Archive (Nov 21, 2026):** a trip whose expenses are all entered leaves the Expenses list for the Archive (grouped by month, search, person and year filters, Report and Receipts per trip). Archived means entered; nothing is moved in the data. Desktop only since Nov 26, 2026: on a phone (isPhone(), including the Expenses phone app) there is no Archive button or "entered in DataBasics" link, and openArchive() and jump() do nothing for entered trips.
- **Trips:** an expense with no trip offers one-tap buttons for the person's open trips (closest dates first), then
  New Trip; a snapped or emailed receipt joins the person's trip with an expense within 3 days; Name This Trip for a
  group with no name; trips start folded; entered trips fold into one line per person; Jonna and Vanessa get the
  Jump To row and can fold each person.
- **Emailed receipts (expense@):** each email becomes a draft expense for the sender, filled in from a photo, a PDF
  or the email body (kept as a PDF); a re-sent email updates instead of duplicating; Jonna or Vanessa can pick whose
  it is; contractors' receipts go to their Service Orders expenses instead.
- **Sending a trip:** Done — Send to Vanessa on each trip (Jonathan's say Done — Send to Jonna; Jonna's say
  Finalize); Remind and Send For for Jonna and Vanessa; Take It Back; one reminder a week after a trip's last
  expense; expenses added later reopen the trip.
- **Ready to Enter:** Vanessa's list (Jonna's for her own and Jonathan's), oldest first; Entered and Submitted per
  trip marks all its sent expenses entered at once, with Undo; the owner is told when it's entered.
- **Downloads:** Export for DataBasics (CSV in the DataBasics template's columns) and Download the Receipts, each
  asking whose (one person or everyone), plus Report and Receipts beside each person's name; receipt files named
  "First - Name - YYYY-MM-DD - $amount".
- **Saving:** every save through the save relay, merged with anyone else's change; nothing is ever sent without the
  person pressing a button.

**Where it stands (Nov 21, 2026).** `src/expenses.js` is built and every item above was checked in the Test Copy against
the real trips (Jonna's, Vanessa's, Amy's and Perry's DC and Executive Women's Summit trips), seen as Jonna, Vanessa,
Amy and Jonathan, and on the phone layout; Run Check passed. Its rules (policy, mileage, trips, export columns, receipt
names) also have their own checks: `node tools/expenses-rules.test.mjs`. It went live the same day:

- **Trying it:** open the Test Copy with `&exp=new` added, e.g. `?try=<version>&check=1&exp=new`. The tab remembers it
  (`?exp=old` turns it off). Without `exp=new` everyone gets the original page and add-ons.
- **How it fits in:** add-ons can't reach `index.html`'s own functions, only what it hands out (`__put`, `__drop`,
  `__show`, `__att`, `__expApi`, `#panel`, `#sheet`, `#toast`). The original page clears the Expenses area before it
  draws, so that moment draws the new page instead and drops what the original adds. When the base page opens its own
  expense editor (its search, Claim Expenses on a trip), the new editor opens in its place. The four add-ons stand
  aside when it is on (one line at the top of each), and the opening cover waits for it in the Expenses app.
- **Changed on purpose:** mileage exports Receipt (Yes/No) as No (no receipt is needed); a mileage expense keeps its
  miles in `miles` as well as the notes line; Export for DataBasics and Download the Receipts leave out what's already
  entered unless "Include trips already entered" is ticked; the Report and Receipts beside a name do the same (all of
  that person's when nothing is waiting); a receipt taken with no signal waits on the device and uploads itself; only
  Jonna gets buttons on Jonna's own trips.
- **Live since Nov 21, 2026 (Jonna's OK):** `LIVE=true`; `?exp=old` turns it off for a tab and brings back the original page and add-ons. After it has run
  live for a while: delete `expinbox.js`, `mileage.js`, `exporg.js`, `expdone.js` and their lines in `build.py`; take
  the `exp=new` lines out of `bootscreen.js`; remove `vExpenses`, `expRow`, `editExp` and the receipt reading from
  `index.html` (by hand, checked); update the Expenses help in `tour.js` and add the CHANGELOG line.

## What Team HQ Connects To

The MISMO Connections Map (Jonna's Claude Doc) is the source of truth for every hand-off. Team HQ's part:

- **Each person's Outlook** (Power Automate, on each person's own license): calendar events every hour, flagged,
  important and unread mail every 15 minutes, and out-of-office replies.
- **Team HQ Actions flow:** Do It in Outlook (flag, mark read, file, delete) and Book It meetings, from each
  person's own Outlook. **Deletes always go to Deleted Items.** Never widen this flow's filter.
- **Done — Send to Vanessa:** marks a trip's expenses `done` and leaves Vanessa a nudge (`nudges`, kind `exp-ready`); when all are ticked entered, her nudge closes and the owner gets one (`exp-entered`). Week-old unsent trips get one `exp-remind`.
- **expense@mismo.org:** each emailed receipt becomes a draft expense within about a minute; contractors'
  receipts go to their Contractor HQ expenses while Jonna's or Vanessa's Team HQ is open.
- **Scheduler:** reads Team HQ's staff list; writes a task per request onto the organizer's board.
- **mismoevents@mismo.org → Industry Events (CN-025, Nov 25, 2026):** Team HQ's own Power Automate flow (Team HQ – Events Mailbox, on Jonna's license; a copy of the expense@ flow, never Member 360's) saves each email into `data/eventmail.json` (`docs[em-…]`: from, fromName, subject, text, preview, at, files[{path, name, type, size}] with files under `receipts/`). `events.js` scores each email against every event (scores(): name and host words weighted by rarity, the sender's or a linked website domain, start date, city) and files it onto the clear best (0.6 or more, next under 60% of it) as that event's `emails` (id, from, fromName, subject, at, text, files[{id:path, name, type, size}]) and marks it `filed`; others wait in Event Emails. Dates and links found are only offered. Nothing is ever sent from the mailbox.
- **Industry Events → MISMO Media:** the Ask MISMO Media button only opens MISMO Media's request form
  (`https://resources.mismo.org/forms/request/`) in a new tab; nothing is sent or posted.
- **Industry Events graphics → MISMO Media's Image Library (CN-011, Nov 23, 2026):** MISMO Media reads, with the
  signed-in person's own sign-in, `team-hq/data/events` (each event's id, name, start and `graphics`: id, name, label,
  use, type, size) and each graphic's file through `team-hq/file/<id>`, and keeps a SharePoint copy. It never writes
  to Team HQ. It accepts only file ids under `receipts/` or `attachments/` (event graphics land under `receipts/`).
  **Keep the graphics shape: add fields only, never rename. If event graphics ever move to another file folder, post
  a Change Notice for MISMO Media first.** The graphics only come in while someone who can read Team HQ has MISMO
  Media open (Perry, Amy, Kelly and Vanessa all use Team HQ, so any of them will do).
- **Member 360 → Industry Events panels (CN-024, Nov 24, 2026):** the Panels tab reads `member-360/data/peoplelist`
  (GET through the save relay with the signed-in person's own sign-in; reply `{data, sha}`; shape `{updated, writtenBy,
  fields, scope, titles, count, companies:[{k, n, cid, m, l, p:[[name, title, email]]}]}`), once per tab and again after
  30 minutes, only when someone looks a person up. Picking a person fills name, title, company, email and member
  (`m===1`), and keeps `k` (Member 360 record key) and `cid` (Aptify Company ID) on the panelist so it can be matched
  again. **Read only: never write to it or use any Member 360 flow or key.** 401, 403 or 404 (no Member 360 access, or
  the list not written yet) quietly says Member 360 isn't available and the details are typed in. Member 360 adds
  fields, never renames; if `scope` shrinks to members and prospects, some people simply won't be found.
- **Planned, not built:** Member 360 reading the events' contacts (now with each contact's `role`) as prospects (on the Connections Map; Member 360's
  Claude builds its side, Team HQ never writes into it).
- **Contractor HQ** (formerly Service Orders): reads the staff list and contractor expense receipts.
- **Every system's tile:** headline numbers read from each system for its dashboard tile.
- **MyMISMO tile (CN-035, Nov 25, 2026):** MyMISMO (`/mymismo/`, GitMISMO/mymismo) is in `SYS` and `SYM` in `src/hqx.js`, so it
  shows in Add a Tile; it is never placed on anyone's dashboard by itself. `extract()` reads its Home figure boxes as they
  are (`.pass-figs`: the number in `<b>`, the label in `<span>`: Sessions, Speakers, Sponsors) and leaves out **Starred**,
  which is kept on each phone, not for the team (`PERPHONE`). If MyMISMO renames `.pass-figs` or its markup, it posts a
  Change Notice; Team HQ never reads `mymismo-data`.
- **MyMISMO's team area moved to MISMO Media (CN-061, CN-062, Nov 27, 2026):** Attendee Reports (CN-041) and MISMO Trivia
  (CN-043) were in Team HQ from Nov 25, 2026 under a MyMISMO menu item, with open reports on My Dashboard and On Your Plate.
  They now live in MISMO Media's MyMISMO area (with MyMISMO's numbers on its Results page), so Team HQ no longer calls
  `/mymismo/staff/reports` or `/mymismo/staff/trivia`: `src/reports.js`, `src/trivia.js`, the MyMISMO menu item and page,
  its tabs, the dashboard line and On Your Plate item, their help and their tests were taken out in version 20261127a
  (every earlier version is still in `releases/`). A saved or linked `mymismo`, `reports` or `trivia` page opens My
  Dashboard. Only the MyMISMO tile (above) stays. Don't add MyMISMO's team work back here; it belongs to MISMO Media.
- **Ask, Plan My Day and receipt reading** go through the relay's ask route; MISMO's API key stays in the relay.
- **Failure Watcher → Connected Systems (CN-019, Nov 23, 2026):** GitMISMO/mismo-connections' Failure Watcher (every 30
  minutes) writes its log into `team-hq-data` `data/systemsmap.json` as `docs.current.failures` (newest 100; each entry
  `at`, `failed`, `system`, `repo`, `workflow`, `url`, `times`, `outcome` = Resolved, Needs Jonna, Passed On or Fixed Itself,
  `cause`, `done`, `forJonna`, `link`). The Failures tab shows it (Needs Jonna first and counted in the figure boxes and the
  tab, then newest first). **Never drop, rename or overwrite `failures` when saving the page**; if the shape changes, the
  Failure Watcher posts a Change Notice.
- **Connected Systems, view only (CN-026, CN-027):** the page at /team-hq/connected-systems/ opens for anyone with
  the `connected-systems` tool (People & Access, given on its own, e.g. Rick Hill at MBA) or with Team HQ. Team HQ
  people read the same view-only file with the `team-hq` key, because `connected-systems` isn't in Team HQ's `also`
  yet (People & Access would take it from people who have it on its own; Initiative Hub is fixing that). Once it is,
  the `team-hq` fallback can stay; it changes nothing for anyone.
- **Connected Systems:** refreshed from the Connections Map when Jonna asks Team HQ's Claude to "refresh
  Connected Systems" (the team-hq-refresh-connected-systems skill).

## System Health

System Health (top bar) watches what Team HQ can see every 5 minutes while it is open: saving
through the relay, storage, the Outlook calendar and email flows, the Outlook actions flow, the expense@ flow and
the team error log, which gathers errors from everyone's screen. Its dot turns yellow or red.

- **Daily Health Check:** `team-hq-data/.github/workflows/health.yml` runs every weekday morning, even when nobody
  has Team HQ open: the email and calendar flows, saving, and errors in the last day. When something is wrong it
  opens a GitHub issue in `team-hq-data` that mentions Jonna (so GitHub emails her), and closes it when all is clear.
  A calendar flow is judged by its last hourly run (CN-054, Nov 27, 2026): its newest commit "Outlook availability
  for <Name>" in `team-hq-data`, since `cal-<person>.json` only changes when that calendar does. The file's own last
  change is used only for someone with no such commit. Over 26 hours since the last run is a problem.
- **Recently Deleted:** `team-hq-data/.github/workflows/trash.yml` runs every hour and, from the save history,
  keeps a 30-day copy of anything deleted (`data/trash.json`). System Health lists it with Restore; Jonna sees
  everyone's, everyone else sees their own.
- **Newer version notice:** Publish a Version writes `version.json`. An open tab checks it every 10 minutes; if a
  newer version is live it says so, and a background tab refreshes itself when you come back to it once nothing is
  waiting to save.

## Jonna's Rules

- Plain, everyday words; MISMO brand; Chicago title case for titles, headings and labels.
- No pill-shaped buttons or tags (small square-ish corners; circles are fine). No big empty spaces.
- No mention of Claude or AI anywhere a person can see.
- Never place a tile on anyone's dashboard by itself, and never move Jonna's saved layout.
- Never put Connected Systems content in this code; it lives in the private record.
- Outlook deletes go to Deleted Items, never a hard delete.
- Don't change another system's page or code. If another system needs something, say which system's Claude must
  make the change, and update the Connections Map.
- Going live, sending to a list or posting publicly needs Jonna's OK.
- Never type a password or sign in for anyone.


## Connected Systems app (Nov 24, 2026)

resources.mismo.org/connected-systems/ (GitMISMO.github.io connected-systems/) loads this repository's `src/systems.js` directly to draw a view-only Connected Systems for people without Team HQ. It sets a stand-in `window.__S` = {me: '', db: {collection: () => ({onSnapshot, doc: () => ({set: rejects})})}} and reads the record from its own storage (GitMISMO/connected-systems-data, copied from data/systemsmap.json every 10 minutes by mismo-connections' Connected Systems Copy). Keep `src/systems.js` working with only that: no other Team HQ globals required, `page()`, `onChange()` and the `.cs-nav button[data-tab]` tabs kept. /team-hq/connected-systems/ only forwards there.
- **Expense Policy card (Nov 26, 2026):** a round "i" beside the Expenses heading opens openPolicy() (the same card as Contractor HQ's), built from MEAL_CAP, DAY_CAP and RCPT_AT plus AIR_OK (airfare over $800 needs approval from the Director of Programs & Operations). It replaced the x2-rules policy note at the bottom of the page.
