import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { ResultSetHeader } from "mysql2";

// GET - Fetch all invoices with customer name
export async function GET() {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT 
        i.invoice_number,
        c.full_name as customer_name,
        i.customer_id,
        i.invoice_date,
        i.due_date,
        i.subtotal,
        i.tax_amount,
        i.discount_amount,
        i.total_amount,
        i.amount_paid,
        i.balance_due,
        i.payment_status,
        i.notes
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.customer_id
      ORDER BY i.created_at DESC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  } finally {
    await conn.end();
  }
}

// POST - Create new invoice with items
export async function POST(request: Request) {
  const conn = await getConnection();
  
  try {
    const body = await request.json();
    const {
      customer_id,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      amount_paid,
      payment_status,
      payment_method,
      currency,
      notes,
      type,
      items
    } = body;

    // Generate invoice number: INV-YYYYMMDD-XXXX or QT-YYYYMMDD-XXXX
    const prefix = type === "quotation" ? "QT" : "INV";
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const invoice_number = `${prefix}-${dateStr}-${random}`;

    // Insert invoice into database - convert undefined to null
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO invoices
        (invoice_number, customer_id, invoice_date, due_date, subtotal, tax_amount,
         discount_amount, total_amount, amount_paid, payment_status, payment_method, currency, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number,
        customer_id || null,
        invoice_date || null,
        due_date || null,
        subtotal !== undefined ? subtotal : 0,
        tax_amount !== undefined ? tax_amount : 0,
        discount_amount !== undefined ? discount_amount : 0,
        total_amount !== undefined ? total_amount : 0,
        amount_paid !== undefined ? amount_paid : 0,
        payment_status || "Unpaid",
        payment_method || null,
        currency || "KES",
        notes || null
      ]
    );

    const invoiceId = result.insertId;

    // Insert invoice items into invoiceitems table
    if (items && items.length > 0) {
      for (const item of items) {
        await conn.execute(
          `INSERT INTO invoiceitems 
            (invoice_number, description, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?)`,
          [
            invoice_number,
            item.description || "",
            item.quantity !== undefined ? item.quantity : 1,
            item.unit_price !== undefined ? item.unit_price : 0,
            item.total_price !== undefined ? item.total_price : 0
          ]
        );
      }
    }

    return NextResponse.json({
      success: true,
      id: invoiceId,
      invoice_number: invoice_number,
      message: `${type === "quotation" ? "Quotation" : "Invoice"} created successfully`
    });

  } catch (error: unknown) {
    console.error("Error creating invoice:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create invoice: " + errorMessage }, { status: 500 });
  } finally {
    await conn.end();
  }
}