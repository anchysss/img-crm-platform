# Deployment

## Lokalno
1. `docker compose up -d` — postgres, minio, mailhog.
2. `pnpm install`.
3. `pnpm db:migrate` → `pnpm seed`.
4. `pnpm dev`.

## Staging
- Node 20 LTS, managed Postgres (npr. RDS / Supabase), S3-kompatibilni bucket.
- Env var set iz CI secret store.
- Migracije kroz `pnpm prisma migrate deploy` na `main` deploy-u.
- Backup: RDS automated daily + 30 dana retencija (PZ 5).

## Rollback
1. `git revert` poslednjeg PR-a ili redeploy prethodne slike.
2. Ako migracija nekompatibilna: `prisma migrate resolve --rolled-back <ime>` i vrati prethodnu šemu (svaka migracija mora imati `down` skriptu).
3. Backup restore procedura:
   - Stop app.
   - Restore snapshot iz RDS.
   - Provera konzistentnosti (`pnpm tsx scripts/verify-db.ts`).
   - Start app.

## Observability
- Structured JSON logs (pino) → stdout.
- OpenTelemetry exporter → OTLP endpoint (konfigurabilno).
- Error tracking: Sentry DSN iz env.

## Security checklist pre produkcije
- [ ] `NEXTAUTH_SECRET` generisan kroz `openssl rand -base64 32`.
- [ ] HTTPS / HSTS aktivan.
- [ ] Rate limit na login-u live.
- [ ] 2FA obavezan za Admin/Finance/CountryManager.
- [ ] OWASP ZAP skeniranje bez High/Critical.
- [ ] Baza backup testiran i restore procedura validirana.
