import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Define types for invoice items
interface InvoiceItem {
  description?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

// Normalize phone number to Kenya format (+254...)
function normalizePhoneToKenya(raw?: string | null) {
  if (!raw) return null;
  let s = String(raw).trim();
  const hasPlus = s.startsWith('+');
  s = s.replace(/[^0-9]/g, '');
  if (!s) return null;
  if (hasPlus) {
    if (s.startsWith('254')) return '+' + s;
    return '+' + s;
  }
  if (s.startsWith('0')) {
    s = '254' + s.slice(1);
    return '+' + s;
  }
  if (s.startsWith('254')) return '+' + s;
  if (s.length === 9) return '+254' + s;
  if (s.length === 12 && s.startsWith('254')) return '+' + s;
  return '+' + s;
}

// Send SMS notification
async function sendSmsNotification(phone: string, message: string) {
  try {
    const smsApiUrl = process.env.SMS_API_URL || 'https://api.mobilesasa.com/v1/send/message';
    const senderId = process.env.SMS_SENDER_ID || 'MOBILESASA';
    const apiToken = process.env.SMS_API_TOKEN || 'o9EFkyTz1mESKMODyOEMT2BuKCFGUv4CgTDaymmp3BuSV9oJXhecpuKiEzHH';

    const smsRes = await fetch(smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        destination: phone,
        message,
        senderID: senderId,
        api_token: apiToken,
      }),
    });

    if (!smsRes.ok) {
      const txt = await smsRes.text().catch(() => '');
      console.error('SMS send failed', smsRes.status, txt);
      return false;
    }
    return true;
  } catch (smsErr) {
    console.error('Error sending SMS:', smsErr);
    return false;
  }
}

// GET - Fetch all invoices with customer name
export async function GET() {
  try {
    // Fetch all invoices - use simple select to avoid column issues
    const { data: rows, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      return NextResponse.json({ error: "Failed to fetch invoices: " + error.message }, { status: 500 });
    }

    // If no data, return empty array
    if (!rows || rows.length === 0) {
      console.log("No invoices found in database");
      return NextResponse.json([]);
    }

    // Fetch all customers for mapping
    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("customer_id, full_name");

    if (customerError) {
      console.error("Error fetching customers:", customerError);
    }

    const customerMap = new Map(
      (customers || []).map((c: { customer_id: number; full_name: string }) => [c.customer_id, c.full_name])
    );

    // Transform the data to match the expected format
    const transformedRows = rows.map((row: Record<string, unknown>) => {
      const totalAmount = Number(row.total_amount) || 0;
      const amountPaid = Number(row.amount_paid) || 0;
      const balanceDue = row.balance_due !== undefined && row.balance_due !== null
        ? Number(row.balance_due)
        : totalAmount - amountPaid;
      
      return {
        id: row.id,
        invoice_number: row.invoice_number || "",
        reference_number: row.reference_number || "",
        customer_id: row.customer_id,
        customer_name: customerMap.get(row.customer_id as number) || null,
        invoice_date: row.invoice_date || null,
        due_date: row.due_date || null,
        subtotal: Number(row.subtotal) || 0,
        tax_amount: Number(row.tax_amount) || 0,
        discount_amount: Number(row.discount_amount) || 0,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        payment_status: row.payment_status || "Unpaid",
        payment_method: row.payment_method || null,
        currency: row.currency || "KES",
        notes: row.notes || null,
        created_by: row.created_by || null,
        created_at: row.created_at || null,
        updated_at: row.updated_at || null
      };
    });

    console.log(`Returning ${transformedRows.length} invoices`);
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

    // Calculate amounts
    const totalAmt = total_amount !== undefined ? Number(total_amount) : 0;
    const paidAmt = amount_paid !== undefined ? Number(amount_paid) : 0;

    // Insert invoice into database
    // Note: balance_due is a generated column (total_amount - amount_paid), so we don't insert it
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
        total_amount: totalAmt,
        amount_paid: paidAmt,
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