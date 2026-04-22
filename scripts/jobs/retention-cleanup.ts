/**
 * Cron job: retention policy — briše audit/PII zapise starije od N meseci.
 * PZ 4.15 (retention policy) + 4.16 (AuditLog retencija min 24 meseca).
 */
import { prisma } from "../../src/lib/prisma";

const AUDIT_RETENTION_MONTHS = Number(process.env.AUDIT_RETENTION_MONTHS ?? 24);
const PII_ACCESS_RETENTION_MONTHS = Number(process.env.PII_ACCESS_RETENTION_MONTHS ?? 24);
const NOTIFICATION_RETENTION_DAYS = Number(process.env.NOTIFICATION_RETENTION_DAYS ?? 90);

async function run() {
  const now = new Date();
  const auditCutoff = new Date(now);
  auditCutoff.setMonth(auditCutoff.getMonth() - AUDIT_RETENTION_MONTHS);
  const piiCutoff = new Date(now);
  piiCutoff.setMonth(piiCutoff.getMonth() - PII_ACCESS_RETENTION_MONTHS);
  const notifCutoff = new Date(now);
  notifCutoff.setDate(notifCutoff.getDate() - NOTIFICATION_RETENTION_DAYS);

  const audit = await prisma.auditLog.deleteMany({ where: { timestamp: { lt: auditCutoff } } });
  const pii = await prisma.licniPodatakPristup.deleteMany({ where: { timestamp: { lt: piiCutoff } } });
  const notif = await prisma.notifikacija.deleteMany({ where: { createdAt: { lt: notifCutoff }, procitano: true } });

  // eslint-disable-next-line no-console
  console.log(`Retention cleanup: audit=${audit.count}, pii=${pii.count}, notif=${notif.count}`);
}

run().finally(() => prisma.$disconnect());
