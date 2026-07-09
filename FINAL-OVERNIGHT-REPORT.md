# Metodo ZAC Final Overnight Audit Report

Audit date: 2026-07-10
Mode: audit only
Website repository: `https://github.com/Kappaemme-git/metodo-zac`
Mobile repository: `https://github.com/Kappaemme-git/metodo-zac-app`

Detailed reports:

- Website: `AUDIT-SITO.md`
- Mobile app: `AUDIT-APP.md` in the mobile repository
- Cross-repository backend readiness: `BACKEND-GAPS.md`

## Executive summary

The public brochure website is visually coherent, responsive at the tested desktop/mobile sizes, and free of obvious runtime/local-link errors. The mobile prototype also has a healthy TypeScript/lint baseline. Those positives do not extend to the product's data flows.

The most urgent issue is that the incomplete questionnaire is already public. It tells visitors their personal answers were registered and their six-month PDF was unlocked, while the implementation only logs a local JavaScript object and links to `#`. It also lacks privacy/consent/minor handling and complete accessibility semantics.

The mobile app is a strong screen prototype, not an operational application. Authentication and role authorization do not exist; workout, diary, check, PDF, approval, and logout actions are local simulations or dead controls. Coach reports reuse one global data set for every selected client, which is a product error now and would become a serious cross-client privacy risk if copied into backend queries.

Recommendation: **do not start direct frontend-to-Supabase/Brevo wiring tomorrow.** First resolve the product/privacy decisions, freeze a canonical data model, and make RLS/storage tests part of the initial backend work. Keep production UI and design unchanged until those contracts exist.

## Top 10 most important findings

These are summaries of detailed findings in the referenced reports.

| Rank | Finding | Severity | Source |
|---:|---|---|---|
| 1 | The publicly deployed questionnaire falsely confirms saved answers and an available PDF; the link is inert. | High | Website W-01/W-02 |
| 2 | Website lead collection has no privacy notice, consent separation, retention model, or decision for users aged 14–17. | High | Website W-03; Backend B-03/B-07/B-08 |
| 3 | Mobile client/coach roles have no authentication or authorization; the role switch is only a route change. | High | App A-01; Backend B-02/B-04 |
| 4 | Core app mutations are not real: workout save is dead, diary is local, checks are memory-only, and PDF upload only toggles a boolean. | High | App A-03 through A-06 |
| 5 | Coach reports reuse global check/diary/progress data for every client. | High | App A-07 |
| 6 | Body-photo and client-PDF storage need private buckets, versioning, RLS, signed access, deletion, and retention before implementation. | High | App A-06/A-08; Backend B-05/B-06 |
| 7 | Website and app disagree on the canonical five Metodo ZAC phases; the app also contradicts itself. | High | App A-09; Backend B-01 |
| 8 | Public lead capture and Brevo automation need a server-only, validated, rate-limited, idempotent boundary with separate delivery/marketing consent. | High | Backend B-03/B-07/B-09 |
| 9 | Transformation images, measurements, and accident/recovery claims need verified publication permission and factual approval. | High | Website W-06 |
| 10 | Static checks pass, but there are no behavior/RLS tests or CI; dependency audit also reports 16 advisories in the Expo/tooling tree. | Medium | App A-15/A-16 |

## What should be done tomorrow morning

### 1. Contain the public questionnaire mismatch

- Decide whether `/questionario.html` is a private preview, public prelaunch page, or live flow.
- Until a real flow exists, remove it from the public artifact or clearly mark it as a non-submitting preview and apply `noindex`.
- Do not send campaign traffic to it and do not leave “registered/download” success copy attached to fake behavior.

### 2. Run a short owner decision session

Luigi/project owner should approve:

- canonical five-phase names, codes, descriptions, and advancement authority;
- exact August date/state and whether pre-registration exists;
- questionnaire scoring/version and which PDF/result each level receives;
- whether the PDF or structured app plan is the source of truth;
- invite/auth/role/coach-client assignment model;
- minimum age/minor handling, privacy purposes, separate marketing consent, retention, deletion/export;
- body-photo consent/access/retention and existing website image releases;
- Brevo sender, templates, cadence, double-opt-in/unsubscribe policy.

