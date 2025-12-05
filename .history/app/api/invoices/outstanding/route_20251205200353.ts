import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Handle preflight requests (Important for CORS/POST/PUT/DELETE)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// Handle GET requests to fetch only invoices with outstanding balances
export async function GET() {
  try {
    // Query to select invoices - we'll filter in JS since Supabase doesn't support column comparison directly
    const { data: rows, error } = await supabase
      .from("invoices")
      .select(`
        *,
        customers (
          full_name
        )
      `)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error fetching outstanding invoices:", error);
      return NextResponse.json({ error: "Failed to fetch outstanding invoices" }, { status: 500 });
    }

    // Filter invoices where total_amount > amount_paid and transform data
    const outstandingInvoices = rows
      ?.filter((row: Record<string, unknown>) => {
        const total = Number(row.total_amount) || 0;
        const paid = Number(row.amount_paid) || 0;
        return total > paid;
      })
      .map((row: Record<string, unknown>) => ({
        ...row,
        customer_name: (row.customers as { full_name?: string } | null)?.full_name || null,
        balance_due: (Number(row.total_amount) || 0) - (Number(row.amount_paid) || 0),
        customers: undefined
      }));

    return NextResponse.json(outstandingInvoices);
  } catch (error) {
    console.error("Error fetching outstanding invoices:", error);
    return NextResponse.json({ error: "Failed to fetch outstanding invoices" }, { status: 500 });
  }
}