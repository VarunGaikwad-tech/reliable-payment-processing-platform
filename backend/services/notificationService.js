const withTransaction = require("../utils/withTransaction");
const notificationRepository = require("../repositories/notificationRepository");
const AppError = require("../utils/AppError");

const getNotifications = async (
  userId,
  page = 1,
  limit = 10
) => {
  if (!userId) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  if (!Number.isSafeInteger(page) || page < 1) {
    throw new AppError(
      "Page must be a positive integer",
      400
    );
  }

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new AppError(
      "Limit must be between 1 and 100",
      400
    );
  }

  const offset = (page - 1) * limit;

  return withTransaction(async (client) => {
    const notifications =
      await notificationRepository.findByUser(
        client,
        userId,
        limit,
        offset
      );

    const total =
      await notificationRepository.countByUser(
        client,
        userId
      );

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
};

module.exports = {
  getNotifications,
};