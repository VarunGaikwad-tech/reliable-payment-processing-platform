# Payment System backend

## PostgreSQL setup

Install PostgreSQL 13 or later and create the development database (replace the database name if `DB_NAME` is set differently):

```powershell
createdb -U postgres payment_system
```

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `backend/.env` as needed. The migration creates the required `pgcrypto` extension, so the configured database user needs permission to create that extension.

From `backend`, run:

```powershell
npm run migrate
```

Migrations are plain SQL files in `migrations/`, ordered by filename. The runner records each filename and SHA-256 checksum in `schema_migrations`, serializes concurrent runs with a PostgreSQL advisory lock, and runs each unapplied migration in its own transaction. It is therefore safe to rerun. Never edit an applied migration; add a new, later-numbered SQL file instead.

The migration history, including the reconciliation migration derived from `current_schema.sql`, creates the application tables, constraints, and indexes required by the current repositories and integration tests. All amounts and balances are `BIGINT` paise; `accounts.balance` has a database check preventing a negative value. Keep `current_schema.sql` as the historical authoritative snapshot; run migrations rather than applying the dump directly.
