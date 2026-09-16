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
  test("concurrent transfers cannot spend the same available balance twice", async () => {
    const competingAmount = 70000; // ₹700
    const competingKey1 = `balance-test-${crypto.randomUUID()}`;
    const competingKey2 = `balance-test-${crypto.randomUUID()}`;

    const client = await pool.connect();

    try {
      // Reset the accounts for this isolated concurrency scenario.
      await client.query(
        `
        UPDATE accounts
        SET balance = CASE
          WHEN id = $1 THEN $3
          WHEN id = $2 THEN 0
        END
        WHERE id IN ($1, $2)
        `,
        [
          senderAccountId,
          receiverAccountId,
          startingBalance,
        ]
      );
    } finally {
      client.release();
    }

    const results = await Promise.allSettled([
      transfer(
        userId,
        senderAccountId,
        receiverAccountId,
        competingAmount,
        competingKey1
      ),
      transfer(
        userId,
        senderAccountId,
        receiverAccountId,
        competingAmount,
        competingKey2
      ),
    ]);

    const successfulTransfers = results.filter(
      (result) => result.status === "fulfilled"
    );

    const failedTransfers = results.filter(
      (result) => result.status === "rejected"
    );

    // Exactly one request can spend ₹700 from a ₹1000 balance.
    expect(successfulTransfers).toHaveLength(1);
    expect(failedTransfers).toHaveLength(1);

    expect(failedTransfers[0].reason).toMatchObject({
      message: "Insufficient balance",
      statusCode: 400,
    });

    const clientAfter = await pool.connect();

    try {
      const accountResult = await clientAfter.query(
        `
        SELECT id, balance
        FROM accounts
        WHERE id IN ($1, $2)
        `,
        [senderAccountId, receiverAccountId]
      );

      const sender = accountResult.rows.find(
        (account) => account.id === senderAccountId
      );

      const receiver = accountResult.rows.find(
        (account) => account.id === receiverAccountId
      );

      // Only one ₹700 transfer should have succeeded.
      expect(sender.balance).toBe(
        String(startingBalance - competingAmount)
      );

      expect(receiver.balance).toBe(
        String(competingAmount)
      );

      // Only one successful transaction should exist for these two keys.
      const transactionResult = await clientAfter.query(
        `
        SELECT id, status
        FROM transactions
        WHERE id IN (
          SELECT transaction_id
          FROM idempotency_keys
          WHERE key IN ($1, $2)
        )
        `,
        [competingKey1, competingKey2]
      );

      expect(transactionResult.rowCount).toBe(1);
      expect(transactionResult.rows[0].status).toBe("SUCCESS");
    } finally {
      clientAfter.release();
    }
  });
});
