# Metodo ZAC Website Audit

Audit date: 2026-07-10
Repository: `https://github.com/Kappaemme-git/metodo-zac`
Audited commit: `93c5b02` (`origin/main` at audit time)
Mode: audit only; no production, UI, CSS, asset, configuration, or dependency changes

## Decision

Security decision: **Do not activate the questionnaire/PDF flow yet.**
Website decision: **The brochure pages are visually coherent and responsive, but the public questionnaire is not truthful or operational, and its privacy/accessibility prerequisites are missing.**

The current GitHub Pages site responded successfully at `https://kappaemme-git.github.io/metodo-zac/`. The unlinked questionnaire also responded publicly with HTTP 200 at `/questionario.html`.

## Design and frontend scorecard

Preset: `landing-page`
Score: **2.9/5**
Verdict: **Needs work before the August conversion flow is exposed**

| Area | Score | Level | Priority |
|---|---:|---|---|
| Purpose and positioning | 4/5 | Good | Medium |
| Visual hierarchy | 4/5 | Good | Low |
| Conversion quality | 2/5 | Weak | High |
| Trust signals | 3/5 | Needs work | High |
| Copy quality and consistency | 3/5 | Needs work | High |
| Accessibility | 2/5 | Weak | High |
| Performance perception | 3/5 | Needs work | Medium |
| SEO and sharing readiness | 2/5 | Weak | Medium |

What works:

- The value proposition, bodybuilding positioning, Luigi section, and five-stage narrative are understandable.
- Home, method, results, and questionnaire pages rendered without horizontal overflow at 1440×900 and 390×844 in local browser checks.
- The tested pages produced no browser console errors or failed local assets.
- Internal page targets returned HTTP 200 locally; the only intentionally inert target found is the PDF download `href="#"`.
- `lang="it"`, viewport metadata, page descriptions, one primary heading per main page, reduced-motion handling, labels for basic questionnaire fields, and descriptive result-image alt text are present.

## Findings

### W-01 — Public questionnaire falsely confirms persistence and PDF delivery

- Title: Public questionnaire falsely confirms persistence and PDF delivery
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `questionario.html:164-176`, `questionario.html:320-350`
- Severity: High
- Problem: Completing the live questionnaire shows “Le tue risposte sono state registrate” and offers “Scarica il Programma Gratuito”, but `submit()` only writes the lead object to the browser console, waits 600 ms, and shows the success step. The download link is `href="#"`. A complete browser walkthrough confirmed the success message, inert link, invisible computed level, and `LEAD PRONTO` console event.
- Why it matters: A visitor is told that personal answers were saved and a six-month program was unlocked when neither happened. This is a broken core flow and a trust risk, even though the page is not linked from the home page.
- Recommended fix: Before any promotion, either keep the page unavailable/non-indexable and change the copy to an explicit preview, or implement one complete server-validated submission and delivery flow. Do not retain the current simulated success state on a public URL.
- Requires human decision: No
- Requires real backend: Yes
- Suggested priority: P0 — before sending any traffic to the questionnaire

### W-02 — The incomplete questionnaire is already public and indexable

- Title: The incomplete questionnaire is already public and indexable
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `questionario.html:1-13`; live `/questionario.html`
- Severity: High
- Problem: The page is unlinked from the home page but is deployed and returns HTTP 200. It has an indexable title and description and no `robots` meta directive. The site also has no `robots.txt` or `sitemap.xml`.
- Why it matters: “Not linked” is not an access or publication control. The incomplete flow can be shared directly, discovered from repository history, or indexed, exposing the false save/download promises before August.
- Recommended fix: The owner must choose whether the page is a private preview or a public prelaunch page. Until the real flow is approved, remove it from the public artifact or apply a clear preview state plus `noindex`; do not rely on navigation hiding.
- Requires human decision: Yes
- Requires real backend: No
- Suggested priority: P0 — immediate publication decision

