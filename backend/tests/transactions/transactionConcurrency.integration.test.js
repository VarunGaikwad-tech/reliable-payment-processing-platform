const crypto = require("crypto");

const pool = require("../../config/db");
const { transfer } = require("../../services/transactionService");

describe("Transfer concurrency integration", () => {
  let userId;
  let senderAccountId;
  let receiverAccountId;

  const transferAmount = 10000; // ₹100 in paise
  const startingBalance = 100000; // ₹1000 in paise
  const idempotencyKey = `concurrent-test-${crypto.randomUUID()}`;

  beforeAll(async () => {
    userId = crypto.randomUUID();
    senderAccountId = crypto.randomUUID();
    receiverAccountId = crypto.randomUUID();

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Test user
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
          "Concurrency Test User",
          `concurrency-${userId}@test.com`,
          "test-password-hash",
        ]
      );

      // Sender account
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
          `TEST${Date.now()}01`,
          startingBalance,
        ]
      );

      // Receiver account
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
          receiverAccountId,
          userId,
          `TEST${Date.now()}02`,
          0,
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

  test("concurrent requests with the same idempotency key create only one transfer", async () => {
    const results = await Promise.all([
      transfer(
        userId,
        senderAccountId,
        receiverAccountId,
        transferAmount,
        idempotencyKey
      ),
      transfer(
        userId,
        senderAccountId,
        receiverAccountId,
        transferAmount,
        idempotencyKey
      ),
    ]);

    // Both requests should return the same transaction.
    expect(results[0].id).toBe(results[1].id);

    const client = await pool.connect();

    try {
      const transactionResult = await client.query(
        `
        SELECT
          id,
          sender_account_id,
          receiver_account_id,
          amount,
          status
        FROM transactions
        WHERE id = $1
        `,
        [results[0].id]
      );

      expect(transactionResult.rowCount).toBe(1);
      expect(transactionResult.rows[0].amount).toBe(
        String(transferAmount)
      );
      expect(transactionResult.rows[0].status).toBe(
        "SUCCESS"
      );

      // There must be exactly one transaction for this idempotency key.
      const idempotencyResult = await client.query(
        `
        SELECT transaction_id
        FROM idempotency_keys
        WHERE key = $1
        `,
        [idempotencyKey]
      );

      expect(idempotencyResult.rowCount).toBe(1);
      expect(idempotencyResult.rows[0].transaction_id).toBe(
        results[0].id
      );

      // Check final balances.
      const accountResult = await client.query(
        `
        SELECT id, balance
        FROM accounts
        WHERE id IN ($1, $2)
        ORDER BY id
        `,
        [senderAccountId, receiverAccountId]
      );

      const accounts = accountResult.rows;

      const sender = accounts.find(
        (account) => account.id === senderAccountId
      );

      const receiver = accounts.find(
        (account) => account.id === receiverAccountId
      );

      expect(sender.balance).toBe(
        String(startingBalance - transferAmount)
      );

      expect(receiver.balance).toBe(
        String(transferAmount)
      );

      // Exactly two ledger entries:
      // one DEBIT and one CREDIT.
      const ledgerResult = await client.query(
        `
        SELECT entry_type, amount
        FROM ledger_entries
        WHERE transaction_id = $1
        ORDER BY entry_type
        `,
        [results[0].id]
      );

      expect(ledgerResult.rowCount).toBe(2);

      expect(ledgerResult.rows).toEqual(
        expect.arrayContaining([
          {
            entry_type: "CREDIT",
            amount: String(transferAmount),
          },
          {
            entry_type: "DEBIT",
            amount: String(transferAmount),
          },
        ])
      );
    } finally {
      client.release();
    }
  });
});
