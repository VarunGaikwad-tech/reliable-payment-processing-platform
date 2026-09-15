const createEntry = async (
  client,
  transactionId,
  accountId,
  entryType,
  amount
) => {
  const result = await client.query(
    `
    INSERT INTO ledger_entries (
      transaction_id,
      account_id,
      entry_type,
      amount
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      transaction_id,
      account_id,
      entry_type,
      amount,
      created_at
    `,
    [
      transactionId,
      accountId,
      entryType,
      amount,
    ]
  );

  return result.rows[0];
};

module.exports = {
  createEntry,
};