require("dotenv").config();

const config = {
  
  port: process.env.PORT || 3000,

  nodeEnv: process.env.NODE_ENV || "development",

  db: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || "payment_system",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },

  redis: {
  url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092")
      .split(",")
      .map((broker) => broker.trim()),

    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
    saslMechanism: process.env.KAFKA_SASL_MECHANISM || "scram-sha-256",
    ssl: process.env.KAFKA_SSL === "true",
    caPath: process.env.KAFKA_CA_PATH,
    caCert: process.env.KAFKA_CA_CERT,
  },
};

module.exports = config;