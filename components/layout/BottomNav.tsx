"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FiBook, FiHome, FiCreditCard, FiSettings } from "react-icons/fi";

export default function BottomNav({ onTabChange }: { onTabChange: (tab: string) => void }) {
  // ✅ Default active tab changed to "cashbook"
  const [active, setActive] = useState("cashbook");

  // ✅ Tabs reordered: Cashbook → Debt → Wallet → Business
  const tabs = [
    { id: "ledger", label: "ledger", icon: FiBook },
    { id: "debt", label: "Debt", icon: FiHome },
    { id: "wallet", label: "Wallet", icon: FiCreditCard },
    { id: "business", label: "Business", icon: FiSettings },
  ];

  const handleTabClick = (tabId: string) => {
    setActive(tabId);
    onTabChange(tabId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 flex justify-around items-center py-3 z-50">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => handleTabClick(id)}
          className="flex flex-col items-center text-gray-500 relative"
        >
          {/* Blue dot indicator */}
          {active === id && (
            <motion.div
              layoutId="underline"
              className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-blue-500"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          {/* Icon */}
          <div
            className={`text-xl transition-colors ${
              active === id ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <Icon />
          </div>
          {/* Label */}
          <span
            className={`text-xs ${
              active === id ? "text-blue-600 font-medium" : "text-gray-400"
            }`}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
