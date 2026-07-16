import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import { applyCors, handlePreflight } from "./lib/cors";

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const path = req.nextUrl.pathname;

    // ── CORS for all /api/* routes ────────────────────────────────────────────
    // Handle OPTIONS preflight before any auth logic so browsers can complete
    // the CORS handshake even for unauthenticated pre-flight requests.
    if (path.startsWith("/api")) {
      if (req.method === "OPTIONS") {
        return handlePreflight(req);
      }
      return applyCors(req, NextResponse.next());
    }

    const token = req.nextauth.token;

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

    const companySuspended = (token as any).companySuspended as boolean | undefined;
    if (companySuspended && userRole !== "SUPER_ADMIN") {
      const url = new URL("/login", req.url);
      url.searchParams.set("reason", "company_suspended");
      return NextResponse.redirect(url);
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

    // /company/dashboard is the worksite picker — all authenticated roles must
    // be able to reach it so they can select a site after login.
    // Only deeper company-management routes (/company/worksites/create, etc.)
    // are restricted to admins.
    const isWorksitePicker = path === "/company/dashboard";

    // SITE_ADMIN: Access to their worksite dashboard, can manage their site
    if (userRole === "SITE_ADMIN") {
      if (path.startsWith("/admin") || (path.startsWith("/company") && !isWorksitePicker)) {
        return NextResponse.redirect(new URL("/company/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // SUPERVISOR: Similar to SITE_ADMIN but may have limited permissions
    if (userRole === "SUPERVISOR") {
      if (path.startsWith("/admin") || (path.startsWith("/company") && !isWorksitePicker)) {
        return NextResponse.redirect(new URL("/company/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // WORKER: Basic access, can view but limited edit
    if (userRole === "WORKER") {
      if (path.startsWith("/admin") || (path.startsWith("/company") && !isWorksitePicker) || path.startsWith("/workflow") || path.startsWith("/cameras")) {
        return NextResponse.redirect(new URL("/company/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // VIEWER: Most restricted, read-only access
    if (userRole === "VIEWER") {
      if (path.startsWith("/admin") || (path.startsWith("/company") && !isWorksitePicker) || path.startsWith("/workflow") || path.startsWith("/cameras") || path.startsWith("/dashboard/object-detection")) {
        return NextResponse.redirect(new URL("/company/dashboard", req.url));
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
        // API routes handle their own authentication — always let the middleware
        // function run so CORS headers get applied regardless of session state.
        if (path.startsWith('/api')) return true;
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
    "/api/:path*",
    "/admin/:path*",
    "/company/:path*",
    "/dashboard/:path*",
    "/workflow/:path*",
  ],
}; 