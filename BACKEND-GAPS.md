# Metodo ZAC Backend Readiness and Gap Analysis

Audit date: 2026-07-10
Repositories covered: `metodo-zac` website and `metodo-zac-app` mobile app
Status: design proposal only; no Supabase, Brevo, storage, auth, function, secret, or environment changes were made

## Readiness decision

**Do not connect either frontend directly to real data yet.** The project first needs human decisions on product taxonomy, identity/roles, minors, consent, photo handling, PDF source of truth, and email purpose. A schema can be drafted safely, but credentials and production integration would currently harden contradictory or unsafe assumptions.

Recommended sequence:

1. Approve the product/data decisions listed below.
2. Freeze a small v0 domain model and data dictionary.
3. Write migrations plus RLS/storage policy tests in an isolated backend task.
4. Implement server-only lead/Brevo/PDF functions with test credentials.
5. Add typed frontend adapters and keep mock adapters for comparison.
6. Pilot with synthetic users before any real client or body-photo data.

## Backend findings

### B-01 — Canonical product concepts are not approved

- Title: Canonical product concepts are not approved
- Repository: Both repositories
- File/path, if relevant: Website `metodo.html`; app `data/mock-client.ts:250-289`
- Severity: High
- Problem: The two repositories use different five-phase names, and the app itself has conflicting Phase II labels. The meaning of “personalized” questionnaire result, program/PDF variants, coach-client onboarding, phase advancement, and check cadence is also undecided.
- Why it matters: These are database entities and state transitions, not only copy. Building tables first would encode contradictions and force migrations before the first real user.
- Recommended fix: Luigi/project owner must approve the canonical taxonomy, advancement authority, questionnaire versions/results, program source of truth, client lifecycle, and coach assignment rules. Assign stable codes/IDs independent of display copy.
- Requires human decision: Yes
- Requires real backend: No
- Suggested priority: P0 — decision workshop before migrations

### B-02 — Identity, role, and coach-client assignment model is missing

- Title: Identity, role, and coach-client assignment model is missing
- Repository: Mobile app (`metodo-zac-app`)
- File/path, if relevant: `components/zac/role-switch.tsx`, `app/coach.tsx`
- Severity: High
- Problem: There is no authentication, immutable role source, invitation flow, coach-client assignment, suspension/revocation state, or admin authority. The app currently chooses role and client in local UI.
- Why it matters: RLS cannot be correct without a precise ownership graph. A user-editable `profiles.role` or client-supplied `client_id` would allow privilege escalation or cross-client access.
- Recommended fix: Use Supabase Auth for identity; store profile data separately from authorization. Create explicit assignments with status and timestamps. Only trusted server/admin operations may grant coach/admin roles or create/revoke assignments.
- Requires human decision: Yes
- Requires real backend: Yes
- Suggested priority: P0 — foundation for every app table

### B-03 — Public lead capture has no trusted server boundary

- Title: Public lead capture has no trusted server boundary
- Repository: Website (`metodo-zac`)
- File/path, if relevant: `questionario.html:320-350`
- Severity: High
- Problem: The planned comments suggest direct Supabase insert followed by Brevo subscription from a static page. No server validation, rate limit, bot protection, idempotency, consent record, duplicate policy, or failure handling is defined.
- Why it matters: A public anonymous table insert is easy to abuse and a Brevo key must never be shipped to the browser. Duplicate submissions can spam contacts and email automation.
- Recommended fix: Submit to one serverless/Edge Function. It must validate and minimize fields, apply abuse controls, record consent version/purpose, calculate the authoritative result, upsert idempotently, and enqueue email work. Anonymous users must not be able to select/update lead rows.
- Requires human decision: Yes
- Requires real backend: Yes
- Suggested priority: P0 — only acceptable website write boundary

### B-04 — RLS and storage authorization requirements are undefined

