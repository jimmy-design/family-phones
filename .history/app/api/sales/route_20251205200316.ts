import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// ✅ CREATE (Add new sale)
export async function POST(request: Request) {
  const data = await request.json();

  try {
    // Insert the sale record
    const { data: result, error: saleError } = await supabase
      .from("sales")
      .insert({
        customer_id: data.customer_id,
        inventory_item_id: data.inventory_item_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total_amount: data.total_amount,
        payment_method: data.payment_method,
        payment_status: data.payment_status || "Paid",
      })
      .select()
      .single();

    if (saleError) {
      console.error("Error creating sale:", saleError);
      return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
    }

    // Update inventory quantity using RPC or direct update
    // Note: Supabase doesn't support arithmetic in update directly, so we need to fetch first
    const { data: inventoryItem, error: fetchError } = await supabase
      .from("inventory")
      .select("quantity")
      .eq("id", data.inventory_item_id)
      .single();

    if (!fetchError && inventoryItem) {
      const newQuantity = inventoryItem.quantity - data.quantity;
      await supabase
        .from("inventory")
        .update({ quantity: newQuantity })
        .eq("id", data.inventory_item_id);
    }

    return NextResponse.json({ id: result.id, message: "Sale created successfully" });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}

// ✅ READ (Get all sales)
export async function GET() {
  const { data: rows, error } = await supabase
    .from("sales")
    .select(`
      *,
      customers (
        full_name
      ),
      inventory (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }

  // Transform the data to match the expected format
  const transformedRows = rows?.map((row: Record<string, unknown>) => ({
    ...row,
    customer_name: (row.customers as { full_name?: string } | null)?.full_name || null,
    item_name: (row.inventory as { name?: string } | null)?.name || null,
    customers: undefined,
    inventory: undefined
  }));

  return NextResponse.json(transformedRows);
}