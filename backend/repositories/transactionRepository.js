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
        t.id,
        t.sender_account_id,
        t.receiver_account_id,
        t.amount,
        t.currency,
        t.type,
        t.status,
        t.failure_reason,
        t.created_at,
        t.completed_at,

        sender_user.name AS sender_name,
        sender_account.account_number AS sender_account_number,

        receiver_user.name AS receiver_name,
        receiver_account.account_number AS receiver_account_number

      FROM transactions t

      JOIN accounts sender_account
        ON sender_account.id = t.sender_account_id

      JOIN users sender_user
        ON sender_user.id = sender_account.user_id

      JOIN accounts receiver_account
        ON receiver_account.id = t.receiver_account_id

      JOIN users receiver_user
        ON receiver_user.id = receiver_account.user_id

      WHERE t.sender_account_id = $1
        OR t.receiver_account_id = $1

      ORDER BY t.created_at DESC, t.id DESC

      LIMIT $2
      OFFSET $3
      `,
      [accountId, limit, offset]
    );

    return result.rows;
  };
// const findByAccount = async (
//   client,
//   accountId,
//   limit,
//   offset
// ) => {
//   const result = await client.query(
//     `
//     SELECT
//       id,
//       sender_account_id,
//       receiver_account_id,
//       amount,
//       currency,
//       type,
//       status,
//       failure_reason,
//       created_at,
//       completed_at
//     FROM transactions
//     WHERE sender_account_id = $1
//        OR receiver_account_id = $1
//     ORDER BY created_at DESC
//     LIMIT $2
//     OFFSET $3
//     `,
//     [
//       accountId,
//       limit,
//       offset,
//     ]
//   );

//   return result.rows;
// };

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

const findByIdForUser = async (
  client,
  transactionId,
  userId
) => {
  const result = await client.query(
    `
    SELECT
      t.id,
      t.sender_account_id,
      t.receiver_account_id,
      t.amount,
      t.currency,
      t.type,
      t.status,
      t.failure_reason,
      t.created_at,
      t.completed_at,

      sender_user.name AS sender_name,
      sender_account.account_number AS sender_account_number,

      receiver_user.name AS receiver_name,
      receiver_account.account_number AS receiver_account_number

    FROM transactions t

    JOIN accounts sender_account
      ON sender_account.id = t.sender_account_id

    JOIN users sender_user
      ON sender_user.id = sender_account.user_id

    JOIN accounts receiver_account
      ON receiver_account.id = t.receiver_account_id

    JOIN users receiver_user
      ON receiver_user.id = receiver_account.user_id

    WHERE t.id = $1
      AND (
        sender_account.user_id = $2
        OR receiver_account.user_id = $2
      )
    `,
    [transactionId, userId]
  );

  return result.rows[0];
};

module.exports = {
  createTransaction,
  markSuccess,
  markFailed,
  findById,
  findByAccount,
  countByAccount,
  findByIdForUser,
};