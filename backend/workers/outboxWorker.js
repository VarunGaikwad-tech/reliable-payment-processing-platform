const pool = require("../config/db");
const outboxRepository = require("../repositories/outboxRepository");
const logger = require("../utils/logger");

const {
  connectProducer,
  publishMessage,
  disconnectProducer,
} = require("../services/kafkaProducer");

const TOPIC = "transaction-events";

const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 10;

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const processEvents = async () => {
  const client = await pool.connect();

  try {
    // Recover events that were stuck in PROCESSING
    // because a worker may have crashed.
    await outboxRepository.recoverStuckEvents(
      client,
      60
    );

    const events =
      await outboxRepository.claimPendingEvents(
        client,
        BATCH_SIZE
      );

    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      try {
        await publishMessage({
          topic: TOPIC,
          key: event.aggregate_id,
          value: {
            eventId: event.id,
            eventType: event.event_type,
            aggregateType: event.aggregate_type,
            aggregateId: event.aggregate_id,
            payload: event.payload,
            occurredAt: event.created_at,
          },
        });

        await outboxRepository.markPublished(
          client,
          event.id
        );

        logger.info("outbox.event.published", {
          eventId: event.id,
          aggregateId: event.aggregate_id,
          aggregateType: event.aggregate_type,
        });
      } catch (error) {
        logger.error("outbox.event.publish_failed", error, {
          eventId: event.id,
          aggregateId: event.aggregate_id,
          aggregateType: event.aggregate_type,
        });

        const nextAvailableAt = new Date(
          Date.now() + 2000
        );

        const failedEvent =
          await outboxRepository.markFailed(
            client,
            event.id,
            nextAvailableAt,
            error.message
          );

        logger.warn("outbox.event.retry_scheduled", {
          eventId: event.id,
          status: failedEvent.status,
          attempts: failedEvent.attempts,
        });
      }
    }
  } finally {
    client.release();
  }
};

let shuttingDown = false;

const shutdown = async () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  logger.info("outbox.worker.shutting_down");

  await disconnectProducer();
  await pool.end();

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const start = async () => {
  await connectProducer();

  logger.info("outbox.worker.started");

  while (!shuttingDown) {
    try {
      await processEvents();
    } catch (error) {
      logger.error("outbox.processing_cycle_failed", error);
    }

    if (!shuttingDown) {
      await sleep(POLL_INTERVAL_MS);
    }
  }
};

start().catch(async (error) => {
  logger.error("outbox.worker.start_failed", error);

  await disconnectProducer();
  await pool.end();

  process.exit(1);
});
