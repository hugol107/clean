import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Deliberately built from the edge-safe `authConfig` (no Prisma/bcrypt) so
// this middleware never bundles the Postgres driver into the Edge runtime.
// It only needs to decode the JWT session cookie, which requires nothing
// beyond AUTH_SECRET.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/verify-request"]);
const AUTH_ENTRY_PATHS = new Set(["/login", "/register"]);

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!req.auth;

  if (isLoggedIn && AUTH_ENTRY_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/post-login", nextUrl));
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Excludes NextAuth's own routes, Next.js internals, and — crucially —
  // *any* path with a file extension (icons, manifest.webmanifest, sw.js,
  // offline.html, and future static assets like /uploads/*.jpg for locally
  // stored issue photos). An earlier, hand-maintained list of specific
  // filenames missed offline.html: the service worker's precache request
  // for it was getting redirected to the login page instead of caching the
  // real fallback page. Matching by "has a dot" is robust to that whole
  // class of bug instead of needing every static asset named explicitly.
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\..*).*)"],
};
