const findByKey = async (client, key) => {
  const result = await client.query(
    `
    SELECT
      key,
      user_id,
      transaction_id,
      request_hash,
      created_at,
      expires_at
    FROM idempotency_keys
    WHERE key = $1
    `,
    [key]
  );

  return result.rows[0];
};

const create = async (
  client,
  key,
  userId,
  requestHash,
  expiresAt
) => {
  const result = await client.query(
    `
    INSERT INTO idempotency_keys (
      key,
      user_id,
      request_hash,
      expires_at
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (key) DO NOTHING
    RETURNING
      key,
      user_id,
      transaction_id,
      request_hash,
      created_at,
      expires_at
    `,
    [
      key,
      userId,
      requestHash,
      expiresAt,
    ]
  );

  return result.rows[0];
};

const attachTransaction = async (
  client,
  key,
  transactionId
) => {
  const result = await client.query(
    `
    UPDATE idempotency_keys
    SET transaction_id = $1
    WHERE key = $2
    RETURNING
      key,
      transaction_id
    `,
    [transactionId, key]
  );

  if (result.rowCount !== 1) {
    throw new Error(
      "Failed to attach transaction to idempotency key"
    );
  }

  return result.rows[0];
};

module.exports = {
  findByKey,
  create,
  attachTransaction,
};