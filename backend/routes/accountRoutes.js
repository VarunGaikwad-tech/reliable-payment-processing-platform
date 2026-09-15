const express = require("express");

const accountController = require("../controllers/accountController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/",
  protect,
  accountController.createAccount
);

router.get(
  "/",
  protect,
  accountController.getAccounts
);

router.get(
  "/:accountId",
  protect,
  accountController.getAccount
);

module.exports = router;
