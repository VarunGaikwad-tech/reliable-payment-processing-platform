const fs = require("fs");
const { Kafka, logLevel } = require("kafkajs");

const config = require("./env");

const kafkaOptions = {
  clientId: "payment-system",
  brokers: config.kafka.brokers,
  logLevel: logLevel.ERROR,
};

if (config.kafka.ssl) {
  let ca;

  if (config.kafka.caCert) {
    ca = config.kafka.caCert;
  } else if (config.kafka.caPath) {
    ca = fs.readFileSync(config.kafka.caPath, "utf8");
  } else {
    throw new Error(
      "KAFKA_CA_CERT or KAFKA_CA_PATH is required when KAFKA_SSL=true"
    );
  }

  kafkaOptions.ssl = {
    ca: [ca],
    rejectUnauthorized: true,
  };
}

if (config.kafka.username && config.kafka.password) {
  kafkaOptions.sasl = {
    mechanism: config.kafka.saslMechanism,
    username: config.kafka.username,
    password: config.kafka.password,
  };
}

const kafka = new Kafka(kafkaOptions);

module.exports = kafka;