const pool = require("../config/db");
const kafka = require("../config/kafka");
const notificationRepository = require("../repositories/notificationRepository");
const logger = require("../utils/logger");

const TOPIC = "transaction-events";
const GROUP_ID = "notification-service";

const consumer = kafka.consumer({
  groupId: GROUP_ID,
});

const processTransactionCompleted = async (
  event
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const transactionId = event.aggregateId;
    const eventId = event.eventId;

    const {
      senderAccountId,
      receiverAccountId,
      amount,
      currency,
    } = event.payload;

    const result = await client.query(
      `
      SELECT
        a.id,
        a.user_id
      FROM accounts a
      WHERE a.id IN ($1, $2)
      `,
      [
        senderAccountId,
        receiverAccountId,
      ]
    );

    const senderAccount = result.rows.find(
      (account) =>
        account.id === senderAccountId
    );

    const receiverAccount = result.rows.find(
      (account) =>
        account.id === receiverAccountId
    );

    if (!senderAccount || !receiverAccount) {
      throw new Error(
        "Unable to find transaction accounts"
      );
    }

    const senderAmount = Number(amount) / 100;

    await notificationRepository.createNotification(
      client,
      eventId,
      senderAccount.user_id,
      transactionId,
      "TRANSFER_SENT",
      `You sent ${currency} ${senderAmount.toFixed(2)}`
    );

    await notificationRepository.createNotification(
      client,
      eventId,
      receiverAccount.user_id,
      transactionId,
      "TRANSFER_RECEIVED",
      `You received ${currency} ${senderAmount.toFixed(2)}`
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const start = async () => {
  await consumer.connect();

  await consumer.subscribe({
    topic: TOPIC,
    fromBeginning: false,
  });

  logger.info("notification.worker.started");

  await consumer.run({
    autoCommit: false,

    eachMessage: async ({
      topic,
      partition,
      message,
    }) => {
      const event = JSON.parse(
        message.value.toString()
      );

      if (
        event.eventType !== "TRANSACTION_COMPLETED"
      ) {
        await consumer.commitOffsets([
          {
            topic,
            partition,
            offset: String(
              Number(message.offset) + 1
            ),
          },
        ]);

        return;
      }
      await processTransactionCompleted(event);

      logger.info("notification.event.processed", {
        eventId: event.eventId,
        transactionId: event.aggregateId,
        topic,
        partition,
        offset: message.offset,
      });

      // Commit ONLY after database processing succeeds.
      await consumer.commitOffsets([
        {
          topic,
          partition,
          offset: String(
            Number(message.offset) + 1
          ),
        },
      ]);

    },
  });
};

const shutdown = async () => {
  logger.info("notification.worker.shutting_down");

  await consumer.disconnect();
  await pool.end();

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch(async (error) => {
  logger.error("notification.worker.failed", error);

  await consumer.disconnect();
  await pool.end();

  process.exit(1);
});
