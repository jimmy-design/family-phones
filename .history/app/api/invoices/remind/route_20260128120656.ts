import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Define types
interface Invoice {
  invoice_number: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  customer_id: number;
}

interface Customer {
  customer_id: number;
  full_name: string;
  phone_number: string | null;
}

// Normalize phone number to Kenya format (+254...)
function normalizePhoneToKenya(raw?: string | null): string | null {
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

// Send SMS notification via Africa's Talking
async function sendSmsNotification(phone: string, message: string): Promise<boolean> {
  try {
    const smsApiUrl = process.env.SMS_API_URL || 'https://api.africastalking.com/version1/messaging';
    const senderId = process.env.SMS_SENDER_ID || '';
    const apiKey = process.env.SMS_API_KEY || '';
    const username = process.env.SMS_USERNAME || 'FamilySmart';

    // Debug: Check if environment variables are loaded (important for Vercel deployment)
    if (!apiKey) {
      console.error('SMS_API_KEY environment variable is not set! Please add it to Vercel Environment Variables.');
      return false;
    }

    // Build form data - Africa's Talking expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('to', phone); // Single phone number as string
    formData.append('message', message);
    
    // Only add sender ID if it's not empty (some accounts may not have approved sender IDs)
    if (senderId && senderId.trim() !== '') {
      formData.append('from', senderId);
    }

    console.log('Sending SMS to:', phone);
    console.log('SMS API URL:', smsApiUrl);
    console.log('Username:', username);
    console.log('Sender ID:', senderId || '(default)');

    const smsRes = await fetch(smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey,
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    if (!smsRes.ok) {
      const txt = await smsRes.text().catch(() => '');
      console.error('SMS send failed', smsRes.status, txt);
      return false;
    }
    
    const result = await smsRes.json().catch(() => null);
    console.log('Africa\'s Talking SMS response:', JSON.stringify(result, null, 2));
    
    // Check if any messages were actually sent
    if (result?.SMSMessageData?.Recipients) {
      const recipients = result.SMSMessageData.Recipients;
      for (const recipient of recipients) {
        console.log(`SMS to ${recipient.number}: status=${recipient.status}, statusCode=${recipient.statusCode}, cost=${recipient.cost}`);
        if (recipient.status === 'Success') {
          return true;
        }
      }
    }
    
    // If we got here, no messages were successfully sent
    console.error('SMS delivery failed - check Africa\'s Talking account balance and sender ID approval');
    return false;
  } catch (smsErr) {
    console.error('Error sending SMS:', smsErr);
    return false;
  }
}

// POST - Send payment reminders to all customers with partially paid invoices
export async function POST() {
  try {
    // Get all invoices with "Partially Paid" status
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("invoice_number, total_amount, amount_paid, balance_due, currency, customer_id")
      .eq("payment_status", "Partially Paid");

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      return NextResponse.json(
        { error: "Failed to fetch invoices: " + invoicesError.message },
        { status: 500 }
      );
    }

    const typedInvoices = (invoices || []) as Invoice[];

    if (typedInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No customers with partially paid invoices found",
        sent: 0,
        failed: 0
      });
    }

    // Get unique customer IDs
    const customerIds = [...new Set(typedInvoices.map((inv: Invoice) => inv.customer_id))];

    // Fetch customer details
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("customer_id, full_name, phone_number")
      .in("customer_id", customerIds);

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      return NextResponse.json(
        { error: "Failed to fetch customers: " + customersError.message },
        { status: 500 }
      );
    }

    const typedCustomers = (customers || []) as Customer[];

    // Create a map of customer_id to customer details
    const customerMap = new Map<number, Customer>(
      typedCustomers.map((c: Customer) => [c.customer_id, c])
    );

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ customer: string; phone: string; status: string; invoice: string }> = [];

    for (const invoice of typedInvoices) {
      const customer = customerMap.get(invoice.customer_id);
      
      if (!customer || !customer.phone_number) {
        failedCount++;
        results.push({
          customer: customer?.full_name || "Unknown",
          phone: "N/A",
          status: "no_phone",
          invoice: invoice.invoice_number
        });
        continue;
      }

      const normalizedPhone = normalizePhoneToKenya(customer.phone_number);
      
      if (!normalizedPhone) {
        failedCount++;
        results.push({
          customer: customer.full_name,
          phone: customer.phone_number,
          status: "invalid_phone",
          invoice: invoice.invoice_number
        });
        continue;
      }

      const { invoice_number, balance_due, currency } = invoice;
      const { full_name } = customer;
      
      // Format the reminder message
      const message = `Dear ${full_name}, this is a friendly reminder that you have an outstanding balance of ${currency} ${balance_due?.toFixed(2) || '0.00'} on invoice ${invoice_number}. Please complete your payment at your earliest convenience. Thank you for your business! - Family Phones`;

      const smsSent = await sendSmsNotification(normalizedPhone, message);
      
      if (smsSent) {
        sentCount++;
        results.push({
          customer: full_name,
          phone: normalizedPhone,
          status: "sent",
          invoice: invoice_number
        });
        console.log(`Reminder SMS sent to ${full_name} (${normalizedPhone}) for invoice ${invoice_number}`);
      } else {
        failedCount++;
        results.push({
          customer: full_name,
          phone: normalizedPhone,
          status: "failed",
          invoice: invoice_number
        });
        console.error(`Failed to send reminder SMS to ${full_name} (${normalizedPhone})`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment reminders sent successfully`,
      sent: sentCount,
      failed: failedCount,
      total: typedInvoices.length,
      results
    });

  } catch (error) {
    console.error("Error sending payment reminders:", error);
    return NextResponse.json(
      { error: "Failed to send payment reminders" },
      { status: 500 }
    );
  }
}
