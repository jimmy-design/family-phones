import React, { useState } from "react";

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
  salary: number;
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
    salary: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "salary" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/staff-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to add staff");
      }

      await res.json();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError("Unable to save staff member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold">Add Staff</h2>

        {error && (
          <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input name="firstName" placeholder="First Name" required onChange={handleChange} className="input" />
            <input name="lastName" placeholder="Last Name" required onChange={handleChange} className="input" />
          </div>

          <input name="email" type="email" placeholder="Email" onChange={handleChange} className="input" />
          <input name="phone" placeholder="Phone" onChange={handleChange} className="input" />

          <div className="grid grid-cols-2 gap-3">
            <input name="department" placeholder="Department" onChange={handleChange} className="input" />
            <input name="jobTitle" placeholder="Job Title" onChange={handleChange} className="input" />
          </div>

          <input name="salary" type="number" placeholder="Salary" onChange={handleChange} className="input" />

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;
