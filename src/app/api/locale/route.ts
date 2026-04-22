import { NextResponse } from "next/server";

const SUPPORTED = ["sr-Latn", "sr-Cyrl", "hr", "bs", "cnr", "en"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const locale = String(body.locale ?? "");
  if (!SUPPORTED.includes(locale)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set("img.locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
