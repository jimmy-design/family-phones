"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // Set a simple auth token in a cookie (in a real app, use proper session management)
        document.cookie = `authToken=authenticated; path=/; max-age=${60 * 60 * 24 * 7};`; // 7 days
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, firstName, lastName, phone }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message);
        // Optionally, switch to login form after successful registration
        setIsLogin(true);
        // Clear form fields
        setUsername("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setPhone("");
      } else {
        const data = await res.json();
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("An error occurred during registration");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/family.png" 
                alt="Family Phones Logo" 
                className="h-16 w-16 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Family Phones</h1>
            <p className="text-gray-600 mt-2">
              {isLogin ? "Login to your account" : "Create a new account"}
            </p>
          </div>

          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                isLogin
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                !isLogin
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
              >
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Create a password"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone (Optional)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Phone number"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-500 text-sm bg-green-50 p-3 rounded-lg">
                  {success}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
              >
                Create Account
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>© {new Date().getFullYear()} Family Phones. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
