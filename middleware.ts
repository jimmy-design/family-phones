import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public paths that don't require authentication
const publicPaths = ['/login'];

// Function to check if a path is public
const isPublicPath = (path: string) => {
  return publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookies (in a real app, you would use proper session management)
  const token = request.cookies.get('authToken')?.value;
  
  // If it's a public path, allow access
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  
  // If no token and not a public path, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // For now, we'll allow access if there's a token
  // In a real application, you would verify the token here
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};