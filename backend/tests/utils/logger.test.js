const logger = require("../../utils/logger");

describe("logger", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("writes one JSON info entry with standard fields", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    logger.info("transfer.completed", {
      requestId: "request-1",
      transactionId: "transaction-1",
    });

    const entry = JSON.parse(logSpy.mock.calls[0][0]);
    expect(entry).toEqual(expect.objectContaining({
      level: "info",
      event: "transfer.completed",
      requestId: "request-1",
      transactionId: "transaction-1",
      timestamp: expect.any(String),
    }));
  });

  test("writes error diagnostics only to the error log entry", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("database unavailable"), {
      code: "ECONNREFUSED",
    });

    logger.error("http.request.failed", error, { requestId: "request-1" });

    const entry = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(entry).toEqual(expect.objectContaining({
      level: "error",
      event: "http.request.failed",
      requestId: "request-1",
      error: expect.objectContaining({
        message: "database unavailable",
        code: "ECONNREFUSED",
        stack: expect.any(String),
      }),
    }));
  });
});
