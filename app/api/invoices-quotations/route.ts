import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// Handle POST requests
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const conn = await getConnection();

    // Insert invoice data
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO invoices 
        (invoice_number, reference_number, customer_id, invoice_date, due_date, subtotal, tax_amount, 
         discount_amount, total_amount, amount_paid, payment_status, payment_method, currency, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.invoice_number,
        data.reference_number,
        data.customer_id,
        data.invoice_date,
        data.due_date,
        data.subtotal,
        data.tax_amount,
        data.discount_amount,
        data.total_amount,
        data.amount_paid,
        data.payment_status || "Unpaid",
        data.payment_method,
        data.currency || "KES",
        data.notes,
        data.created_by,
      ]
    );

    await conn.end();
    return NextResponse.json({ id: result.insertId, message: "Invoice created successfully" });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

// Handle GET requests
export async function GET() {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute<RowDataPacket[]>("SELECT * FROM invoices ORDER BY created_at DESC");
    await conn.end();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}