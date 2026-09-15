const crypto = require("crypto");

const pool = require("../../config/db");
const outboxRepository = require("../../repositories/outboxRepository");

const createTestEvent = async () => {
  const client = await pool.connect();

  try {
    return await outboxRepository.createEvent(
      client,
      "TEST_EVENT",
      "TEST",
      crypto.randomUUID(),
      {
        test: true,
      }
    );
  } finally {
    client.release();
  }
};

const deleteTestEvent = async (eventId) => {
  const client = await pool.connect();

  try {
    await client.query(
      `
      DELETE FROM outbox_events
      WHERE id = $1
      `,
      [eventId]
    );
  } finally {
    client.release();
  }
};

describe("Outbox Repository Integration", () => {
  afterAll(async () => {
    await pool.end();
  });

  test("claims a pending event and moves it to PROCESSING", async () => {
    const event = await createTestEvent();

    const client = await pool.connect();

    try {
      const events =
        await outboxRepository.claimPendingEvents(
          client,
          1,
          event.id
        );

      const claimedEvent = events.find(
        (item) => item.id === event.id
      );

      expect(claimedEvent).toBeDefined();
      expect(claimedEvent.status).toBe("PROCESSING");
      expect(claimedEvent.attempts).toBe(1);
      expect(claimedEvent.locked_at).not.toBeNull();
    } finally {
      client.release();
      await deleteTestEvent(event.id);
    }
  });

  test("marks a processing event as PUBLISHED", async () => {
    const event = await createTestEvent();

    const claimClient = await pool.connect();

    try {
      await outboxRepository.claimPendingEvents(
        claimClient,
        1,
        event.id
      );
    } finally {
      claimClient.release();
    }

    const client = await pool.connect();

    try {
      const result =
        await outboxRepository.markPublished(
          client,
          event.id
        );

      expect(result.status).toBe("PUBLISHED");
      expect(result.published_at).not.toBeNull();
    } finally {
      client.release();
      await deleteTestEvent(event.id);
    }
  });

  test("moves a failed processing event back to PENDING", async () => {
    const event = await createTestEvent();

    const claimClient = await pool.connect();

    try {
      await outboxRepository.claimPendingEvents(
        claimClient,
        1,
        event.id
      );
    } finally {
      claimClient.release();
    }

    const nextAvailableAt = new Date(
      Date.now() + 5000
    );

    const client = await pool.connect();

    try {
      const result =
        await outboxRepository.markFailed(
          client,
          event.id,
          nextAvailableAt,
          "Kafka unavailable",
          5
        );

      expect(result.status).toBe("PENDING");
      expect(result.attempts).toBe(1);
      expect(result.last_error).toBe("Kafka unavailable");
    } finally {
      client.release();
      await deleteTestEvent(event.id);
    }
  });

  test("moves event to FAILED after maximum attempts", async () => {
    const event = await createTestEvent();

    const claimClient = await pool.connect();

    try {
      await claimClient.query(
        `
        UPDATE outbox_events
        SET status = 'PROCESSING',
            attempts = 5,
            locked_at = NOW()
        WHERE id = $1
        `,
        [event.id]
      );
    } finally {
      claimClient.release();
    }

    const client = await pool.connect();

    try {
      const result =
        await outboxRepository.markFailed(
          client,
          event.id,
          new Date(Date.now() + 5000),
          "Kafka still unavailable",
          5
        );

      expect(result.status).toBe("FAILED");
      expect(result.attempts).toBe(5);
    } finally {
      client.release();
      await deleteTestEvent(event.id);
    }
  });
});