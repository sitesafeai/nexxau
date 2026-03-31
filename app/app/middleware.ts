import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // If no token, redirect to login (except for public paths)
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const userRole = token.role as string;

    // Tenant pilot enforcement (block access after pilotEndsAt)
    const pilotEndsAt = (token as any).pilotEndsAt as string | null | undefined;
    if (pilotEndsAt) {
      const expiresAt = new Date(pilotEndsAt).getTime();
      if (!Number.isNaN(expiresAt) && Date.now() > expiresAt) {
        const url = new URL("/login", req.url);
        url.searchParams.set("reason", "pilot_expired");
        return NextResponse.redirect(url);
      }
    }

    // SUPER_ADMIN: Only access /admin routes (platform management)
    if (userRole === "SUPER_ADMIN") {
      if (path.startsWith("/company")) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // COMPANY_ADMIN: Access to company dashboard and their worksites, but NOT /admin
    if (userRole === "COMPANY_ADMIN") {
      if (path.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/company/dashboard", req.url));
      }
      // Allow access to /company and /dashboard
      return NextResponse.next();
    }

    // SITE_ADMIN: Access to their worksite dashboard, can manage their site
    if (userRole === "SITE_ADMIN") {
      if (path.startsWith("/admin") || path.startsWith("/company")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // SUPERVISOR: Similar to SITE_ADMIN but may have limited permissions
    if (userRole === "SUPERVISOR") {
      if (path.startsWith("/admin") || path.startsWith("/company")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // WORKER: Basic access, can view but limited edit
    if (userRole === "WORKER") {
      if (path.startsWith("/admin") || path.startsWith("/company") || path.startsWith("/workflow") || path.startsWith("/cameras")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // VIEWER: Most restricted, read-only access
    if (userRole === "VIEWER") {
      if (path.startsWith("/admin") || path.startsWith("/company") || path.startsWith("/workflow") || path.startsWith("/cameras") || path.startsWith("/dashboard/object-detection")) {
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
        // Allow dashboard and company routes if authenticated
        if (path.startsWith('/dashboard') || path.startsWith('/company')) {
          return !!token;
        }
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
     * - login, signup, auth pages
     * - public files
     */
    "/admin/:path*",
    "/company/:path*",
    "/dashboard/:path*",
    "/workflow/:path*",
  ],
}; 