"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiDownload, FiEdit, FiTrash2, FiDollarSign, FiEye, FiMessageSquare, FiSearch, FiFileText, FiCheckCircle, FiClock, FiX } from "react-icons/fi";
import jsPDF from "jspdf";
import "jspdf-autotable";
import PaymentModal from "@/components/PaymentModal";

interface InvoiceItem {
  id?: number;
  invoice_number: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  reference_number: string;
  customer_id: number;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  payment_method: string;
  currency: string;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Customer {
  customer_id: number;
  full_name: string;
  phone_number: string;
}

interface InventoryItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    invoice_number: "",
    reference_number: "",
    customer_id: 0,
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    amount_paid: 0,
    payment_status: "Unpaid",
    payment_method: "",
    currency: "KES",
    notes: "",
    created_by: "Admin",
  });
  const [selectedItems, setSelectedItems] = useState<{ item: InventoryItem; quantity: number }[]>([]);
  const [existingInvoiceItems, setExistingInvoiceItems] = useState<InvoiceItem[]>([]);
  const [taxType, setTaxType] = useState<string>("none");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const filteredInvoices = invoices.filter((invoice) => {
    const customer = customers.find(c => c.customer_id === invoice.customer_id);
    const query = search.trim().toLowerCase();
    return (statusFilter === "All" || (invoice.payment_status || "Unpaid") === statusFilter)
      && [invoice.invoice_number, invoice.reference_number, customer?.full_name, customer?.phone_number]
        .some(value => value?.toLowerCase().includes(query));
  });
  const formatMoney = (value: number, currency = "KES") =>
    `${currency} ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const currencyTotals = (field: "total_amount" | "amount_paid" | "balance_due") => {
    const totals = invoices.reduce<Record<string, number>>((result, invoice) => {
      const currency = invoice.currency || "KES";
      result[currency] = (result[currency] || 0) + Number(invoice[field] || 0);
      return result;
    }, {});
    return Object.entries(totals).map(([currency, total]) => formatMoney(total, currency)).join(" / ") || formatMoney(0);
  };
  const statusStyles: Record<string, string> = {
    Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    "Partially Paid": "bg-amber-50 text-amber-700 ring-amber-600/20",
    Overdue: "bg-rose-50 text-rose-700 ring-rose-600/20",
    Unpaid: "bg-slate-100 text-slate-600 ring-slate-500/20",
  };

  // Fetch invoices, customers, and inventory items
  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchInventoryItems();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/invoices");
      if (!response.ok) throw new Error("Failed to load invoices");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid invoice response");
      setInvoices(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setLoadError("We could not load your invoices. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const response = await fetch("/api/inventory");
      const data = await response.json();
      setInventoryItems(data);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "customer_id" || name === "amount_paid" || name === "tax_amount" || name === "discount_amount" 
        ? Number(value) : value
    });
  };

  const handleAddItem = (item: InventoryItem) => {
    const existingItem = selectedItems.find(i => i.item.id === item.id);
    if (existingItem) {
      setSelectedItems(selectedItems.map(i => 
        i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter(i => i.item.id !== itemId));
  };

  const calculateTotals = () => {
    // Calculate subtotal from new selected items
    const newItemsSubtotal = selectedItems.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
    // Calculate subtotal from existing invoice items
    const existingItemsSubtotal = existingInvoiceItems.reduce((sum, item) => sum + item.total_price, 0);
    const subtotal = newItemsSubtotal + existingItemsSubtotal;
    
    const taxAmount = formData.tax_amount;
    const discountAmount = formData.discount_amount;
    const totalAmount = subtotal + taxAmount - discountAmount;
    
    // Calculate balance due
    const balanceDue = Math.max(0, totalAmount - formData.amount_paid);
    
    // Determine payment status based on amounts
    let paymentStatus = formData.payment_status;
    if (formData.amount_paid <= 0) {
      paymentStatus = "Unpaid";
    } else if (formData.amount_paid >= totalAmount) {
      paymentStatus = "Paid";
    } else {
      paymentStatus = "Partially Paid";
    }

    setFormData({
      ...formData,
      subtotal,
      total_amount: totalAmount,
      payment_status: paymentStatus
    });
  };

  useEffect(() => {
    calculateTotals();
  }, [selectedItems, existingInvoiceItems, formData.tax_amount, formData.discount_amount, formData.amount_paid]);

  // Recalculate tax amount when tax type or selected items change
  useEffect(() => {
    const newItemsSubtotal = selectedItems.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
    const existingItemsSubtotal = existingInvoiceItems.reduce((sum, item) => sum + item.total_price, 0);
    const subtotal = newItemsSubtotal + existingItemsSubtotal;
    
    let percent = 0;
    if (taxType === "vat") percent = 0.16;
    else if (taxType === "levy") percent = 0.015;
    else if (taxType === "withholding") percent = 0.05;

    const newTax = +(subtotal * percent).toFixed(2);
    setFormData((f) => ({ ...f, tax_amount: newTax }));
  }, [taxType, selectedItems, existingInvoiceItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Prepare items for submission
      const newItems = selectedItems.map(si => ({
        description: si.item.name,
        quantity: si.quantity,
        unit_price: si.item.price,
        total_price: si.item.price * si.quantity
      }));

      if (isEditing) {
        // For editing, we need to update the invoice and its items
        const url = "/api/invoices";
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            id: currentInvoice?.id,
            items: newItems,
            existingItems: existingInvoiceItems
          }),
        });

        if (response.ok) {
          fetchInvoices();
          resetForm();
        } else {
          console.error("Failed to update invoice");
        }
      } else {
        // For new invoice, include items in the request
        const url = "/api/invoices";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            items: newItems
          }),
        });

        if (response.ok) {
          fetchInvoices();
          resetForm();
        } else {
          console.error("Failed to save invoice");
        }
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
    }
  };

  const handleEdit = async (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setFormData({
      invoice_number: invoice.invoice_number,
      reference_number: invoice.reference_number,
      customer_id: invoice.customer_id,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      discount_amount: invoice.discount_amount,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid,
      payment_status: invoice.payment_status,
      payment_method: invoice.payment_method,
      currency: invoice.currency,
      notes: invoice.notes,
      created_by: invoice.created_by,
    });
    setIsEditing(true);
    setShowModal(true);
    
    // Fetch existing invoice items
    setIsLoadingItems(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.invoice_number}/items`);
      if (response.ok) {
        const items: InvoiceItem[] = await response.json();
        setExistingInvoiceItems(items);
      }
    } catch (error) {
      console.error("Error fetching invoice items:", error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        const response = await fetch("/api/invoices", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        if (response.ok) {
          fetchInvoices();
        } else {
          console.error("Failed to delete invoice");
        }
      } catch (error) {
        console.error("Error deleting invoice:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_number: "",
      reference_number: "",
      customer_id: 0,
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: "",
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
      amount_paid: 0,
      payment_status: "Unpaid",
      payment_method: "",
      currency: "KES",
      notes: "",
      created_by: "Admin",
    });
    setSelectedItems([]);
    setExistingInvoiceItems([]);
    setShowModal(false);
    setIsEditing(false);
    setCurrentInvoice(null);
  };

  // Function to remove an existing invoice item
  const handleRemoveExistingItem = (itemId: number) => {
    setExistingInvoiceItems(existingInvoiceItems.filter(item => item.id !== itemId));
  };

  // Function to update quantity of existing invoice item
  const handleUpdateExistingItemQuantity = (itemId: number, newQuantity: number) => {
    setExistingInvoiceItems(existingInvoiceItems.map(item => {
      if (item.id === itemId) {
        const newTotalPrice = item.unit_price * newQuantity;
        return { ...item, quantity: newQuantity, total_price: newTotalPrice };
      }
      return item;
    }));
  };

  // Generate PDF with items fetched from database
  const generatePDF = async (invoice: Invoice) => {
    // Fetch invoice items from database
    let invoiceItems: InvoiceItem[] = [];
    try {
      const response = await fetch(`/api/invoices/${invoice.invoice_number}/items`);
      if (response.ok) {
        invoiceItems = await response.json();
      }
    } catch (error) {
      console.error("Error fetching invoice items for PDF:", error);
    }

    const doc = new jsPDF() as any;
    
    // Add title
    const isQuotation = invoice.invoice_number.startsWith("QT");
    doc.setFontSize(20);
    doc.text(isQuotation ? "QUOTATION" : "INVOICE", 105, 20, { align: "center" });
    
    // Add company info
    doc.setFontSize(12);
    doc.text("Family Phones", 20, 30);
    doc.text("Nairobi, Kenya", 20, 37);
    doc.text("info@familyphones.co.ke", 20, 44);
    
    // Add invoice info
    doc.text(`${isQuotation ? "Quotation" : "Invoice"} Number: ${invoice.invoice_number}`, 140, 30);
    doc.text(`Date: ${invoice.invoice_date}`, 140, 37);
    doc.text(`Due Date: ${invoice.due_date || "N/A"}`, 140, 44);
    
    // Add customer info
    const customer = customers.find(c => c.customer_id === invoice.customer_id);
    if (customer) {
      doc.text("Bill To:", 20, 60);
      doc.text(customer.full_name, 20, 67);
      doc.text(customer.phone_number || "", 20, 74);
    }
    
    // Add items table with items from database
    (doc as any).autoTable({
      startY: 85,
      head: [['Item', 'Unit Price', 'Quantity', 'Total']],
      body: invoiceItems.map(item => [
        item.description,
        `${invoice.currency} ${item.unit_price.toFixed(2)}`,
        item.quantity,
        `${invoice.currency} ${item.total_price.toFixed(2)}`
      ]),
    });
    
    // Add totals
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.text(`Subtotal: ${invoice.currency} ${invoice.subtotal.toFixed(2)}`, 140, finalY + 10);
    doc.text(`Tax: ${invoice.currency} ${invoice.tax_amount.toFixed(2)}`, 140, finalY + 17);
    doc.text(`Discount: ${invoice.currency} ${invoice.discount_amount.toFixed(2)}`, 140, finalY + 24);
    doc.setFontSize(14);
    doc.text(`Total: ${invoice.currency} ${invoice.total_amount.toFixed(2)}`, 140, finalY + 33);
    doc.setFontSize(12);
    doc.text(`Amount Paid: ${invoice.currency} ${invoice.amount_paid.toFixed(2)}`, 140, finalY + 42);
    doc.text(`Balance Due: ${invoice.currency} ${(invoice.balance_due || 0).toFixed(2)}`, 140, finalY + 49);
    
    // Add payment status
    doc.text(`Payment Status: ${invoice.payment_status || "Unpaid"}`, 20, finalY + 20);
    
    // Add notes if any
    if (invoice.notes) {
      doc.text("Notes:", 20, finalY + 60);
      doc.setFontSize(10);
      doc.text(invoice.notes, 20, finalY + 67, { maxWidth: 170 });
    }
    
    // Save the PDF
    doc.save(`${isQuotation ? "quotation" : "invoice"}-${invoice.invoice_number}.pdf`);
  };

  // Handle View button click - generates PDF
  const handleView = async (invoice: Invoice) => {
    if (typeof window !== "undefined") {
      await generatePDF(invoice);
    }
  };

  const handleOpenPaymentModal = (invoice?: Invoice) => {
    setSelectedInvoiceForPayment(invoice || null);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoiceForPayment(null);
  };

  const handlePaymentRecorded = () => {
    fetchInvoices();
  };

  const handleSendReminders = async () => {
    if (isSendingReminders) return;
    
    const partiallyPaidCount = invoices.filter(inv => inv.payment_status === "Partially Paid").length;
    
    if (partiallyPaidCount === 0) {
      alert("No customers with partially paid invoices to remind.");
      return;
    }
    
    if (!window.confirm(`Send payment reminders to ${partiallyPaidCount} customer(s) with partially paid invoices?`)) {
      return;
    }
    
    setIsSendingReminders(true);
    try {
      const response = await fetch("/api/invoices/remind", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Payment reminders sent!\n\nSent: ${data.sent}\nFailed: ${data.failed}\nTotal: ${data.total}`);
      } else {
        alert(`Failed to send reminders: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error sending reminders:", error);
      alert("Failed to send payment reminders. Please try again.");
    } finally {
      setIsSendingReminders(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-600">Billing & payments</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="mt-2 text-sm text-slate-500">Manage invoices, track balances, and keep payments moving.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center text-sm font-semibold shadow-sm transition-colors"
          >
            <FiPlus className="mr-2" />
            Generate Invoice
          </button>
          <button
            onClick={handleSendReminders}
            disabled={isSendingReminders}
            className="border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 px-4 py-2.5 rounded-xl flex items-center text-sm font-medium transition-colors"
          >
            <FiMessageSquare className="mr-2" />
            {isSendingReminders ? "Sending..." : "Remind"}
          </button>
          <button
            onClick={() => handleOpenPaymentModal()}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl flex items-center text-sm font-medium transition-colors"
          >
            <FiDollarSign className="mr-2" />
            Update Payment
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total invoices", value: invoices.length.toLocaleString(), icon: FiFileText, color: "bg-blue-50 text-blue-600" },
          { label: "Total invoiced", value: currencyTotals("total_amount"), icon: FiDollarSign, color: "bg-indigo-50 text-indigo-600" },
          { label: "Payments received", value: currencyTotals("amount_paid"), icon: FiCheckCircle, color: "bg-emerald-50 text-emerald-600" },
          { label: "Outstanding balance", value: currencyTotals("balance_due"), icon: FiClock, color: "bg-amber-50 text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span className={`rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></span>
            </div>
            <p className="break-words text-xl font-semibold tracking-tight text-slate-900">{isLoading ? "..." : loadError ? "Unavailable" : value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">All invoices</h2>
            <p className="mt-1 text-sm text-slate-500" aria-live="polite">{filteredInvoices.length} of {invoices.length} invoices</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input aria-label="Search invoices" type="search" placeholder="Search invoice or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-blue-500 sm:w-72" />
            </div>
            <select aria-label="Filter by payment status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500">
              <option value="All">All statuses</option>
              {["Unpaid", "Partially Paid", "Paid", "Overdue"].map(status => <option key={status}>{status}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!isLoading && !loadError && filteredInvoices.map((invoice) => {
              const customer = customers.find(c => c.customer_id === invoice.customer_id);
              return (
                <tr key={invoice.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer?.full_name || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.invoice_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.due_date || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatMoney(invoice.total_amount, invoice.currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatMoney(invoice.amount_paid, invoice.currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatMoney(invoice.balance_due, invoice.currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[invoice.payment_status || "Unpaid"] || statusStyles.Unpaid}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{invoice.payment_status || "Unpaid"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleView(invoice)}
                      title="View/Download PDF" aria-label="View/Download PDF"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <FiEye />
                    </button>
                    <button
                      onClick={() => handleEdit(invoice)}
                      title="Edit Invoice" aria-label="Edit Invoice"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={() => handleView(invoice)}
                      title="Download PDF" aria-label="Download PDF"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <FiDownload />
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      title="Delete Invoice" aria-label="Delete Invoice"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              );
            })}
            {(isLoading || loadError || filteredInvoices.length === 0) && (
              <tr><td colSpan={9} className="px-6 py-16 text-center">
                <FiFileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="font-medium text-slate-700" role="status">{isLoading ? "Loading invoices..." : loadError || (invoices.length ? "No matching invoices" : "Your first invoice starts here")}</p>
                {!isLoading && !loadError && <p className="mt-2 text-sm text-slate-500">{invoices.length ? "Try another search or change the status filter." : "Generate an invoice to start tracking customer payments."}</p>}
                {loadError && <button onClick={fetchInvoices} className="mt-3 text-sm font-semibold text-blue-600">Try again</button>}
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50">
          <div role="dialog" aria-modal="true" aria-labelledby="invoice-dialog-title" className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 id="invoice-dialog-title" className="text-xl font-bold text-gray-800">
                  {isEditing ? "Edit Invoice" : "Generate New Invoice"}
                </h2>
                <button 
                  onClick={resetForm}
                  aria-label="Close invoice form" className="rounded-lg p-2 text-gray-500 hover:bg-slate-100 hover:text-gray-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      name="invoice_number"
                      value={formData.invoice_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                    <input
                      type="text"
                      name="reference_number"
                      value={formData.reference_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Customer</option>
                      {customers.map((customer) => (
                        <option key={customer.customer_id} value={customer.customer_id}>
                          {customer.full_name} ({customer.phone_number})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      name="invoice_date"
                      value={formData.invoice_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <select
                      name="payment_status"
                      value={formData.payment_status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <input
                      type="text"
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
                    <input
                      type="number"
                      name="tax_amount"
                      value={formData.tax_amount}
                      onChange={handleInputChange}
                      readOnly={taxType !== "none"}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
                    <input
                      type="number"
                      name="discount_amount"
                      value={formData.discount_amount}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax</label>
                  <select
                    name="tax"
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 mb-3"
                  >
                    <option value="none">None</option>
                    <option value="vat">VAT (16%)</option>
                    <option value="levy">Levy (1.5%)</option>
                    <option value="withholding">Withholding Tax (5%)</option>
                  </select>

                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                
                {/* Inventory Items Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Select Items</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {inventoryItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-800">{item.name}</h4>
                            <p className="text-sm text-gray-600">Price: KES {item.price.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">Stock: {item.quantity}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddItem(item)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Selected Items */}
                  {selectedItems.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl p-4">
                      <h4 className="font-medium text-gray-800 mb-3">Selected Items</h4>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Item</th>
                            <th className="text-left py-2">Price</th>
                            <th className="text-left py-2">Quantity</th>
                            <th className="text-left py-2">Total</th>
                            <th className="text-left py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItems.map((selectedItem) => (
                            <tr key={selectedItem.item.id} className="border-b">
                              <td className="py-2">{selectedItem.item.name}</td>
                              <td className="py-2">KES {selectedItem.item.price.toFixed(2)}</td>
                              <td className="py-2">
                                <input
                                  type="number"
                                  min="1"
                                  max={selectedItem.item.quantity}
                                  value={selectedItem.quantity}
                                  onChange={(e) => {
                                    const newQuantity = Math.min(
                                      parseInt(e.target.value) || 1,
                                      selectedItem.item.quantity
                                    );
                                    setSelectedItems(
                                      selectedItems.map(i =>
                                        i.item.id === selectedItem.item.id
                                          ? { ...i, quantity: newQuantity }
                                          : i
                                      )
                                    );
                                  }}
                                  className="w-16 px-2 py-1 border rounded"
                                />
                              </td>
                              <td className="py-2">
                                KES {(selectedItem.item.price * selectedItem.quantity).toFixed(2)}
                              </td>
                              <td className="py-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(selectedItem.item.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Existing Invoice Items (shown when editing) */}
                  {isEditing && (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl p-4 mt-4">
                      <h4 className="font-medium text-gray-800 mb-3">Existing Invoice Items</h4>
                      {isLoadingItems ? (
                        <p className="text-gray-500">Loading items...</p>
                      ) : existingInvoiceItems.length > 0 ? (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Item</th>
                              <th className="text-left py-2">Price</th>
                              <th className="text-left py-2">Quantity</th>
                              <th className="text-left py-2">Total</th>
                              <th className="text-left py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {existingInvoiceItems.map((item) => (
                              <tr key={item.id} className="border-b">
                                <td className="py-2">{item.description}</td>
                                <td className="py-2">KES {item.unit_price.toFixed(2)}</td>
                                <td className="py-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQuantity = parseInt(e.target.value) || 1;
                                      handleUpdateExistingItemQuantity(item.id!, newQuantity);
                                    }}
                                    className="w-16 px-2 py-1 border rounded"
                                  />
                                </td>
                                <td className="py-2">
                                  KES {item.total_price.toFixed(2)}
                                </td>
                                <td className="py-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveExistingItem(item.id!)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-gray-500">No existing items found for this invoice.</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Totals */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="font-medium">KES {formData.subtotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tax</p>
                      <p className="font-medium">KES {formData.tax_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Discount</p>
                      <p className="font-medium">KES {formData.discount_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="font-medium text-lg">KES {formData.total_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Amount Paid</p>
                      <input
                        type="number"
                        name="amount_paid"
                        value={formData.amount_paid}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1 border rounded"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Balance Due</p>
                      <p className="font-medium text-lg">
                        KES {Math.max(0, formData.total_amount - formData.amount_paid).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {isEditing ? "Update Invoice" : "Generate Invoice"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handleClosePaymentModal}
        invoice={selectedInvoiceForPayment}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  );
}