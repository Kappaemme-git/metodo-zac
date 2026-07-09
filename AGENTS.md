# Metodo ZAC Landing — Agent Instructions

This repository contains only the public Metodo ZAC website.

The mobile app is a different repository:

- Landing/site: `Kappaemme-git/metodo-zac`
- Mobile app: `Kappaemme-git/metodo-zac-app`

Do not mix changes between these repositories.

## Hard Rules

- Do not edit sibling worktrees.
- Do not touch the mobile app from this repository.
- Do not add backend secrets, Supabase keys, Brevo keys, private tokens, or `.env` values.
- Do not merge PRs automatically.
- Do not deploy destructive changes.
- Keep every task in its own branch/worktree.
- If a design choice is subjective, document it clearly instead of making broad changes.

## Current Product Shape

The landing presents Luigi Zaccone and Metodo ZAC.

Current pages:

- `index.html` — home page.
- `metodo.html` — method/fases page.
- `questionario.html` — lead magnet questionnaire, currently not part of the public CTA flow.
- `risultati.html` — questionnaire result page.
- `style.css` — shared styles.
- `assets/` — images.

Current direction:

- Elegant navy/gold brand.
- Stronger bodybuilding signal in the hero.
- The free program is temporary and should stay secondary until August.
- Main narrative order: identity/system, method, Luigi, free program.

## Local Preview

```bash
python3 -m http.server 4500
```

Open:

```text
http://localhost:4500/
```

## Verification

Before final status:

- Check the home page on desktop.
- Check `metodo.html` on desktop.
- If changing responsive styles, check mobile too.
- Verify links and images load from local server.
- For GitHub Pages changes, verify the live URL after push.

## Overnight Workflow

For each landing task:

1. Create a dedicated branch/worktree.
2. Inspect current branch, relevant HTML/CSS/assets and live behavior.
3. Implement the change only in that worktree.
4. Verify locally.
5. Review the diff for regressions, duplicated CSS and broken responsive behavior.
6. Fix issues in the same worktree.
7. Commit with a clear message.
8. Push the branch and open/update a PR if requested.

## Safe Tasks

- Copy refinement.
- Desktop visual polish.
- Responsiveness fixes.
- Asset cleanup.
- Link/navigation fixes.
- Questionnaire UI polish without backend secrets.

## Risky Tasks

Avoid unless explicitly requested:

- Real Supabase integration.
- Real Brevo integration.
- Moving hosting from GitHub Pages to Vercel.
- Publishing private roadmap/client notes.
- Changing the overall brand direction without approval.