- Title: RLS and storage authorization requirements are undefined
- Repository: Both repositories
- File/path, if relevant: Proposed Supabase architecture
- Severity: High
- Problem: No policy matrix exists for clients, assigned coaches, unassigned coaches, administrators, anonymous visitors, program files, or body photos.
- Why it matters: UI route guards cannot prevent direct API/storage access. Default-public tables or buckets would expose personal fitness data, coach notes, PDFs, and body images.
- Recommended fix: Enable RLS on every non-reference table, deny by default, and write multi-user policy tests before frontend integration. Use private buckets and short-lived signed access. Authorization helpers must derive identity from `auth.uid()`, fix `search_path`, and never trust request-supplied roles.
- Requires human decision: No
- Requires real backend: Yes
- Suggested priority: P0 — must ship with initial migrations

### B-05 — PDF lifecycle and source of truth are unresolved

- Title: PDF lifecycle and source of truth are unresolved
- Repository: Both repositories
- File/path, if relevant: Website `questionario.html`; app `app/pdf.tsx`, `app/coach.tsx:821-838`
- Severity: High
- Problem: The website needs free-program delivery, while the app needs client-specific coach PDFs. Neither flow defines whether PDFs are public/private, how variants are selected, who can publish, whether structured workouts duplicate PDF contents, how versions are replaced, or how old links expire.
- Why it matters: Mixing free lead magnets and private client programs in one public bucket risks disclosure. Without versioning, coach/client views can disagree about which plan is active.
- Recommended fix: Use separate content domains and buckets. Version assets immutably, store checksums/metadata, distinguish draft from published, and issue access only after server authorization. Decide whether structured program rows or the uploaded PDF is authoritative.
- Requires human decision: Yes
- Requires real backend: Yes
- Suggested priority: P0 — before storage creation

### B-06 — Check-photo privacy and retention are not designed

- Title: Check-photo privacy and retention are not designed
- Repository: Mobile app (`metodo-zac-app`)
- File/path, if relevant: `app/(tabs)/progressi.tsx`, planned coach/photo flow
- Severity: High
- Problem: There is no approved consent, pose/capture guidance, ownership, EXIF policy, format/size limit, moderation/rejection state, signed URL lifetime, retention, deletion, export, or screenshot/download expectation.
- Why it matters: Body progress photos are highly sensitive and can identify clients. Storage paths alone are not sufficient; database and bucket policies must agree, and operational deletion must remove both metadata and objects.
- Recommended fix: Approve the lifecycle before creating the bucket. Strip metadata, validate content, store privately, bind each object to a check/client, restrict reads to the client and assigned coach, log sensitive access as appropriate, and implement tested deletion/retention jobs.
- Requires human decision: Yes
- Requires real backend: Yes
- Suggested priority: P0 — before image picker or uploads

### B-07 — Brevo consent, delivery, and unsubscribe responsibilities are missing

- Title: Brevo consent, delivery, and unsubscribe responsibilities are missing
- Repository: Website (`metodo-zac`)
- File/path, if relevant: `questionario.html:320-324`
- Severity: High
- Problem: The planned flow combines PDF delivery and a three-day level-based automation without defining transactional versus marketing purpose, opt-in/double-opt-in, template/version mapping, sender identity, duplicate contact behavior, unsubscribe synchronization, bounce handling, or data minimization.
- Why it matters: Sending the free PDF does not automatically authorize ongoing marketing. Client-side Brevo calls would expose secrets, and unsynchronized unsubscribe state can cause unwanted messages.
- Recommended fix: Keep the Brevo API key server-only. Record separate consent purposes and versions; send only the attributes Brevo needs; process authenticated webhooks; make upsert/idempotency explicit; and honor unsubscribe/suppression across local records and Brevo.
- Requires human decision: Yes
- Requires real backend: Yes
- Suggested priority: P0 — approve before automation setup

### B-08 — Operational privacy controls have no engineering path

- Title: Operational privacy controls have no engineering path
- Repository: Both repositories
- File/path, if relevant: No privacy/account backend exists
- Severity: High
- Problem: Retention periods, deletion/export requests, account closure, consent withdrawal, photo takedown, audit history, backups, support access, and incident response are not defined.
- Why it matters: Real data cannot be responsibly operated if the owner cannot find, export, restrict, or delete it across Supabase Auth, database rows, storage objects, backups, and Brevo.
- Recommended fix: Create an owner-approved data inventory and retention schedule. Design administrative procedures and minimal audit events, then verify deletion/export across every processor. This is engineering and operations planning, not a legal conclusion.
- Requires human decision: Yes
- Requires real backend: Yes
- Suggested priority: P0 — before real-user pilot

