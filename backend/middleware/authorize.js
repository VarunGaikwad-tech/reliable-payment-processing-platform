const AppError = require("../utils/AppError");

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError("Access denied", 403);
    }

    next();
  };
};

module.exports = authorize;