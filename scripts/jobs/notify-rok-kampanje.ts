/**
 * Cron job: proverava rokove kampanja vs naloga u korekciji.
 * Šalje warning notifikacije agentima prodaje:
 *   - WARNING: kampanja počinje u manje od 7 dana, a nalog je u korekciji
 *   - CRITICAL: kampanja je već trebala da počne, a nalog je u korekciji
 *
 * Pokreni:
 *   DATABASE_URL=… npx tsx scripts/jobs/notify-rok-kampanje.ts
 *
 * Vercel Cron (vercel.json):
 *   { "crons": [{ "path": "/api/cron/rok-kampanje", "schedule": "0 8 * * *" }] }
 */
import { checkRokoviKampanja, sendRokWarnings } from "../../src/server/services/notify-vozilo";

async function main() {
  console.log("[cron] notify-rok-kampanje start", new Date().toISOString());
  const warnings = await checkRokoviKampanja();
  console.log(`Pronađeno ${warnings.length} warnings:`);
  warnings.forEach((w) => {
    console.log(`  [${w.severnost}] ${w.tip} ${w.nalogBroj} — ${w.partnerNaziv} — ${w.daniDoStarta}d do starta`);
  });
  await sendRokWarnings(warnings);
  console.log("[cron] notify-rok-kampanje done");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
