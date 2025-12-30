import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, amount } = body || {};

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });

    // Fetch current paid and total_owed
    const { data: existing, error: fetchErr } = await supabase
      .from('suppliers')
      .select('paid, total_owed')
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

    return NextResponse.json({ message: 'Payment recorded', data: updated }, { status: 200 });
  } catch (err) {
    console.error('Error in suppliers/pay:', err);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
