"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiDownload, FiEdit, FiTrash2 } from "react-icons/fi";
import jsPDF from "jspdf";
import "jspdf-autotable";

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

  // Fetch invoices, customers, and inventory items
  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchInventoryItems();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/invoices");
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
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
    const subtotal = selectedItems.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
    const taxAmount = formData.tax_amount;
    const discountAmount = formData.discount_amount;
    const totalAmount = subtotal + taxAmount - discountAmount;
    const amountPaid = formData.amount_paid;
    const balanceDue = totalAmount - amountPaid;

    setFormData({
      ...formData,
      subtotal,
      total_amount: totalAmount
    });
  };

  useEffect(() => {
    calculateTotals();
  }, [selectedItems, formData.tax_amount, formData.discount_amount, formData.amount_paid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = isEditing ? "PUT" : "POST";
      const url = "/api/invoices";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(isEditing ? { ...formData, id: currentInvoice?.id } : formData),
      });

      if (response.ok) {
        fetchInvoices();
        resetForm();
      } else {
        console.error("Failed to save invoice");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
    }
  };

  const handleEdit = (invoice: Invoice) => {
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
    setShowModal(false);
    setIsEditing(false);
    setCurrentInvoice(null);
  };

  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF() as any;
    
    // Add title
    doc.setFontSize(20);
    doc.text("INVOICE", 105, 20, { align: "center" });
    
    // Add company info
    doc.setFontSize(12);
    doc.text("Family Phones", 20, 30);
    doc.text("Nairobi, Kenya", 20, 37);
    doc.text("info@familyphones.co.ke", 20, 44);
    
    // Add invoice info
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 150, 30);
    doc.text(`Date: ${invoice.invoice_date}`, 150, 37);
    doc.text(`Due Date: ${invoice.due_date || "N/A"}`, 150, 44);
    
    // Add customer info
    const customer = customers.find(c => c.customer_id === invoice.customer_id);
    if (customer) {
      doc.text("Bill To:", 20, 60);
      doc.text(customer.full_name, 20, 67);
      doc.text(customer.phone_number, 20, 74);
    }
    
    // Add items table
    (doc as any).autoTable({
      startY: 85,
      head: [['Item', 'Price', 'Quantity', 'Total']],
      body: selectedItems.map(item => [
        item.item.name,
        item.item.price.toFixed(2),
        item.quantity,
        (item.item.price * item.quantity).toFixed(2)
      ]),
    });
    
    // Add totals
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.text(`Subtotal: ${invoice.currency} ${invoice.subtotal.toFixed(2)}`, 150, finalY + 10);
    doc.text(`Tax: ${invoice.currency} ${invoice.tax_amount.toFixed(2)}`, 150, finalY + 17);
    doc.text(`Discount: ${invoice.currency} ${invoice.discount_amount.toFixed(2)}`, 150, finalY + 24);
    doc.text(`Total: ${invoice.currency} ${invoice.total_amount.toFixed(2)}`, 150, finalY + 31);
    doc.text(`Amount Paid: ${invoice.currency} ${invoice.amount_paid.toFixed(2)}`, 150, finalY + 38);
    doc.text(`Balance Due: ${invoice.currency} ${invoice.balance_due.toFixed(2)}`, 150, finalY + 45);
    
    // Add payment status
    doc.text(`Payment Status: ${invoice.payment_status}`, 20, finalY + 20);
    
    // Save the PDF
    doc.save(`invoice-${invoice.invoice_number}.pdf`);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <FiPlus className="mr-2" />
          Generate Invoice
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
            {invoices.map((invoice) => {
              const customer = customers.find(c => c.customer_id === invoice.customer_id);
              return (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer?.full_name || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.invoice_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.due_date || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.currency} {invoice.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.currency} {invoice.amount_paid.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.currency} {invoice.balance_due?.toFixed(2) || "0.00"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${invoice.payment_status === "Paid" ? "bg-green-100 text-green-800" : 
                        invoice.payment_status === "Partially Paid" ? "bg-yellow-100 text-yellow-800" : 
                        "bg-red-100 text-red-800"}`}>
                      {invoice.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button 
                      onClick={() => generatePDF(invoice)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <FiDownload />
                    </button>
                    <button 
                      onClick={() => handleEdit(invoice)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <FiEdit />
                    </button>
                    <button 
                      onClick={() => handleDelete(invoice.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Generate Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {isEditing ? "Edit Invoice" : "Generate New Invoice"}
                </h2>
                <button 
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <select
                      name="payment_status"
                      value={formData.payment_status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
                    <input
                      type="number"
                      name="tax_amount"
                      value={formData.tax_amount}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    <div className="border rounded-lg p-4">
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
    </div>
  );
}