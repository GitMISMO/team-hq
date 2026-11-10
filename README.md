# Team HQ

MISMO's team hub: what everyone is working on, who is around, key dates, team projects, plans, the team meeting
agenda and expenses, with a tile for every other MISMO system. Live at **https://resources.mismo.org/team-hq/**,
behind the shared resources.mismo.org sign-in.

This repository is **public** and holds **no team data**, only the page and its source. Everything the team enters
lives in the **private** repository `GitMISMO/team-hq-data`, reached only through MISMO's save relay under the
project key `team-hq`. Private plan notes live in `GitMISMO/team-hq-private-data` (relay key `team-hq-private`),
which only people given *Team HQ Private Notes* can read.

- **Working on Team HQ?** Read [DEVELOPING.md](DEVELOPING.md) first: where everything lives, how a change goes
  live, how to roll back, what it connects to, and the rules.
- **What changed and when:** [CHANGELOG.md](CHANGELOG.md).
- **Source:** `src/`, built into `releases/upgrades-<version>.js` by `build.py`.
- **Going live:** try a version in the Test Copy (`?try=<version>&check=1`), then Actions › Publish a Version.
  Every change runs the Team HQ Checks; nothing goes live unless they pass.

Never put a GitHub token, key, password or any team data in this repository.
