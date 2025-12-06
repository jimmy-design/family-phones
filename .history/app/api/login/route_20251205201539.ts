import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    console.log("Attempting login for user:", username);

    // Query to check credentials and get user details
    const { data: rows, error } = await supabase
      .from("users")
      .select("username, password, first_name, last_name, role, user_level")
      .eq("username", username)
      .limit(1);

    if (error) {
      console.error("Database error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Database error: " + (error.message || "Unknown error") },
        { status: 500 }
      );
    }

    console.log("Query result - rows found:", rows?.length || 0);

    if (rows && rows.length > 0) {
      const user = rows[0];
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      
      if (isValid) {
        // Remove password from user object before sending to client
        const { password: _, ...userWithoutPassword } = user;
        
        // In a real application, you would use proper session management or JWT tokens here
        // For this implementation, we'll just return success with user details
        return NextResponse.json({
          success: true,
          user: userWithoutPassword
        });
      }
    }
    
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}