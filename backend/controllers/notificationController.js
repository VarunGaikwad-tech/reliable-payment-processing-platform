const notificationService = require("../services/notificationService");

const getNotifications = async (req, res, next) => {
  try {
    const {
      page = "1",
      limit = "10",
    } = req.query;

    const result =
      await notificationService.getNotifications(
        req.user.userId,
        Number(page),
        Number(limit)
      );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
};