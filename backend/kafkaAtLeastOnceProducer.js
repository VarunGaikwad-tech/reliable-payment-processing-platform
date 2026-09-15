const crypto = require("crypto");

const {
  connectProducer,
  publishMessage,
  disconnectProducer,
} = require("./services/kafkaProducer");

const run = async () => {
  await connectProducer();

  const event = {
    eventId: crypto.randomUUID(),
    eventType: "AT_LEAST_ONCE_TEST",
    message: "This message should be delivered twice",
    createdAt: new Date().toISOString(),
  };

  await publishMessage({
    topic: "at-least-once-test",
    key: event.eventId,
    value: event,
  });

  console.log("Published test event:");
  console.log(event);
};

run()
  .catch((error) => {
    console.error("Producer test failed:", error);
  })
  .finally(async () => {
    await disconnectProducer();
  });