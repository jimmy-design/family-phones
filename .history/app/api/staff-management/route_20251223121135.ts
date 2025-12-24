import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// Placeholder for staff-management API
export async function GET() {
  try {
    const { data, error } = await supabase.from("staff").select("*");
    if (error) {
      console.error("Supabase GET error (staff):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Error fetching staff:", err);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Insert into Supabase 'staff' table
    const { data: inserted, error } = await supabase.from("staff").insert([data]).select();
    if (error) {
      console.error("Supabase INSERT error (staff):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: "Staff member added successfully", data: inserted }, { status: 201 });
  } catch (error) {
    console.error("Error with staff management:", error);
    return NextResponse.json({ error: "Failed to process staff management" }, { status: 500 });
  }
}