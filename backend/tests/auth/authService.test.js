jest.mock("../../repositories/userRepository");
jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const bcrypt = require("bcrypt");
const userRepository = require("../../repositories/userRepository");
const { register, login } = require("../../services/authService");

describe("Auth service validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("normalizes email and name before registering", async () => {
    userRepository.findByEmail.mockResolvedValue(undefined);
    bcrypt.hash.mockResolvedValue("hash");
    userRepository.createUser.mockResolvedValue({ id: "user-id" });

    await register("  Alice  ", " ALICE@Example.COM ", "password");

    expect(userRepository.findByEmail).toHaveBeenCalledWith("alice@example.com");
    expect(userRepository.createUser).toHaveBeenCalledWith(
      "Alice",
      "alice@example.com",
      "hash"
    );
  });

  test("rejects malformed login email before repository access", async () => {
    await expect(login("not-an-email", "password")).rejects.toMatchObject({
      message: "Invalid email",
      statusCode: 400,
    });

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  test("maps a registration uniqueness race to a conflict", async () => {
    userRepository.findByEmail.mockResolvedValue(undefined);
    bcrypt.hash.mockResolvedValue("hash");
    userRepository.createUser.mockRejectedValue({ code: "23505" });

    await expect(register("Alice", "alice@example.com", "password")).rejects.toMatchObject({
      message: "Email already registered",
      statusCode: 409,
    });
  });
});
