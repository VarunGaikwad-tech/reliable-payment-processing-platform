//Responsible for Starting the HTTP server.
// Production server entry point
const app = require("./app");
const config = require("./config/env");
const pool = require("./config/db");
const redisClient = require("./config/redis");
const logger = require("./utils/logger");

const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");

    logger.info("database.connected");

    //redis connection
    await redisClient.connect();
    logger.info("redis.connected");

    app.listen(config.port, "0.0.0.0", () => {
      logger.info("http.server.started", { port: config.port });
    });
  } catch (error) {
    logger.error("http.server.start_failed", error);

    process.exit(1);
  }
};

startServer();