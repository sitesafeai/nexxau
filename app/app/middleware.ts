import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Allow access to dashboard without auth (temporary during development)
    if (path.startsWith("/dashboard")) {
      return NextResponse.next();
    }

    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const userRole = token.role;

    // Admin can access everything
    if (userRole === "admin") {
      return NextResponse.next();
    }

    // Site manager access
    if (userRole === "site-manager") {
      if (path.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // Worker access
    if (userRole === "worker") {
      if (path.startsWith("/admin") || path.startsWith("/workflow") || path.startsWith("/cameras")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // Viewer access (most restricted)
    if (userRole === "viewer") {
      if (path.startsWith("/admin") || path.startsWith("/workflow") || path.startsWith("/cameras") || path.startsWith("/dashboard/object-detection")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // Unknown role, redirect to login
    return NextResponse.redirect(new URL("/login", req.url));
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith('/dashboard')) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - public files
     */
    // Exclude dashboard entirely from auth middleware during development
    "/((?!api|_next/static|_next/image|favicon.ico|login|images|manifest.json|dashboard).*)",
  ],
}; 