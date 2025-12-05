"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function AddBalance() {
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !amount || !date) {
      alert("Please fill all fields");
      return;
    }

    console.log({ customer, amount, date });
    alert(`✅ Added balance for ${customer} - KES ${amount}`);
    setCustomer("");
    setAmount("");
    setDate("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-4 rounded-2xl shadow-md"
    >
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Add New Balance</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Customer Name"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          className="w-full border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="number"
          placeholder="Amount (KES)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition"
        >
          Save Balance
        </button>
      </form>
    </motion.div>
  );
}
