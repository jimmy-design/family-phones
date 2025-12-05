import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// ✅ READ (Get all inventory items)
export async function GET() {
  const { data: rows, error } = await supabase
    .from("inventory")
    .select("*")
    .order("date_updated", { ascending: false });

  if (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }

  return NextResponse.json(rows);
}

// ✅ CREATE (Add new inventory item)
export async function POST(request: Request) {
  const data = await request.json();

  const { data: result, error } = await supabase
    .from("inventory")
    .insert({
      imei: data.imei,
      model: data.model,
      name: data.name,
      price: data.price,
      offer_price: data.offer_price,
      quantity: data.quantity || 0,
      status: data.status || "Available",
      updated_by: data.updated_by || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding inventory:", error);
    return NextResponse.json({ error: "Failed to add inventory item" }, { status: 500 });
  }

  return NextResponse.json({ id: result.id, message: "Inventory item added successfully" });
}

// ✅ UPDATE (Edit existing inventory item)
export async function PUT(request: Request) {
  const data = await request.json();

  const { error } = await supabase
    .from("inventory")
    .update({
      imei: data.imei,
      model: data.model,
      name: data.name,
      price: data.price,
      offer_price: data.offer_price,
      quantity: data.quantity,
      status: data.status,
      updated_by: data.updated_by,
    })
    .eq("id", data.id);

  if (error) {
    console.error("Error updating inventory:", error);
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
  }

  return NextResponse.json({ message: "Inventory item updated successfully" });
}

// ✅ DELETE (Remove inventory item)
export async function DELETE(request: Request) {
  const { id } = await request.json();

  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting inventory:", error);
    return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 });
  }

  return NextResponse.json({ message: "Inventory item deleted successfully" });
}
