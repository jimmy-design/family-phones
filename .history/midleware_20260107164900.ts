import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  return new NextResponse("System is offline", { status: 503 });
}