### B-09 — Idempotency, jobs, and failure visibility are missing

- Title: Idempotency, jobs, and failure visibility are missing
- Repository: Both repositories
- File/path, if relevant: Future Edge Functions and email/notification workflows
- Severity: Medium
- Problem: No contract exists for duplicate questionnaire submissions, interrupted uploads, repeated publish actions, reminder retries, Brevo timeouts, webhook replay, partial database/storage failure, or support diagnostics.
- Why it matters: These flows cross systems. A single synchronous request can save the lead but fail the email, publish metadata but fail the file, or send the same reminder twice.
- Recommended fix: Use idempotency keys, explicit job/event states, retry limits, dead-letter/manual retry visibility, correlation IDs, redacted logs, and transactional boundaries where possible. Never log questionnaire answers, tokens, signed URLs, or body-photo paths unnecessarily.
- Requires human decision: No
- Requires real backend: Yes
- Suggested priority: P1 — include in function contracts

### B-10 — Environment ownership and credentials are a human blocker

- Title: Environment ownership and credentials are a human blocker
- Repository: Both repositories
- File/path, if relevant: Deployment/project-owner setup
- Severity: Medium
- Problem: No owner-approved Supabase project/region, production domain redirects, sender domain, Brevo account, signing/release ownership, secret storage, environment separation, backup policy, or support contact is available.
- Why it matters: Credentials cannot be safely invented, and account ownership determines recovery, billing, data location, and incident handling. Frontend code written before these choices often hard-codes wrong URLs or mixes test and production.
- Recommended fix: The project owner must create and own the accounts, choose region/environments, configure domains and sender authentication, and provide secrets only through approved server/deployment secret stores. Continue using fixtures until then.
- Requires human decision: Yes
- Requires real backend: No
- Suggested priority: P1 — setup after product/privacy decisions

## Proposed Supabase schema

This is a starting data model, not an implementation instruction. Names and cardinalities should be frozen only after B-01/B-02 decisions.

### Identity and authorization

| Table | Purpose | Required relationships / constraints |
|---|---|---|
| `profiles` | Non-authoritative user profile fields | `id` PK/FK to `auth.users`; display/contact fields only; do not allow role self-escalation |
| `user_roles` | Trusted app roles | `(user_id, role)` unique; grants/revokes only through trusted admin/server path; roles such as `client`, `coach`, `admin` |
| `coach_client_assignments` | Explicit coach access to a client | UUID PK; `coach_id` and `client_id` FKs to profiles; status, starts/ends, invited/approved by; unique active pair |
| `client_goals` | Client goals/history | `client_id` FK; type/code plus approved free text; active/version timestamps |

### Method, programs, and workouts

| Table | Purpose | Required relationships / constraints |
|---|---|---|
| `method_phase_versions` | Canonical versioned five-phase taxonomy | Version/status; only one published version at a time unless migrations support overlap |
| `method_phases` | Ordered phases within a version | FK to phase version; stable code; unique `(version_id, ordinal)` |
| `client_phase_history` | Assigned/current/completed phase history | FKs to client, phase, assigning coach; timestamps and reason; enforce one current phase per client |
| `training_programs` | Client-specific program lifecycle | FKs to client, coach, phase; draft/published/archived status; title/focus/start/end; version |
| `program_files` | Immutable uploaded PDF versions | FK to program; private storage path, original name, MIME, bytes, checksum, uploaded_by, published_at, supersedes_id |
| `training_days` | Structured sessions in a program | FK to program; stable ID, ordinal, title/focus, active status |
| `exercise_catalog` | Optional canonical exercise reference | Stable name/video metadata; defer until owner confirms need |
| `program_exercises` | Prescribed exercise snapshot | FK to training day; optional catalog FK; ordinal, sets, rep range, target load/unit, rest seconds, coach note |
| `workout_sessions` | One client performance of a training day | FKs to client/program/day; draft/completed/cancelled; started/completed timestamps; unique idempotency key |
| `workout_set_logs` | Numeric set-level performance | FK to session and program exercise; set number, load numeric/unit, reps, RPE/flags if approved; unique set per session/exercise |

