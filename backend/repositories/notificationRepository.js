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

module.exports = {
  createNotification,
};