import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/error",
  "/auth/verify",
  "/auth/request-reset",
  "/auth/reset",
  "/api/auth",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (
    isPublic ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/manifest.webmanifest") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/static")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const referer = req.headers.get("referer");
    let callbackPath = pathname;

    if (referer) {
      try {
        const refererUrl = new URL(referer);
        callbackPath = refererUrl.pathname + refererUrl.search;
      } catch {
        // fallback to pathname when referer is invalid
      }
    }

    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", callbackPath || "/");

    if (pathname.startsWith("/api")) {
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)"],
};
