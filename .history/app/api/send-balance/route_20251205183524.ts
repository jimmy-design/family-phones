import { NextResponse } from "next/server";

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// Placeholder for send-balance API
export async function GET() {
  return NextResponse.json({ message: "Send balance endpoint" });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // TODO: Implement send balance logic
    return NextResponse.json({ message: "Balance sent successfully", data });
  } catch (error) {
    console.error("Error sending balance:", error);
    return NextResponse.json({ error: "Failed to send balance" }, { status: 500 });
  }
}