import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return NextResponse.json({ message: "Approval API working" });
}

export async function POST(request: Request) {
  const data = await request.json();
  // handle approval logic
  return NextResponse.json({ success: true });
}
