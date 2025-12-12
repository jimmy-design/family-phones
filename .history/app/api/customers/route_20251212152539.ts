import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// ✅ READ (Get all customers)
export async function GET() {
  const { data: rows, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }

  return NextResponse.json(rows);
}

// ✅ CREATE (Add a new customer)
export async function POST(request: Request) {
  const data = await request.json();

  // Provide safe defaults so modal-only fields can be inserted without errors
  const full_name = (data.full_name || "").trim();
  const phone_number = data.phone_number ?? null;
  const id_number = data.id_number ?? null;

  // Defaults for optional sale-related columns
  const amount_deposited = data.amount_deposited ?? 0.0;
  const payment_status = data.payment_status ?? "Pending";
  const payment_type = data.payment_type ?? "Installment";

  if (!full_name) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  const city = data.city ?? "";
  const next_of_kin = data.next_of_kin ?? null;
  const installment_id = data.installment_id ?? null;

  if (!installment_id) {
    return NextResponse.json({ error: "installment_id is required" }, { status: 400 });
  }

  const { data: result, error } = await supabase
    .from("customers")
    .insert({
      full_name,
      phone_number,
      id_number,
      city,
      next_of_kin,
      installment_id,
      amount_deposited,
      payment_status,
      payment_type,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding customer:", error);
    return NextResponse.json({
      error: "Failed to add customer: " + error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    }, { status: 500 });
  }

  return NextResponse.json({ id: result.customer_id, message: "Customer added successfully" });
}

// ✅ UPDATE (Edit existing customer)
export async function PUT(request: Request) {
  const data = await request.json();

  const { error } = await supabase
    .from("customers")
    .update({
      full_name: data.full_name,
      phone_number: data.phone_number,
      id_number: data.id_number,
      product_id: data.product_id,
      product_name: data.product_name,
      total_price: data.total_price,
      amount_deposited: data.amount_deposited,
      payment_status: data.payment_status,
      payment_type: data.payment_type,
    })
    .eq("customer_id", data.customer_id);

  if (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }

  return NextResponse.json({ message: "Customer updated successfully" });
}

// ✅ DELETE (Remove customer)
export async function DELETE(request: Request) {
  const { customer_id } = await request.json();

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("customer_id", customer_id);

  if (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }

  return NextResponse.json({ message: "Customer deleted successfully" });
}