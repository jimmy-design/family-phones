import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

export async function GET() {
  const conn = await getConnection();
  const [rows] = await conn.execute("SELECT id, name, days FROM installments ORDER BY id ASC");
  await conn.end();
  return NextResponse.json(rows);
}
