const createNotification = async (
  client,
  eventId,
  userId,
  transactionId,
  type,
  message
) => {
  const result = await client.query(
    `
    INSERT INTO notifications (
      event_id,
      user_id,
      transaction_id,
      type,
      message
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (event_id, user_id) DO NOTHING
    RETURNING
      id,
      event_id,
      user_id,
      transaction_id,
      type,
      message,
      created_at
    `,
    [
      eventId,
      userId,
      transactionId,
      type,
      message,
    ]
  );

  return result.rows[0];
};

const findByUser = async (
  client,
  userId,
  limit,
  offset
) => {
  const result = await client.query(
    `
    SELECT
      n.id,
      n.transaction_id,
      n.type,
      n.message,
      n.created_at,

      t.amount,
      t.currency,
      t.status,

      CASE
        WHEN n.type = 'TRANSFER_SENT'
          THEN receiver_user.name
        ELSE sender_user.name
      END AS counterparty_name,

      CASE
        WHEN n.type = 'TRANSFER_SENT'
          THEN receiver_account.account_number
        ELSE sender_account.account_number
      END AS counterparty_account_number

    FROM notifications n

    JOIN transactions t
      ON t.id = n.transaction_id

    JOIN accounts sender_account
      ON sender_account.id = t.sender_account_id

    JOIN users sender_user
      ON sender_user.id = sender_account.user_id

    JOIN accounts receiver_account
      ON receiver_account.id = t.receiver_account_id

    JOIN users receiver_user
      ON receiver_user.id = receiver_account.user_id

    WHERE n.user_id = $1

    ORDER BY n.created_at DESC, n.id DESC

    LIMIT $2
    OFFSET $3
    `,
    [userId, limit, offset]
  );

  return result.rows;
};

const countByUser = async (
  client,
  userId
) => {
  const result = await client.query(
    `
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE user_id = $1
    `,
    [userId]
  );

  return Number(result.rows[0].count);
};

module.exports = {
  createNotification,
  findByUser,
  countByUser,
};