const pool = require("../config/db");

const createAccount = async (
  userId,
  accountNumber,
  currency
) => {
  const result = await pool.query(
    `
    INSERT INTO accounts (
      user_id,
      account_number,
      currency,
      balance,
      status
    )
    VALUES ($1, $2, $3, 0, 'ACTIVE')
    RETURNING
      id,
      user_id,
      account_number,
      currency,
      balance,
      status,
      created_at
    `,
    [userId, accountNumber, currency]
  );

  return result.rows[0];
};

const findByAccountNumber = async (accountNumber) => {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id,
      account_number,
      currency,
      balance,
      status,
      created_at,
      updated_at
    FROM accounts
    WHERE account_number = $1
    `,
    [accountNumber]
  );

  return result.rows[0];
};

const findById = async (accountId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id,
      account_number,
      currency,
      balance,
      status,
      created_at,
      updated_at
    FROM accounts
    WHERE id = $1
    `,
    [accountId]
  );

  return result.rows[0];
};

const findByUserId = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id,
      account_number,
      currency,
      balance,
      status,
      created_at,
      updated_at
    FROM accounts
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

const findByIdAndUserId = async (accountId, userId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id,
      account_number,
      currency,
      balance,
      status,
      created_at,
      updated_at
    FROM accounts
    WHERE id = $1
      AND user_id = $2
    `,
    [accountId, userId]
  );

  return result.rows[0];
};

const findByIdForUpdate = async (client, accountId) => {
  const result = await client.query(
    `
    SELECT
      id,
      user_id,
      account_number,
      currency,
      balance,
      status
    FROM accounts
    WHERE id = $1
    FOR UPDATE
    `,
    [accountId]
  );

  return result.rows[0];
};

const updateBalance = async (client, accountId, newBalance) => {
  const result = await client.query(
    `
    UPDATE accounts
    SET balance = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING
      id,
      user_id,
      account_number,
      currency,
      balance,
      status,
      updated_at
    `,
    [newBalance, accountId]
  );

  return result.rows[0];
};

const debitAccount = async (client, accountId, amount) => {
  const result = await client.query(
    `
    UPDATE accounts
    SET balance = balance - $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING
      id,
      user_id,
      account_number,
      currency,
      balance,
      status,
      updated_at
    `,
    [amount, accountId]
  );

  return result.rows[0];
};

const creditAccount = async (client, accountId, amount) => {
  const result = await client.query(
    `
    UPDATE accounts
    SET balance = balance + $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING
      id,
      user_id,
      account_number,
      currency,
      balance,
      status,
      updated_at
    `,
    [amount, accountId]
  );

  return result.rows[0];
};

module.exports = {
  createAccount,
  findByAccountNumber,
  findById,
  findByUserId,
  findByIdAndUserId,
  findByIdForUpdate,
  updateBalance,
  debitAccount,
  creditAccount
};