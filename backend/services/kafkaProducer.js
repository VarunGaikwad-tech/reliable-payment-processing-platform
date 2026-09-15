const kafka = require("../config/kafka");
const logger = require("../utils/logger");

const producer = kafka.producer({
  allowAutoTopicCreation: false,
});

const connectProducer = async () => {
  if (!producer.connected) {
    await producer.connect();
    logger.info("kafka.producer.connected");
  }
};

const publishMessage = async ({
  topic,
  key,
  value,
}) => {
  await producer.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(value),
      },
    ],
  });
};

const disconnectProducer = async () => {
  if (producer.connected) {
    await producer.disconnect();
  }
};

module.exports = {
  connectProducer,
  publishMessage,
  disconnectProducer,
};
