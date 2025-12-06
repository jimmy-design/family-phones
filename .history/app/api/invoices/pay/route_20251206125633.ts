import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Expected payload
// {
//   invoice_id: number,
//   new_payment_amount: number,
//   payment_method: string,
//   payment_date: string (YYYY-MM-DD)
// }

async function handlePayment(req: Request) {
  try {
    const body = await req.json();
    const { invoice_number, payment_method, payment_date } = body || {};

    console.log("Payment request received:", { invoice_number, payment_method, payment_date });

    // Accept either new_payment_amount or amount, and coerce to number
    const rawAmount = body?.new_payment_amount ?? body?.amount;
    const paymentAmount = Number(rawAmount);

    if (!rawAmount || !isFinite(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "A positive payment amount is required" },
        { status: 400 }
      );
    }

    if (!invoice_number) {
      return NextResponse.json(
        { error: "Invoice number is required" },
        { status: 400 }
      );
    }

    // 1) Fetch current invoice using invoice_number (primary identifier)
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_number", invoice_number)
      .limit(1)
      .single();

    if (fetchError || !invoice) {
      console.error("Invoice not found. Error:", fetchError);
      return NextResponse.json({ error: "Invoice not found: " + (fetchError?.message || "No matching record") }, { status: 404 });
    }

    console.log("Found invoice:", invoice);

    const currentPaid = Number(invoice.amount_paid || 0);
    const total = Number(invoice.total_amount || 0);
    const nextPaid = currentPaid + paymentAmount;
    const clampedPaid = Math.min(nextPaid, total); // prevent overpay
    const balanceDue = Math.max(total - clampedPaid, 0);

    const nextStatus = balanceDue <= 0 ? "Paid" : clampedPaid > 0 ? "Partially Paid" : "Unpaid";

    console.log("Calculated values:", { currentPaid, total, nextPaid, clampedPaid, balanceDue, nextStatus });

    // 2) Update invoice using invoice_number directly
    // First try with all fields including balance_due
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        amount_paid: clampedPaid,
        balance_due: balanceDue,
        payment_status: nextStatus,
        payment_method: payment_method || invoice.payment_method || null
      })
      .eq("invoice_number", invoice_number);

    if (updateError) {
      console.error("Error updating invoice with balance_due:", updateError);
      
      // Try without balance_due in case that column doesn't exist
      const { error: retryError } = await supabase
        .from("invoices")
        .update({
          amount_paid: clampedPaid,
          payment_status: nextStatus,
          payment_method: payment_method || invoice.payment_method || null
        })
        .eq("invoice_number", invoice_number);
      
      if (retryError) {
        console.error("Retry update also failed:", retryError);
        return NextResponse.json({ error: "Failed to update invoice: " + retryError.message }, { status: 500 });
      }
    }

    console.log("Invoice updated successfully");

    // 3) Optionally insert a payment record (if payments table exists)
    try {
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          invoice_number: invoice_number,
          amount: paymentAmount,
          method: payment_method || null,
          payment_date: payment_date || new Date().toISOString().split('T')[0]
        });
      
      if (paymentError) {
        console.warn("Could not insert payment record:", paymentError.message);
      }
    } catch (e) {
      // If payments table doesn't exist, skip without failing the whole request
      console.warn("Skipping payment log: ", (e as Error).message);
    }

    // 4) Return updated invoice snapshot
    const updated = {
      invoice_number: invoice_number,
      total_amount: total,
      amount_paid: clampedPaid,
      balance_due: balanceDue,
      currency: invoice.currency || "KES",
      payment_status: nextStatus,
    };

    console.log("Payment recorded successfully:", updated);
    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    console.error("/api/invoices/pay error:", err);
    return NextResponse.json({ error: "Server error: " + (err as Error).message }, { status: 500 });
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
