import { NextResponse, NextRequest } from "next/server";

// Simple SSR protection for app routes using a cookie set on login
export function middleware(request: NextRequest) {
  const token = request.cookies.get("joye_admin_auth_token")?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/login");
  const isProtected = ["/dashboard", "/prompts", "/users"].some((p) => pathname.startsWith(p));

  if (!token && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (token && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/prompts",
    "/prompts/:path*",
    "/users",
    "/users/:path*",
    "/login",
    "/login/:path*",
  ],
};