### 3. Freeze backend contracts before credentials

- Approve the v0 data dictionary and immutable IDs.
- Define client/coach/admin/anonymous policy matrix.
- Define private bucket paths and object lifecycle.
- Define mutation/request states: loading, saved/not saved, retry, idempotency, offline/conflict, permission denied.
- Write acceptance tests for client A, client B, assigned coach, unassigned coach, admin, and anonymous user.

### 4. Create separate implementation tasks

Keep website and app work separate. Suggested first backend tasks:

1. Schema/RLS/storage policy tests with synthetic data.
2. Server-only questionnaire submission/PDF delivery/Brevo outbox functions.
3. Typed mobile repository interfaces plus mock adapters.
4. Real auth/assignment pilot.
5. Workout/diary persistence pilot.
6. Private PDF workflow.
7. Photo workflow only after privacy decisions.

## What should not be touched yet

- Do not redesign or refactor the current UI as part of backend setup.
- Do not scatter direct Supabase calls into screens or static HTML.
- Do not put Brevo keys/calls in the browser or mobile app.
- Do not treat the role switch, route, query parameter, or profile role as authorization.
- Do not create public buckets for client PDFs or check photos.
- Do not implement image/file pickers before policies, validation, retention, and deletion are approved.
- Do not encode the provisional phase names or client display names as durable database identity.
- Do not build push reminders before persisted schedule state and retry/cancel semantics.
- Do not add analytics/tracking before purpose/consent decisions.
- Do not run `npm audit fix --force`; it proposes a breaking Expo 57 move and should be a separate reviewed upgrade.
- Do not merge, deploy, or modify `main` as part of this audit.

## Website findings summary

- Decision: brochure acceptable for continued visual review; questionnaire/PDF flow must not be activated.
- Responsive result: no horizontal overflow at 1440×900 or 390×844 for tested pages.
- Runtime result: home, method, results, and questionnaire loaded locally without browser console errors; local page/assets returned 200.
- Public exposure: GitHub Pages home and questionnaire returned 200; `robots.txt` and `sitemap.xml` returned 404.
- Conversion risk: August/prelaunch and questionnaire/live success messages conflict.
- Privacy risk: lead fields, age 14 minimum, health-adjacent answers, email automation, and result photos lack approved policies/records.
- Accessibility risk: incomplete radio/error semantics and visually collapsed but focusable mobile navigation.
- SEO risk: no canonical, social cards, structured data, sitemap, or robots controls.
- Performance risk: results page eagerly loads about 3.0 MB of unsized, non-lazy images.
- Security hygiene: no common secret pattern found; live GitHub Pages supplies HTTPS/HSTS but limited custom security headers.

See `AUDIT-SITO.md` for the 12 structured website findings and design scorecard.

## Mobile app findings summary

- Health checks: lint and strict TypeScript both pass.
- Architecture: screens import mock data directly; no persistence/API/auth boundary exists.
- Role risk: coach access is a demo route switch with no server authority.
- Client flow gaps: workout save is dead; diary success is local; progress is static; PDF is a hard-coded mock.
- Coach flow gaps: approve is dead; checks reset in memory; reminders are not scheduled; upload does not select a file.
- Data isolation risk: client detail reports reuse one global history/progress set for every client.
- Privacy risk: check-photo lifecycle is undefined and no storage policies exist.
- Product inconsistency: app and website phase taxonomies disagree.
- Data model risk: names/indexes/formatted strings substitute for IDs, enums, numeric units, and timestamps.
- Maintainability: `app/coach.tsx` is 2,734 lines and duplicates progress/navigation logic.
- Operational quality: dates are stale/hard-coded; release identifiers/privacy operations are missing.
- Accessibility: no explicit accessibility metadata was found; icon-only inactive tabs and the custom slider need semantics.
- Test/security: no tests/CI; npm audit reported 16 transitive advisories, with the high `undici` path under Expo CLI/tooling.

See `AUDIT-APP.md` in the mobile repository for 19 structured app findings.

## Backend gaps summary

The backend must be designed around these boundaries:

