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
      .select("id, refno, name, total_owed, paid, status, created_at")
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refno, name, total_owed = 0, paid = 0, status = 'unpaid' } = body || {};

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const payload = {
      refno: refno || `SUP-${Date.now().toString().slice(-6)}`,
      name: String(name).trim(),
      total_owed: Number(total_owed) || 0,
      paid: Number(paid) || 0,
      status: ['unpaid','partial','paid'].includes(String(status)) ? String(status) : 'unpaid',
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
