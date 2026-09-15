const createTransaction = async (
  client,
  senderAccountId,
  receiverAccountId,
  amount,
  currency
) => {
  const result = await client.query(
    `
    INSERT INTO transactions (
      sender_account_id,
      receiver_account_id,
      amount,
      currency,
      type,
      status
    )
    VALUES ($1, $2, $3, $4, 'TRANSFER', 'PROCESSING')
    RETURNING
      id,
      sender_account_id,
      receiver_account_id,
      amount,
      currency,
      type,
      status,
      created_at
    `,
    [
      senderAccountId,
      receiverAccountId,
      amount,
      currency,
    ]
  );

  return result.rows[0];
};

const markSuccess = async (client, transactionId) => {
  const result = await client.query(
    `
    UPDATE transactions
    SET status = 'SUCCESS',
        completed_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      sender_account_id,
      receiver_account_id,
      amount,
      currency,
      type,
      status,
      created_at,
      completed_at
    `,
    [transactionId]
  );

  return result.rows[0];
};

const markFailed = async (client, transactionId) => {
  const result = await client.query(
    `
    UPDATE transactions
    SET status = 'FAILED'
    WHERE id = $1
    RETURNING
      id,
      status
    `,
    [transactionId]
  );

  return result.rows[0];
};

const findById = async (client, transactionId) => {
  const result = await client.query(
    `
    SELECT
      id,
      sender_account_id,
      receiver_account_id,
      amount,
      currency,
      type,
      status,
      failure_reason,
      created_at,
      completed_at
    FROM transactions
    WHERE id = $1
    `,
    [transactionId]
  );

  return result.rows[0];
};

const findByAccount = async (
  client,
  accountId,
  limit,
  offset
) => {
  const result = await client.query(
    `
    SELECT
      id,
      sender_account_id,
      receiver_account_id,
      amount,
      currency,
      type,
      status,
      failure_reason,
      created_at,
      completed_at
    FROM transactions
    WHERE sender_account_id = $1
       OR receiver_account_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    OFFSET $3
    `,
    [
      accountId,
      limit,
      offset,
    ]
  );

  return result.rows;
};

const countByAccount = async (
  client,
  accountId
) => {
  const result = await client.query(
    `
    SELECT COUNT(*) AS count
    FROM transactions
    WHERE sender_account_id = $1
       OR receiver_account_id = $1
    `,
    [accountId]
  );

  return Number(result.rows[0].count);
};

module.exports = {
  createTransaction,
  markSuccess,
  markFailed,
  findById,
  findByAccount,
  countByAccount,
};