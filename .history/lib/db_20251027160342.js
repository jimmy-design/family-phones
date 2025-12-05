import mysql from "mysql2/promise";

export async function getConnection() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",          // default XAMPP user
    password: "",          // leave empty if no password
    database: "family",    // your database name
  });
  return connection;
}
