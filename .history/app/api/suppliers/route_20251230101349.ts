import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, refno, name, phone, total_owed, paid, balance, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase GET error (suppliers):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

function normalizePhoneToKenya(raw?: string | null) {
  if (!raw) return null;
  // remove spaces and non-digit/plus characters
  let s = String(raw).trim();
  // keep plus to detect international prefix, but remove other non-digits
  const hasPlus = s.startsWith('+');
  s = s.replace(/[^0-9]/g, '');
  if (!s) return null;
  // if originally had plus, assume country code present
  if (hasPlus) {
    // ensure it starts with 254
    if (s.startsWith('254')) return '+' + s;
    // otherwise just prefix +
    return '+' + s;
  }
  // If starts with 0, replace leading 0 with 254
  if (s.startsWith('0')) {
    s = '254' + s.slice(1);
    return '+' + s;
  }
  // If already starts with 254, add plus
  if (s.startsWith('254')) return '+' + s;
  // If looks like local (9 digits) e.g., 712345678 -> prepend 254
  if (s.length === 9) return '+254' + s;
  // Fallback: if length 12 and missing plus, assume it's 254XXXXXXXXX
  if (s.length === 12 && s.startsWith('254')) return '+' + s;
  // Otherwise return with plus
  return '+' + s;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refno, name, total_owed = 0, paid = 0, status = 'unpaid' } = body || {};

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const t = Number(total_owed) || 0;
    const p = Number(paid) || 0;
    const computedBalance = +(t - p);

    const payload = {
      refno: refno || `SUP-${Date.now().toString().slice(-6)}`,
      name: String(name).trim(),
      total_owed: t,
      paid: p,
      balance: computedBalance,
      status: ['unpaid','partial','paid'].includes(String(status)) ? String(status) : (p >= t ? 'paid' : (p > 0 ? 'partial' : 'unpaid')),
    };

    const { data, error } = await supabase.from('suppliers').insert([payload]).select();
    if (error) {
      console.error('Supabase insert error (suppliers):', error);
      return NextResponse.json({ error: error.message || 'Failed to insert supplier' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Supplier created', data }, { status: 201 });
  } catch (err) {
    console.error('Error creating supplier:', err);
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, refno, name, total_owed, paid, status } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'id is required to update supplier' }, { status: 400 });
    }

    const payload: any = {};
    if (refno !== undefined) payload.refno = refno;
    if (name !== undefined) payload.name = String(name).trim();

    // compute new totals/paid based on what's provided; fall back to current values when not provided
    let newTotal: number | undefined = undefined;
    let newPaid: number | undefined = undefined;
    if (total_owed !== undefined) newTotal = Number(total_owed) || 0;
    if (paid !== undefined) newPaid = Number(paid) || 0;

    if (newTotal !== undefined) payload.total_owed = newTotal;
    if (newPaid !== undefined) payload.paid = newPaid;

    // If either total or paid is being changed, recalculate balance and status.
    if (newTotal !== undefined || newPaid !== undefined) {
      // fetch existing row to get current values if needed
      const { data: existingRows, error: fetchErr } = await supabase.from('suppliers').select('total_owed, paid').eq('id', id).limit(1).single();
      if (fetchErr) {
        console.error('Supabase fetch error (suppliers) before update:', fetchErr);
      }
      const curTotal = existingRows?.total_owed ?? 0;
      const curPaid = existingRows?.paid ?? 0;
      const finalTotal = newTotal !== undefined ? newTotal : Number(curTotal || 0);
      const finalPaid = newPaid !== undefined ? newPaid : Number(curPaid || 0);
      payload.balance = +(finalTotal - finalPaid);
      payload.status = (finalPaid >= finalTotal) ? 'paid' : (finalPaid > 0 ? 'partial' : 'unpaid');
    } else if (status !== undefined) {
      payload.status = ['unpaid','partial','paid'].includes(String(status)) ? String(status) : 'unpaid';
    }

    const { data, error } = await supabase.from('suppliers').update(payload).eq('id', id).select();
    if (error) {
      console.error('Supabase update error (suppliers):', error);
      return NextResponse.json({ error: error.message || 'Failed to update supplier' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Supplier updated', data }, { status: 200 });
  } catch (err) {
    console.error('Error updating supplier:', err);
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}
