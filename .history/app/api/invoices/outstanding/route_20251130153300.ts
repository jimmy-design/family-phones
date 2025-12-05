import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

// Handle preflight requests (Important for CORS/POST/PUT/DELETE)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// Handle GET requests to fetch only invoices with outstanding balances
export async function GET() { // <-- MUST be named 'GET' and exported
  try {
    const conn = await getConnection();

    // Query to select invoices where total_amount is greater than amount_paid,
    // which means a balance is still due (Unpaid or Partially Paid).
    // It also joins the customer table to get the customer's full name.
    const query = `
      SELECT 
        i.*, 
        c.full_name AS customer_name,
        (i.total_amount - i.amount_paid) AS balance_due 
      FROM invoices i
      JOIN customers c ON i.customer_id = c.customer_id
      WHERE i.total_amount > i.amount_paid
      ORDER BY i.due_date ASC, i.created_at DESC;
    `;

    const [rows] = await conn.execute<RowDataPacket[]>(query);

    await conn.end();

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching outstanding invoices:", error);
    return NextResponse.json({ error: "Failed to fetch outstanding invoices" }, { status: 500 });
  }
}