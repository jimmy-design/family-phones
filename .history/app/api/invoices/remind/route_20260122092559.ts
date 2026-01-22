import { NextResponse } from "next/server";
import pool from "@/lib/db";

// Send SMS notification
async function sendSmsNotification(phone: string, message: string) {
  try {
    const smsApiUrl = process.env.SMS_API_URL || 'https://api.mobilesasa.com/v1/send/message';
    const senderId = process.env.SMS_SENDER_ID || 'MOBILESASA';
    const smsApiKey = process.env.SMS_API_KEY;

    const smsRes = await fetch(smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${smsApiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        senderID: senderId,
        phone: phone,
        message: message,
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

// POST - Send payment reminders to all customers with partially paid invoices
export async function POST() {
  try {
    // Get all invoices with "Partially Paid" status along with customer info
    const [invoices] = await pool.query(`
      SELECT 
        i.invoice_number,
        i.total_amount,
        i.amount_paid,
        i.balance_due,
        i.currency,
        c.full_name,
        c.phone_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.customer_id
      WHERE i.payment_status = 'Partially Paid'
      AND c.phone_number IS NOT NULL
      AND c.phone_number != ''
    `);

    const partiallyPaidInvoices = invoices as Array<{
      invoice_number: string;
      total_amount: number;
      amount_paid: number;
      balance_due: number;
      currency: string;
      full_name: string;
      phone_number: string;
    }>;

    if (partiallyPaidInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No customers with partially paid invoices found",
        sent: 0,
        failed: 0
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ customer: string; phone: string; status: string }> = [];

    for (const invoice of partiallyPaidInvoices) {
      const { invoice_number, balance_due, currency, full_name, phone_number } = invoice;
      
      // Format the reminder message
      const message = `Dear ${full_name}, this is a friendly reminder that you have an outstanding balance of ${currency} ${balance_due.toFixed(2)} on invoice ${invoice_number}. Please complete your payment at your earliest convenience. Thank you for your business! - Family Phones`;

      const smsSent = await sendSmsNotification(phone_number, message);
      
      if (smsSent) {
        sentCount++;
        results.push({ customer: full_name, phone: phone_number, status: 'sent' });
        console.log(`Reminder SMS sent to ${full_name} (${phone_number}) for invoice ${invoice_number}`);
      } else {
        failedCount++;
        results.push({ customer: full_name, phone: phone_number, status: 'failed' });
        console.error(`Failed to send reminder SMS to ${full_name} (${phone_number})`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment reminders sent successfully`,
      sent: sentCount,
      failed: failedCount,
      total: partiallyPaidInvoices.length,
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
