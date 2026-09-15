const kafka = require("./config/kafka");

const TOPIC = "at-least-once-test";
const GROUP_ID = "at-least-once-demo-group";

const consumer = kafka.consumer({
  groupId: GROUP_ID,
});

const run = async () => {
  await consumer.connect();

  await consumer.subscribe({
    topic: TOPIC,
    fromBeginning: true,
  });

  console.log("Test consumer started");

  let received = false;

  await new Promise(async (resolve, reject) => {
    try {
      await consumer.run({
        autoCommit: false,

        eachMessage: async ({ topic, partition, message }) => {
          console.log("\nReceived message:");
          console.log("Topic:", topic);
          console.log("Partition:", partition);
          console.log("Offset:", message.offset);
          console.log("Value:", message.value.toString());

          received = true;

          // IMPORTANT:
          // We intentionally do NOT commit the offset.

          await consumer.stop();
          resolve();
        },
      });
    } catch (error) {
      reject(error);
    }
  });

  if (received) {
    console.log("\nOffset was intentionally NOT committed.");
    console.log("Disconnecting consumer...");
  }

  await consumer.disconnect();
};

run().catch(async (error) => {
  console.error("Consumer test failed:", error);

  if (consumer) {
    try {
      await consumer.disconnect();
    } catch (_) {}
  }
});