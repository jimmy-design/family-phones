import { getConnection } from "@/lib/db";
import bcrypt from "bcrypt";

async function testCredentials() {
  const username = "your_test_username";
  const password = "your_test_password";

  try {
    const connection = await getConnection();
    
    // Query to check credentials and get user details
    const [rows]: any = await connection.execute(
      "SELECT username, password AS hashedPassword, first_name, last_name, role, user_level FROM users WHERE username = ?",
      [username]
    );
    
    await connection.end();

    if (rows.length > 0) {
      const user = rows[0];
      console.log("User found:", user);
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.hashedPassword);
      console.log("Password valid:", isValid);
      
      if (isValid) {
        console.log("Login would be successful");
      } else {
        console.log("Password does not match");
      }
    } else {
      console.log("User not found");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testCredentials();