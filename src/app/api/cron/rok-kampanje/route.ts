import { NextResponse } from "next/server";
import { checkRokoviKampanja, sendRokWarnings } from "@/server/services/notify-vozilo";

// Vercel Cron endpoint — pokreće se po rasporedu iz vercel.json
// Vercel automatski šalje header `Authorization: Bearer ${CRON_SECRET}`
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const warnings = await checkRokoviKampanja();
  await sendRokWarnings(warnings);
  return NextResponse.json({ ok: true, warningsCount: warnings.length });
}

export const dynamic = "force-dynamic";
