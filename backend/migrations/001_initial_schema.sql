CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  account_number TEXT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_account_number_key UNIQUE (account_number),
  CONSTRAINT accounts_balance_non_negative_check CHECK (balance >= 0),
  CONSTRAINT accounts_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT accounts_status_check CHECK (status IN ('ACTIVE', 'INACTIVE', 'CLOSED'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_account_id UUID NOT NULL REFERENCES accounts(id),
  receiver_account_id UUID NOT NULL REFERENCES accounts(id),
  amount BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  type TEXT NOT NULL DEFAULT 'TRANSFER',
  status TEXT NOT NULL DEFAULT 'PROCESSING',
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT transactions_amount_positive_check CHECK (amount > 0),
  CONSTRAINT transactions_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT transactions_different_accounts_check CHECK (sender_account_id <> receiver_account_id),
  CONSTRAINT transactions_type_check CHECK (type = 'TRANSFER'),
  CONSTRAINT transactions_status_check CHECK (status IN ('PROCESSING', 'SUCCESS', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  entry_type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ledger_entries_amount_positive_check CHECK (amount > 0),
  CONSTRAINT ledger_entries_entry_type_check CHECK (entry_type IN ('DEBIT', 'CREDIT'))
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_id UUID REFERENCES transactions(id),
  request_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT outbox_events_attempts_non_negative_check CHECK (attempts >= 0),
  CONSTRAINT outbox_events_status_check CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES outbox_events(id),
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_event_user_key UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS accounts_user_id_created_at_idx
  ON accounts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_sender_account_created_at_idx
  ON transactions (sender_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_receiver_account_created_at_idx
  ON transactions (receiver_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ledger_entries_transaction_id_idx
  ON ledger_entries (transaction_id);
CREATE INDEX IF NOT EXISTS ledger_entries_account_id_created_at_idx
  ON ledger_entries (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idempotency_keys_expires_at_idx
  ON idempotency_keys (expires_at);
CREATE INDEX IF NOT EXISTS outbox_events_pending_available_at_idx
  ON outbox_events (available_at, created_at)
  WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_transaction_id_idx
  ON notifications (transaction_id);
