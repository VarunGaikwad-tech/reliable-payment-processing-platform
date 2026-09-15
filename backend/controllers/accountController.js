const accountService = require("../services/accountService");

const createAccount = async (req, res) => {
  const account = await accountService.createAccount(
    req.user.userId
  );

  res.status(201).json({
    success: true,
    account,
  });
};

const getAccounts = async (req, res) => {
  const accounts = await accountService.getUserAccounts(
    req.user.userId
  );

  res.status(200).json({
    success: true,
    accounts,
  });
};

const getAccount = async (req, res) => {
  const account = await accountService.getAccount(
    req.params.accountId,
    req.user.userId
  );

  res.status(200).json({
    success: true,
    account,
  });
};

module.exports = {
  createAccount,
  getAccounts,
  getAccount,
};