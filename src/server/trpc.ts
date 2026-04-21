import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { AkcijaDozvole } from "@prisma/client";
import { AppError } from "./errors";
import { requirePermission, type SessionCtx } from "./rbac";

export interface Context {
  session: SessionCtx | null;
  ip?: string;
  userAgent?: string;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    if (cause instanceof AppError) {
      return { ...shape, message: cause.message, data: { ...shape.data, code: cause.code, details: cause.details } };
    }
    if (cause instanceof ZodError) {
      return { ...shape, message: "Validacija neuspešna", data: { ...shape.data, code: "VALIDATION", details: cause.flatten() } };
    }
    return shape;
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

const isAuth = middleware(async ({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const protectedProcedure = t.procedure.use(isAuth);

export function withPermission(modul: string, akcija: AkcijaDozvole) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      await requirePermission(ctx.session, modul, akcija);
    } catch (e) {
      throw new TRPCError({ code: "FORBIDDEN", cause: e as Error });
    }
    return next({ ctx });
  });
}
