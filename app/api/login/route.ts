import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
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

    const connection = await getConnection();
    
    // Query to check credentials and get user details
    const [rows]: any = await connection.execute(
      "SELECT username, password AS hashedPassword, first_name, last_name, role, user_level FROM users WHERE username = ?",
      [username]
    );
    
    await connection.end();

    if (rows.length > 0) {
      const user = rows[0];
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.hashedPassword);
      
      if (isValid) {
        // Remove hashedPassword from user object before sending to client
        const { hashedPassword, ...userWithoutPassword } = user;
        
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
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}