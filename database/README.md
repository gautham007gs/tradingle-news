# `database/` — Schema tooling (DDL only — never dumps)

| File | Purpose |
|---|---|
| `migrate.php` | Canonical schema definitions; mirrors the idempotent DDL in `api/helpers.php::ensure_cms_schema_upgrades()` |
| `add-foreign-keys.php` | Deferred FK installer for legacy tables |

## Rules
- `*.sql` dumps are **gitignored forever** (they contain user data).
- Schema changes ship as idempotent code in `api/helpers.php` (`ensure_cms_schema_upgrades()`
  + `ensure_column()`), mirrored here — the DB self-migrates on first request after deploy.
