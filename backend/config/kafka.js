const { Kafka, logLevel } = require("kafkajs");
const config = require("./env");

const kafka = new Kafka({
  clientId: "payment-system",
  brokers: config.kafka.brokers,
  logLevel: logLevel.ERROR,
});

module.exports = kafka;