### Diary, checks, photos, and progress

| Table | Purpose | Required relationships / constraints |
|---|---|---|
| `diary_entries` | Daily/session feedback | FK to client and optional workout; local date/timezone; numeric scales with CHECK constraints; comment; timestamps |
| `check_schedules` | Planned check lifecycle | FKs to client/coach; due timestamp/timezone; status (`scheduled`, `rescheduled`, `completed`, `cancelled`, `missed`); created_by |
| `check_reports` | Completed check data and coach assessment | Optional schedule FK; client/coach FKs; measurements/condition/client note/coach note; submitted/reviewed timestamps |
| `check_photos` | Metadata for private body images | FK to report/client; pose, storage path, MIME, bytes, checksum, metadata-stripped flag, uploader, retention/deleted timestamps |
| `body_measurements` | Queryable numeric measurements | FK to client/check; metric code, numeric value, unit, measured_at, source; unique source metric where appropriate |
| `progress_events` | Optional milestones not derivable from logs | FK to client; typed event, numeric/text payload, source reference, occurred_at; keep derived charts as views/queries where possible |

### Website lead, questionnaire, and delivery

| Table | Purpose | Required relationships / constraints |
|---|---|---|
| `leads` | Minimal lead identity and lifecycle | UUID PK; normalized email unique or dedupe policy; names only if necessary; status/source/timestamps; avoid storing unnecessary age/sex |
| `questionnaire_versions` | Versioned questions/scoring/content mapping | Version/status/published_at; immutable after submissions exist |
| `questionnaire_submissions` | One completed result | FK to lead/version; answers JSONB or normalized child rows; authoritative score/level; idempotency key; completed_at |
| `consent_records` | Purpose-specific consent/evidence | FK to lead or user; purpose, text/version, granted/revoked timestamps, source; marketing and delivery separated |
| `lead_magnet_assets` | Versioned free PDFs | Level/audience code, version, private storage path, checksum, active window/status |
| `delivery_events` | PDF/email lifecycle | FK to lead/submission/asset; channel/type/status/provider ID; attempt/delivered/downloaded timestamps; no secret URLs in durable logs |
| `integration_contacts` | Minimal Brevo synchronization state | FK to lead; provider contact ID, sync/suppression state and timestamps; do not mirror unnecessary questionnaire answers |

### Operations

| Table | Purpose | Required relationships / constraints |
|---|---|---|
| `outbox_jobs` | Reliable cross-system work | Type, dedupe key, redacted payload/reference IDs, status, attempts, next attempt, last safe error |
| `audit_events` | Minimal record of privileged changes/access where justified | Actor, action, target type/ID, timestamp, safe metadata; never store secrets or sensitive content in logs |
| `data_subject_requests` | Track export/delete/restriction handling | Subject reference, request type/status, due/completed timestamps, operator; only if owner/legal workflow requires it |

Avoid storing the same derived totals in multiple tables unless there is a documented cache/rebuild strategy. Progress percentages, volume totals, adherence, and records should normally be derived from client-scoped sources or materialized views with a clear refresh policy.

## Required RLS policy matrix

All application tables and storage objects should default to deny.

| Resource | Client | Assigned coach | Unassigned coach | Anonymous | Admin/trusted server |
|---|---|---|---|---|---|
| Own profile | Read/update approved fields | Read minimal assigned-client fields | No | No | Controlled |
| Coach-client assignments | Read own active assignment | Read own assignments | No | No | Create/revoke |
| Programs/days/exercises | Read own published versions | CRUD for assigned client, publish under rules | No | No | Controlled |
| Workout sessions/sets | CRUD own records under program rules | Read assigned client; coach edits only if explicitly approved | No | No | Controlled |
| Diary | CRUD own within edit policy | Read assigned client | No | No | Controlled |
| Check schedules | Read own | CRUD assigned client | No | No | Controlled |
| Check reports/measurements | Read own; write client-owned fields only | Read/write assigned coach fields | No | No | Controlled |
| Check photos | Read/delete own under policy | Read assigned client; upload only if approved | No | No | Controlled |
| Leads/submissions/consent | No direct anonymous select/update | No app-coach access by default | No | Edge Function only | Controlled |
| Delivery/integration/jobs/audit | No direct app access | No direct app access | No | No | Trusted server/admin only |

