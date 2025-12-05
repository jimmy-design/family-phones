import mysql from "mysql2/promise";

export async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "family",
    port: parseInt(process.env.DB_PORT || "3306"),
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  return connection;
}
