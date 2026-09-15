const { createClient } = require("redis");
const config = require("./env");
const logger = require("../utils/logger");

const redisClient = createClient({
  url: config.redis.url,
});

redisClient.on("error", (error) => {
  logger.error("redis.error", error);
});

module.exports = redisClient;
