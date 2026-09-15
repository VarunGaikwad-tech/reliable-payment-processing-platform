const createEvent = async (
  client,
  eventType,
  aggregateType,
  aggregateId,
  payload
) => {
  const result = await client.query(
    `
    INSERT INTO outbox_events (
      event_type,
      aggregate_type,
      aggregate_id,
      payload
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      event_type,
      aggregate_type,
      aggregate_id,
      payload,
      status,
      attempts,
      available_at,
      locked_at,
      last_error,
      published_at,
      created_at
    `,
    [
      eventType,
      aggregateType,
      aggregateId,
      JSON.stringify(payload),
    ]
  );

  return result.rows[0];
};

const claimPendingEvents = async (
  client,
  limit = 100,
  eventId = null
) => {
  const result = await client.query(
    `
    WITH events AS (
      SELECT id
      FROM outbox_events
      WHERE status = 'PENDING'
        AND available_at <= NOW()
        AND ($2::uuid IS NULL OR id = $2)
      ORDER BY created_at
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE outbox_events AS oe
    SET
      status = 'PROCESSING',
      attempts = attempts + 1,
      locked_at = NOW(),
      updated_at = NOW()
    FROM events
    WHERE oe.id = events.id
    RETURNING
      oe.id,
      oe.event_type,
      oe.aggregate_type,
      oe.aggregate_id,
      oe.payload,
      oe.status,
      oe.attempts,
      oe.available_at,
      oe.locked_at,
      oe.last_error,
      oe.published_at,
      oe.created_at
    `,
    [limit, eventId]
  );

  return result.rows;
};

const markPublished = async (
  client,
  eventId
) => {
  const result = await client.query(
    `
    UPDATE outbox_events
    SET
      status = 'PUBLISHED',
      published_at = NOW(),
      locked_at = NULL,
      last_error = NULL,
      updated_at = NOW()
    WHERE id = $1
      AND status = 'PROCESSING'
    RETURNING
      id,
      status,
      published_at
    `,
    [eventId]
  );

  return result.rows[0];
};

const markFailed = async (
  client,
  eventId,
  nextAvailableAt,
  errorMessage,
  maxAttempts = 5
) => {
  const result = await client.query(
    `
    UPDATE outbox_events
    SET
      status =
        CASE
          WHEN attempts >= $4 THEN 'FAILED'
          ELSE 'PENDING'
        END,
      available_at =
        CASE
          WHEN attempts >= $4 THEN available_at
          ELSE $2
        END,
      locked_at = NULL,
      last_error = $3,
      updated_at = NOW()
    WHERE id = $1
      AND status = 'PROCESSING'
    RETURNING
      id,
      status,
      attempts,
      available_at,
      last_error
    `,
    [
      eventId,
      nextAvailableAt,
      errorMessage,
      maxAttempts,
    ]
  );

  return result.rows[0];
};

const recoverStuckEvents = async (
  client,
  staleAfterSeconds = 60
) => {
  const result = await client.query(
    `
    UPDATE outbox_events
    SET
      status = 'PENDING',
      locked_at = NULL,
      available_at = NOW(),
      updated_at = NOW()
    WHERE status = 'PROCESSING'
      AND locked_at < NOW() - ($1 * INTERVAL '1 second')
    RETURNING id
    `,
    [staleAfterSeconds]
  );

  return result.rows;
};

module.exports = {
  createEvent,
  claimPendingEvents,
  markPublished,
  markFailed,
  recoverStuckEvents,
};