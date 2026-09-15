const pool = require("../config/db");

const findByEmail = async (email) => {
  const result = await pool.query(
    `
    SELECT id, name, email, password_hash, role, created_at
    FROM users
    WHERE email = $1
    `,
    [email]
  );

  return result.rows[0];
};

const createUser = async (name, email, passwordHash) => {
  const result = await pool.query(
    `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, created_at
    `,
    [name, email, passwordHash]
  );

  return result.rows[0];
};

module.exports = {
  findByEmail,
  createUser,
};