### W-03 — No privacy notice, consent model, or minor-user decision exists

- Title: No privacy notice, consent model, or minor-user decision exists
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `questionario.html:131-161`, `index.html:378-398`, `risultati.html:150-171`
- Severity: High
- Problem: The questionnaire asks for name, surname, email, age from 14, sex, training behavior, nutrition behavior, body goal, motivation, and subjective wellbeing-related answers. It provides no privacy notice, controller contact, purposes, retention period, recipient list, deletion/export route, consent record, or separate marketing choice. No policy link exists anywhere. The owner has not defined how users aged 14–17 are handled.
- Why it matters: This is a material GDPR and trust risk because the planned dataset can reveal fitness/health-adjacent information and is intended for email automation. A marketing opt-in cannot be silently inferred from requesting the free PDF. This audit identifies engineering and product gaps, not a legal conclusion.
- Recommended fix: Obtain owner/legal decisions on data minimization, lawful basis, transactional versus marketing email, consent text/versioning, retention, data-subject requests, and minimum age. Add the approved notice and collect only fields needed for the stated purpose before persistence is enabled.
- Requires human decision: Yes
- Requires real backend: No
- Suggested priority: P0 — define before database or Brevo integration

### W-04 — “Personalized” delivery and scoring are not product-defined

- Title: “Personalized” delivery and scoring are not product-defined
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `index.html:349-357`, `questionario.html:188-213`, `questionario.html:311-339`
- Severity: High
- Problem: The home page says the program starts “su misura”, while the questionnaire computes only three broad levels and never displays the level or maps it to a file. Several answers receive no points, the scoring rules live only in client-side code, and there are no approved PDF variants or version identifiers in the repository.
- Why it matters: Backend work cannot be scoped until Luigi decides whether the result selects one of three PDFs, customizes content, or only segments email messaging. Client-side scoring can also be changed by a visitor and is not an authoritative business rule.
- Recommended fix: Approve a questionnaire version, scoring matrix, level boundaries, handling of non-scored answers, result copy, PDF-to-level mapping, and fallback behavior. Recompute and store the authoritative result on the server when the flow becomes real.
- Requires human decision: Yes
- Requires real backend: Yes
- Suggested priority: P0 — product decision before schema/function implementation

### W-05 — August CTA states contradict each other

- Title: August CTA states contradict each other
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `index.html:349-357`, `questionario.html:8-9`, `questionario.html:170-176`
- Severity: Medium
- Problem: The home page says the program arrives in August 2026 and asks visitors to return at the end of August. The already-public questionnaire metadata says visitors can unlock it now, and its completion state says the program begins today.
- Why it matters: There is no single source of truth for launch state, so marketing links, search snippets, and direct visitors can receive mutually exclusive promises.
- Recommended fix: Define explicit states (`prelaunch`, `live`, `paused`) with one approved CTA/copy set for each. Confirm the exact August date, whether pre-registration exists, and whether the questionnaire should be usable before the PDF is available.
- Requires human decision: Yes
- Requires real backend: No
- Suggested priority: P0 — before August campaign preparation

### W-06 — Transformation photos and claims need documented publication authority

- Title: Transformation photos and claims need documented publication authority
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `risultati.html:68-144`, `assets/clienti/`
- Severity: High
- Problem: The public results page identifies clients by first name/initial, shows before/after body photos, body measurements, weight changes, exercise loads, and an accident/recovery narrative. No repository evidence establishes model releases, measurement substantiation, permitted duration/channels, withdrawal handling, or approval of the sensitive narrative.
- Why it matters: These are high-trust claims tied to identifiable bodies and potentially health-related context. Missing publication records create privacy, reputational, and takedown risk even when the displayed names are abbreviated.
- Recommended fix: The owner should verify signed, scope-specific publication permission and factual support for every case, define a withdrawal/takedown process, and have the copy reviewed. Do not infer permission from possession of the images.
- Requires human decision: Yes
- Requires real backend: No
- Suggested priority: P0 — verify before further promotion

