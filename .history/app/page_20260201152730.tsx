"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import BottomNav from "@/components/layout/BottomNav";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { FiLogOut, FiX } from "react-icons/fi";
import Swal from 'sweetalert2';
import PaymentModal from '@/components/PaymentModal';
import AddCustomerModal from '@/components/AddCustomerModal';
import AddStaffModal from '@/components/AddStaffModal';
import AddSupplierModal from '@/components/AddSupplierModal';
import { supabase } from '@/lib/db';

/* ----- Types ----- */
interface InventoryItem {
  id: number;
  imei?: string;
  model?: string;
  name?: string;
  price: number;
  offer_price?: number;
  status?: string;
  quantity?: number;
}
interface Customer {
  customer_id: number;
  full_name: string;
  phone_number?: string;
  id_number?: string;
  product_id?: number;
  product_name?: string;
  total_price?: number;
  amount_deposited?: number;
  payment_status?: string;
  payment_type?: string;
}

interface SaleRecord {
  id?: number;
  transaction_number: string;
  customer_id: number;
  item_id: number;
  item: string;
  amount: number;
  deposit_amount: number;
  payment_method: "Cash" | "Mpesa" | "Card" | "Bank" | "Credit";
  sale_date?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function HomePage() {
  const router = useRouter();
  
  /* ----- UI state ----- */
  const [activeTab, setActiveTab] = useState("ledger");
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [supplierToEdit, setSupplierToEdit] = useState<any | null>(null);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    imei: "",
    model: "",
    name: "",
    price: "",
    offer_price: "",
    quantity: "",
    status: "Available",
    updated_by: "Admin",
  });

  /* ----- Data ----- */
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);

  /* ----- Modal & selection state ----- */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [saleType, setSaleType] = useState<"normal" | "lpp">("normal");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "Cash" | "Mpesa" | "Card" | "Bank" | "Credit"
  >("Cash");

  /* ----- Customer search UI for LPP ----- */
  const [customerSearch, setCustomerSearch] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  /* ----- Confirmation modal ----- */
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* ----- Invoice/Quotation Modal State ----- */
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"invoice" | "quotation">("invoice");
  const [invoiceCustomerId, setInvoiceCustomerId] = useState<number>(0);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 1, rate: 0, amount: 0 }
  ]);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [taxType, setTaxType] = useState<string>("none");
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  
  /* ----- Invoice Confirm Modal State ----- */
  const [invoiceConfirmOpen, setInvoiceConfirmOpen] = useState(false);
  const [invoiceSuccessOpen, setInvoiceSuccessOpen] = useState(false);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState("");
  
  /* ----- Invoice Detail View State ----- */
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<any>(null);
  const [invoiceDetailItems, setInvoiceDetailItems] = useState<any[]>([]);
  
  /* ----- Invoice Edit State ----- */
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editingInvoiceData, setEditingInvoiceData] = useState<any>(null);
  const [wasEditingInvoice, setWasEditingInvoice] = useState(false); // Track if last operation was an edit for success modal

  /* ----- Stats / content map ----- */
  const [statistics, setStatistics] = useState<{ label: string; value: number }[]>([]);
  const [totalAmountPaid, setTotalAmountPaid] = useState<number | null>(null);
  const stats = {
    ledger: [
      { label: "Sales Today", value: "14,200" },
      { label: "Expenses", value: "3,500" },
      { label: "New Customers", value: "8" },
    ],
    debt: [
      { label: "Debts Today", value: "12" },
      { label: "Pending Debts", value: "34" },
      { label: "Customers in Debt", value: "27" },
    ],
    wallet: [
      { label: "Wallet Balance", value: "25,000" },
      { label: "Pending Approvals", value: "3" },
      { label: "Transactions", value: "58" },
    ],
    business: [
      { label: "Suppliers", value: "14" },
      { label: "Staff Members", value: "7" },
      { label: "Active Services", value: "12" },
    ],
  };

  useEffect(() => {
    // Fetch aggregated statistics from our API route
    async function fetchStatisticsFromApi() {
      try {
        const res = await fetch('/api/statistics');
        if (!res.ok) {
          console.error('Failed to fetch /api/statistics', await res.text());
          return;
        }
        const json = await res.json();
        const arr = [
          { label: 'Total Amount Paid', value: Number(json.totalAmountPaid) || 0 },
          { label: 'Total Balance Due', value: Number(json.totalBalanceDue) || 0 },
          { label: 'Total Invoices', value: Number(json.totalInvoices) || 0 },
        ];
        setStatistics(arr);
        setTotalAmountPaid(Number(json.totalAmountPaid) || 0);
      } catch (err) {
        console.error('Error fetching statistics from API:', err);
      }
    }

    fetchStatisticsFromApi();
  }, []);

  const contentMap = {
    ledger: {
      title: "Cashbook",
      gradient: "from-green-500/90 via-emerald-500/80 to-lime-400/90",
      // Use dynamic statistics for the main overview
      stats: statistics.length > 0 ? statistics : stats.ledger,
      features: ["Sales", "Expenses", "Inventory", "Purchases"],
    },
    debt: {
      title: "Debt Management",
      gradient: "from-blue-500/90 via-indigo-500/80 to-blue-400/90",
      stats: stats.debt,
      features: [
        "Add New Balance",
        "Send Reminder",
        "Recorded Payments",
        "Invoices & Quotations",
      ],
    },
    wallet: {
      title: "Wallet",
      gradient: "from-indigo-500/90 via-blue-500/80 to-cyan-400/90",
      stats: stats.wallet,
      features: ["Pay", "Deposit", "Withdraw", "Approvals"],
    },
    business: {
      title: "Business Management",
      gradient: "from-amber-500/90 via-orange-500/80 to-yellow-400/90",
      stats: stats.business,
      features: [
        "My Services",
        "Customers",
        "Suppliers",
        "Staff Management",
        "Repeating Balances",
        "Payment Options",
      ],
    },
  };

  const current =
    contentMap[activeTab as keyof typeof contentMap] ?? contentMap["ledger"];

  const isInvoiceFeature = activeFeature?.toLowerCase().includes("invoice") ||
                          activeFeature?.toLowerCase().includes("quotation");

  /* ----- Fetch initial data ----- */

  // Removed broken useEffect that returned JSX. All useEffect hooks must return void or a cleanup function, not JSX.

  /* ----- Generic feature fetch ----- */
  useEffect(() => {
    if (!activeFeature || activeFeature === "Sales") return;

    const fetchData = async () => {
      try {
        let endpoint = "";
        
        // Map feature names to API endpoints
        const featureEndpointMap: { [key: string]: string } = {
          "Customers": "/api/customers",
          "Inventory": "/api/inventory",
          "Invoices & Quotations": "/api/invoices",
          "Recorded Payments": "/api/invoices/outstanding",
          "Add New Balance": "/api/add-balance",
          "Send Reminder": "/api/send-balance",
          "My Services": "/api/my-services",
          "Suppliers": "/api/suppliers",
          "Staff Management": "/api/staff-management",
          "Repeating Balances": "/api/repeating-balances",
          "Payment Options": "/api/payment-options",
          "Pay": "/api/pay",
          "Deposit": "/api/deposit",
          "Withdraw": "/api/withdraw",
          "Approvals": "/api/approval",
          "Expenses": "/api/expenses",
          "Purchases": "/api/purchases",
        };
        
        if (featureEndpointMap[activeFeature]) {
          endpoint = featureEndpointMap[activeFeature];
        } else if (
          activeFeature.toLowerCase().includes("invoice") ||
          activeFeature.toLowerCase().includes("quotation")
        ) {
          endpoint = "/api/invoices";
        } else {
          // Fallback: convert feature name to hyphenated lowercase
          endpoint = `/api/${activeFeature.toLowerCase().replace(/\s+/g, "-")}`;
        }

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          let rows: any[] = [];
          if (Array.isArray(data)) rows = data;
          else if (data && Array.isArray((data as any).data)) rows = (data as any).data;
          else if (data && Array.isArray((data as any).rows)) rows = (data as any).rows;
          else if (data && typeof data === "object") rows = [data];
          setDataRows(rows);
        } else setDataRows([]);
      } catch (err) {
        console.error("Error fetching feature data:", err);
        setDataRows([]);
      }
    };

    fetchData();
  }, [activeFeature]);

  const refreshInventoryRows = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setDataRows(Array.isArray(data) ? data : []);
        setInventory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to refresh inventory:", err);
    }
  };

  const handleInventoryChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setInventoryForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inventoryForm),
      });
      if (res.ok) {
        setIsInventoryModalOpen(false);
        setInventoryForm({
          imei: "",
          model: "",
          name: "",
          price: "",
          offer_price: "",
          quantity: "",
          status: "Available",
          updated_by: "Admin",
        });
        await refreshInventoryRows();
      } else {
        const t = await res.text();
        console.error("Failed to add inventory:", t);
        alert("Error saving item.");
      }
    } catch (err) {
      console.error("Error saving item:", err);
      alert("Error saving item.");
    }
  };

  const filteredRows = dataRows.filter((row) =>
    Object.values(row).some((val) =>
      val?.toString().toLowerCase().includes(search.toLowerCase())
    )
  );

  const getOrderedKeys = (row: any) => {
    let keys = Object.keys(row);
    // Always exclude created/updated timestamp columns (various formats)
    keys = keys.filter((k) => {
      const n = k.toLowerCase().replace(/[_\s]/g, "");
      return n !== "createdat" && n !== "updatedat";
    });

    // Additional exclusions for invoice/quotation views
    if (activeFeature?.toLowerCase().includes("invoice") || activeFeature?.toLowerCase().includes("quotation")) {
      const excludedCols = [
        "created_by",
        "createdby",
        "invoice_date",
        "invoicedate",
        "due_date",
        "duedate",
        "currency",
        "id",
        "reference_number",
        "referencenumber",
        "customer_id",
        "customerid",
        "tax_amount",
        "discount_amount",
        "amount_paid",
        "payment_method",
        "notes",
      ];
      keys = keys.filter((k) => !excludedCols.includes(k.toLowerCase().replace(/_/g, "").replace(/ /g, "")));
    }
    return keys;
  };

  const renderCell = (row: any, key: string) => {
    const val = row[key];
    if (val === null || val === undefined) return "";
    const keyNormalized = key.toLowerCase();
    const formatCurrency = (n: number) => {
      try {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(n);
      } catch (e) {
        return `KES ${n.toFixed(2)}`;
      }
    };

    if (keyNormalized === "balance") {
      const total = Number(row.total_owed || row.total || 0);
      const paid = Number(row.paid || 0);
      const balance = +(total - paid).toFixed(2);
      const isOwed = balance > 0;
      const isClear = balance === 0;
      const cls = isOwed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-semibold ${cls}`}>
          {formatCurrency(balance)}
        </span>
      );
    }
    if (keyNormalized.includes("status")) {
      const isActive = String(val).toLowerCase() === "active";
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-semibold ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
          {String(val)}
        </span>
      );
    }
    return String(val);
  };

  const getKeysForFeature = (row: any) => {
    const keys = getOrderedKeys(row);
    if (activeFeature === "Suppliers") {
      const copy = [...keys];
      // Ensure phone column is placed right after name (if phone exists)
      const nameIdx = copy.findIndex(k => k.toLowerCase() === "name");
      const phoneIdx = copy.findIndex(k => k.toLowerCase() === "phone");
      if (phoneIdx >= 0 && nameIdx >= 0) {
        // remove existing phone position
        copy.splice(phoneIdx, 1);
        // insert after nameIdx (if phone was before name, nameIdx shifts by -1)
        const insertAt = phoneIdx < nameIdx ? nameIdx : nameIdx + 1;
        copy.splice(insertAt, 0, "phone");
      }

      // insert 'balance' immediately after total_owed
      const idx = copy.findIndex(k => k.toLowerCase() === "total_owed");
      if (idx >= 0) {
        // avoid duplicate
        if (!copy.includes("balance")) {
          copy.splice(idx + 1, 0, "balance");
        }
      }
      return copy;
    }
    return keys;
  };

  /* ----- Auto-select exact item matches ----- */
  useEffect(() => {
    if (!query) {
      setSelectedItem(null);
      return;
    }
    const q = query.trim().toLowerCase();
    const match = inventory.find(
      (i) =>
        (i.name && i.name.toLowerCase() === q) ||
        (i.model && i.model.toLowerCase() === q) ||
        (i.imei && i.imei.toLowerCase() === q)
    );
    setSelectedItem(match || null);
  }, [query, inventory]);

  /* ----- Customer search for LPP ----- */
  useEffect(() => {
    if (!customerSearch) {
      setFilteredCustomers([]);
      return;
    }
    const q = customerSearch.trim().toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (c) =>
          (c.full_name && c.full_name.toLowerCase().includes(q)) ||
          (c.phone_number && c.phone_number.toLowerCase().includes(q))
      )
    );
  }, [customerSearch, customers]);

  /* ----- Helper: generate transaction number ----- */
  const genTransactionNumber = () => {
    const t = Date.now().toString();
    const r = Math.floor(Math.random() * 9000 + 1000).toString();
    return `TX${t}${r}`;
    
  };

  /* ----- Build sale payload ----- */
  const buildSalePayload = (): SaleRecord | null => {
    if (!selectedItem) {
      alert("Please select an item.");
      return null;
    }

    const price = Number(selectedItem.offer_price ?? selectedItem.price ?? 0);
    if (!price || isNaN(price)) {
      alert("Selected item price is invalid.");
      return null;
    }

    let deposit = price;
    let customerId = 0;

    if (saleType === "lpp") {
      if (!selectedCustomer) {
        alert("Please select a customer for Lipa Pole Pole.");
        return null;
      }
      customerId = selectedCustomer.customer_id;
      const parsed = parseFloat(depositAmount || "0");
      if (!parsed || isNaN(parsed) || parsed <= 0) {
        alert("Enter a valid deposit amount for Lipa Pole Pole.");
        return null;
      }
      if (parsed > price) {
        alert("Deposit cannot exceed total price.");
        return null;
      }
      deposit = parsed;
    } else {
      customerId = selectedCustomerId ?? 0;
      deposit = price;
    }

    return {
      transaction_number: genTransactionNumber(),
      customer_id: customerId,
      item_id: selectedItem.id,
      item: selectedItem.name ?? selectedItem.model ?? `Item-${selectedItem.id}`,
      amount: price,
      deposit_amount: deposit,
      payment_method: paymentMethod,
    };
  };

  const handleSaveClick = () => {
    const payload = buildSalePayload();
    if (!payload) return;
    setConfirmOpen(true);
  };

  const performSave = async () => {
    const payload = buildSalePayload();
    if (!payload) {
      setConfirmOpen(false);
      return;
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to save sale:", text);
        alert("Failed to save sale. See console for details.");
        setConfirmOpen(false);
        return;
      }

      const created = await res.json();
      setSales((prev) => [created, ...prev]);
      
      if (activeFeature === "Sales") {
        try {
          const r2 = await fetch("/api/sales");
          if (r2.ok) {
            const all = await r2.json();
            setDataRows(all || []);
          }
        } catch (err) {
          console.error("Failed to refresh sales after save", err);
        }
      }

      setIsModalOpen(false);
      setQuery("");
      setSelectedItem(null);
      setSaleType("normal");
      setSelectedCustomerId(0);
      setSelectedCustomer(null);
      setDepositAmount("");
      setPaymentMethod("Cash");
      setConfirmOpen(false);
      alert("Sale saved successfully.");
    } catch (err) {
      console.error(err);
      alert("Error saving sale. Check console.");
      setConfirmOpen(false);
    }
  };

  /* ----- Invoice/Quotation Functions ----- */
  const handleAddInvoiceItem = () => {
    const newId = (invoiceItems.length + 1).toString();
    setInvoiceItems([
      ...invoiceItems,
      { id: newId, description: "", quantity: 1, rate: 0, amount: 0 }
    ]);
  };

  const handleRemoveInvoiceItem = (id: string) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };

  const handleSendReminders = async () => {
    if (isSendingReminders) return;
    
    const partiallyPaidCount = dataRows.filter((row: any) => row.payment_status === "Partially Paid").length;
    
    if (partiallyPaidCount === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Reminders to Send',
        text: 'No customers with partially paid invoices found.',
        confirmButtonColor: '#7c3aed'
      });
      return;
    }
    
    const result = await Swal.fire({
      icon: 'question',
      title: 'Send Payment Reminders?',
      html: `<p>You are about to send SMS reminders to <strong>${partiallyPaidCount}</strong> customer(s) with partially paid invoices.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Send Reminders',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280'
    });
    
    if (!result.isConfirmed) {
      return;
    }
    
    setIsSendingReminders(true);
    
    // Show loading state
    Swal.fire({
      title: 'Sending Reminders...',
      html: 'Please wait while we send SMS reminders to customers.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    try {
      const response = await fetch("/api/invoices/remind", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Reminders Sent!',
          html: `
            <div class="text-left">
              <p><strong>Sent:</strong> ${data.sent}</p>
              <p><strong>Failed:</strong> ${data.failed}</p>
              <p><strong>Total:</strong> ${data.total}</p>
            </div>
          `,
          confirmButtonColor: '#7c3aed'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed to Send',
          text: data.error || 'Unknown error occurred',
          confirmButtonColor: '#7c3aed'
        });
      }
    } catch (error) {
      console.error("Error sending reminders:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send payment reminders. Please try again.',
        confirmButtonColor: '#7c3aed'
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleInvoiceItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(invoiceItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateInvoiceTotal = () => {
    return invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  };

  // Recalculate tax amount when tax type or invoice items change
  useEffect(() => {
    const subtotal = calculateInvoiceTotal();
    let percent = 0;
    if (taxType === "vat") percent = 0.16;
    else if (taxType === "levy") percent = 0.015;
    else if (taxType === "withholding") percent = 0.05;

    const newTax = +(subtotal * percent).toFixed(2);
    setTaxAmount(newTax);
  }, [taxType, invoiceItems]);

  const handleGenerateInvoice = async () => {
    if (!invoiceCustomerId) {
      alert("Please select a customer");
      return;
    }
    if (!invoiceDate) {
      alert("Please enter invoice date");
      return;
    }
    if (!dueDate) {
      alert("Please enter due date");
      return;
    }
    if (invoiceItems.some(item => !item.description || item.quantity <= 0 || item.rate <= 0)) {
      alert("Please fill in all item details with valid values");
      return;
    }

    // Show confirmation modal
    setInvoiceConfirmOpen(true);
  };

  const confirmSaveInvoice = async () => {
    setInvoiceConfirmOpen(false);
    setIsSubmitting(true);

    const subtotal = calculateInvoiceTotal();
    const discountAmount = 0;
    const totalAmount = subtotal + taxAmount - discountAmount;
    
    // When editing, preserve the existing amount_paid and calculate balance
    const existingAmountPaid = isEditingInvoice && editingInvoiceData ? (editingInvoiceData.amount_paid || 0) : 0;
    const balanceDue = Math.max(0, totalAmount - existingAmountPaid);
    
    // Determine payment status based on amounts
    let paymentStatus = "Unpaid";
    if (existingAmountPaid <= 0) {
      paymentStatus = "Unpaid";
    } else if (existingAmountPaid >= totalAmount) {
      paymentStatus = "Paid";
    } else {
      paymentStatus = "Partially Paid";
    }

    const payload = {
      customer_id: invoiceCustomerId,
      invoice_date: invoiceDate,
      due_date: dueDate,
      subtotal: subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      amount_paid: existingAmountPaid,
      payment_status: paymentStatus,
      payment_method: isEditingInvoice && editingInvoiceData ? editingInvoiceData.payment_method : null,
      currency: "KES",
      notes: notes || null,
      type: invoiceType,
      items: invoiceItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.rate,
        total_price: item.amount
      })),
      // Include editing-specific fields
      ...(isEditingInvoice && editingInvoiceData ? {
        id: editingInvoiceData.id,
        invoice_number: editingInvoiceData.invoice_number,
        existingItems: [] // All items are now in the invoiceItems array
      } : {})
    };

    try {
      const res = await fetch("/api/invoices", {
        method: isEditingInvoice ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Failed to ${isEditingInvoice ? 'update' : 'create'} invoice:`, text);
        alert(`Failed to ${isEditingInvoice ? 'update' : 'create'} invoice. See console for details.`);
        setIsSubmitting(false);
        return;
      }

      const result = await res.json();
      setCreatedInvoiceNumber(result.invoice_number);
      
      if (activeFeature?.toLowerCase().includes("invoice") || activeFeature?.toLowerCase().includes("quotation")) {
        const r2 = await fetch("/api/invoices");
        if (r2.ok) {
          const all = await r2.json();
          setDataRows(all || []);
        }
      }

      // Show success modal - track if this was an edit before resetting
      setWasEditingInvoice(isEditingInvoice);
      setIsInvoiceModalOpen(false);
      setInvoiceSuccessOpen(true);
      
      // Reset form and editing state
      setInvoiceCustomerId(0);
      setInvoiceItems([{ id: "1", description: "", quantity: 1, rate: 0, amount: 0 }]);
      setInvoiceDate("");
      setDueDate("");
      setNotes("");
      setTaxType("none");
      setTaxAmount(0);
      setInvoiceType("invoice");
      setIsEditingInvoice(false);
      setEditingInvoiceData(null);
    } catch (err) {
      console.error(err);
      alert(`Error ${isEditingInvoice ? 'updating' : 'creating'} invoice. Check console.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ----- Open Invoice Detail View ----- */
  const openInvoiceDetail = async (invoice: any) => {
    setSelectedInvoiceDetail(invoice);
    
    // Fetch invoice items
    try {
      const res = await fetch(`/api/invoices/${invoice.invoice_number}/items`);
      if (res.ok) {
        const items = await res.json();
        setInvoiceDetailItems(items || []);
      }
    } catch (err) {
      console.error("Failed to load invoice items:", err);
      setInvoiceDetailItems([]);
    }
  };

  const closeInvoiceDetail = () => {
    setSelectedInvoiceDetail(null);
    setInvoiceDetailItems([]);
  };

  /* ----- Open Edit Invoice Modal ----- */
  const openEditInvoice = async (invoice: any) => {
    setEditingInvoiceData(invoice);
    setIsEditingInvoice(true);
    
    // Pre-populate the invoice form with existing data
    setInvoiceCustomerId(invoice.customer_id || 0);
    setInvoiceDate(invoice.invoice_date || "");
    setDueDate(invoice.due_date || "");
    setNotes(invoice.notes || "");
    setInvoiceType(invoice.invoice_number?.startsWith('QT') ? "quotation" : "invoice");
    
    // Fetch existing invoice items
    try {
      const res = await fetch(`/api/invoices/${invoice.invoice_number}/items`);
      if (res.ok) {
        const items = await res.json();
        if (items && items.length > 0) {
          setInvoiceItems(items.map((item: any, index: number) => ({
            id: (index + 1).toString(),
            description: item.description || "",
            quantity: item.quantity || 1,
            rate: item.unit_price || 0,
            amount: item.total_price || 0
          })));
        } else {
          setInvoiceItems([{ id: "1", description: "", quantity: 1, rate: 0, amount: 0 }]);
        }
      }
    } catch (err) {
      console.error("Failed to load invoice items for editing:", err);
      setInvoiceItems([{ id: "1", description: "", quantity: 1, rate: 0, amount: 0 }]);
    }
    
    // Open the invoice modal
    setIsInvoiceModalOpen(true);
  };

  
  
  const shareInvoice = async () => {
  try {
    const invoiceElement = document.getElementById('invoice-content');
    if (!invoiceElement) {
      alert("Could not find invoice content");
      return;
    }

    // Store original styles
    const originalStyle = {
      overflow: invoiceElement.style.overflow,
      maxHeight: invoiceElement.style.maxHeight,
      position: invoiceElement.style.position,
    };

    // Optimize for PDF rendering - A4 full size
    invoiceElement.style.overflow = 'visible';
    invoiceElement.style.maxHeight = 'none';
    invoiceElement.style.position = 'relative';

    // Wait for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture with HIGH quality for A4
    const canvas = await html2canvas(invoiceElement, {
      scale: 3, // High quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowHeight: invoiceElement.scrollHeight,
      height: invoiceElement.scrollHeight,
    });

    // Restore original styles
    invoiceElement.style.overflow = originalStyle.overflow;
    invoiceElement.style.maxHeight = originalStyle.maxHeight;
    invoiceElement.style.position = originalStyle.position;

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;

    // Calculate dimensions to fit A4
    const imgWidth = a4Width;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF with A4 format
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    let heightLeft = imgHeight;
    let position = 0;
    const pageHeight = a4Height;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const fileName = `${selectedInvoiceDetail.invoice_number || 'invoice'}.pdf`;

    // Try Web Share API (mobile)
    if (navigator.share) {
      try {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        await navigator.share({
          title: 'Invoice',
          text: `Invoice ${selectedInvoiceDetail.invoice_number}`,
          files: [file]
        });
        alert("Invoice shared successfully!");
        return;
      } catch (shareError: any) {
        if (shareError.name === 'AbortError') return;
      }
    }
    




    const savePDF = async () => {
  try {
    const invoiceElement = document.getElementById('invoice-content');
    if (!invoiceElement) {
      alert("Could not find invoice content");
      return;
    }

    const originalStyle = {
      overflow: invoiceElement.style.overflow,
      maxHeight: invoiceElement.style.maxHeight,
      position: invoiceElement.style.position,
    };

    invoiceElement.style.overflow = 'visible';
    invoiceElement.style.maxHeight = 'none';
    invoiceElement.style.position = 'relative';

    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(invoiceElement, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowHeight: invoiceElement.scrollHeight,
      height: invoiceElement.scrollHeight,
    });

    invoiceElement.style.overflow = originalStyle.overflow;
    invoiceElement.style.maxHeight = originalStyle.maxHeight;
    invoiceElement.style.position = originalStyle.position;

    const a4Width = 210;
    const a4Height = 297;
    const imgWidth = a4Width;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= a4Height;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= a4Height;
    }

    const fileName = `${selectedInvoiceDetail.invoice_number || 'invoice'}.pdf`;
    pdf.save(fileName);
    alert("Invoice saved successfully!");
  } catch (error) {
    console.error("Error saving PDF:", error);
    alert("Failed to save invoice.");
  }
};
  
const printInvoice = () => {
  window.print();
};

    // Fallback: Download
    pdf.save(fileName);
    alert("Invoice downloaded successfully!");
  } catch (error) {
    console.error("Error sharing invoice:", error);
    alert("Failed to share invoice. Check console for details.");
  }
};


  const resetInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setInvoiceCustomerId(0);
    setInvoiceItems([{ id: "1", description: "", quantity: 1, rate: 0, amount: 0 }]);
    setInvoiceDate("");
    setDueDate("");
    setNotes("");
    setTaxType("none");
    setTaxAmount(0);
    setInvoiceType("invoice");
  };

  const displayPrice = (item: InventoryItem) =>
    item.offer_price ?? item.price ?? 0;


  return (
    <main className="fixed inset-0 bg-gradient-to-b from-gray-100 to-gray-50 overflow-hidden">
      <div className="absolute top-[-120px] right-[-120px] w-[200px] h-[200px] bg-gradient-to-r from-blue-300 to-indigo-300 opacity-30 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-[-120px] left-[-120px] w-[200px] h-[200px] bg-gradient-to-r from-pink-300 to-purple-300 opacity-25 blur-3xl rounded-full pointer-events-none" />

      <div className="relative flex flex-col md:flex-row h-full w-full px-4 md:px-6 pt-6 pb-24 gap-6 overflow-hidden">
        {/* RIGHT SIDE */}
        <div className="flex flex-col flex-1 overflow-hidden order-1 md:order-2">
          {/* Mobile header with title and logout */}
          <div className="flex items-center justify-between md:hidden mb-3">
            <h2 className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              {activeFeature || current.title}
            </h2>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                } catch {}
                if (typeof document !== "undefined") {
                  document.cookie = "authToken=; path=/; max-age=0";
                }
                router.push("/login");
              }}
              className="ml-3 inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md active:scale-95"
            >
              <FiLogOut className="text-sm" />
              <span>Logout</span>
            </button>
          </div>

          {/* Desktop title */}
          <h2 className="hidden md:block text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent mb-3">
            {activeFeature || current.title}
          </h2>

          {!activeFeature && (
            <>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`p-5 rounded-3xl bg-gradient-to-r ${current.gradient} text-white shadow-xl backdrop-blur-md`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Statistics Overview</h3>
                  <div className="text-xs bg-white/20 px-2 py-1 rounded-full">Today</div>
                </div>
                {/* Consolidated view: show only Total Amount Paid */}
                <div className="flex items-center justify-center">
                  <div className="p-6 bg-white/10 rounded-2xl text-center">
                    <div className="text-3xl md:text-4xl font-extrabold">
                      KES { (totalAmountPaid ?? (statistics.find(s=>s.label==='Total Amount Paid')?.value ?? 0)).toLocaleString('en-KE') }
                    </div>
                    <div className="text-sm opacity-90 mt-1">Total Amount Paid</div>
                  </div>
                </div>
              </motion.div>

              <div className="flex md:hidden flex-wrap justify-center gap-3 mt-5">
                {current.features.map((f, i) => (
                  <motion.div
                    key={i}
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setActiveFeature(f)}
                    className={`w-[45%] h-[50px] flex items-center justify-center bg-white text-gray-800 font-semibold text-xs text-center rounded-xl shadow-md border border-gray-100 cursor-pointer transition-all ${
                      activeFeature === f ? "ring-2 ring-blue-400" : "hover:shadow-lg"
                    }`}
                  >
                    {f}
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {activeFeature && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-inner mt-6 flex flex-col flex-1 overflow-hidden">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-2 md:p-3 border-b bg-gray-50 gap-2">
                <input
                  type="text"
                  placeholder={`Search ${activeFeature}...`}
                  className="w-full md:w-1/2 p-2 text-sm border rounded-lg focus:outline-none focus:ring"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex gap-2">
                  {isInvoiceFeature ? (
                    <>
                      <button
                        className="flex-1 md:flex-none px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg font-semibold"
                        onClick={() => setIsInvoiceModalOpen(true)}
                      >
                        Generate
                      </button>
                      <button
                        className="flex-1 md:flex-none px-3 py-2 text-xs md:text-sm bg-purple-600 text-white rounded-lg font-semibold disabled:bg-purple-400"
                        onClick={handleSendReminders}
                        disabled={isSendingReminders}
                      >
                        {isSendingReminders ? "Sending..." : "Remind"}
                      </button>
                      <button
                        className="flex-1 md:flex-none px-3 py-2 text-xs md:text-sm bg-green-600 text-white rounded-lg font-semibold"
                        onClick={() => {
                          setInvoiceToPay(null);
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        Update
                      </button>
                    </>
                  ) : activeFeature === "Customers" ? (
                    <button
                      className="flex-1 md:flex-none px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg font-semibold"
                      onClick={() => setIsAddCustomerModalOpen(true)}
                    >
                      Add
                    </button>
                  ) : activeFeature === "Inventory" ? (
                    <button
                      className="flex-1 md:flex-none px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg font-semibold"
                      onClick={() => setIsInventoryModalOpen(true)}
                    >
                      Add
                    </button>
                  ) : activeFeature === "Staff Management" ? (
                    <button
                      className="flex-1 md:flex-none px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg font-semibold"
                      onClick={() => setIsAddStaffModalOpen(true)}
                    >
                      Add
                    </button>
                  ) : activeFeature === "Suppliers" ? (
                    <>
                      <button
                        className="px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg font-semibold"
                        onClick={() => {
                          // open add modal (clear any edit holder)
                          try { if (typeof window !== 'undefined') (window as any).__supplierToEdit = null; } catch {}
                          setSupplierToEdit(null);
                          setIsAddSupplierModalOpen(true);
                        }}
                      >
                        Add
                      </button>
                      <button
                        className="px-3 py-2 text-xs md:text-sm bg-green-600 text-white rounded-lg font-semibold"
                        onClick={() => {
                          if (!selectedSupplier) {
                            alert('Please select a supplier row to update');
                            return;
                          }
                          try { if (typeof window !== 'undefined') (window as any).__supplierToEdit = selectedSupplier; } catch {}
                          setSupplierToEdit(selectedSupplier);
                          setIsAddSupplierModalOpen(true);
                        }}
                      >
                        Update
                      </button>
                    </>
                  ) : (
                    <button
                      className="flex-1 md:flex-none px-3 py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg font-semibold"
                      onClick={() => setIsModalOpen(true)}
                    >
                      Add
                    </button>
                  )}
                  <button className="flex-1 md:flex-none px-3 py-2 text-xs md:text-sm bg-gray-200 rounded-lg font-semibold">
                    Export
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {filteredRows.length > 0 ? (
                  <>
                    {/* Mobile View - Card Layout for Invoices */}
                    {isInvoiceFeature ? (
                      <div className="md:hidden px-0 py-2 space-y-2">
                        {filteredRows.map((row, i) => (
                          <div 
                            key={i} 
                            className="py-3 px-3 bg-white shadow-md border-y border-gray-100 transition-all hover:shadow-lg cursor-pointer active:bg-gray-50"
                            onClick={() => openInvoiceDetail(row)}
                          >
                            {/* Row 1 */}
                            <div className="flex justify-between items-center text-[11px] mb-1.5">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-500">Customer: </span>
                                <span className="font-semibold truncate">{row.customer_name || "—"}</span>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <span className="text-gray-500">Total: </span>
                                <span className="font-semibold">{row.total_amount || 0}</span>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <span className="text-gray-500">Due: </span>
                                <span className="font-semibold text-red-600">{row.balance_due || 0}</span>
                              </div>
                              <button className="flex-shrink-0 ml-2 text-blue-600 font-semibold text-[10px]">See All</button>
                            </div>
                            {/* Row 2 */}
                            <div className="flex justify-between items-center text-[10px] text-gray-600">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400">INV#: </span>
                                <span className="truncate">{row.invoice_number || "—"}</span>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <span className="text-gray-400">Subtotal: </span>
                                <span>{row.subtotal || 0}</span>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <span className="text-[9px] font-semibold text-gray-700">
                                  {row.payment_status || "Unpaid"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : activeFeature === "Inventory" ? (
                      /* Mobile View - Card Layout for Inventory */
                      <div className="md:hidden px-0 py-2 space-y-2">
                        {filteredRows.map((row, i) => (
                          <div key={i} className="py-3 px-3 bg-white shadow-md border-y border-gray-100 transition-all hover:shadow-lg">
                            {/* Row 1 */}
                            <div className="flex justify-between items-center text-[11px] mb-1.5">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-500">Name: </span>
                                <span className="font-semibold truncate">{row.name || row.model || "—"}</span>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <span className="text-gray-500">Price: </span>
                                <span className="font-semibold">{row.offer_price || row.price || 0}</span>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <span className="text-gray-500">Qty: </span>
                                <span className="font-semibold">{row.quantity ?? 1}</span>
                              </div>
                              <button className="flex-shrink-0 ml-2 text-blue-600 font-semibold text-[10px]">See All</button>
                            </div>
                            {/* Row 2 */}
                            <div className="flex justify-between items-center text-[10px] text-gray-600">
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-400">IMEI: </span>
                                <span className="truncate">{row.imei || "—"}</span>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <span className="text-gray-400">Model: </span>
                                <span>{row.model || "—"}</span>
                              </div>
                              <div className="flex-shrink-0 ml-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                  row.status === "Available" || row.status === "In Stock" ? "bg-green-100 text-green-700" :
                                  row.status === "Sold" ? "bg-blue-100 text-blue-700" :
                                  row.status === "Reserved" ? "bg-yellow-100 text-yellow-700" :
                                  row.status === "Out of Stock" ? "bg-red-100 text-red-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                  {row.status || "Available"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : activeFeature === "Staff Management" ? (
                      /* Mobile View - Card Layout for Staff Management (like invoices) */
                      <div className="md:hidden px-0 py-2 space-y-3">
                        {filteredRows.map((row, i) => {
                          const fullName = row.first_name || row.full_name || `${row.firstName || ""} ${row.lastName || ""}`.trim() || "—";
                          return (
                            <div key={i} className="py-3 px-3 bg-white shadow-md border-y border-gray-100 transition-all hover:shadow-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold truncate text-sm text-gray-800">{fullName}</div>
                                  <div className="text-xs text-gray-500 truncate">{row.job_title || row.jobTitle || row.department || ""}</div>
                                </div>
                                <div className="flex-shrink-0 ml-3">{renderCell(row, "status")}</div>
                              </div>

                              <div className="flex justify-between items-center text-[12px] text-gray-600">
                                <div className="flex-1 min-w-0 truncate">{row.email || row.phone || "—"}</div>
                                <div className="flex-shrink-0 ml-3 text-sm font-semibold">{row.salary ?? ""}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : activeFeature === "Suppliers" ? (
                      /* Mobile View - Card Layout for Suppliers */
                      <div className="md:hidden px-0 py-2 space-y-3">
                        {filteredRows.map((row, i) => {
                          const name = row.name || row.refno || "—";
                          const total = Number(row.total_owed || row.total || 0);
                          const paid = Number(row.paid || 0);
                          const balance = +(total - paid).toFixed(2);
                          const isSelected = !!(selectedSupplier && selectedSupplier.id === row.id);
                          return (
                            <div
                              key={i}
                              onClick={() => setSelectedSupplier(row)}
                              className={`py-3 px-3 bg-white shadow-md border-y border-gray-100 transition-all hover:shadow-lg cursor-pointer ${
                                isSelected ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold truncate text-sm text-gray-800">{name}</div>
                                  <div className="text-xs text-gray-500 truncate">{row.refno ? `Ref: ${row.refno}` : ''}</div>
                                </div>
                                <div className="flex-shrink-0 ml-3">{renderCell(row, "status")}</div>
                              </div>

                              <div className="flex justify-between items-center text-[12px] text-gray-600">
                                <div className="flex-1 min-w-0 truncate">Total owed: <span className="font-semibold">{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(total)}</span></div>
                                <div className="flex-shrink-0 ml-3 text-sm font-semibold">Balance: <span className="ml-1">{renderCell(row, 'balance')}</span></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Mobile View - Default Table for other features */
                      <div className="md:hidden">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="bg-gray-100 text-gray-700">
                            <tr>
                              {getKeysForFeature(filteredRows[0]).map((col) => (
                                    <th key={col} className="p-3 capitalize">
                                      {col.replaceAll("_", " ")}
                                    </th>
                                  ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRows.map((row, i) => (
                              <tr key={i} className="border-b hover:bg-gray-50">
                                {getKeysForFeature(row).map((key, j) => (
                                    <td key={j} className="p-3">{renderCell(row, key)}</td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Desktop View - Table Layout */}
                    <table className="hidden md:table w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          {getKeysForFeature(filteredRows[0]).map((col) => (
                            <th key={col} className="p-3 capitalize">
                              {col.replaceAll("_", " ")}
                            </th>
                          ))}
                          {activeFeature === "Suppliers" && !getKeysForFeature(filteredRows[0]).includes("balance") && (
                            <th className="p-3 capitalize">Balance</th>
                          )}
                          {activeFeature === "Invoices & Quotations" && (
                            <th className="p-3 capitalize">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, i) => (
                          <tr
                            key={i}
                            onClick={() => setSelectedSupplier(row)}
                            className={`border-b hover:bg-gray-50 cursor-pointer ${selectedSupplier && selectedSupplier.id === row.id ? 'bg-blue-50' : ''}`}
                          >
                            {getKeysForFeature(row).map((key, j) => (
                              <td key={j} className="p-3">{renderCell(row, key)}</td>
                            ))}
                            {activeFeature === "Invoices & Quotations" && (
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openInvoiceDetail(row)}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => openEditInvoice(row)}
                                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </td>
                            )}
                            
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <div className="text-center text-gray-400 italic py-8">No records found.</div>
                )}
              </div>
            </div>
          )}

          {sales.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Recent Sales (local)</h3>
              <table className="w-full text-left border">
                <thead>
                  <tr>
                    <th className="p-2 border">Txn#</th>
                    <th className="p-2 border">Item</th>
                    <th className="p-2 border">Amount</th>
                    <th className="p-2 border">Deposit</th>
                    <th className="p-2 border">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s, i) => (
                    <tr key={s.transaction_number ?? i} className="border-b">
                      <td className="p-2">{s.transaction_number}</td>
                      <td className="p-2">{s.item}</td>
                      <td className="p-2">{s.amount}</td>
                      <td className="p-2">{s.deposit_amount}</td>
                      <td className="p-2">{s.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LEFT SIDEBAR */}
        <div className="hidden md:flex flex-col items-center gap-4 w-full md:w-[240px] flex-shrink-0 order-2 md:order-1 mt-8">
          <div className="w-full flex justify-center mb-2">
            <Image
             src="/family.png"
             alt="Company Logo"
             width={120}
             height={50}
            className="object-contain rounded-md"
             priority
            unoptimized
             />

          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            {current.features.map((f, i) => (
              <motion.div
                key={i}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setActiveFeature(f)}
                className={`w-[250px] h-[55px] flex items-center justify-center bg-white text-gray-800 font-semibold text-sm text-center rounded-2xl shadow-md border border-gray-100 cursor-pointer transition-all ${
                  activeFeature === f ? "ring-2 ring-blue-400" : "hover:shadow-xl"
                }`}
              >
                {f}
              </motion.div>
            ))}
            
            {/* Logout Button */}
            <motion.div
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                router.push("/login");
              }}
              className="w-[250px] h-[55px] flex items-center justify-center gap-2 bg-red-500 text-white font-semibold text-sm text-center rounded-2xl shadow-md border border-red-400 cursor-pointer transition-all hover:bg-red-600 hover:shadow-xl mt-4"
            >
              <FiLogOut className="text-lg" />
              Logout
            </motion.div>
          </div>
        </div>
      </div>

      {/* Add Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[450px] max-w-full shadow-lg">
            <h2 className="text-xl font-bold mb-4">Add Sale</h2>

            <div className="mb-3">
              <label className="mr-4">
                <input
                  type="radio"
                  name="saleType"
                  value="normal"
                  checked={saleType === "normal"}
                  onChange={() => {
                    setSaleType("normal");
                    setCustomerSearch("");
                    setFilteredCustomers([]);
                    setSelectedCustomer(null);
                  }}
                />{" "}
                Normal
              </label>
              <label>
                <input
                  type="radio"
                  name="saleType"
                  value="lpp"
                  checked={saleType === "lpp"}
                  onChange={() => {
                    setSaleType("lpp");
                    setSelectedCustomerId(0);
                  }}
                />{" "}
                Lipa Pole Pole
              </label>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter item name, model or IMEI..."
              className="w-full p-2 border rounded-lg mb-3"
            />

            {query && !selectedItem && (
              <div className="max-h-40 overflow-y-auto border rounded-lg mb-3">
                {inventory
                  .filter(
                    (i) =>
                      (i.name && i.name.toLowerCase().includes(query.toLowerCase())) ||
                      (i.model && i.model.toLowerCase().includes(query.toLowerCase())) ||
                      (i.imei && i.imei.toLowerCase().includes(query.toLowerCase()))
                  )
                  .slice(0, 20)
                  .map((item) => (
                    <div
                      key={`inv-${item.id}`}
                      onClick={() => {
                        setSelectedItem(item);
                        setQuery(item.name || item.model || item.imei || "");
                      }}
                      className="p-2 cursor-pointer hover:bg-gray-100"
                    >
                      <div className="font-semibold">{item.name || item.model}</div>
                      <div className="text-xs opacity-80">
                        IMEI: {item.imei ?? "—"} • KES {displayPrice(item)}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {selectedItem && (
              <div className="mb-3 p-3 border rounded-lg bg-gray-50">
                <div className="font-semibold text-lg">{selectedItem.name || selectedItem.model}</div>
                <div className="text-sm">Model: {selectedItem.model ?? "—"}</div>
                <div className="text-sm">IMEI: {selectedItem.imei ?? "—"}</div>
                <div className="text-sm">Price: KES {displayPrice(selectedItem)}</div>
                <div className="text-sm">Status: {selectedItem.status ?? "—"}</div>
              </div>
            )}

            {saleType === "lpp" ? (
              <div className="mb-3">
                <label className="block text-sm mb-1">Search Customer</label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setSelectedCustomer(null);
                  }}
                  placeholder="Type customer name or phone..."
                  className="w-full p-2 border rounded-lg"
                />

                {filteredCustomers.length > 0 && (
                  <div className="max-h-36 overflow-y-auto border rounded-lg mt-2">
                    {filteredCustomers.map((c) => (
                      <div
                        key={`cust-${c.customer_id}`}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(c.full_name);
                          setFilteredCustomers([]);
                        }}
                      >
                        <div className="font-semibold">{c.full_name}</div>
                        <div className="text-xs opacity-80">
                          {c.phone_number ?? "—"} {typeof c.amount_deposited !== "undefined" ? ` • Deposited: ${c.amount_deposited}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                    Selected: <strong>{selectedCustomer.full_name}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-3">
                <label className="block text-sm mb-1">Customer (optional)</label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                >
                  <option value={0}>Walk-in / No customer</option>
                  {customers.map((c) => (
                    <option key={`cust-${c.customer_id}`} value={c.customer_id}>
                      {c.full_name} {c.phone_number ? `(${c.phone_number})` : ""}{" "}
                      {typeof c.amount_deposited !== "undefined" ? `- Dep: ${c.amount_deposited}` : ""}
                    </option>
                  ))}
                </select>
                <div className="text-xs opacity-70 mt-1">
                  For Lipa Pole Pole, use the search box above.
                </div>
              </div>
            )}

            {saleType === "lpp" && (
              <div className="mb-3">
                <label className="block text-sm mb-1">Deposit amount (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter deposit (partial) amount"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm mb-1">Payment method</label>
              <select
                className="w-full p-2 border rounded-lg"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as "Cash" | "Mpesa" | "Card" | "Bank" | "Credit")
                }
              >
                <option value="Cash">Cash</option>
                <option value="Mpesa">Mpesa</option>
                <option value="Card">Card</option>
                <option value="Bank">Bank</option>
                <option value="Credit">Credit</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-gray-200"
                onClick={() => {
                  setIsModalOpen(false);
                  setQuery("");
                  setSelectedItem(null);
                  setCustomerSearch("");
                  setSelectedCustomer(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                onClick={handleSaveClick}
              >
                Save Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
          <div className="bg-white rounded-2xl p-6 w-[420px] max-w-full shadow-lg">
            <h3 className="text-lg font-bold mb-3">Confirm Sale</h3>

            <div className="mb-3">
              <div className="text-sm">Item:</div>
              <div className="font-semibold">{selectedItem?.name ?? selectedItem?.model}</div>
            </div>

            <div className="mb-3">
              <div className="text-sm">Sale Type:</div>
              <div className="font-semibold">{saleType === "lpp" ? "Lipa Pole Pole" : "Normal"}</div>
            </div>

            <div className="mb-3">
              <div className="text-sm">Customer:</div>
              <div className="font-semibold">
                {saleType === "lpp" ? selectedCustomer?.full_name : customers.find(c => c.customer_id === selectedCustomerId)?.full_name || "Walk-in"}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-sm">Amount:</div>
              <div className="font-semibold">KES {selectedItem ? displayPrice(selectedItem) : "—"}</div>
            </div>

            {saleType === "lpp" && (
              <div className="mb-3">
                <div className="text-sm">Deposit:</div>
                <div className="font-semibold">KES {depositAmount || "—"}</div>
              </div>
            )}

            <div className="mb-4">
              <div className="text-sm">Payment method:</div>
              <div className="font-semibold">{paymentMethod}</div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-gray-200"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-green-600 text-white"
                onClick={performSave}
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Inventory Modal */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsInventoryModalOpen(false)} />

          {/* Sheet on mobile, centered modal on desktop */}
          <div className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between px-4 md:px-6 py-3 border-b bg-white/95 backdrop-blur">
              <div>
                <h2 className="text-base md:text-lg font-bold text-gray-800">Add Inventory Item</h2>
                <p className="hidden md:block text-xs text-gray-500">Capture device details to update your stock</p>
              </div>
              <button
                onClick={() => setIsInventoryModalOpen(false)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleInventorySubmit} className="px-4 md:px-6 py-4 space-y-4">
              {/* Device info */}
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">Device Information</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">IMEI</label>
                    <input

                      type="text"
                      name="imei"
                      placeholder="3569 42 10..."
                      value={inventoryForm.imei}
                      onChange={handleInventoryChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">Model</label>
                    <input
                      type="text"
                      name="model"
                      placeholder="Samsung A14"
                      value={inventoryForm.model}
                      onChange={handleInventoryChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-medium text-gray-600">Name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Device name (optional)"
                      value={inventoryForm.name}
                      onChange={handleInventoryChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">Pricing</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">Price (KES)</label>
                    <input
                      type="number"
                      name="price"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={inventoryForm.price}
                      onChange={handleInventoryChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">Offer Price (KES)</label>
                    <input
                      type="number"
                      name="offer_price"
                      inputMode="decimal"
                      placeholder="Optional"
                      value={inventoryForm.offer_price}
                      onChange={handleInventoryChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      inputMode="numeric"
                      placeholder="1"
                      value={inventoryForm.quantity}
                      onChange={handleInventoryChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">Status</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-medium text-gray-600">Item Status</label>
                    <select
                      name="status"
                      value={inventoryForm.status}
                      onChange={handleInventoryChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 text-sm bg-white"
                    >
                      <option>Available</option>
                      <option>Reserved</option>
                      <option>Sold Out</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-medium text-gray-600">Updated By</label>
                    <input
                      type="text"
                      name="updated_by"
                      placeholder="e.g. Admin"
                      value={inventoryForm.updated_by}
                      onChange={handleInventoryChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col md:flex-row gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setIsInventoryModalOpen(false)}
                  className="w-full md:w-auto inline-flex justify-center items-center px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full md:w-auto inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice/Quotation Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 pb-28">
          <div className="bg-white rounded-lg p-2.5 md:p-3 w-full md:w-[420px] max-w-[95vw] h-[75vh] md:h-auto md:max-h-[85vh] flex flex-col shadow-lg">
            <h2 className="text-sm md:text-base font-bold mb-1.5">
              Create Invoice/Quotation
            </h2>

            {/* Invoice Type Tabs */}
            <div className="flex gap-1 mb-2 border-b pb-1">
              <button
                onClick={() => setInvoiceType("invoice")}
                className={`flex-1 py-1 px-2 rounded font-semibold text-[10px] transition-all ${
                  invoiceType === "invoice"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Invoice
              </button>
              <button
                onClick={() => setInvoiceType("quotation")}
                className={`flex-1 py-1 px-2 rounded font-semibold text-[10px] transition-all ${
                  invoiceType === "quotation"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Quote
              </button>
            </div>

            {/* Fixed Top Section - Customer & Dates */}
            <div className="flex-shrink-0 space-y-2 mb-2">
              {/* Customer Selection */}
              <div>
                <label className="block text-[9px] font-semibold mb-0.5">Customer *</label>
                <select
                  className="w-full p-1 border rounded text-[10px]"
                  value={invoiceCustomerId}
                  onChange={(e) => setInvoiceCustomerId(Number(e.target.value))}
                >
                  <option value={0}>Select a customer</option>
                  {customers.map((c) => (
                    <option key={`inv-cust-${c.customer_id}`} value={c.customer_id}>
                      {c.full_name} {c.phone_number ? `(${c.phone_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[9px] font-semibold mb-0.5">
                    {invoiceType === "invoice" ? "Invoice Date *" : "Quote Date *"}
                  </label>
                  <input
                    type="date"
                    className="w-full p-1 border rounded text-[10px]"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold mb-0.5">
                    {invoiceType === "invoice" ? "Due Date *" : "Valid Until *"}
                  </label>
                  <input
                    type="date"
                    className="w-full p-1 border rounded text-[10px]"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Scrollable Items Section */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              <div>
                <div className="flex justify-between items-center mb-1 sticky top-0 bg-white py-1">
                  <label className="text-[9px] font-semibold">Items *</label>
                  <button
                    onClick={handleAddInvoiceItem}
                    className="px-1.5 py-0.5 text-[9px] bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Add
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-1.5">
                  {invoiceItems.map((item, index) => (
                    <div key={item.id} className="border rounded p-1.5 bg-gray-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-semibold text-gray-600">#{index + 1}</span>
                        {invoiceItems.length > 1 && (
                          <button
                            onClick={() => handleRemoveInvoiceItem(item.id)}
                            className="text-red-600 hover:text-red-800 text-[10px] leading-none"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      
                      <div className="mb-1">
                        <input
                          type="text"
                          className="w-full p-1 border rounded text-[10px]"
                          value={item.description}
                          onChange={(e) =>
                            handleInvoiceItemChange(item.id, "description", e.target.value)
                          }
                          placeholder="Description"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <div>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-full p-1 border rounded text-[10px]"
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              handleInvoiceItemChange(item.id, "quantity", val === "" ? 0 : Number(val));
                            }}
                            placeholder="Qty"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            className="w-full p-1 border rounded text-[10px]"
                            value={item.rate === 0 ? "" : item.rate}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, "");
                              handleInvoiceItemChange(item.id, "rate", val === "" ? 0 : Number(val));
                            }}
                            placeholder="Rate"
                          />
                        </div>
                        <div>
                          <div className="p-1 bg-white border rounded text-[10px] font-semibold text-right">
                            {item.amount === 0 ? "" : item.amount.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax selection */}
              <div className="mt-2">
                <label className="block text-[9px] font-semibold mb-0.5">Tax</label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full p-1 border rounded text-[10px] mb-2"
                >
                  <option value="none">None</option>
                  <option value="vat">VAT (16%)</option>
                  <option value="levy">Levy (1.5%)</option>
                  <option value="withholding">Withholding Tax (5%)</option>
                </select>

                {/* Notes */}
                <label className="block text-[9px] font-semibold mb-0.5">Notes</label>
                <textarea
                  className="w-full p-1 border rounded text-[10px]"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                />
              </div>
            </div>

            {/* Fixed Bottom Section - Total & Buttons */}
            <div className="flex-shrink-0 mt-2 pt-2 border-t">
              {/* Subtotal and Total Summary */}
              <div className="p-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-200 mb-2">
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">{calculateInvoiceTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-gray-600">Tax ({taxType === 'vat' ? '16%' : taxType === 'levy' ? '1.5%' : taxType === 'withholding' ? '5%' : '0%'}):</span>
                    <span className="font-semibold">{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-0.5 border-t border-blue-300">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-700">Total:</span>
                      <span className="text-xs font-bold text-blue-600">KES {calculateInvoiceTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1.5">
                <button
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
                  
                  onClick={resetInvoiceModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:bg-blue-400"
                  onClick={handleGenerateInvoice}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : `Create ${invoiceType === "invoice" ? "Invoice" : "Quote"}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail View Modal */}
      {selectedInvoiceDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 pb-28">
          <div id="invoice-content" className="bg-white rounded-lg w-full max-w-[95vw] md:max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* Header with Close Button */}
            {/* <div className="sticky top-0 bg-white border-b p-3 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-800">Invoice Details</h3>
              <button 
                onClick={closeInvoiceDetail}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div> */}

            <div className="p-4">
              {/* Header with Logo, Company Info, and Invoice Details */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                 <Image
             src="/family.png"
             alt="Company Logo"
             width={80}
             height={30}
            className="object-contain rounded-md"
             priority
            unoptimized
             />
                  
                </div>
                
                <div className="flex-1 text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    {selectedInvoiceDetail.invoice_number?.startsWith('QT') ? 'QUOTATION' : 'INVOICE'}
                  </h2>
                  <p className="text-xs text-gray-600">#{selectedInvoiceDetail.invoice_number}</p>
                  <div className="mt-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {selectedInvoiceDetail.payment_status || "Unpaid"}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 text-right">
                  <div className="inline-block text-left">
                    <div className="mb-1">
                      <span className="text-gray-500 text-xs">Invoice Date:</span>
                      <p className="font-semibold text-xs">{selectedInvoiceDetail.invoice_date ? new Date(selectedInvoiceDetail.invoice_date).toISOString().slice(0, 10).replace(/-/g, '') : "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Due Date:</span>
                      <p className="font-semibold text-xs">{selectedInvoiceDetail.due_date ? new Date(selectedInvoiceDetail.due_date).toISOString().slice(0, 10).replace(/-/g, '') : "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company and Customer Info on Same Level */}
              <div className="flex justify-between mb-6">
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">FROM:</h3>
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold text-xs text-gray-800">Family smartPhones Ltd</p>
                    <p className="text-xs">Nairobi, Kenya</p>
                    <p className="text-xs">Phone: +254 705 470 671</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">BILL TO:</h3>
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold text-xs text-gray-800">{selectedInvoiceDetail.customer_name || "—"}</p>
                    <p className="text-xs">Customer ID: {selectedInvoiceDetail.customer_id}</p>
                  </div>
                </div>
              </div>

              

              {/* Items Table */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">ITEMS:</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetailItems.length > 0 ? (
                        invoiceDetailItems.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">{item.description || "—"}</td>
                            <td className="p-2 text-right">{item.quantity || 0}</td>
                            <td className="p-2 text-right">KES {Number(item.unit_price || 0).toFixed(2)}</td>
                            <td className="p-2 text-right font-semibold">KES {Number(item.total_price || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400">No items found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold">KES {Number(selectedInvoiceDetail.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-semibold">KES {Number(selectedInvoiceDetail.tax_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-semibold">KES {Number(selectedInvoiceDetail.discount_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 text-lg border-t border-gray-300 mt-2">
                      <span className="font-bold text-gray-800">Total:</span>
                      <span className="font-bold text-blue-600">KES {Number(selectedInvoiceDetail.total_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-semibold text-green-600">KES {Number(selectedInvoiceDetail.amount_paid || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm border-t">
                      <span className="font-semibold text-gray-700">Balance Due:</span>
                      <span className="font-bold text-red-600">KES {Number(selectedInvoiceDetail.balance_due || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoiceDetail.notes && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">NOTES:</h3>
                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedInvoiceDetail.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-2">
                <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                  Print
                </button>
                <button
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                  onClick={shareInvoice}
                >
                  Share
                </button>
                <button className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300"
                  onClick={closeInvoiceDetail}
                >
                    Save
                </button>
                <button className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300"
                  onClick={closeInvoiceDetail}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice/Quotation Confirmation Modal */}
      {invoiceConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-[340px] shadow-2xl text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold mb-2">
              {isEditingInvoice ? "Update" : "Confirm"} {invoiceType === "invoice" ? "Invoice" : "Quotation"}
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to {isEditingInvoice ? "update" : "create"} this {invoiceType === "invoice" ? "invoice" : "quotation"}?
            </p>
            
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Customer:</span>
                <span className="font-semibold">{customers.find(c => c.customer_id === invoiceCustomerId)?.full_name || "—"}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Items:</span>
                <span className="font-semibold">{invoiceItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total:</span>
                <span className="text-xs font-bold text-blue-600">KES {calculateInvoiceTotal().toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setInvoiceConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveInvoice}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                {isSubmitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice/Quotation Success Modal */}
      {invoiceSuccessOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-[340px] shadow-2xl text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Success! 🎉
            </h3>
            
            <p className="text-sm text-gray-600 mb-2">
              {invoiceType === "invoice" ? "Invoice" : "Quotation"} has been {wasEditingInvoice ? "updated" : "created"} successfully!
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-4 border border-blue-200">
              <p className="text-xs text-gray-500 mb-1">Document Number</p>
              <p className="text-lg font-bold text-blue-600">{createdInvoiceNumber}</p>
            </div>
            
            <button
              onClick={() => {
                setInvoiceSuccessOpen(false);
                setCreatedInvoiceNumber("");
                setWasEditingInvoice(false);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal for Invoices & Quotations */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setInvoiceToPay(null);
        }}
        invoice={invoiceToPay}
        onPaymentRecorded={async () => {
          // Refresh invoices data
          if (isInvoiceFeature) {
            try {
              const res = await fetch("/api/invoices");
              if (res.ok) {
                const data = await res.json();
                setDataRows(data || []);
              }
            } catch (err) {
              console.error("Failed to refresh invoices:", err);
            }
          }
        }}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onCustomerAdded={async () => {
          // Refresh customers data
          try {
            const res = await fetch("/api/customers");
            if (res.ok) {
              const data = await res.json();
              setCustomers(data || []);
              // Also refresh dataRows if we're on the Customers feature
              if (activeFeature === "Customers") {
                setDataRows(data || []);
              }
            }
          } catch (err) {
            console.error("Failed to refresh customers:", err);
          }
        }}
      />
      
      {/* Add Supplier Modal */}
      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onSupplierAdded={async () => {
          try {
            const res = await fetch("/api/suppliers");
            if (res.ok) {
              const data = await res.json();
              setDataRows(data || []);
              setSelectedSupplier(null);
            }
          } catch (err) {
            console.error("Failed to refresh suppliers:", err);
          }
        }}
        initialSupplier={supplierToEdit}
        onSupplierUpdated={async () => {
          try {
            const res = await fetch("/api/suppliers");
            if (res.ok) {
              const data = await res.json();
              setDataRows(data || []);
              setSelectedSupplier(null);
              setSupplierToEdit(null);
            }
          } catch (err) {
            console.error("Failed to refresh suppliers after update:", err);
          }
        }}
      />

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isAddStaffModalOpen}
        onClose={() => setIsAddStaffModalOpen(false)}
        onSuccess={async () => {
          try {
            const res = await fetch("/api/staff-management");
            if (res.ok) {
              const data = await res.json();
              // If we're viewing Staff Management, refresh rows
              if (activeFeature === "Staff Management") {
                if (Array.isArray(data)) setDataRows(data || []);
                else if (data && Array.isArray((data as any).data)) setDataRows((data as any).data || []);
                else setDataRows([data]);
              }
            }
          } catch (err) {
            console.error("Failed to refresh staff data:", err);
          }
        }}
      />

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50">
        <BottomNav
          onTabChange={(tab) => {
            setActiveTab(tab);
            setActiveFeature(null);
          }}
        />
      </div>
    </main>
  );
}