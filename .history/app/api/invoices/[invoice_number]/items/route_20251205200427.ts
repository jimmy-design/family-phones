import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// GET - Fetch invoice items by invoice number
export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoice_number: string }> }
) {
  try {
    const { invoice_number } = await params;
    
    const { data: rows, error } = await supabase
      .from("invoiceitems")
      .select("*")
      .eq("invoice_number", invoice_number)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching invoice items:", error);
      return NextResponse.json(
        { error: "Failed to fetch invoice items" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching invoice items:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice items" },
      { status: 500 }
    );
  }
}