import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth";
import { appRouter } from "@/server/router";
import { authOptions } from "@/lib/next-auth";
import type { Context } from "@/server/trpc";

async function createContext(req: Request): Promise<Context> {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId;
  if (!session || !userId) return { session: null };
  return {
    session: {
      korisnikId: userId,
      email: session.user?.email ?? "",
      tenantId: (session as any).tenantId,
      roles: (session as any).roles ?? [],
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });

export { handler as GET, handler as POST };
