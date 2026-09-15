const fs = require("fs");
const path = require("path");
const redisClient = require("../config/redis");

const scriptPath = path.join(__dirname, "../utils/tokenBucket.lua");
const tokenBucketScript = fs.readFileSync(scriptPath, "utf8");

const consumeToken = async ({
  key,
  capacity,
  refillRate,
  now = Date.now(),
}) => {
  const result = await redisClient.eval(tokenBucketScript, {
    keys: [key],
    arguments: [
      String(capacity),
      String(refillRate),
      String(now),
    ],
  });

  return {
    allowed: result[0] === 1,
    remaining: Number(result[1]),
    retryAfter: Number(result[2]),
  };
};

module.exports = {
  consumeToken,
};