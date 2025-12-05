import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return NextResponse.json({ message: "Expenses API working" });
}

export async function POST(request: Request) {
  const data = await request.json();
  // handle expenses logic here
  return NextResponse.json({ success: true, data });
}
