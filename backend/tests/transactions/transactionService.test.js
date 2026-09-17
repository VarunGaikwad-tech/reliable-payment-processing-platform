// const AppError = require("../../utils/AppError");

// Mock the transaction wrapper so we don't need a real PostgreSQL transaction.
jest.mock("../../utils/withTransaction", () => {
  return jest.fn(async (callback) => {
    const fakeClient = {};
    return callback(fakeClient);
  });
});

jest.mock("../../repositories/accountRepository");
jest.mock("../../repositories/transactionRepository");
jest.mock("../../repositories/ledgerRepository");
jest.mock("../../repositories/idempotencyRepository");

jest.mock("../../utils/requestHash", () => ({
  createTransferRequestHash: jest.fn(() => "mock-request-hash"),
}));
jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const withTransaction = require("../../utils/withTransaction");

const accountRepository = require("../../repositories/accountRepository");
const transactionRepository = require("../../repositories/transactionRepository");
const ledgerRepository = require("../../repositories/ledgerRepository");
const idempotencyRepository = require("../../repositories/idempotencyRepository");
const logger = require("../../utils/logger");

const { transfer, getTransactionHistory } = require("../../services/transactionService");

describe("Transaction Service - Idempotency", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const fromAccountId = "22222222-2222-4222-8222-222222222222";
  const toAccountId = "33333333-3333-4333-8333-333333333333";
  const toAccountNumber = "407997690543"; 
  const amount = 10000;
  const idempotencyKey = "test-idempotency-key";

  beforeEach(() => {
    jest.clearAllMocks();

    accountRepository.findByAccountNumber.mockResolvedValue({
      id: toAccountId,
    });
  });

  test("returns existing transaction for an identical idempotent request", async () => {
    const existingTransaction = {
      id: "transaction-123",
      sender_account_id: fromAccountId,
      receiver_account_id: toAccountNumber,
      amount: "10000",
      status: "SUCCESS",
    };

    idempotencyRepository.create.mockResolvedValue(undefined);

    idempotencyRepository.findByKey.mockResolvedValue({
      key: idempotencyKey,
      user_id: userId,
      transaction_id: "transaction-123",
      request_hash: "mock-request-hash",
    });

    transactionRepository.findById.mockResolvedValue(
      existingTransaction
    );

    const result = await transfer(
      userId,
      fromAccountId,
      toAccountNumber,
      amount,
      idempotencyKey
    );

    expect(result).toEqual(existingTransaction);

    expect(transactionRepository.findById).toHaveBeenCalledWith(
      expect.anything(),
      "transaction-123"
    );

    // The payment should NOT be processed again.
    expect(accountRepository.debitAccount).not.toHaveBeenCalled();
    expect(accountRepository.creditAccount).not.toHaveBeenCalled();
    expect(ledgerRepository.createEntry).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "idempotency.replayed",
      expect.objectContaining({ transactionId: "transaction-123" })
    );
  });

  test("rejects reuse of idempotency key for a different request", async () => {
    idempotencyRepository.create.mockResolvedValue(undefined);

    idempotencyRepository.findByKey.mockResolvedValue({
      key: idempotencyKey,
      user_id: userId,
      transaction_id: "transaction-123",
      request_hash: "different-request-hash",
    });

    await expect(
      transfer(
        userId,
        fromAccountId,
        toAccountNumber,
        amount,
        idempotencyKey
      )
    ).rejects.toMatchObject({
      message:
        "Idempotency key was already used for a different request",
      statusCode: 409,
    });

    expect(transactionRepository.findById).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      "idempotency.conflict",
      expect.objectContaining({ reason: "request_mismatch" })
    );
  });

  test("rejects an idempotency key belonging to another user", async () => {
    idempotencyRepository.create.mockResolvedValue(undefined);

    idempotencyRepository.findByKey.mockResolvedValue({
      key: idempotencyKey,
      user_id: "different-user",
      transaction_id: "transaction-123",
      request_hash: "mock-request-hash",
    });

    await expect(
      transfer(
        userId,
        fromAccountId,
        toAccountNumber,
        amount,
        idempotencyKey
      )
    ).rejects.toMatchObject({
      message: "Invalid idempotency key",
      statusCode: 409,
    });
  });

  test("rejects an existing idempotency record with no transaction", async () => {
    idempotencyRepository.create.mockResolvedValue(undefined);

    idempotencyRepository.findByKey.mockResolvedValue({
      key: idempotencyKey,
      user_id: userId,
      transaction_id: null,
      request_hash: "mock-request-hash",
    });

    await expect(
      transfer(
        userId,
        fromAccountId,
        toAccountNumber,
        amount,
        idempotencyKey
      )
    ).rejects.toMatchObject({
      message: "Idempotency record is in an invalid state",
      statusCode: 500,
    });
  });

  test("fails when idempotency key exists but cannot be found", async () => {
    idempotencyRepository.create.mockResolvedValue(undefined);
    idempotencyRepository.findByKey.mockResolvedValue(undefined);

    await expect(
      transfer(
        userId,
        fromAccountId,
        toAccountNumber,
        amount,
        idempotencyKey
      )
    ).rejects.toMatchObject({
      message: "Unable to process idempotency key",
      statusCode: 500,
    });
  });
  test("rejects malformed account IDs before opening a transaction", async () => {
    await expect(
      transfer(
        userId,
        "not-a-uuid",
        toAccountNumber,
        amount,
        idempotencyKey
      )
    ).rejects.toMatchObject({
      message: "Invalid sender account ID",
      statusCode: 400,
    });

    expect(withTransaction).not.toHaveBeenCalled();
  });
  // test("rejects malformed account IDs before opening a transaction", async () => {
  //   await expect(
  //     transfer(userId, "not-a-uuid", toAccountNumber, amount, idempotencyKey)
  //   ).rejects.toMatchObject({
  //     message: "Invalid sender account ID",
  //     statusCode: 400,
  //   });

  //   expect(withTransaction).not.toHaveBeenCalled();
  // });

  test("rejects unsafe or non-integer paise amounts", async () => {
    await expect(
      transfer(userId, fromAccountId, toAccountNumber, Number.MAX_SAFE_INTEGER + 1, idempotencyKey)
    ).rejects.toMatchObject({
      message: "Amount must be a positive integer in paise",
      statusCode: 400,
    });

    expect(withTransaction).not.toHaveBeenCalled();
  });

  test("rejects invalid transaction history pagination before repository access", async () => {
    await expect(
      getTransactionHistory(userId, fromAccountId, 1, 101)
    ).rejects.toMatchObject({
      message: "Limit must be between 1 and 100",
      statusCode: 400,
    });

    expect(accountRepository.findByIdAndUserId).not.toHaveBeenCalled();
  });
});
