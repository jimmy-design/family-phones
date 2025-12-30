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
  const [phone, setPhone] = useState<string>("");
  const [totalOwed, setTotalOwed] = useState<string>("0.00");
  const [existingPaid, setExistingPaid] = useState<string>("0.00");
  const [pay, setPay] = useState<string>("0.00");
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
      setExistingPaid("0.00");
      setPay("0.00");
      setStatus("unpaid");
      setErrors({});
      setLoading(false);
      // clear global holder
      try { if (typeof window !== 'undefined') (window as any).__supplierToEdit = null; } catch(e){}
    } else {
      if (edit) {
        setRefno(edit.refno || `SUP-${Date.now().toString().slice(-6)}`);
        setName(edit.name || "");
        setPhone(edit.phone || "");
        setTotalOwed(String(edit.total_owed ?? edit.total ?? 0));
        setExistingPaid(String(edit.paid ?? 0));
        setPay("0.00");
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
    const curPaid = parseAmount(existingPaid);
    const additional = parseAmount(pay);
    const finalPaid = +(curPaid + additional);
    const b = +(t - finalPaid);
    setBalance(Number.isFinite(b) ? b : 0);

    // auto-set status
    if (t <= 0) {
      setStatus('unpaid');
    } else if (finalPaid >= t) {
      setStatus('paid');
    } else if (finalPaid > 0 && finalPaid < t) {
      setStatus('partial');
    } else {
      setStatus('unpaid');
    }
  }, [totalOwed, existingPaid, pay]);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string,string> = {};
    if (!name.trim()) e.name = "Supplier name is required";
    if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(totalOwed)) e.totalOwed = "Enter valid amount";
    if (pay && !/^[0-9]+(\.[0-9]{1,2})?$/.test(pay)) e.pay = "Enter valid amount";
    if (phone && !/^[0-9+()\s-]+$/.test(phone)) e.phone = "Enter valid phone";
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
      // Build payload for create/update (exclude paid on updates; use pay separately)
      let res;
      if (edit && edit.id) {
        // Prepare patch payload (do not include paid here since payments are accumulated)
        const patchPayload: any = { id: edit.id };
        if (refno !== undefined) patchPayload.refno = refno;
        if (name !== undefined) patchPayload.name = name.trim();
        if (phone !== undefined) patchPayload.phone = phone.trim();
        patchPayload.total_owed = Number(totalOwed) || 0;
        // allow manual status override if user changed it
        if (status) patchPayload.status = status;

        // If there are fields to update (always total_owed/refno/name/status), call PATCH
        res = await fetch('/api/suppliers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        });

        const patchJson = await res.json();
        // capture json for unified handling below
        var json: any = patchJson;
        if (!res.ok) throw new Error(patchJson?.error || 'Failed to update supplier');

        // If user provided a pay amount (>0), call the pay endpoint to accumulate payments
        const payAmount = Number(pay) || 0;
        if (payAmount > 0) {
          const payRes = await fetch('/api/suppliers/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: edit.id, amount: payAmount }),
          });
          const payJson = await payRes.json();
          if (!payRes.ok) throw new Error(payJson?.error || 'Failed to record payment');
        }
      } else {
        // create - include initial paid amount from `pay`
        const payload: any = {
          refno: refno || undefined,
          name: name.trim(),
          phone: phone || undefined,
          total_owed: Number(totalOwed) || 0,
          paid: Number(pay) || 0,
          status,
        };
        res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      // If json wasn't already captured in the edit branch, read it from the response here
      if (typeof json === 'undefined' || json === null) {
        json = await res.json();
      }
      if (!res.ok) throw new Error(json?.error || (edit ? 'Failed to update supplier' : 'Failed to add supplier'));

      // Success
      await Swal.fire({ icon: 'success', title: edit ? 'Supplier updated' : 'Supplier added', timer: 1400, showConfirmButton: false });
      try { if (typeof window !== 'undefined') (window as any).__supplierToEdit = null; } catch(e){}
      if (edit && edit.id) {
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Paid</label>
              <div className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(existingPaid || 0))}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pay (add amount)</label>
            <input value={pay} onChange={(e) => setPay(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${errors.pay ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.pay && <p className="mt-1 text-xs text-red-600">{errors.pay}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
            <div className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(balance)}</div>
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
