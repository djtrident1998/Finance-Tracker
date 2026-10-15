# Architecture and data ownership

The app is a dependency-free ES-module application: browser HTML/CSS/JavaScript, a Cloudflare Worker backend, owner-scoped D1 persistence, and a shared deterministic domain library. A minimal Node 24 development server wraps the exact built Worker and a SQLite implementation of the D1 operations used here. No production OAuth or database is simulated in the hosted build.

`src/finance.mjs` owns 8-decimal fixed-point accounting, FIFO lots, XIRR, SIP simulation, assignment validation, overlap, scoring gates and evidence validation. Financial amounts and units persist as decimal strings in JSON; D1's SQLite integer/float types are not used for monetary summation. Effective returns necessarily use floating-point exponentiation, rounded to 8 decimals at monthly simulation steps; display rounds separately. This precision contract is documented and tested, and is not instrument-specific settlement accounting.

`src/imports.mjs` owns the CSV parser, schema validation, identity, duplicate review and closing-unit checks. `src/server.mjs` owns authenticated API operations, source state, analytics, reports, audit events and background job processing. `src/demo.mjs` contains all synthetic seed records and is never loaded into personal space. Each signed-in owner has separate personal and demo overlays. Demo fixture changes persist privately under that owner's demo namespace.

## Schema

Migration `drizzle/0000_ledger.sql` defines:

- `records`: composite primary key (owner, space, kind, id); serialized typed payload; created_at, updated_at. Kinds: events, prices, goals, sips, reports, imports, preferences. Events are append-only; report records use insert-only deterministic IDs. Corrections are explicit batch reversals or a newly dated price update, not rewrites of historical report snapshots.
- `audit_events`: actor/owner, workspace, action, entity, UTC timestamp and reason; indexed by owner/time. Records preview/post/reverse, price, profile, goal, SIP, report and export actions. Deletion deliberately removes the selected workspace's activity.
- `job_runs`: owner + cutoff + revision key, status, attempt count, UTC update time. Failed runs back off up to an hour; catch-up processes one latest period.

This compact document-record schema keeps a small personal deployment portable. It is not the normalized production entity schema from the full specification. Instrument records and lots are derived from immutable events. Peer snapshots, licensed metadata history, delivery receipts, encrypted retained statements, rule versions, risk overrides, stable scheme listing normalization and report correction revisions need additional schema before advanced release.

## API

Every `/api/*` request requires the trusted `oai-authenticated-user-id` supplied by Sites dispatch. Requests cannot select an owner. All record access binds owner and workspace server-side. Mutations reject cross-origin requests and enforce input constraints. The private Site boundary provides authenticated access; the local server binds loopback, strips incoming identity headers, and injects a clearly identified development owner. Do not expose the local server publicly.

Routes: GET state/export/audit; POST simulate/imports/imports/{id}/confirm/imports/{id}/reverse/prices/goals/sips/preferences/reports/delete/refresh-nav. These implement equivalent typed service capabilities to the specification, not its exact route spellings. Analytics include dates, sources, version and data-quality status where relevant. Price and account references must remain non-secret display identifiers.

`scripts/build.mjs` embeds web assets and domain/service modules into `worker/index.js`, copies it to `dist/server/index.js`, and includes migrations under `dist/.openai/drizzle`. The artifact is validated as ESM. Native Sites authentication paths are owned by the hosting platform; the app does not implement them.

## Background processing

The Worker exports `scheduled()` and a POST `/internal/jobs` endpoint protected by a server-only `JOB_SECRET`. Neither creates a scheduler. The local runner executes `runJobs` every minute while its process remains alive. A latest-period calculation catches up one missed schedule without generating historical floods. Frozen report IDs prevent duplicate report snapshots. Email is not connected and no notification is sent. The UI must say Not configured until actual hosted scheduling has been provisioned and verified.

## Security and operational boundary

The application returns private/no-store responses, uses a restrictive CSP, escapes imported labels, has no HTML injection surface for CSV content, and stores no provider passwords or AI keys. PWA service worker installs without caching financial pages or APIs. Platform transport and managed storage security apply; application-level field encryption and a second-factor configuration flow are not implemented. No claims are made about tested hosted backup RPO/RTO, full regulatory readiness, institutional concurrency guarantees or completion of Phases 1–3.