Policy tests must include at least: client A, client B, assigned coach A, unassigned coach B, suspended assignment, anonymous caller, and admin/service path. Storage tests must use the same identities and verify both object listing and direct download attempts.

## Required storage buckets

| Bucket | Visibility | Suggested object path | Notes |
|---|---|---|---|
| `client-programs` | Private | `{client_uuid}/{program_uuid}/{version_uuid}.pdf` | PDF MIME/magic-byte/size validation, immutable versions, client reads only published assigned asset |
| `check-photos` | Private | `{client_uuid}/{check_uuid}/{photo_uuid}.{ext}` | Image validation, EXIF stripping, pose metadata in DB, short-lived signed reads, retention/deletion |
| `lead-magnets` | Private if unlock is meaningful | `{questionnaire_version}/{level}/{asset_version}.pdf` | Edge Function issues short-lived delivery; if made public, acknowledge that the “gate” is marketing only |
| `avatars` | Decision required | `{user_uuid}/{version}.{ext}` | Prefer private for client identities unless owner explicitly accepts public URLs |
| `exercise-media` | Defer | — | Do not create until ownership/licensing and product need are approved |

Never place client PDFs and free lead magnets in the same public namespace. Never put service-role keys or long-lived signed URLs in either frontend.

## Required Edge/serverless functions

| Function | Responsibility | Must not do |
|---|---|---|
| `submit-questionnaire` | Validate/minimize input, rate-limit, record consent/version, score server-side, idempotently upsert lead/submission, enqueue delivery | Expose service key; trust client score; synchronously hide partial failures |
| `resolve-lead-magnet` | Authorize submission/token and return short-lived signed asset URL or stream | Return permanent private paths/URLs |
| `sync-brevo-contact` | Server-only minimal contact upsert and consent-aware list/automation operation | Receive or store unnecessary body/health answers in Brevo |
| `brevo-webhook` | Authenticate provider callback; record delivery/bounce/unsubscribe/suppression idempotently | Trust unauthenticated events or log full payloads blindly |
| `invite-or-approve-user` | Trusted invitation/approval and role/assignment creation | Let coaches grant arbitrary admin/coach roles |
| `publish-program` | Validate assignment, file/version, status transition, and notify client | Treat upload completion alone as publication |
| `schedule-check-notification` | Enqueue/cancel/reschedule reminders from persisted check state | Claim reminder success before provider/job acceptance |
| `export-or-delete-subject` | Coordinated owner-approved export/delete across DB, storage, Auth, and Brevo | Run without strong authorization/audit and confirmation |

Not every database write needs a function: client workout/diary writes and assigned-coach CRUD may use Supabase directly under tested RLS. Privileged role changes, public anonymous intake, external-service secrets, and multi-step publication/delivery should stay server-side.

## Proposed lead and questionnaire flow

1. Page loads versioned questions and approved privacy/consent copy.
2. Browser validates only for usability; it does not calculate the authoritative result or call Brevo.
3. One request with an idempotency key goes to `submit-questionnaire`.
4. Function revalidates fields, age policy, consent, version, and abuse signals.
5. Function stores the minimal lead, immutable submission, authoritative score/level, and consent record in a transaction.
6. Function enqueues `deliver_pdf` and, only when separately authorized, `brevo_sync` work.
7. Response returns a submission receipt/result and a short-lived PDF delivery method. It never claims success for failed persistence.
8. Worker/function retries email safely and records delivery/suppression state.
9. Brevo webhook synchronizes bounce/unsubscribe events idempotently.

Open human decision: whether PDF delivery is transactional and immediate, whether marketing requires separate opt-in/double-opt-in, and whether age/sex are genuinely needed for the result.