### W-07 — Questionnaire controls are not exposed as complete accessible form controls

- Title: Questionnaire controls are not exposed as complete accessible form controls
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `questionario.html:126-183`, `questionario.html:217-253`, `questionario.html:281-300`
- Severity: Medium
- Problem: There is no `<form>`. Choice groups have `role="radiogroup"` but no accessible group label; choice buttons have neither radio roles nor `aria-checked`. Validation messages are not connected with `aria-describedby`, fields do not receive `aria-invalid`, and changes/errors are not announced. Requiredness exists only in JavaScript. Browser inspection confirmed all of these attributes were absent.
- Why it matters: Screen-reader and keyboard users do not receive the selected state, group question, required state, or error relationship. This blocks a core conversion flow for part of the audience.
- Recommended fix: Use semantic form/radio controls where possible, otherwise implement the complete ARIA radio pattern, group labeling, keyboard behavior, announced progress, required/error attributes, and an error summary. Test with keyboard and at least VoiceOver.
- Requires human decision: No
- Requires real backend: No
- Suggested priority: P1 — before questionnaire launch

### W-08 — Collapsed mobile navigation leaves hidden links in the accessibility tree

- Title: Collapsed mobile navigation leaves hidden links in the accessibility tree
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `style.css:87-97`, menu buttons in `index.html:72`, `metodo.html:190`, `risultati.html:53`
- Severity: Medium
- Problem: The closed menu is implemented with `max-height: 0` and `overflow: hidden`; links remain rendered and focusable. The DOM accessibility snapshot exposed all navigation links while the menu was closed. The menu button has `aria-expanded` but no `aria-controls`, and there is no focus/escape management.
- Why it matters: Keyboard and screen-reader focus can enter controls that are visually unavailable, creating confusing navigation and an inconsistent expanded state.
- Recommended fix: When collapsed, make the link container non-interactive and hidden from assistive technology; restore it on open. Add `aria-controls`, meaningful open/close naming, Escape behavior, and focus return.
- Requires human decision: No
- Requires real backend: No
- Suggested priority: P1 — accessibility pass

### W-09 — SEO and social preview basics are incomplete

- Title: SEO and social preview basics are incomplete
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `<head>` in all four HTML files; missing `robots.txt` and `sitemap.xml`
- Severity: Medium
- Problem: Page titles/descriptions exist, but no canonical URLs, Open Graph tags, Twitter card tags, social preview image, structured data, sitemap, or robots file exist. The home title is only “Metodo ZAC”. The live `robots.txt` and `sitemap.xml` both returned 404.
- Why it matters: Search engines and shared links have weak control over canonicalization, snippets, brand attribution, and previews. The public questionnaire can be indexed while important pages are not explicitly enumerated.
- Recommended fix: After the canonical domain and launch visibility are approved, add per-page canonical/title metadata, `og:*`/Twitter metadata, a verified preview asset, sitemap/robots rules, and conservative `Person`/`Organization` or service structured data where facts are approved.
- Requires human decision: Yes
- Requires real backend: No
- Suggested priority: P1 — before campaign distribution

### W-10 — Results page eagerly loads heavy, unsized images

- Title: Results page eagerly loads heavy, unsized images
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `risultati.html:72-144`, `assets/clienti/`
- Severity: Medium
- Problem: Eight 1152–1200 px images totaling about 3.0 MB are loaded immediately. None has `loading="lazy"`, `decoding="async"`, explicit width/height, responsive variants, or modern formats. The heaviest individual file is about 457 KB.
- Why it matters: Mobile visitors pay the full transfer and decode cost even for images far below the fold. Missing intrinsic dimensions increase layout-stability risk, and large decodes can make scrolling feel slow on low-end devices.
- Recommended fix: Preserve the visual design while generating appropriately sized WebP/AVIF variants, adding intrinsic dimensions and responsive sources, and lazy-loading below-the-fold cases. Measure the live page before and after.
- Requires human decision: No
- Requires real backend: No
- Suggested priority: P1 — performance pass before promotion

