"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function SendReminder() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message) {
      alert("Fill all fields");
      return;
    }

    console.log("📩 Sending SMS:", { phone, message });
    alert(`📨 Reminder sent to ${phone}`);
    setPhone("");
    setMessage("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-4 rounded-2xl shadow-md"
    >
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Send Payment Reminder</h2>
      <form onSubmit={handleSend} className="space-y-3">
        <input
          type="tel"
          placeholder="Customer Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-purple-400"
        />
        <textarea
          placeholder="Your reminder message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-purple-400"
          rows={3}
        />
        <button
          type="submit"
          className="w-full bg-purple-600 text-white py-2 rounded-xl hover:bg-purple-700 transition"
        >
          Send Reminder
        </button>
      </form>
    </motion.div>
  );
}
