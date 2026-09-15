const transactionService = require("../services/transactionService");

const transfer = async (req, res) => {
  const {
    fromAccountId,
    toAccountId,
    amount,
  } = req.body;

  const idempotencyKey =
    req.headers["idempotency-key"];
  
  const transaction =
    await transactionService.transfer(
      req.user.userId,
      fromAccountId,
      toAccountId,
      amount,
      idempotencyKey,
      req.requestId
    );

  res.status(201).json({
    success: true,
    transaction,
  });
};

const getTransactionHistory = async (req, res, next) => {
  try {
    const {
      accountId,
      page = "1",
      limit = "10",
    } = req.query;

    const result =
      await transactionService.getTransactionHistory(
        req.user.userId,
        accountId,
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
  transfer,
  getTransactionHistory,
};
