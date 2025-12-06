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
    const { invoice_id, invoice_number, payment_method, payment_date } = body || {};

    console.log("Payment request received:", { invoice_id, invoice_number, payment_method, payment_date });

    // Accept either new_payment_amount or amount, and coerce to number
    const rawAmount = body?.new_payment_amount ?? body?.amount;
    const paymentAmount = Number(rawAmount);

    if (!rawAmount || !isFinite(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "A positive payment amount is required" },
        { status: 400 }
      );
    }

    // 1) Fetch current invoice using id or invoice_number - use select("*") to get all fields
    let invoice: Record<string, unknown> | null = null;
    let fetchError: unknown = null;

    if (invoice_id) {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoice_id)
        .limit(1)
        .single();
      
      fetchError = error;
      if (!error && data) {
        invoice = data;
      }
    }
    
    // If not found by id, try by invoice_number
    if (!invoice && invoice_number) {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("invoice_number", invoice_number)
        .limit(1)
        .single();
      
      fetchError = error;
      if (!error && data) {
        invoice = data;
      }
    }

    if (!invoice) {
      console.error("Invoice not found. Error:", fetchError);
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    console.log("Found invoice:", invoice);

    const currentPaid = Number(invoice.amount_paid || 0);
    const total = Number(invoice.total_amount || 0);
    const nextPaid = currentPaid + paymentAmount;
    const clampedPaid = Math.min(nextPaid, total); // prevent overpay
    const balanceDue = Math.max(total - clampedPaid, 0);

    const nextStatus = balanceDue <= 0 ? "Paid" : clampedPaid > 0 ? "Partially Paid" : "Unpaid";

    // 2) Build update object - only include fields that exist
    const updateData: Record<string, unknown> = {
      amount_paid: clampedPaid,
      payment_status: nextStatus
    };

    // Try to update balance_due if the column exists
    // We'll include it and let Supabase handle it
    updateData.balance_due = balanceDue;

    // Try to update payment_method if provided
    if (payment_method) {
      updateData.payment_method = payment_method;
    }

    console.log("Updating invoice with:", updateData);

    // 2) Update invoice amounts and status - use invoice_number as fallback if id doesn't work
    let updateError: unknown = null;
    
    // Try updating by id first
    if (invoice.id) {
      const result = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", invoice.id);
      
      updateError = result.error;
    }
    
    // If id update failed, try by invoice_number
    if (updateError && invoice.invoice_number) {
      console.log("Update by id failed, trying by invoice_number");
      const result = await supabase
        .from("invoices")
        .update(updateData)
        .eq("invoice_number", invoice.invoice_number);
      
      updateError = result.error;
    }

    if (updateError) {
      console.error("Error updating invoice:", updateError);
      
      // Try a simpler update without balance_due in case that column doesn't exist
      const simpleUpdate: Record<string, unknown> = {
        amount_paid: clampedPaid,
        payment_status: nextStatus
      };
      
      if (payment_method) {
        simpleUpdate.payment_method = payment_method;
      }
      
      const retryResult = await supabase
        .from("invoices")
        .update(simpleUpdate)
        .eq("invoice_number", invoice.invoice_number);
      
      if (retryResult.error) {
        console.error("Retry update also failed:", retryResult.error);
        return NextResponse.json({ error: "Failed to update invoice: " + (retryResult.error as { message?: string }).message }, { status: 500 });
      }
    }

    // 3) Optionally insert a payment record (if payments table exists)
    try {
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount: paymentAmount,
          method: payment_method || null,
          payment_date: payment_date || null
        });
      
      if (paymentError) {
        console.warn("Could not insert payment record:", paymentError);
      }
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

    console.log("Payment recorded successfully:", updated);
    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    console.error("/api/invoices/pay PUT error", err);
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
