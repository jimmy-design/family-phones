import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, amount } = body || {};

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });

    // Fetch current paid, total_owed, phone, name and refno
    const { data: existing, error: fetchErr } = await supabase
      .from('suppliers')
      .select('paid, total_owed, phone, name, refno')
      .eq('id', id)
      .limit(1)
      .single();

    if (fetchErr) {
      console.error('Supabase fetch error (suppliers/pay):', fetchErr);
      return NextResponse.json({ error: fetchErr.message || 'Failed to fetch supplier' }, { status: 500 });
    }

    const curPaid = Number(existing?.paid ?? 0);
    const curTotal = Number(existing?.total_owed ?? 0);
    const newPaid = +(curPaid + amt);
    const newBalance = +(curTotal - newPaid);
    const newStatus = newPaid >= curTotal ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');

    const { data: updated, error: updateErr } = await supabase
      .from('suppliers')
      .update({ paid: newPaid, balance: newBalance, status: newStatus })
      .eq('id', id)
      .select();

    if (updateErr) {
      console.error('Supabase update error (suppliers/pay):', updateErr);
      return NextResponse.json({ error: updateErr.message || 'Failed to update supplier payment' }, { status: 500 });
    }

    // Send SMS notification via Africa's Talking if phone exists
    try {
      const phoneRaw = existing?.phone || null;
      const phone = normalizePhoneToKenya(phoneRaw);
      if (phone) {
        const smsApiUrl = process.env.SMS_API_URL || 'https://api.africastalking.com/version1/messaging';
        const senderId = process.env.SMS_SENDER_ID || '';
        const apiKey = process.env.SMS_API_KEY || '';
        const username = process.env.SMS_USERNAME || 'FamilySmart';

        // Debug: Check if environment variables are loaded (important for Vercel deployment)
        if (!apiKey) {
          console.error('SMS_API_KEY environment variable is not set! Please add it to Vercel Environment Variables.');
        }

        const supplierName = existing?.name || '';
        const supplierRef = existing?.refno || '';
        const message = `Dear ${supplierName || supplierRef || 'Supplier'}, We have successfully paid  KES ${amt.toFixed(2)}. Ref: ${supplierRef || '—'}. Remaining: KES ${newBalance.toFixed(2)}.`;

        // Build form data - Africa's Talking expects application/x-www-form-urlencoded
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('to', phone); // Single phone number as string
        formData.append('message', message);
        
        // Only add sender ID if it's not empty
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
        } else {
          const result = await smsRes.json().catch(() => null);
          console.log('Africa\'s Talking SMS response:', JSON.stringify(result, null, 2));
          
          // Log recipient status for debugging
          if (result?.SMSMessageData?.Recipients) {
            for (const recipient of result.SMSMessageData.Recipients) {
              console.log(`SMS to ${recipient.number}: status=${recipient.status}, statusCode=${recipient.statusCode}, cost=${recipient.cost}`);
            }
          }
        }
      }
    } catch (smsErr) {
      console.error('Error sending SMS after payment:', smsErr);
    }

    return NextResponse.json({ message: 'Payment recorded', data: updated }, { status: 200 });
  } catch (err) {
    console.error('Error in suppliers/pay:', err);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
