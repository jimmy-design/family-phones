import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StaffFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  salary: number | "";
  status: "Active" | "Inactive";
}

const AddStaffModal: React.FC<AddStaffModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<StaffFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    jobTitle: "",
    salary: "",
    status: "Active",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        department: "",
        jobTitle: "",
        salary: "",
        status: "Active",
      });
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "salary" ? (value === "" ? "" : Number(value)) : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Enter a valid email";
    if (formData.phone && !/^[0-9+\-\s()]{6,20}$/.test(String(formData.phone))) newErrors.phone = "Enter a valid phone";
    if (formData.salary !== "" && typeof formData.salary === "number" && (isNaN(formData.salary) || formData.salary < 0)) newErrors.salary = "Enter a valid salary";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        department: formData.department.trim() || null,
        jobTitle: formData.jobTitle.trim() || null,
        salary: formData.salary === "" ? null : Number(formData.salary),
        status: formData.status,
      };

      const res = await fetch("/api/staff-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson?.error || "Failed to add staff");

      await Swal.fire({
        icon: "success",
        title: "Staff added",
        text: resJson?.message || "Staff member added successfully",
        timer: 1400,
        showConfirmButton: false,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save. Try again.";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Add Staff Member</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              aria-label="Close"
              disabled={loading}
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name <span className="text-red-500">*</span></label>
              <input name="firstName" value={formData.firstName} onChange={handleChange} className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${errors.firstName ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'}`} placeholder="John" />
              {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name <span className="text-red-500">*</span></label>
              <input name="lastName" value={formData.lastName} onChange={handleChange} className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${errors.lastName ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'}`} placeholder="Doe" />
              {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="name@company.com" className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'}`} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" value={formData.phone} onChange={handleChange} placeholder="0712345678" className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${errors.phone ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'}`} />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input name="department" value={formData.department} onChange={handleChange} placeholder="Sales" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
              <input name="jobTitle" value={formData.jobTitle} onChange={handleChange} placeholder="Sales Rep" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
              <input name="salary" type="number" value={formData.salary as any} onChange={handleChange} placeholder="0" className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${errors.salary ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'}`} />
              {errors.salary && <p className="mt-1 text-xs text-red-600">{errors.salary}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${formData.status === 'Active' ? 'bg-green-50 border-green-200 focus:ring-green-100' : 'bg-white border-gray-200 focus:ring-blue-100'}`}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;
