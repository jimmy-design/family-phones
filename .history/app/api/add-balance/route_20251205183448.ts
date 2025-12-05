import { NextResponse } from "next/server";

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

// Placeholder for add-balance API
export async function GET() {
  return NextResponse.json({ message: "Add balance endpoint" });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // TODO: Implement add balance logic
    return NextResponse.json({ message: "Balance added successfully", data });
  } catch (error) {
    console.error("Error adding balance:", error);
    return NextResponse.json({ error: "Failed to add balance" }, { status: 500 });
  }
}