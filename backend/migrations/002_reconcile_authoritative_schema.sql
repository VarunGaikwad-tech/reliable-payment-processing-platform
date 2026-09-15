-- Reconciles the initial migration with the authoritative pg_dump snapshot.
-- Constraint replacement intentionally validates existing data; it will fail rather
-- than silently accepting rows that violate a financial invariant.

ALTER TABLE users
  ALTER COLUMN name TYPE VARCHAR(100) USING name::VARCHAR(100),
  ALTER COLUMN email TYPE VARCHAR(255) USING email::VARCHAR(255),
  ALTER COLUMN role TYPE VARCHAR(20) USING role::VARCHAR(20),
  ALTER COLUMN role SET DEFAULT 'USER';
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_role;
ALTER TABLE users
  ADD CONSTRAINT check_user_role CHECK (role IN ('USER', 'ADMIN', 'SYSTEM'));

ALTER TABLE accounts
  ALTER COLUMN account_number TYPE VARCHAR(20) USING account_number::VARCHAR(20),
  ALTER COLUMN currency TYPE CHAR(3) USING currency::CHAR(3),
  ALTER COLUMN currency SET DEFAULT 'INR',
  ALTER COLUMN status TYPE VARCHAR(20) USING status::VARCHAR(20),
  ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_currency_check;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_account_currency;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_status_check;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_account_status;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_balance_non_negative_check;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_account_balance;
ALTER TABLE accounts
  ADD CONSTRAINT check_account_currency CHECK (currency = 'INR'),
  ADD CONSTRAINT check_account_status CHECK (status IN ('ACTIVE', 'BLOCKED', 'CLOSED')),
  ADD CONSTRAINT check_account_balance CHECK (balance >= 0);
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS fk_accounts_user;
ALTER TABLE accounts
  ADD CONSTRAINT fk_accounts_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE transactions
  ALTER COLUMN currency TYPE CHAR(3) USING currency::CHAR(3),
  ALTER COLUMN currency SET DEFAULT 'INR',
  ALTER COLUMN type TYPE VARCHAR(20) USING type::VARCHAR(20),
  ALTER COLUMN status TYPE VARCHAR(20) USING status::VARCHAR(20),
  ALTER COLUMN status SET DEFAULT 'INITIATED';
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_currency_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_currency;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_type;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_status;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_amount_positive_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_amount;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_different_accounts_check;
ALTER TABLE transactions
  ADD CONSTRAINT check_transaction_currency CHECK (currency = 'INR'),
  ADD CONSTRAINT check_transaction_type CHECK (type IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL')),
  ADD CONSTRAINT check_transaction_status CHECK (status IN ('INITIATED', 'PROCESSING', 'SUCCESS', 'FAILED')),
  ADD CONSTRAINT check_transaction_amount CHECK (amount > 0),
  ADD CONSTRAINT transactions_different_accounts_check CHECK (sender_account_id <> receiver_account_id);
ALTER TABLE transactions
  ALTER COLUMN sender_account_id SET NOT NULL,
  ALTER COLUMN receiver_account_id SET NOT NULL;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_sender_account_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_sender;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_receiver_account_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_receiver;
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_sender
  FOREIGN KEY (sender_account_id) REFERENCES accounts(id),
  ADD CONSTRAINT fk_transactions_receiver
  FOREIGN KEY (receiver_account_id) REFERENCES accounts(id);

ALTER TABLE ledger_entries
  ALTER COLUMN entry_type TYPE VARCHAR(10) USING entry_type::VARCHAR(10);
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_amount_positive_check;
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS check_ledger_amount;
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_entry_type_check;
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS check_ledger_entry_type;
ALTER TABLE ledger_entries
  ADD CONSTRAINT check_ledger_amount CHECK (amount > 0),
  ADD CONSTRAINT check_ledger_entry_type CHECK (entry_type IN ('DEBIT', 'CREDIT'));
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_transaction_id_fkey;
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS fk_ledger_transaction;
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_account_id_fkey;
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS fk_ledger_account;
ALTER TABLE ledger_entries
  ADD CONSTRAINT fk_ledger_transaction
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ledger_account
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;

ALTER TABLE idempotency_keys
  ALTER COLUMN key TYPE VARCHAR(255) USING key::VARCHAR(255);
ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS idempotency_keys_user_id_fkey;
ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS fk_idempotency_user;
ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS idempotency_keys_transaction_id_fkey;
ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS fk_idempotency_transaction;
ALTER TABLE idempotency_keys
  ADD CONSTRAINT fk_idempotency_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_idempotency_transaction
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;

ALTER TABLE outbox_events
  ALTER COLUMN event_type TYPE VARCHAR(100) USING event_type::VARCHAR(100),
  ALTER COLUMN aggregate_type TYPE VARCHAR(100) USING aggregate_type::VARCHAR(100),
  ALTER COLUMN status TYPE VARCHAR(20) USING status::VARCHAR(20),
  ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS outbox_events_status_check;
ALTER TABLE outbox_events DROP CONSTRAINT IF EXISTS outbox_status_check;
ALTER TABLE outbox_events
  ADD CONSTRAINT outbox_status_check CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'));

ALTER TABLE notifications
  ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR(50);
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_event_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_event_user_key;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_event_id_user_id_key;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_event_id_user_id_key UNIQUE (event_id, user_id);
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_transaction_id_fkey;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT notifications_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;

-- These indexes are present in the authoritative dump. Some overlap newer
-- composite indexes, but are retained to avoid changing established behavior.
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON idempotency_keys (expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_user ON idempotency_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries (account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction ON ledger_entries (transaction_id);
CREATE INDEX IF NOT EXISTS idx_notifications_transaction ON notifications (transaction_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_events (aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox_events (created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events (status, available_at);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions (receiver_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions (sender_account_id);
