# Artha — Indian portfolio & SIP planning

A working personal tracker and deterministic planning foundation, built from the supplied product specification. Responsive web interface, actual server persistence, import reconciliation and real calculations. The full three-phase product is **not complete**; see the delivery status and acceptance evidence below.

## Run locally

Requires Node.js 24 or newer with `node:sqlite`. There are no npm dependencies.

```powershell
node scripts/build.mjs
node --test tests/*.test.mjs
node scripts/dev.mjs
```

Open `http://127.0.0.1:4173`. Local preview uses one development owner and stores records in ignored `.local/artha.sqlite`. It binds only loopback and is not production authentication. The exact built Worker serves both frontend and API. Rebuild and restart the local server after source changes. Set `PORT` to use a different port.

The app opens a clearly labeled demo workspace. Use **Start my portfolio** for an empty personal workspace. Imports, goals, prices and reports persist server-side, separated by owner and workspace. Only the selected workspace is exported or deleted. Templates under `templates/` are synthetic.

## What works

- Dashboard, holdings by account or consolidated view, search/type filters, allocation, dated valuations and data-quality notes.
- Manual entry and generic CSV field mapping → preview → duplicate/identical-row review → atomic confirmation; FIFO lots, partial redemptions, whole-batch reversals, unknown opening bases, splits and distributions.
- Fixed-point financial accounting, dated personal XIRR with ambiguity/short-history handling, separate unavailable TWR, known realized and unrealized gains.
- Editable goal and SIP scenarios, today-cost versus future targets, effective monthly return, beginning/end payments, annual step-ups, required starting SIP and funding gaps. Monthly/quarterly manual SIP schedules and missing imported-evidence labels.
- Private frozen in-app report snapshots with dates, boundary cash flows, profit availability, stale-data flags, source references, at most three data-review tasks, idempotent retry.
- Financial-context inputs, report preference saving, private JSON export, workspace record deletion and audit activity.
- Production identity from Sites and owner-scoped D1 operations. Local SQLite development adapter. PWA metadata and non-caching service worker.
- Separately testable scoring, overlap, allocation-limit and AI-evidence gates. A disabled-until-approved AMFI latest-NAV adapter. Missing research/tax/provider coverage is visibly unavailable.

## Delivery status and remaining scope

This release is a **Phase 1 foundation**, not a completed Phase 1 gate or a completed Phases 1–3 product. Automated core tests and mobile browser exercises have passed locally. The remaining work includes deployed scheduler verification, market-session calendars, fully dated statement reconciliation, preserving transfer acquisition provenance, assignment UI and live holding-linked goal progress, advanced cash events and corrections, normalized entity storage, performance targets at 100 holdings/10,000 events, backups and a restore drill.

Phase 2 has deterministic primitives and honest insufficient-data screens. Actual research data adapters, reproducible total-return metric pipelines, eligible peer cohorts, dated metadata, overlap disclosures, suitability allocations, candidate selection and numerical retain/redirect/sale comparisons are not complete. The app does not publish fabricated scores or precise tax benefits.

Phase 3 has a report worker and provider setup states. Representative statement parsers, a verified account integration, licensed stock/corporate-action adapters, email delivery, alert cooldowns and an optional AI integration remain. Credentials alone do not implement these integrations. Each needs documented formats, permissions, data coverage and further engineering.

## Hosted deployment

The tracked `.openai/hosting.json` preserves the private Sites project identity and declares the D1 binding `DB`. Use the Sites source synchronization/package/deploy workflow; migrations are included in the artifact and applied before the Worker is published. Do not recreate the Site or alter its audience for deployment. Never put runtime secrets in the manifest or browser bundle.

Hosted sign-in is handled by Sites. Every data API checks the trusted identity header and binds it on database queries. Production has no local-owner fallback. The owner-private audience is preserved.

Provider setup: see [docs/PROVIDERS.md](docs/PROVIDERS.md). Runtime examples in `.env.example` contain no secrets. Do not enable NAV requests before verifying permitted use. No tax rates, return forecasts or preferred real funds are hardcoded.

## Reports and scheduling

Default preference is Saturday 09:00 Asia/Kolkata (03:30 UTC). This is an application preference, not a chat reminder. Manual generation works immediately. For local unattended processing:

```powershell
node scripts/report-worker.mjs
# For a single verification cycle:
node scripts/report-worker.mjs --once
```

Keep the process running. For hosting, provision a supported Worker schedule or a managed scheduler calling the protected POST `/internal/jobs` with a Sites server secret `JOB_SECRET`. A bare scheduled export does not provision a cron trigger. Verify a report and persisted job result before setting `SCHEDULER_ENABLED=true`; the current delivery leaves it false. Report preferences alter eligibility, not infrastructure configuration. The worker catches up the latest period, avoids duplicate snapshot IDs and backs off failed jobs. No email is sent.

## Backup, restore and deletion

Local: stop the dev server and report worker, copy `.local/artha.sqlite` together with any `-wal` and `-shm` files to private encrypted storage, and restart. Prefer a SQLite online backup tool for consistent backups while running. Restore only to a stopped disposable local copy first and compare event counts, balances and report IDs before promoting it. No restore drill or 24-hour RPO is claimed in this delivery.

Hosted: arrange managed D1 backups/time travel under the hosting account's supported controls and retention. Test restoration into a separate private environment. A JSON workspace export provides a private portable record copy; an automatic JSON restore importer is not implemented. Generic transactions can be reimported through CSV after review. Full platform database export/restore is an operator procedure, not an app feature.

Deletion erases the selected workspace's current records, reports and activity. It removes the owner's queued report job records and leaves no personal record source for future generation if all personal records are gone. It does not revoke the external ChatGPT identity or promise immediate removal from provider backups. Infrastructure backup retention must be configured by the operator and documented before a full deletion guarantee. Demo deletion restores base fixtures. Logout clears the platform session; financial pages are never cached by the service worker.

## Documentation

[Import format](docs/IMPORTS.md) · [Architecture/schema](docs/ARCHITECTURE.md) · [Provider matrix](docs/PROVIDERS.md) · [Acceptance evidence](docs/ACCEPTANCE.md). Methodology is also available inside the app. No account credentials, actual statements, or personal portfolio data are committed.
