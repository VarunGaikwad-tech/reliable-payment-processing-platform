jest.mock("../../repositories/accountRepository");

const accountRepository = require("../../repositories/accountRepository");
const { getAccount } = require("../../services/accountService");

describe("Account service validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects a malformed account ID before repository access", async () => {
    await expect(
      getAccount("not-a-uuid", "11111111-1111-4111-8111-111111111111")
    ).rejects.toMatchObject({
      message: "Invalid account ID",
      statusCode: 400,
    });

    expect(accountRepository.findByIdAndUserId).not.toHaveBeenCalled();
  });
});
