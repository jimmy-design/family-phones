import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login'];

const isPublicPath = (path: string) =>
  publicPaths.some(p => path === p || path.startsWith(`${p}/`));

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 🔴 SYSTEM OFFLINE BLOCK
  return new NextResponse(
    'System is temporarily offline. Please try again later.',
    { status: 503 }
  );
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
