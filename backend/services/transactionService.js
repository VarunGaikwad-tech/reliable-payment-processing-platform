const withTransaction = require("../utils/withTransaction");

const accountRepository = require("../repositories/accountRepository");
const transactionRepository = require("../repositories/transactionRepository");
const ledgerRepository = require("../repositories/ledgerRepository");
const idempotencyRepository = require("../repositories/idempotencyRepository");

//outboxRepo for kafka integration
const outboxRepository = require("../repositories/outboxRepository");
const { createTransferRequestHash } = require("../utils/requestHash");

const AppError = require("../utils/AppError");
const { isUuid } = require("../utils/validation");
const logger = require("../utils/logger");

const transfer = async (
  userId,
  fromAccountId,
  toAccountId,
  amount,
  idempotencyKey,
  requestId
) => {
  if (!userId) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    throw new AppError(
      "Idempotency-Key header is required",
      400
    );
  }

  if (!fromAccountId || !toAccountId || amount === undefined || amount === null) {
    throw new AppError(
      "Sender account, receiver account and amount are required",
      400
    );
  }

  if (!isUuid(fromAccountId) || !isUuid(toAccountId)) {
    throw new AppError("Invalid account ID", 400);
  }

  if (idempotencyKey.length > 255) {
    throw new AppError("Idempotency-Key header is too long", 400);
  }

  if (fromAccountId === toAccountId) {
    throw new AppError(
      "Sender and receiver accounts must be different",
      400
    );
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new AppError(
      "Amount must be a positive integer in paise",
      400
    );
  }
  const requestHash = createTransferRequestHash({
    fromAccountId,
    toAccountId,
    amount,
  });

  let replayed = false;
  const completedTransaction = await withTransaction(async (client) => {

    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    const createdKey =
      await idempotencyRepository.create(
        client,
        idempotencyKey,
        userId,
        requestHash,
        expiresAt
      );

    // -----------------------------------------
    // Existing idempotency key
    // -----------------------------------------
    if (!createdKey) {
      const existingKey =
        await idempotencyRepository.findByKey(
          client,
          idempotencyKey
        );

      if (!existingKey) {
        throw new AppError(
          "Unable to process idempotency key",
          500
        );
      }
      // Key belongs to another user
      if (existingKey.user_id !== userId) {
        logger.warn("idempotency.conflict", {
          requestId,
          reason: "different_user",
        });
        throw new AppError(
          "Invalid idempotency key",
          409
        );
      }

      // Same key, different request
      if (existingKey.request_hash !== requestHash) {
        logger.warn("idempotency.conflict", {
          requestId,
          reason: "request_mismatch",
        });
        throw new AppError(
          "Idempotency key was already used for a different request",
          409
        );
      }

      // Same request and transaction already exists
      if (!existingKey.transaction_id) {
        throw new AppError(
          "Idempotency record is in an invalid state",
          500
        );
      }

      const existingTransaction =
        await transactionRepository.findById(
          client,
          existingKey.transaction_id
        );

      if (!existingTransaction) {
        throw new AppError(
          "Associated transaction not found",
          500
        );
      }

      replayed = true;
      return existingTransaction;
    }
    // -----------------------------------------
    // 1. Determine deterministic lock order
    // -----------------------------------------

    const firstAccountId =
      fromAccountId < toAccountId
        ? fromAccountId
        : toAccountId;

    const secondAccountId =
      fromAccountId < toAccountId
        ? toAccountId
        : fromAccountId;

    // -----------------------------------------
    // 2. Lock both accounts
    // -----------------------------------------

    const firstAccount =
      await accountRepository.findByIdForUpdate(
        client,
        firstAccountId
      );

    if (!firstAccount) {
      throw new AppError(
        "Account not found",
        404
      );
    }

    const secondAccount =
      await accountRepository.findByIdForUpdate(
        client,
        secondAccountId
      );

    if (!secondAccount) {
      throw new AppError(
        "Account not found",
        404
      );
    }

    // -----------------------------------------
    // 3. Identify sender/receiver
    // -----------------------------------------

    const senderAccount =
      firstAccount.id === fromAccountId
        ? firstAccount
        : secondAccount;

    const receiverAccount =
      firstAccount.id === toAccountId
        ? firstAccount
        : secondAccount;

    // -----------------------------------------
    // 4. Authorization
    // -----------------------------------------

    if (senderAccount.user_id !== userId) {
      throw new AppError(
        "You are not authorized to use this account",
        403
      );
    }

    // -----------------------------------------
    // 5. Account status validation
    // -----------------------------------------

    if (senderAccount.status !== "ACTIVE") {
      throw new AppError(
        "Sender account is not active",
        400
      );
    }

    if (receiverAccount.status !== "ACTIVE") {
      throw new AppError(
        "Receiver account is not active",
        400
      );
    }

    // -----------------------------------------
    // 6. Currency validation
    // -----------------------------------------

    if (
      senderAccount.currency !==
      receiverAccount.currency
    ) {
      throw new AppError(
        "Currency mismatch between accounts",
        400
      );
    }

    // -----------------------------------------
    // 7. Balance validation
    // -----------------------------------------

    if (senderAccount.balance < amount) {
      throw new AppError(
        "Insufficient balance",
        400
      );
    }

    // -----------------------------------------
    // 8. Create transaction
    // -----------------------------------------

    const transaction =
      await transactionRepository.createTransaction(
        client,
        fromAccountId,
        toAccountId,
        amount,
        senderAccount.currency
      );

    // -----------------------------------------
    // 9. Debit sender
    // -----------------------------------------

    await accountRepository.debitAccount(
      client,
      fromAccountId,
      amount
    );

    // -----------------------------------------
    // 10. Credit receiver
    // -----------------------------------------

    await accountRepository.creditAccount(
      client,
      toAccountId,
      amount
    );

    // -----------------------------------------
    // 11. Ledger DEBIT
    // -----------------------------------------

    await ledgerRepository.createEntry(
      client,
      transaction.id,
      fromAccountId,
      "DEBIT",
      amount
    );

    // -----------------------------------------
    // 12. Ledger CREDIT
    // -----------------------------------------

    await ledgerRepository.createEntry(
      client,
      transaction.id,
      toAccountId,
      "CREDIT",
      amount
    );

    // -----------------------------------------
    // 13. Mark transaction successful
    // -----------------------------------------

    const completedTransaction =
      await transactionRepository.markSuccess(
        client,
        transaction.id
      );
      
    await idempotencyRepository.attachTransaction(
      client,
      idempotencyKey,
      completedTransaction.id
    );

    await outboxRepository.createEvent(
      client,
      "TRANSACTION_COMPLETED",
      "TRANSACTION",
      completedTransaction.id,
      {
        transactionId: completedTransaction.id,
        senderAccountId: completedTransaction.sender_account_id,
        receiverAccountId: completedTransaction.receiver_account_id,
        amount: completedTransaction.amount,
        currency: completedTransaction.currency,
      }
    );
    return completedTransaction;
  });

  logger.info(
    replayed ? "idempotency.replayed" : "transfer.completed",
    {
      requestId,
      transactionId: completedTransaction.id,
    }
  );

  return completedTransaction;
};

const getTransactionHistory = async (
  userId,
  accountId,
  page = 1,
  limit = 10
) => {
  if (!userId) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  if (!accountId) {
    throw new AppError(
      "Account ID is required",
      400
    );
  }

  if (!isUuid(accountId)) {
    throw new AppError("Invalid account ID", 400);
  }

  if (!Number.isSafeInteger(page) || page < 1) {
    throw new AppError(
      "Page must be a positive integer",
      400
    );
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(
      "Limit must be between 1 and 100",
      400
    );
  }

  // Verify the account belongs to the authenticated user.
  const account = await accountRepository.findByIdAndUserId(
    accountId,
    userId
  );

  if (!account) {
    throw new AppError(
      "Account not found",
      404
    );
  }

  const offset = (page - 1) * limit;

  return withTransaction(async (client) => {
    const transactions =
      await transactionRepository.findByAccount(
        client,
        accountId,
        limit,
        offset
      );

    const total =
      await transactionRepository.countByAccount(
        client,
        accountId
      );

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        ),
      },
    };
  });
};

module.exports = {
  transfer,
  getTransactionHistory,
};