## Proposed client/PT data flows

### Workout

1. Client creates/resumes a draft session for a published training day.
2. Set writes use stable exercise/set IDs and an idempotency key; invalid numeric/unit values are rejected.
3. Completion is an explicit state transition with timestamp.
4. Progress queries derive only from that client's completed sessions.
5. Assigned coach receives read access; editing client logs requires a separate approved policy.

### Diary/check

1. Client writes diary data under own identity and an approved edit window.
2. Assigned coach schedules a check with timezone and status.
3. Reminder job is created only after the schedule commit; retries/cancellation are visible.
4. Client/coach complete their permitted check fields.
5. Private photos attach to the persisted report and inherit client/assignment access.

### Program PDF

1. Assigned coach uploads to a temporary/private version path.
2. Server validates metadata/content and records a draft version.
3. Coach explicitly publishes; server atomically marks the current version and enqueues client notification.
4. Client receives only the current published version via short-lived authorization.
5. Replacement creates a new immutable version; prior versions follow retention policy.

## Manual setup required from the project owner

- Approve canonical phase names, criteria, questionnaire scoring/result/PDF mapping, and exact August launch state/date.
- Decide whether the app is invite-only, who can be a coach/admin, how assignments start/end, and whether one client can have multiple coaches.
- Decide minimum age and minor handling; approve privacy notices, consent purposes/versions, retention, deletion/export, photo consent, and controller/support contact.
- Verify transformation-photo releases and claims on the website.
- Supply the real free PDF variants and client-PDF requirements; decide whether PDFs or structured workouts are authoritative.
- Create/own Supabase organizations/projects, choose region/environment separation, enable backups, configure Auth methods/redirect URLs/SMTP, and keep service-role credentials in server secret storage.
- Create/own Brevo, verify sender/domain authentication (SPF/DKIM/DMARC as applicable), approve templates/cadence, configure unsubscribe/suppression and webhook secret, and complete processor/legal setup.
- Approve canonical website/app domains, iOS bundle ID, Android package ID, signing/release ownership, privacy/support URLs, and incident/support responsibility.
- Define photo capture guidance, storage/retention, staff access, and takedown process.

## Work that can be prepared safely before credentials exist

- Versioned data dictionary and entity/state diagrams.
- SQL migration drafts and seed fixtures containing synthetic users only.
- RLS and storage policy tests using local Supabase or an isolated non-production project.
- TypeScript domain types and repository interfaces with mock implementations.
- Request/response schemas, idempotency rules, error codes, and loading/offline acceptance criteria.
- Approved privacy/consent copy placeholders with explicit version fields (final text still needs human approval).
- Storage path, MIME/size/checksum, and retention specifications.
- Test matrix for client A/client B/assigned coach/unassigned coach/admin/anonymous.
- Brevo attribute/template mapping with synthetic addresses using reserved test domains.
- Release checklist and secret inventory naming—without adding real values.

## What should not be built yet

- Direct Supabase calls scattered through existing screens.
- Any Brevo call from browser or mobile code.
- Authentication that treats the floating role switch or a profile field as authority.
- Public client-PDF or body-photo buckets.
- Image/file pickers before consent, validation, path, RLS, deletion, and retention decisions.
- A final database schema that preserves the current contradictory phase names or client-name keys.
- Push reminders before persisted schedules, timezone rules, retry/cancel behavior, and provider ownership exist.
- Analytics/tracking/cookie tooling before purpose and consent are approved.
- Payments, subscriptions, AI coaching, chat, or other scope expansion.
- Forced dependency upgrades mixed with backend work.

## Assumptions and limits

- Supabase and Brevo are the intended providers because they are named in the repository/user scope; no provider account or credential was accessed.
- The proposal assumes multiple clients per coach and potentially more coaches later, because RLS should not hard-code a single person even if Luigi is initially the only coach.
- The proposal treats body photos, wellbeing feedback, coach notes, and measurements as sensitive product data requiring strong privacy controls; exact legal classification needs qualified review.
- This document is a gap analysis, not implemented architecture or legal advice.
