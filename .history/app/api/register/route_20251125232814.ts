import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  let connection: any;

  try {
    const { username, password, firstName, lastName, phone } = await req.json();

    if (!username || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    connection = await getConnection();

    // --- CHECK IF USER EXISTS ---
    const [rows]: any = await connection.execute(
      "SELECT COUNT(*) AS count FROM users WHERE username = ?",
      [username]
    );

    if (rows[0].count > 0) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // --- HASH PASSWORD ---
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- INSERT USER ---
    const [result]: any = await connection.execute(
      `INSERT INTO users 
        (username, password, first_name, last_name, phone, role, user_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, firstName, lastName, phone || null, "user", 1]
    );

    if (result.affectedRows < 1) {
      return NextResponse.json(
        { error: "Failed to register user" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed", details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error("Connection close error:", err);
      }
    }
  }
}
