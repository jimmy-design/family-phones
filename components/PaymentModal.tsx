import React, { useState, useEffect } from "react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice?: any;
    onPaymentRecorded: () => void; // Function to refresh data on success
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, invoice, onPaymentRecorded }) => {
    const [amount, setAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState<string>("");
    const [loadedInvoice, setLoadedInvoice] = useState<any | null>(invoice || null);
    const [lookupError, setLookupError] = useState<string>("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        if (isOpen) {
            setLoadedInvoice(invoice || null);
            if (invoice) {
                setInvoiceNumber(invoice.invoice_number || "");
                setAmount(invoice.balance_due || (invoice.total_amount - invoice.amount_paid));
            } else {
                setInvoiceNumber("");
                setAmount(0);
            }
            setLookupError("");
            setShowSuccess(false);
            setSuccessMsg("");
        }
    }, [isOpen, invoice]);

    if (!isOpen) return null;

    const loadInvoiceByNumber = async () => {
        setLookupError("");
        setIsLoading(true);
        try {
            // Try querying by invoice number via query param
            let inv: any | null = null;
            const byNum = await fetch(`/api/invoices?invoice_number=${encodeURIComponent(invoiceNumber)}`);
            if (byNum.ok) {
                const data = await byNum.json();
                if (Array.isArray(data)) {
                    inv = data.find((d: any) => d.invoice_number === invoiceNumber) || null;
                } else if (data && (data.invoice_number || data.id)) {
                    inv = data;
                }
            }
            if (!inv) {
                // Fallback: fetch all then filter client-side
                const allRes = await fetch("/api/invoices");
                if (allRes.ok) {
                    const all = await allRes.json();
                    inv = (all || []).find((d: any) => d.invoice_number === invoiceNumber) || null;
                }
            }
            if (!inv) {
                setLoadedInvoice(null);
                setAmount(0);
                setLookupError("Invoice not found.");
                return;
            }
            setLoadedInvoice(inv);
            setAmount(inv.balance_due || (inv.total_amount - (inv.amount_paid || 0)) || 0);
            setLookupError("");
        } catch (err) {
            console.error("Failed to load invoice by number", err);
            setLookupError("Failed to load invoice. Try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!loadedInvoice) {
            alert("Load a valid invoice first.");
            setIsLoading(false);
            return;
        }

        const payload = {
            invoice_id: loadedInvoice?.id,
            invoice_number: loadedInvoice?.invoice_number,
            new_payment_amount: amount,
            payment_method: paymentMethod,
            payment_date: date,
        };

        try {
            const response = await fetch("/api/invoices/pay", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setSuccessMsg("Payment recorded successfully");
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    onPaymentRecorded(); // Refresh data in HomePage
                    onClose();
                }, 1200);
            } else {
                const errorData = await response.json();
                alert(`Failed to record payment: ${errorData.error}`);
            }
        } catch (error) {
            console.error("Payment submission error:", error);
            alert("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Record Payment</h3>

                {showSuccess && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40"></div>
                        <div className="relative z-[61] bg-white rounded-lg shadow-2xl p-6 w-[90%] max-w-sm text-center">
                            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="mt-3">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">{successMsg || "Payment recorded successfully"}</h3>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Invoice Number</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                            placeholder="e.g., INV20241130-0001 or QT20241130-0001"
                            className="flex-1 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={loadInvoiceByNumber}
                            className="px-4 py-2 bg-indigo-600 text-white rounded font-semibold disabled:bg-indigo-400"
                            disabled={isLoading || !invoiceNumber}
                        >
                            {isLoading ? 'Loading...' : 'Load'}
                        </button>
                    </div>
                    {lookupError && <p className="text-red-600 text-xs mt-1">{lookupError}</p>}
                </div>

                {loadedInvoice && (
                    <div className="mb-4 p-3 bg-gray-50 border rounded">
                        <div className="text-sm text-gray-700 mb-1">
                            Invoice: <span className="font-semibold">{loadedInvoice.invoice_number}</span>
                        </div>
                        <div className="text-sm text-gray-700">
                            Balance Due: <span className="font-semibold">{loadedInvoice.currency || 'KES'} {(loadedInvoice.balance_due || 0).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Amount Received</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            min="0.01"
                            max={loadedInvoice?.balance_due || 0}
                            disabled={!loadedInvoice}
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                             <option>M-Pesa</option>
                            <option>Cash</option>
                            <option>Bank Transfer</option>
                            <option>Cheque</option>
                        </select>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Payment Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2 transition duration-150"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-1800 disabled:opacity-70"
                            disabled={isLoading || !loadedInvoice}
                        >
                            {isLoading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentModal;