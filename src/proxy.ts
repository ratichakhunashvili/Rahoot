import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminSessionCookieName, verifyAdminToken } from "@/lib/session";

// Guards the entire /admin area. This is the wall that keeps the admin panel
// unreachable for anyone but the admin: every request under /admin (other
// than the login page itself) must carry a valid, signed session cookie or
// it gets bounced to /admin/login before any admin page/data ever renders.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(adminSessionCookieName())?.value;
  const session = token ? await verifyAdminToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/admin/login", request.nextUrl);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
