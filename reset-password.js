const bcrypt = require("bcrypt");

async function hashPassword() {
  const password = "your_new_password"; // Change this to your desired password
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log("Hashed password:", hash);
    console.log("Update your database with this hash:");
    console.log(`UPDATE users SET password = '${hash}' WHERE username = 'james';`);
  } catch (error) {
    console.error("Error hashing password:", error);
  }
}

hashPassword();