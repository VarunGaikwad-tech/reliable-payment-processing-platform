const express = require("express");

const transactionController = require("../controllers/transactionController");
const protect = require("../middleware/authMiddleware");

// Import the rateLimiter middleware
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

router.post(
  "/transfer",
  protect,
  rateLimiter({
    capacity: 10,
    refillRate: 2,
  }),
  transactionController.transfer
);

router.get(
  "/",
  protect,
  transactionController.getTransactionHistory
);

module.exports = router;