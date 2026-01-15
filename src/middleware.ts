import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for route protection
 *
 * Note: Since we use localStorage for auth tokens (client-side),
 * this middleware provides structural protection only.
 * The actual auth check happens client-side in AuthProvider.
 *
 * This middleware:
 * 1. Ensures dashboard routes are not cached
 * 2. Adds security headers
 * 3. Could be extended to check cookies if we migrate to cookie-based auth
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Dashboard routes should not be cached
  if (pathname.startsWith("/dashboard")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
