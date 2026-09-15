const { EventEmitter } = require("events");

jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
}));

const logger = require("../../utils/logger");
const requestId = require("../../middleware/requestId");

describe("requestId middleware", () => {
  test("generates a server request ID, returns it, and logs completion metadata", () => {
    const req = {
      method: "GET",
      path: "/api/accounts",
      headers: { "x-request-id": "untrusted-client-value" },
    };
    const res = new EventEmitter();
    res.statusCode = 200;
    res.setHeader = jest.fn();
    const next = jest.fn();

    requestId(req, res, next);
    res.emit("finish");

    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(req.requestId).not.toBe("untrusted-client-value");
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "http.request.completed",
      expect.objectContaining({
        requestId: req.requestId,
        method: "GET",
        path: "/api/accounts",
        statusCode: 200,
        durationMs: expect.any(Number),
      })
    );
  });
});
