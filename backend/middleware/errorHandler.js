const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error("http.request.failed", err, {
    requestId: req.requestId,
    method: req.method,
    path: req.path || req.originalUrl,
  });

  let statusCode = err.isOperational && Number.isInteger(err.statusCode)
    ? err.statusCode
    : 500;
  let message = "Internal server error";

  if (err.isOperational && statusCode >= 400 && statusCode < 500) {
    message = err.message;
  } else if (err.code === "23505") {
    statusCode = 409;
    message = "Request conflicts with existing data";
  } else if (err.code === "23503") {
    statusCode = 409;
    message = "Request conflicts with related data";
  } else if (err.code === "23514" || err.code === "22P02") {
    statusCode = 400;
    message = "Invalid request data";
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
};

module.exports = errorHandler;
