CREATE TABLE records (owner TEXT NOT NULL, space TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(owner,space,kind,id));
--> statement-breakpoint
CREATE INDEX records_owner_kind ON records(owner,space,kind,created_at);
--> statement-breakpoint
CREATE TABLE audit_events (id TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, space TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT NOT NULL, occurred_at TEXT NOT NULL, reason TEXT);
--> statement-breakpoint
CREATE INDEX audit_owner ON audit_events(owner,occurred_at);
--> statement-breakpoint
CREATE TABLE job_runs (owner TEXT NOT NULL, period TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY(owner,period,revision));
