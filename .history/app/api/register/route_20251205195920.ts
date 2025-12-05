import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { username, password, firstName, lastName, phone } = await req.json();

    if (!username || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // --- CHECK IF USER EXISTS ---
    const { data: existingUsers, error: checkError } = await supabase
      .from("users")
      .select("username")
      .eq("username", username)
      .limit(1);

    if (checkError) {
      console.error("Database error:", checkError);
      return NextResponse.json(
        { error: "Registration failed" },
        { status: 500 }
      );
    }

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // --- HASH PASSWORD ---
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- INSERT USER ---
    const { data: result, error: insertError } = await supabase
      .from("users")
      .insert({
        username,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role: "user",
        user_level: 1
      })
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to register user", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error("Registration error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Registration failed", details: errorMessage },
      { status: 500 }
    );
  }
}
