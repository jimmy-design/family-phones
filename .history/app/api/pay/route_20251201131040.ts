import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

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

        const conn = await getConnection();

        // 1. Fetch current invoice data
        const [invoiceRows] = await conn.execute<RowDataPacket[]>(
            "SELECT total_amount, amount_paid, payment_status, currency FROM invoices WHERE id = ?",
            [invoice_id]
        );

        if (invoiceRows.length === 0) {
            await conn.end();
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const currentInvoice = invoiceRows[0];
        const newAmountPaid = currentInvoice.amount_paid + new_payment_amount;
        const totalAmount = currentInvoice.total_amount;

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
        await conn.execute<ResultSetHeader>(
            `UPDATE invoices SET 
                amount_paid = ?, 
                payment_status = ? 
            WHERE id = ?`,
            [newAmountPaid, newStatus, invoice_id]
        );
        
        // 4. (Optional but recommended) Insert payment record into a dedicated payments table
        await conn.execute<ResultSetHeader>(
            `INSERT INTO payments 
                (invoice_id, payment_date, amount, method, currency)
            VALUES (?, ?, ?, ?, ?)`,
            [invoice_id, payment_date, new_payment_amount, payment_method, currentInvoice.currency]
        );


        await conn.end();

        return NextResponse.json({ message: "Payment recorded successfully", new_status: newStatus });
    } catch (error) {
        console.error("Error recording payment:", error);
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }
}