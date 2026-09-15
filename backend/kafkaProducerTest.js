const crypto = require("crypto");

const {
  connectProducer,
  publishMessage,
  disconnectProducer,
} = require("./services/kafkaProducer");

const run = async () => {
  await connectProducer();

  await publishMessage({
    topic: "transaction-events",
    key: crypto.randomUUID(),
    value: {
      eventType: "TEST_EVENT",
      message: "Hello from Payment System",
      createdAt: new Date().toISOString(),
    },
  });

  console.log("Kafka message published successfully");
};

run()
  .catch((error) => {
    console.error("Kafka producer test failed:", error);
  })
  .finally(async () => {
    await disconnectProducer();
  });