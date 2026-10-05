# Team HQ

MISMO's team hub: what everyone is working on, who is around, key dates, team projects,
plans and checklists, the team meeting agenda and expenses. Live at
**https://resources.mismo.org/team-hq/**, behind the shared resources.mismo.org sign-in.

This repository is **public** and holds **no team data** — only the page. Everything the
team enters lives in the **private** repository `GitMISMO/team-hq-data`, reached only
through MISMO's save relay under the project key `team-hq`. Private notes on plans live in
a second private repository, `GitMISMO/team-hq-private-data` (relay key `team-hq-private`),
which only people given the *Team HQ Private Notes* tool can read.

## How it works

- `index.html` is the whole tool. It was built in Claude (Artifact - Team HQ) and is
  copied here; the Claude copy is kept only for building and fixing things.
- The top of `index.html` holds the "door": a small layer that gives the page the same
  saving it had inside Claude, backed by the save relay instead. Every save is a commit to
  `team-hq-data`, so there is history and rollback.
- Sign-in and who can open what come from `/assets/session.js` and the admin panel's
  People & Access (Edit / View / No access).
- Ask and Plan My Day need Claude, so they are only in the Claude copy.

## Updating the page

Replace `index.html` with the new copy and commit. GitHub Pages republishes within a
minute or two. Never put a GitHub token or any team data in this repository.