### W-11 — Repository contains unused image assets and no automated site checks

- Title: Repository contains unused image assets and no automated site checks
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: `assets/hero-physique.jpg`, `assets/clienti/c1.jpg`, `c2.jpg`, `c3.jpg`; repository root
- Severity: Low
- Problem: Four tracked images totaling roughly 410 KB are not referenced by any HTML or CSS. The static repository has no automated link, accessibility, HTML, or performance check; manual verification is the only regression control.
- Why it matters: Unused assets add maintenance ambiguity, while the absence of repeatable checks makes it easy to reintroduce broken fragments, missing files, or accessibility regressions during the August switch.
- Recommended fix: Confirm whether the assets are intentionally reserved before deleting them. Add non-mutating CI checks later for internal links, HTML semantics, accessibility, and page weight; keep the audit-only branch unchanged now.
- Requires human decision: Yes
- Requires real backend: No
- Suggested priority: P2 — cleanup after launch-state decisions

### W-12 — GitHub Pages header control is insufficient for a sensitive form by itself

- Title: GitHub Pages header control is insufficient for a sensitive form by itself
- Repository: Website / landing (`metodo-zac`)
- File/path, if relevant: Live GitHub Pages response; hosting architecture
- Severity: Low
- Problem: The live host provides HTTPS/HSTS, but the response did not include a Content Security Policy, anti-framing policy, or explicit referrer policy. GitHub Pages offers limited custom response-header control.
- Why it matters: This is acceptable residual risk for a small static brochure, but the risk profile changes when the page collects personal data and calls a backend. Third-party fonts and future endpoints should be constrained deliberately.
- Recommended fix: Keep the brochure static if possible. Before activating form submission, decide whether HTML meta policies are sufficient or whether a host/proxy with controlled headers is required. Do not migrate hosting solely for this finding without weighing operational cost.
- Requires human decision: Yes
- Requires real backend: No
- Suggested priority: P2 — architecture decision before live data collection

## Commands and checks run

- Read `README.md`, `AGENTS.md`, and `OVERNIGHT.md` before repository work.
- Inspected Git branch, worktree, remote, tracked files, ignored files, history, and report-only status.
- Ran the security skill's local secret-pattern scan: no common secret patterns found.
- Served the site locally with `python3 -m http.server 4500`.
- Browser-tested home, method, results, and questionnaire pages at 1440×900 and 390×844.
- Completed the questionnaire with synthetic data, tested validation, inspected accessibility semantics, and confirmed the simulated success/download behavior.
- Checked browser console warnings/errors, image completion/dimensions, document overflow, navigation behavior, and headings.
- Checked local page/asset HTTP responses with `curl`; tested the live GitHub Pages candidate, `/questionario.html`, `/robots.txt`, and `/sitemap.xml`.
- Inspected metadata, claims, internal targets, file sizes, image references, and unused assets with read-only searches.
- Ran `tidy -qe` as an additional signal; its installed version is legacy and produced many false HTML5/SVG errors, so it was not treated as an authoritative validator. It also flagged unescaped ampersands in Google Fonts URLs.
- Rechecked `git status` and `git diff --check`; no production files changed.

## Audit limits

- No production analytics or real-user performance data was available; performance findings use asset sizes and runtime observation.
- This is not legal advice. Consent, health-data classification, claims, minors, and image releases require qualified human review.
- No real PDF, approved scoring specification, privacy text, consent records, Supabase project, or Brevo account was available.
- The ignored local `ROADMAP-BACKEND.md` was deliberately not read or published because repository instructions prohibit publishing private roadmap notes.
- Instagram was not exercised as an authenticated user flow.
