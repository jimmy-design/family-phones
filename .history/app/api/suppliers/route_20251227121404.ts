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
