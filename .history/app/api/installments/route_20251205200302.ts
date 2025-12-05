import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET() {
  const { data: rows, error } = await supabase
    .from("installments")
    .select("id, name, days")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching installments:", error);
    return NextResponse.json({ error: "Failed to fetch installments" }, { status: 500 });
  }

  return NextResponse.json(rows);
}
