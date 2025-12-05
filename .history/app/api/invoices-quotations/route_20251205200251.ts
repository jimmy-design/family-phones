import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// Handle POST requests
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Insert invoice data
    const { data: result, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: data.invoice_number,
        reference_number: data.reference_number,
        customer_id: data.customer_id,
        invoice_date: data.invoice_date,
        due_date: data.due_date,
        subtotal: data.subtotal,
        tax_amount: data.tax_amount,
        discount_amount: data.discount_amount,
        total_amount: data.total_amount,
        amount_paid: data.amount_paid,
        payment_status: data.payment_status || "Unpaid",
        payment_method: data.payment_method,
        currency: data.currency || "KES",
        notes: data.notes,
        created_by: data.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating invoice:", error);
      return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }

    return NextResponse.json({ id: result.id, message: "Invoice created successfully" });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

// Handle GET requests
export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}