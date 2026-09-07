import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config: no Prisma, no bcrypt, no Node-only imports.
 *
 * This is shared between the full config (`src/auth.ts`, used by route
 * handlers/server actions/server components — runs in the Node.js runtime)
 * and `middleware.ts` (runs on the Edge runtime). Middleware only needs to
 * decode the JWT session cookie, which requires nothing beyond
 * `AUTH_SECRET` — so keeping the Prisma-backed Credentials provider out of
 * this file stops the Postgres driver from ever being bundled into the
 * Edge middleware bundle.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.isSuperAdmin = Boolean((user as { isSuperAdmin?: boolean }).isSuperAdmin);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.isSuperAdmin = token.isSuperAdmin;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
