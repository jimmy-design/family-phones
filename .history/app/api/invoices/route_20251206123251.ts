import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Define types for invoice items
interface InvoiceItem {
  description?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

// GET - Fetch all invoices with customer name
export async function GET() {
  try {
    // First, try to fetch invoices with customer relation
    let { data: rows, error } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        reference_number,
        customer_id,
        invoice_date,
        due_date,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        amount_paid,
        balance_due,
        payment_status,
        payment_method,
        currency,
        notes,
        created_by,
        created_at,
        updated_at,
        customers (
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    // If the join fails, try without the customer relation
    if (error) {
      console.error("Error fetching invoices with join, trying without:", error);
      const result = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (result.error) {
        console.error("Error fetching invoices:", result.error);
        return NextResponse.json({ error: "Failed to fetch invoices: " + result.error.message }, { status: 500 });
      }
      rows = result.data;
    }

    // Fetch all customers for mapping
    const { data: customers } = await supabase
      .from("customers")
      .select("customer_id, full_name");

    const customerMap = new Map(
      (customers || []).map((c: { customer_id: number; full_name: string }) => [c.customer_id, c.full_name])
    );

    // Transform the data to match the expected format
    const transformedRows = (rows || []).map((row: Record<string, unknown>) => {
      const totalAmount = Number(row.total_amount) || 0;
      const amountPaid = Number(row.amount_paid) || 0;
      const balanceDue = row.balance_due !== undefined && row.balance_due !== null
        ? Number(row.balance_due)
        : totalAmount - amountPaid;
      
      return {
        ...row,
        customer_name: (row.customers as { full_name?: string } | null)?.full_name ||
                       customerMap.get(row.customer_id as number) ||
                       null,
        balance_due: balanceDue,
        customers: undefined
      };
    });

    return NextResponse.json(transformedRows);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

// POST - Create new invoice with items
export async function POST(request: Request) {
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

    // Insert invoice into database
    const { data: result, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number,
        customer_id: customer_id || null,
        invoice_date: invoice_date || null,
        due_date: due_date || null,
        subtotal: subtotal !== undefined ? subtotal : 0,
        tax_amount: tax_amount !== undefined ? tax_amount : 0,
        discount_amount: discount_amount !== undefined ? discount_amount : 0,
        total_amount: total_amount !== undefined ? total_amount : 0,
        amount_paid: amount_paid !== undefined ? amount_paid : 0,
        payment_status: payment_status || "Unpaid",
        payment_method: payment_method || null,
        currency: currency || "KES",
        notes: notes || null
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json({ error: "Failed to create invoice: " + invoiceError.message }, { status: 500 });
    }

    // Insert invoice items into invoiceitems table
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: InvoiceItem) => ({
        invoice_number,
        description: item.description || "",
        quantity: item.quantity !== undefined ? item.quantity : 1,
        unit_price: item.unit_price !== undefined ? item.unit_price : 0,
        total_price: item.total_price !== undefined ? item.total_price : 0
      }));

      const { error: itemsError } = await supabase
        .from("invoiceitems")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Error creating invoice items:", itemsError);
        // Invoice was created but items failed - you might want to handle this differently
      }
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      invoice_number: invoice_number,
      message: `${type === "quotation" ? "Quotation" : "Invoice"} created successfully`
    });

  } catch (error: unknown) {
    console.error("Error creating invoice:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create invoice: " + errorMessage }, { status: 500 });
  }
}