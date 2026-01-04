"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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

  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4 py-8">
      {/* Subtle background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-60 w-60 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 px-8 py-7 md:px-9 md:py-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="inline-flex items-center justify-center rounded-full bg-slate-100 p-3 mb-3 shadow-inner">
              <img
                src="/family.png"
                alt="Family Phones Logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Family Phones
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Sign in to continue to your business dashboard
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="peer w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter your username"
                  required
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-300 peer-focus:text-blue-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-3.33 0-6 1.34-6 3v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1c0-1.66-2.67-3-6-3Z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter your password"
                  required
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-300 peer-focus:text-blue-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M17 9V7a5 5 0 0 0-10 0v2H5v10h14V9h-2Zm-8-2a3 3 0 0 1 6 0v2H9V7Zm3 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Use your admin credentials to login</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="group relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 focus:ring-offset-slate-900"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
              <span className="relative">Sign in</span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 border-t border-slate-100 pt-3 text-center">
            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Family Phones. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
