jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const AppError = require("../../utils/AppError");
const errorHandler = require("../../middleware/errorHandler");
const logger = require("../../utils/logger");

const response = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  return res;
};

describe("errorHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns operational client errors unchanged", () => {
    const res = response();

    errorHandler(new AppError("Account not found", 404), {
      method: "GET",
      originalUrl: "/api/accounts/id",
    }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: "Account not found" },
    });
  });

  test("sanitizes unexpected database errors while logging details", () => {
    const res = response();
    const error = Object.assign(
      new Error('duplicate key value violates unique constraint "users_email_key"'),
      { code: "23505" }
    );

    errorHandler(error, { method: "POST", originalUrl: "/api/auth/register" }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: "Request conflicts with existing data" },
    });
    expect(logger.error).toHaveBeenCalledWith(
      "http.request.failed",
      error,
      expect.objectContaining({
        method: "POST",
        path: "/api/auth/register",
      })
    );
  });

  test("does not expose unexpected errors", () => {
    const res = response();
    const error = new Error("password=secret host=db.internal");

    errorHandler(error, { method: "GET", originalUrl: "/api/accounts" }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: "Internal server error" },
    });
  });
});
