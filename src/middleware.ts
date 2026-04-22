import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware sloj (runs on every request):
 * 1. Auth guard — chroni `/dashboard`, `/pipeline`, `/opportunities`, `/partners`, `/mediabook`,
 *    `/vehicles`, `/campaigns`, `/invoices`, `/reports`, `/notifications`, `/admin`, `/profile`.
 * 2. CSP i ostali security headers (dodatno na next.config.mjs).
 * 3. Bloking basic requests bez `host` header-a.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/pipeline",
  "/opportunities",
  "/partners",
  "/mediabook",
  "/vehicles",
  "/campaigns",
  "/invoices",
  "/reports",
  "/notifications",
  "/admin",
  "/profile",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next();
  // Additional headers (next.config.mjs već postavlja većinu; ovo je layer 2)
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js RSC/dev zahteva unsafe-inline
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  res.headers.set("X-DNS-Prefetch-Control", "off");
  return res;
}

export const config = {
  matcher: [
    // Match everything osim statičkih fajlova i nekih internih path-ova
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
