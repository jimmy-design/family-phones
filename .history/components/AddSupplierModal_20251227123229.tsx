"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierAdded?: () => void;
}

export default function AddSupplierModal({ isOpen, onClose, onSupplierAdded }: AddSupplierModalProps) {
  const [refno, setRefno] = useState("");
  const [name, setName] = useState("");
  const [totalOwed, setTotalOwed] = useState<string>("0.00");
  const [paid, setPaid] = useState<string>("0.00");
  const [status, setStatus] = useState<"unpaid"|"partial"|"paid">("unpaid");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  useEffect(() => {
    if (!isOpen) {
      setRefno("");
      setName("");
      setTotalOwed("0.00");
      setPaid("0.00");
      setStatus("unpaid");
      setErrors({});
      setLoading(false);
    } else {
      if (!refno) setRefno(`SUP-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string,string> = {};
    if (!name.trim()) e.name = "Supplier name is required";
    if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(totalOwed)) e.totalOwed = "Enter valid amount";
    if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(paid)) e.paid = "Enter valid amount";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        refno,
        name: name.trim(),
        total_owed: Number(totalOwed) || 0,
        paid: Number(paid) || 0,
        status,
      };

      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to add supplier');

      await Swal.fire({ icon: 'success', title: 'Supplier added', timer: 1400, showConfirmButton: false });
      onSupplierAdded?.();
      onClose();
    } catch (err) {
      console.error('Add supplier error', err);
      await Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Failed to add supplier' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Add Supplier</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input value={refno} onChange={(e) => setRefno(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${errors.name ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Owed</label>
              <input value={totalOwed} onChange={(e) => setTotalOwed(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${errors.totalOwed ? 'border-red-300' : 'border-gray-200'}`} />
              {errors.totalOwed && <p className="mt-1 text-xs text-red-600">{errors.totalOwed}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid</label>
              <input value={paid} onChange={(e) => setPaid(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${errors.paid ? 'border-red-300' : 'border-gray-200'}`} />
              {errors.paid && <p className="mt-1 text-xs text-red-600">{errors.paid}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-gray-200">
              <option value="unpaid">unpaid</option>
              <option value="partial">partial</option>
              <option value="paid">paid</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
