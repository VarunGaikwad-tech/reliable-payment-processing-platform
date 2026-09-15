const jwt = require("jsonwebtoken");

const config = require("../config/env");
const AppError = require("../utils/AppError");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new AppError(
      "Invalid authorization format",
      401
    );
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(
      token,
      config.jwt.secret
    );

    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Invalid or expired token",
      401
    );
  }
};

module.exports = protect;