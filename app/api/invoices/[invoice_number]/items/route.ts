import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

// GET - Fetch invoice items by invoice number
export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoice_number: string }> }
) {
  const conn = await getConnection();
  
  try {
    const { invoice_number } = await params;
    
    const [rows] = await conn.execute(
      `SELECT * FROM invoiceitems WHERE invoice_number = ? ORDER BY id`,
      [invoice_number]
    );
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching invoice items:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice items" },
      { status: 500 }
    );
  } finally {
    await conn.end();
  }
}