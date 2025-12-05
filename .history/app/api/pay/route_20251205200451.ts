import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// Handle PUT requests to record a payment
export async function PUT(request: Request) {
    try {
        const { invoice_id, new_payment_amount, payment_method, payment_date } = await request.json();

        if (!invoice_id || new_payment_amount === undefined || new_payment_amount <= 0) {
            return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
        }

        // 1. Fetch current invoice data
        const { data: invoiceData, error: fetchError } = await supabase
            .from("invoices")
            .select("total_amount, amount_paid, payment_status, currency")
            .eq("id", invoice_id)
            .single();

        if (fetchError || !invoiceData) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const currentInvoice = invoiceData;
        const newAmountPaid = (currentInvoice.amount_paid || 0) + new_payment_amount;
        const totalAmount = currentInvoice.total_amount || 0;

        // 2. Determine new payment status
        let newStatus = currentInvoice.payment_status;
        if (newAmountPaid >= totalAmount) {
            newStatus = "Paid";
        } else if (newAmountPaid > 0) {
            newStatus = "Partially Paid";
        } else {
            newStatus = "Unpaid";
        }

        // 3. Update the invoices table
        const { error: updateError } = await supabase
            .from("invoices")
            .update({
                amount_paid: newAmountPaid,
                payment_status: newStatus
            })
            .eq("id", invoice_id);

        if (updateError) {
            console.error("Error updating invoice:", updateError);
            return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
        }
        
        // 4. (Optional but recommended) Insert payment record into a dedicated payments table
        try {
            await supabase
                .from("payments")
                .insert({
                    invoice_id,
                    payment_date,
                    amount: new_payment_amount,
                    method: payment_method,
                    currency: currentInvoice.currency
                });
        } catch (e) {
            // If payments table doesn't exist, skip without failing
            console.warn("Skipping payment log:", e);
        }

        return NextResponse.json({ message: "Payment recorded successfully", new_status: newStatus });
    } catch (error) {
        console.error("Error recording payment:", error);
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }
}