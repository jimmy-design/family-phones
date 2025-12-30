"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierAdded?: () => void;
  initialSupplier?: any | null;
  onSupplierUpdated?: () => void;
}

export default function AddSupplierModal({ isOpen, onClose, onSupplierAdded, initialSupplier, onSupplierUpdated }: AddSupplierModalProps) {
  const [refno, setRefno] = useState("");
  const [name, setName] = useState("");
  const [totalOwed, setTotalOwed] = useState<string>("0.00");
  const [paid, setPaid] = useState<string>("0.00");
  const [status, setStatus] = useState<"unpaid"|"partial"|"paid">("unpaid");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  // initialize from initialSupplier when opening in edit mode
  useEffect(() => {
    // read initialSupplier from props (may be undefined)
    // @ts-ignore
    const init = (typeof (arguments[0]) !== 'undefined' && (arguments[0] as any).initialSupplier) ? (arguments[0] as any).initialSupplier : null;
    // Note: parent will also re-create the component props; to be safe we'll use a simpler pattern below
  }, []);

  useEffect(() => {
    // The component receives props via closure; instead access global initial via (window as any).__initialSupplier if set by parent
    // Instead, we'll rely on prop-driven initialization by reading from dataset attached to DOM is complex; simpler: when modal opens, the parent will reset fields via props - so implement another signature
  }, []);

  // Simpler implementation: use a prop read approach by using default parameters in function signature isn't possible here.
  // To avoid complex runtime coupling, we'll rework the component to accept initialSupplier via a global variable attached to window if provided by parent before opening.

  useEffect(() => {
    // Use prop-driven initialSupplier when provided, otherwise fall back to global holder
    // @ts-ignore
    const globalEdit = (typeof window !== 'undefined' ? (window as any).__supplierToEdit : null) || null;
    const edit = initialSupplier || globalEdit || null;
    if (!isOpen) {
      setRefno("");
      setName("");
      setTotalOwed("0.00");
      setPaid("0.00");
      setStatus("unpaid");
      setErrors({});
      setLoading(false);
      // clear global holder
      try { if (typeof window !== 'undefined') (window as any).__supplierToEdit = null; } catch(e){}
    } else {
      if (edit) {
        setRefno(edit.refno || `SUP-${Date.now().toString().slice(-6)}`);
        setName(edit.name || "");
        setTotalOwed(String(edit.total_owed ?? edit.total ?? 0));
        setPaid(String(edit.paid ?? 0));
        setStatus(edit.status || 'unpaid');
      } else {
        if (!refno) setRefno(`SUP-${Date.now().toString().slice(-6)}`);
      }
    }
  }, [isOpen, initialSupplier]);

  // Recalculate balance and auto-update status when totals change
  useEffect(() => {
    const parseAmount = (s: string) => {
      if (!s && s !== "0") return 0;
      const n = Number(String(s).replace(/[^0-9.-]+/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const t = parseAmount(totalOwed);
    const p = parseAmount(paid);
    const b = +(t - p);
    setBalance(Number.isFinite(b) ? b : 0);

    // auto-set status
    if (t <= 0) {
      setStatus('unpaid');
    } else if (p >= t) {
      setStatus('paid');
    } else if (p > 0 && p < t) {
      setStatus('partial');
    } else {
      setStatus('unpaid');
    }
  }, [totalOwed, paid]);

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
      // Check if editing via global holder
      // @ts-ignore
      const edit = (typeof window !== 'undefined' ? (window as any).__supplierToEdit : null) || null;
      const payload: any = {
        refno,
        name: name.trim(),
        total_owed: Number(totalOwed) || 0,
        paid: Number(paid) || 0,
        status,
      };

      let res;
      if (edit && edit.id) {
        // update
        res = await fetch('/api/suppliers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: edit.id, ...payload }),
        });
      } else {
        // create
        res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || (edit ? 'Failed to update supplier' : 'Failed to add supplier'));

      await Swal.fire({ icon: 'success', title: edit ? 'Supplier updated' : 'Supplier added', timer: 1400, showConfirmButton: false });
      if (edit && edit.id) {
        try { if (typeof window !== 'undefined') (window as any).__supplierToEdit = null; } catch(e){}
        onSupplierUpdated?.();
      } else {
        onSupplierAdded?.();
      }
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
