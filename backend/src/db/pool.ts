import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "campusflow",
  password: process.env.DB_PASSWORD || "root",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

export default pool;
