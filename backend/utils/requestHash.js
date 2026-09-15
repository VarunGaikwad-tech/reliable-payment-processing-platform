const crypto = require("crypto");

const createTransferRequestHash = ({
  fromAccountId,
  toAccountId,
  amount,
}) => {
  const payload =
    `${fromAccountId}|${toAccountId}|${amount}`;

  return crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
};

module.exports = {
  createTransferRequestHash,
};