const crypto = require("crypto");

const pool = require("../../config/db");
const { transfer } = require("../../services/transactionService");

jest.mock("../../repositories/outboxRepository", () => {
  return {
    createEvent: jest.fn(async () => {
      throw new Error("Simulated outbox failure");
    }),
    findPendingEvents: jest.fn(),
    markPublished: jest.fn(),
    markFailed: jest.fn(),
  };
});

const outboxRepository = require("../../repositories/outboxRepository");

describe("Outbox atomicity", () => {
  let userId;
  let senderAccountId;
  let receiverAccountId;

  const startingBalance = 100000;
  const transferAmount = 10000;
  const idempotencyKey = `outbox-failure-${crypto.randomUUID()}`;

  beforeAll(async () => {
    userId = crypto.randomUUID();
    senderAccountId = crypto.randomUUID();
    receiverAccountId = crypto.randomUUID();

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
        INSERT INTO users (
          id,
          name,
          email,
          password_hash,
          role
        )
        VALUES ($1, $2, $3, $4, 'USER')
        `,
        [
          userId,
          "Outbox Test User",
          `outbox-${userId}@test.com`,
          "test-password",
        ]
      );

      await client.query(
        `
        INSERT INTO accounts (
          id,
          user_id,
          account_number,
          currency,
          balance,
          status
        )
        VALUES ($1, $2, $3, 'INR', $4, 'ACTIVE')
        `,
        [
          senderAccountId,
          userId,
          `OUTBOX${Date.now()}1`,
          startingBalance,
        ]
      );

      await client.query(
        `
        INSERT INTO accounts (
          id,
          user_id,
          account_number,
          currency,
          balance,
          status
        )
        VALUES ($1, $2, $3, 'INR', 0, 'ACTIVE')
        `,
        [
          receiverAccountId,
          userId,
          `OUTBOX${Date.now()}2`,
        ]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
        DELETE FROM ledger_entries
        WHERE transaction_id IN (
          SELECT id
          FROM transactions
          WHERE sender_account_id = $1
             OR receiver_account_id = $1
        )
        `,
        [senderAccountId]
      );

      await client.query(
        `
        DELETE FROM outbox_events
        WHERE aggregate_id IN (
          SELECT id
          FROM transactions
          WHERE sender_account_id = $1
             OR receiver_account_id = $1
        )
        `,
        [senderAccountId]
      );

      await client.query(
        `
        DELETE FROM idempotency_keys
        WHERE user_id = $1
        `,
        [userId]
      );
      
      await client.query(
        `
        DELETE FROM outbox_events
        WHERE aggregate_id IN (
          SELECT id
          FROM transactions
          WHERE sender_account_id = $1
            OR receiver_account_id = $1
        )
        `,
        [senderAccountId]
      );

      await client.query(
        `
        DELETE FROM transactions
        WHERE sender_account_id = $1
           OR receiver_account_id = $1
        `,
        [senderAccountId]
      );

      await client.query(
        `
        DELETE FROM accounts
        WHERE id IN ($1, $2)
        `,
        [senderAccountId, receiverAccountId]
      );

      await client.query(
        `
        DELETE FROM users
        WHERE id = $1
        `,
        [userId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await pool.end();
  });

  test("rolls back money movement when outbox creation fails", async () => {
    await expect(
      transfer(
        userId,
        senderAccountId,
        receiverAccountId,
        transferAmount,
        idempotencyKey
      )
    ).rejects.toThrow("Simulated outbox failure");

    const client = await pool.connect();

    try {
      const accountsResult = await client.query(
        `
        SELECT id, balance
        FROM accounts
        WHERE id IN ($1, $2)
        `,
        [senderAccountId, receiverAccountId]
      );

      const sender = accountsResult.rows.find(
        (row) => row.id === senderAccountId
      );

      const receiver = accountsResult.rows.find(
        (row) => row.id === receiverAccountId
      );

      expect(sender.balance).toBe(String(startingBalance));
      expect(receiver.balance).toBe("0");

      const transactionResult = await client.query(
        `
        SELECT id
        FROM transactions
        WHERE sender_account_id = $1
           OR receiver_account_id = $1
        `,
        [senderAccountId]
      );

      expect(transactionResult.rowCount).toBe(0);

      const idempotencyResult = await client.query(
        `
        SELECT key
        FROM idempotency_keys
        WHERE key = $1
        `,
        [idempotencyKey]
      );

      expect(idempotencyResult.rowCount).toBe(0);

      const outboxResult = await client.query(
        `
        SELECT id
        FROM outbox_events
        WHERE aggregate_id IN (
          SELECT id
          FROM transactions
          WHERE sender_account_id = $1
             OR receiver_account_id = $1
        )
        `,
        [senderAccountId]
      );

      expect(outboxResult.rowCount).toBe(0);

      expect(outboxRepository.createEvent).toHaveBeenCalled();
    } finally {
      client.release();
    }
  });
});