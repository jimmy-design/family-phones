"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiX } from "react-icons/fi";
import Image from "next/image";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    imei: "",
    model: "",
    name: "",
    price: "",
    offer_price: "",
    quantity: "",
    status: "Available",
    updated_by: "Admin",
  });

  // ✅ Fetch inventory items
  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // ✅ Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Submit new inventory record
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          imei: "",
          model: "",
          name: "",
          price: "",
          offer_price: "",
          quantity: "",
          status: "Available",
          updated_by: "Admin",
        });
        fetchInventory();
      } else {
        alert("Error saving item.");
      }
    } catch (err) {
      console.error("Error saving item:", err);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/family.png"
            alt="Family Phones Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <h1 className="text-2xl font-bold text-gray-800">📦 Inventory Management</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <FiPlus /> Add Inventory
        </button>
      </header>

      {/* Table Section */}
      <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="w-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-700 border-collapse min-w-[800px]">
              <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left">IMEI</th>
                  <th className="px-4 py-2 text-left">Model</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Price</th>
                  <th className="px-4 py-2 text-left">Offer</th>
                  <th className="px-4 py-2 text-left">Qty</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length > 0 ? (
                  inventory.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-2">{item.imei}</td>
                      <td className="px-4 py-2">{item.model}</td>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">Ksh {item.price}</td>
                      <td className="px-4 py-2">Ksh {item.offer_price}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === "Available"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {new Date(item.date_updated).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500">
                      No inventory items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl relative"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                <FiX size={20} />
              </button>

              <h2 className="text-lg font-semibold mb-4 text-gray-700">
                Add Inventory Item
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3">
                {[
                  { label: "IMEI", name: "imei" },
                  { label: "Model", name: "model" },
                  { label: "Name", name: "name" },
                  { label: "Price", name: "price", type: "number" },
                  { label: "Offer Price", name: "offer_price", type: "number" },
                  { label: "Quantity", name: "quantity", type: "number" },
                ].map(({ label, name, type }) => (
                  <div key={name}>
                    <label className="text-sm text-gray-600">{label}</label>
                    <input
                      type={type || "text"}
                      name={name}
                      value={(formData as any)[name]}
                      onChange={handleChange}
                      required={name !== "offer_price"}
                      className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                  </div>
                ))}

                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option>Available</option>
                    <option>Sold Out</option>
                    <option>Reserved</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg mt-4 hover:bg-blue-700"
                >
                  Save Item
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
