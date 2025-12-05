import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

// Expected payload
// {
//   invoice_id: number,
//   new_payment_amount: number,
//   payment_method: string,
//   payment_date: string (YYYY-MM-DD)
// }

async function handlePayment(req: Request) {
  let conn: any;
  try {
    conn = await getConnection();
    const body = await req.json();
    const { invoice_id, invoice_number, payment_method, payment_date } = body || {};

    // Accept either new_payment_amount or amount, and coerce to number
    const rawAmount = body?.new_payment_amount ?? body?.amount;
    const paymentAmount = Number(rawAmount);

    if (!rawAmount || !isFinite(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "A positive payment amount is required" },
        { status: 400 }
      );
    }

    // 1) Fetch current invoice using id or invoice_number
    let invoice: any = null;

    if (invoice_id) {
      const [rows]: any = await conn.execute(
        `SELECT id, invoice_number, total_amount, amount_paid, balance_due, currency, payment_status
         FROM invoices
         WHERE id = ?
         LIMIT 1`,
        [invoice_id]
      );
      invoice = Array.isArray(rows) ? rows[0] : (rows as any);
    } else if (invoice_number) {
      const [rows]: any = await conn.execute(
        `SELECT id, invoice_number, total_amount, amount_paid, balance_due, currency, payment_status
         FROM invoices
         WHERE invoice_number = ? OR TRIM(invoice_number) = TRIM(?) OR LOWER(REPLACE(invoice_number,' ','')) = LOWER(REPLACE(?,' ',''))
         LIMIT 1`,
        [invoice_number, invoice_number, invoice_number]
      );
      invoice = Array.isArray(rows) ? rows[0] : (rows as any);
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const currentPaid = Number(invoice.amount_paid || 0);
    const total = Number(invoice.total_amount || 0);
    const nextPaid = currentPaid + paymentAmount;
    const clampedPaid = Math.min(nextPaid, total); // prevent overpay
    const balanceDue = Math.max(total - clampedPaid, 0);

    const nextStatus = balanceDue <= 0 ? "Paid" : clampedPaid > 0 ? "Partially Paid" : "Unpaid";

    // 2) Update invoice amounts and status
    await conn.execute(
      `UPDATE invoices
       SET amount_paid = ?, balance_due = ?, payment_status = ?, updated_at = NOW()
       WHERE id = ?`,
      [clampedPaid, balanceDue, nextStatus, invoice.id]
    );

    // 3) Optionally insert a payment record (if payments table exists)
    try {
      await conn.execute(
        `INSERT INTO payments (invoice_id, amount, method, payment_date, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [invoice.id, paymentAmount, payment_method || null, payment_date || null]
      );
    } catch (e) {
      // If payments table doesn't exist, skip without failing the whole request
      console.warn("Skipping payment log: ", (e as Error).message);
    }

    // 4) Return updated invoice snapshot (including computed balance)
    const updated = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      total_amount: total,
      amount_paid: clampedPaid,
      balance_due: balanceDue,
      currency: invoice.currency || "KES",
      payment_status: nextStatus,
    };

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("/api/invoices/pay PUT error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    try { if (conn) await conn.end(); } catch {}
  }
}

export async function PUT(req: Request) {
  return handlePayment(req);
}

export async function POST(req: Request) {
  return handlePayment(req);
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  }});
}
