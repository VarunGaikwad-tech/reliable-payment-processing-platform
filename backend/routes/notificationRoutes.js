const express = require("express");

const notificationController = require("../controllers/notificationController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  notificationController.getNotifications
);

module.exports = router;