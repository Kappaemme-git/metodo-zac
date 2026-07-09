# Overnight Plan — Metodo ZAC Landing

Use this file as the starting point for overnight agent work on the website.

## Scope

Work only in this repository:

```text
/Users/francescomistero/Documents/ZacApp/zac-gym/landing
```

GitHub repo:

```text
https://github.com/Kappaemme-git/metodo-zac
```

Do not touch the mobile app repository from this worktree.

## Guardrails

- Do not edit `main` directly for feature work.
- Do not merge PRs automatically.
- Do not add secrets.
- Do not edit sibling worktrees.
- Keep every task in its own branch/worktree.
- Do not publish internal roadmap notes.
- If a design decision depends on Luigi/client taste, document it instead of forcing it.

## Safe Tasks

- Improve desktop visual polish.
- Improve bodybuilding references without breaking the navy/gold brand.
- Improve copy for the method and Luigi sections.
- Improve questionario UI if it remains unlinked from the home.
- Fix responsive bugs.
- Clean unused assets.

## Risky Tasks

Avoid these unless explicitly requested:

- Connecting Supabase.
- Connecting Brevo.
- Adding tracking scripts.
- Moving hosting to Vercel.
- Changing the launch flow for the August program.

## Local Preview

```bash
python3 -m http.server 4500
```

Open:

```text
http://localhost:4500/
```

## Final Status Format

For each branch/task report:

- Branch/worktree
- What was fixed
- Files changed
- Checks run
- Review status
- Remaining risks or blockers