- Supabase Auth identity plus trusted role grants and explicit coach-client assignments.
- UUID-based, normalized domain data for phases, programs, workouts, diary, checks, measurements, and files.
- Default-deny RLS on every personal-data table, tested with multiple users/assignments.
- Separate private storage buckets for client programs, check photos, and gated lead magnets.
- Server-only public lead intake and Brevo integration with validation, rate limits, consent versions, idempotency, retries, and webhook handling.
- Immutable/versioned PDF publication with draft/published states and signed client access.
- Photo validation/EXIF stripping/retention/deletion and assigned-coach access.
- Operational export/delete/consent withdrawal/support/audit paths.
- Explicit job/outbox behavior for email, webhooks, reminders, uploads, and partial failure.

`BACKEND-GAPS.md` contains the proposed tables, relationships, RLS matrix, buckets, Edge Functions, end-to-end flows, manual setup list, safe pre-credential work, and “do not build yet” list.

## Commands and checks run

### Both repositories

- Read `README.md`, `AGENTS.md`, and `OVERNIGHT.md` before audit actions.
- Inspected branch, worktree, remote, history, tracked/ignored files, and clean status.
- Ran local secret-pattern scans: no common secret patterns found.
- Rechecked `git status`, report scope, and `git diff --check`.

### Website

- Served locally with `python3 -m http.server 4500`.
- Browser-tested desktop and mobile home/method/results/questionnaire pages.
- Tested mobile navigation and questionnaire validation.
- Completed the questionnaire with synthetic data and confirmed the simulated console/save/download behavior.
- Inspected DOM accessibility semantics, headings, image attributes, overflow, and browser console.
- Checked local page/asset responses with `curl`.
- Checked the live GitHub Pages candidate, questionnaire, response headers, `robots.txt`, and `sitemap.xml`.
- Inspected metadata, link targets, assets, sizes, claims, and unused files.
- Ran legacy `tidy -qe` as a non-authoritative supplemental signal.

### Mobile app

- `npm run lint` — pass.
- `npx tsc --noEmit` — pass.
- `npx expo install --check` — pass.
- `npm audit --omit=dev` — exit 1, 16 advisories.
- `npm ls` / `npm explain` for affected dependency paths.
- Searched for auth/persistence/API/upload/accessibility/test/CI/release configuration and visible pressables without handlers.
- Inspected layouts, navigation, role switch, data store, mock data, all requested client/PT flows, and relevant screen logic.

## What was not done on purpose

- No UI, CSS, HTML layout, app screen, production source, backend code, configuration, asset, or dependency was modified.
- No Supabase/Brevo/external product integration was created.
- No API key, secret, `.env` value, certificate, or token was added or accessed.
- No real customer data was entered; browser flow testing used synthetic values.
- No deployment, PR, merge, or direct `main` edit was performed.
- No sibling worktree or root `zac-gym` implementation work was used.
- No implementation branch was created; the pre-existing audit/report branches were used.
- No native iOS/Android simulator run was performed because the task was audit-only and required static checks passed.
- The ignored local website `ROADMAP-BACKEND.md` was not read or published because repository instructions prohibit publishing private roadmap notes.

## Limits of the audit

- Website performance was assessed from runtime observation and asset size, not production RUM/Lighthouse history.
- Native-only layout, keyboard, permission, and platform behavior was not exercised in a simulator/device.
- No real PDF, backend schema, credentials, email templates, storage objects, user accounts, consent records, transformation releases, or support procedures were available.
- Npm advisories were traced to installed dependency paths, but exploitability in a shipped native binary was not independently demonstrated.
- Privacy/GDPR, marketing consent, claims, minors, and health-data observations are engineering/product risks, not legal advice.
- The live website check reflects the remote main commit available during the audit.

## Uncertainty and assumptions

- August means August 2026, but the exact launch date is not approved in repository content.
- Luigi is initially the primary coach, but the backend proposal assumes multiple coaches may exist so authorization is not hard-coded to one person.
- Supabase and Brevo remain the intended providers because they are explicitly named, although neither is configured.
- The free program may have one or multiple PDFs; the current copy/scoring is insufficient to determine which.
- The canonical Metodo ZAC phase taxonomy is assumed to be undecided because the website and app conflict.
- Body photos, wellbeing feedback, measurements, and coach notes are treated as sensitive product data for engineering purposes; qualified review must determine exact legal requirements.
