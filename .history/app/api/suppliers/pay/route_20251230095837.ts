import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, amount } = body || {};

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });

    // Fetch current paid, total_owed and phone
    const { data: existing, error: fetchErr } = await supabase
      .from('suppliers')
      .select('paid, total_owed, phone, phone_number')
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

    // Send SMS notification if phone exists
    try {
      const phone = existing?.phone || existing?.phone_number || null;
      if (phone) {
        const smsApiUrl = process.env.SMS_API_URL || 'https://api.mobilesasa.com/v1/send/message';
        const senderId = process.env.SMS_SENDER_ID || 'MOBILESASA';
        const apiToken = process.env.SMS_API_TOKEN || 'o9EFkyTz1mESKMODyOEMT2BuKCFGUv4CgTDaymmp3BuSV9oJXhecpuKiEzHH';

        const message = `Payment received: KES ${amt.toFixed(2)}. Remaining balance: KES ${newBalance.toFixed(2)}.`;

        // Attempt to send SMS (service may expect different payload; adjust if needed)
        const smsRes = await fetch(smsApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            destination: phone,
            message,
            senderID: senderId,
            api_token: apiToken,
          }),
        });

        if (!smsRes.ok) {
          const txt = await smsRes.text().catch(() => '');
          console.error('SMS send failed', smsRes.status, txt);
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
