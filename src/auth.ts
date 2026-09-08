import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";
import { authConfig } from "@/auth.config";

const providers: Provider[] = [
  Credentials({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials) {
      const parsed = loginSchema.safeParse(rawCredentials);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (!user?.passwordHash) return null;

      const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!isValid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isSuperAdmin: user.isSuperAdmin,
      };
    },
  }),
];

// Magic-link sign-in is opt-in: only registered when SMTP settings are
// present. Without them the app still works fully via email + password.
if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  );
}

// Google sign-in is opt-in: only registered when OAuth credentials are
// present (see README "Google Sign-In"). `allowDangerousEmailAccountLinking`
// is safe here specifically because Google verifies the email during its
// own OAuth flow — you cannot complete it for an address you don't control.
// That's what makes "a manager invites worker@gmail.com with no password,
// the worker later clicks Sign in with Google" resolve to the *same* user
// instead of a duplicate account.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // `@auth/prisma-adapter`'s published types still import `PrismaClient`
  // from the legacy `@prisma/client` package path. Prisma 7's `prisma-client`
  // generator (used here, see prisma/schema.prisma) emits a self-contained
  // client under `src/generated/prisma` instead, so the static types don't
  // line up even though the runtime shape the adapter actually calls
  // (`prisma.user.*`, `prisma.session.*`, ...) is identical. Cast at the
  // boundary rather than fighting the upstream type declaration.
  adapter: PrismaAdapter(prisma as never),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers,
});
