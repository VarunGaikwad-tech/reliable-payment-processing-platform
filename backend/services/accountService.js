const accountRepository = require("../repositories/accountRepository");
const generateAccountNumber = require("../utils/accountNumber");
const AppError = require("../utils/AppError");
const { isUuid } = require("../utils/validation");

const createAccount = async (userId) => {
  if (!userId) {
    throw new AppError("User authentication required", 401);
  }

  const accountNumber = generateAccountNumber();

  try {
    const account = await accountRepository.createAccount(
      userId,
      accountNumber,
      "INR"
    );

    return account;
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "Could not generate a unique account number. Please try again.",
        409
      );
    }

    throw error;
  }
};

const getUserAccounts = async (userId) => {
  if (!userId) {
    throw new AppError("User authentication required", 401);
  }

  return accountRepository.findByUserId(userId);
};

const getAccount = async (accountId, userId) => {
  if (!userId) {
    throw new AppError("User authentication required", 401);
  }

  if (!isUuid(accountId)) {
    throw new AppError("Invalid account ID", 400);
  }

  const account = await accountRepository.findByIdAndUserId(
    accountId,
    userId
  );

  if (!account) {
    throw new AppError("Account not found", 404);
  }

  return account;
};

module.exports = {
  createAccount,
  getUserAccounts,
  getAccount,
};
