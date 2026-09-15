const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const pool = require("../config/db");

const migrationsDirectory = path.join(__dirname, "..", "migrations");
const migrationFilePattern = /^\d+_.+\.sql$/;
const migrationLockId = 314159265;

const getMigrations = () => fs.readdirSync(migrationsDirectory)
  .filter((fileName) => migrationFilePattern.test(fileName))
  .sort()
  .map((fileName) => ({
    name: fileName,
    sql: fs.readFileSync(path.join(migrationsDirectory, fileName), "utf8"),
  }));

const checksum = (sql) => crypto.createHash("sha256").update(sql).digest("hex");

const run = async () => {
  const client = await pool.connect();

  try {
    await client.query("SELECT pg_advisory_lock($1)", [migrationLockId]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of getMigrations()) {
      const migrationChecksum = checksum(migration.sql);
      const applied = await client.query(
        "SELECT checksum FROM schema_migrations WHERE name = $1",
        [migration.name]
      );

      if (applied.rowCount === 1) {
        if (applied.rows[0].checksum !== migrationChecksum) {
          throw new Error(`Migration checksum mismatch: ${migration.name}`);
        }

        console.log(`Already applied: ${migration.name}`);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
          [migration.name, migrationChecksum]
        );
        await client.query("COMMIT");
        console.log(`Applied: ${migration.name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [migrationLockId]);
    } finally {
      client.release();
      await pool.end();
    }
  }
};

run().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
