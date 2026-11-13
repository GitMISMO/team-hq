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
| `systems.js` | Connected Systems (the page; its content comes from the private record) |
| `next.js` | The current Team HQ shell: My Dashboard, Inbox, My Tasks, Calendar, System Health and more |
| `oofdates.js` | Out of Office key dates from Outlook automatic replies |
| `expinbox.js` | The expense@ inbox: emailed receipts become draft expenses |
| `mileage.js` | Mileage in the expense editor: miles driven × the IRS rate for the date |
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

Run Check in the Test Copy is the browser check on every page and tile. Still to come: browser tests on made-up
records that run on GitHub.

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
  `systemsmap` (Connected Systems: `current` and `requests`).
- Team HQ reads other systems' headline numbers for their dashboard tiles through the relay, and each system's
  own tiles are drawn Team HQ style.

## What Team HQ Connects To

The MISMO Connections Map (Jonna's Claude Doc) is the source of truth for every hand-off. Team HQ's part:

- **Each person's Outlook** (Power Automate, on each person's own license): calendar events every hour, flagged,
  important and unread mail every 15 minutes, and out-of-office replies.
- **Team HQ Actions flow:** Do It in Outlook (flag, mark read, file, delete) and Book It meetings, from each
  person's own Outlook. **Deletes always go to Deleted Items.** Never widen this flow's filter.
- **expense@mismo.org:** each emailed receipt becomes a draft expense within about a minute; contractors'
  receipts go to their Service Orders expenses while Jonna's or Vanessa's Team HQ is open.
- **Scheduler:** reads Team HQ's staff list; writes a task per request onto the organizer's board.
- **Service Orders:** reads the staff list and contractor expense receipts.
- **Every system's tile:** headline numbers read from each system for its dashboard tile.
- **Ask, Plan My Day and receipt reading** go through the relay's ask route; MISMO's API key stays in the relay.
- **Connected Systems:** refreshed from the Connections Map when Jonna asks Team HQ's Claude to "refresh
  Connected Systems" (the team-hq-refresh-connected-systems skill).

## System Health

System Health (top bar) watches what Team HQ can see every 5 minutes while it is open: saving
through the relay, storage, the Outlook calendar and email flows, the Outlook actions flow, the expense@ flow and
the team error log, which gathers errors from everyone's screen. Its dot turns yellow or red.

- **Daily Health Check:** `team-hq-data/.github/workflows/health.yml` runs every weekday morning, even when nobody
  has Team HQ open: the email and calendar flows, saving, and errors in the last day. When something is wrong it
  opens a GitHub issue in `team-hq-data` that mentions Jonna (so GitHub emails her), and closes it when all is clear.
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
