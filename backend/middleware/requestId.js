const crypto = require("crypto");
const logger = require("../utils/logger");

const requestId = (req, res, next) => {
  req.requestId = crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  res.setHeader("X-Request-Id", req.requestId);
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    logger.info("http.request.completed", {
      requestId: req.requestId,
      method: req.method,
      path: req.path || req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
};

module.exports = requestId;
