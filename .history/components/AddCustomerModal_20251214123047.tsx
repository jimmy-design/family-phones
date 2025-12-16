"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

interface Installment {
  id: number;
  name: string;
  days: number;
}

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded: () => void;
}

export default function AddCustomerModal({
  isOpen,
  onClose,
  onCustomerAdded,
}: AddCustomerModalProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    id_number: "",
    city: "",
    next_of_kin: "",
    installment_id: "",
  });

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch installments on mount
  useEffect(() => {
    const fetchInstallments = async () => {
      try {
        const res = await fetch("/api/installments");
        if (res.ok) {
          const data = await res.json();
          setInstallments(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch installments:", err);
      }
    };

    if (isOpen) {
      fetchInstallments();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        full_name: "",
        phone_number: "",
        id_number: "",
        city: "",
        next_of_kin: "",
        installment_id: "",
      });
      setErrors({});
      setSubmitError("");
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Full name is required
    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = "Full name must be at least 2 characters";
    }

    // Phone number validation (optional but if provided, must be valid)
    if (formData.phone_number && !/^[0-9+\-\s()]{7,15}$/.test(formData.phone_number)) {
      newErrors.phone_number = "Please enter a valid phone number";
    }

    // ID number validation (optional but if provided, must be valid)
    if (formData.id_number && !/^[0-9]{5,12}$/.test(formData.id_number)) {
      newErrors.id_number = "Please enter a valid ID number (5-12 digits)";
    }

    // Installment ID is required
    if (!formData.installment_id) {
      newErrors.installment_id = "Please select an installment plan";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim() || null,
        id_number: formData.id_number.trim() || null,
        city: formData.city.trim() || "",
        next_of_kin: formData.next_of_kin.trim() || null,
        installment_id: Number(formData.installment_id),
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      
      if (!res.ok) {
        console.error("API Error:", responseData);
        throw new Error(responseData.error || "Failed to add customer");
      }

      // Success - show SweetAlert, then notify parent and close modal
      await Swal.fire({
        icon: "success",
        title: "Customer added",
        text: responseData?.message || "Customer added successfully",
        timer: 1800,
        showConfirmButton: false,
      });

      onCustomerAdded();
      onClose();
    } catch (err) {
      console.error("Error adding customer:", err);
      setSubmitError(
        err instanceof Error ? err.message : "Failed to add customer. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Add New Customer</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="Enter full name"
              className={`w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                errors.full_name
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-300 focus:ring-blue-200"
              }`}
              disabled={isSubmitting}
            />
            {errors.full_name && (
              <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleInputChange}
              placeholder="e.g., 0712345678"
              className={`w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                errors.phone_number
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-300 focus:ring-blue-200"
              }`}
              disabled={isSubmitting}
            />
            {errors.phone_number && (
              <p className="mt-1 text-xs text-red-600">{errors.phone_number}</p>
            )}
          </div>

          {/* ID Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ID Number
            </label>
            <input
              type="text"
              name="id_number"
              value={formData.id_number}
              onChange={handleInputChange}
              placeholder="Enter ID number"
              className={`w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                errors.id_number
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-300 focus:ring-blue-200"
              }`}
              disabled={isSubmitting}
            />
            {errors.id_number && (
              <p className="mt-1 text-xs text-red-600">{errors.id_number}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Enter city"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={isSubmitting}
            />
          </div>

          {/* Next of Kin */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Next of Kin
            </label>
            <input
              type="text"
              name="next_of_kin"
              value={formData.next_of_kin}
              onChange={handleInputChange}
              placeholder="Enter next of kin name"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              disabled={isSubmitting}
            />
          </div>

          {/* Installment Plan */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Installment Plan <span className="text-red-500">*</span>
            </label>
            <select
              name="installment_id"
              value={formData.installment_id}
              onChange={handleInputChange}
              className={`w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                errors.installment_id
                  ? "border-red-300 focus:ring-red-200"
                  : "border-gray-300 focus:ring-blue-200"
              }`}
              disabled={isSubmitting}
            >
              <option value="">Select an installment plan</option>
              {installments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.days} days)
                </option>
              ))}
            </select>
            {errors.installment_id && (
              <p className="mt-1 text-xs text-red-600">{errors.installment_id}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
