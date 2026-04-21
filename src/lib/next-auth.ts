import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticate, verifyTotp } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? 30) * 60 },
  providers: [
    CredentialsProvider({
      name: "Email + lozinka",
      credentials: {
        email: { type: "text" },
        password: { type: "password" },
        totp: { type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const ip = (req.headers?.["x-forwarded-for"] as string)?.split(",")[0] ?? null;
        const ua = (req.headers?.["user-agent"] as string) ?? null;
        try {
          const session = await authenticate(credentials.email, credentials.password, ip ?? undefined, ua ?? undefined);
          const user = await prisma.korisnik.findUnique({ where: { id: session.korisnikId } });
          if (user?.twoFaEnabled) {
            if (!credentials.totp || !user.twoFaSecret) throw new AppError("UNAUTHORIZED", "TOTP token obavezan");
            if (!verifyTotp(user.twoFaSecret, credentials.totp)) throw new AppError("UNAUTHORIZED", "Pogrešan TOTP token");
          }
          return {
            id: session.korisnikId,
            email: session.email,
            tenantId: session.tenantId,
            roles: session.roles,
          } as unknown as import("next-auth").User;
        } catch (e) {
          if (e instanceof AppError) throw e;
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = (user as any).tenantId;
        token.roles = (user as any).roles;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).tenantId = token.tenantId;
      (session as any).roles = token.roles;
      (session as any).userId = token.sub;
      return session;
    },
  },
  pages: { signIn: "/login" },
};
