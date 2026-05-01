"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const { data, isLoading } = trpc.dashboard.today.useQuery();
  const forecastAcc = trpc.dashboard.forecastAccuracy.useQuery();
  const kampanje = trpc.dashboard.campaignsOverview.useQuery();
  const ponude = trpc.dashboard.ponudeOverview.useQuery();

  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam...</p>;
  if (!data) return <p className="text-sm text-destructive">Nema podataka</p>;

  const k = data.kpi;
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-3 text-2xl font-semibold">Dashboard</h1>
        <CampaignsWidget items={kampanje.data ?? []} />
      </section>

      <h1 className="text-2xl font-semibold">Danas</h1>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Otvoreni Opp" value={String(k.openCount)} />
        <Card label="Weighted pipeline" value={formatCurrency(k.weightedPipeline, "EUR")} hint="pipeline × probability" />
        <Card label="90-day weighted" value={formatCurrency(k.weighted90, "EUR")} hint="zatvaranje u narednih 90d" />
        <Card label="90-day confirmed" value={formatCurrency(k.confirmed90, "EUR")} hint="Verbal + Won u 90d" />
        <Card label="Coverage ratio" value={`${k.coverageRatio}%`} hint={`target: ${formatCurrency(k.monthlyTarget, "EUR")}`} />
        <Card label="Win rate 90d" value={`${k.winRate90}%`} />
        <Card label="Closed Won mesec" value={formatCurrency(k.closedWonMonth, "EUR")} />
        <Card label="Stale > 60 dana" value={String(data.stale60.length)} tone={data.stale60.length > 0 ? "red" : undefined} />
      </section>

      {data.todayActivities.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Danas treba da uradiš:</h2>
          <div className="flex flex-col gap-2">
            {data.todayActivities.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div><Badge>{a.tip}</Badge> <strong className="ml-2">{a.nextActionOpis ?? a.opis}</strong></div>
                <span className="text-xs text-muted-foreground">{a.nextActionDatum ? formatDate(a.nextActionDatum) : ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Time in stage — alarm &gt; 60 dana</h2>
        {data.stale60.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sve prilike su ažurirane u poslednjih 60 dana.</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-3 py-2">Naziv</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2 text-right">Dani u fazi</th>
                </tr>
              </thead>
              <tbody>
                {data.stale60.map((o: any) => (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-2"><Link href={`/prodaja/ponude/${o.id}`} className="hover:underline">{o.naziv}</Link></td>
                    <td className="px-3 py-2">{o.stage}</td>
                    <td className="px-3 py-2 text-right font-medium text-destructive">{o.daniUFazi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.perRep.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Po prodavcu</h2>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-3 py-2">Prodavac</th>
                  <th className="px-3 py-2 text-right">Otvorene</th>
                  <th className="px-3 py-2 text-right">Pipeline</th>
                  <th className="px-3 py-2 text-right">Weighted</th>
                </tr>
              </thead>
              <tbody>
                {data.perRep.map((r: any) => (
                  <tr key={r.korisnikId} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.ime}</td>
                    <td className="px-3 py-2 text-right">{r.count}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.pipeline, "EUR")}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.weighted, "EUR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <PonudeWidget items={ponude.data ?? []} />

      {(forecastAcc.data ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Forecast accuracy (prošli mesec)</h2>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-3 py-2">Prodavac</th>
                  <th className="px-3 py-2 text-right">Prognozirano</th>
                  <th className="px-3 py-2 text-right">Realizovano</th>
                  <th className="px-3 py-2 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {(forecastAcc.data ?? []).map((r: any) => (
                  <tr key={r.korisnikId} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.ime}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.forecasted, "EUR")}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.realized, "EUR")}</td>
                    <td className="px-3 py-2 text-right font-medium">{r.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "red" }) {
  const toneCls = tone === "red" ? "text-destructive" : "";
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneCls}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const CAMP_TONE: Record<string, any> = {
  POTVRDENA: "info",
  U_REALIZACIJI: "success",
  ZAVRSENA: "default",
  OTKAZANA: "danger",
};

function CampaignsWidget({ items }: { items: any[] }) {
  const now = Date.now();
  const all = items.map((k) => ({ ...k, odMs: new Date(k.odDatum).getTime(), doMs: new Date(k.doDatum).getTime() }));
  const aktivne = all.filter((k) => k.odMs <= now && k.doMs >= now);
  const upcoming = all.filter((k) => k.odMs > now).slice(0, 8);
  const recent = all.filter((k) => k.doMs < now).slice(-5);

  // Mini Gantt: range = -30d → +90d
  const past30 = now - 30 * 86400000;
  const future90 = now + 90 * 86400000;
  const total = future90 - past30;
  const visible = all.filter((k) => k.doMs >= past30 && k.odMs <= future90);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kampanje</h2>
        <Link href="/logistika/mediabook" className="text-xs text-primary hover:underline">Otvori chart →</Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card label="Aktivne sada" value={String(aktivne.length)} tone={aktivne.length === 0 ? undefined : undefined} />
        <Card label="Nadolazeće (90d)" value={String(upcoming.length)} />
        <Card label="Završene (poslednjih 30d)" value={String(recent.length)} />
      </div>

      {/* Mini timeline */}
      {visible.length > 0 && (
        <div className="mt-4 rounded-md border bg-card p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{new Date(past30).toLocaleDateString("sr-Latn")}</span>
            <span className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-blue-500" />Outdoor</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-indigo-500" />Indoor</span>
              <span>· Sada ·</span>
            </span>
            <span>{new Date(future90).toLocaleDateString("sr-Latn")}</span>
          </div>
          <div className="relative">
            {/* Now marker */}
            <div className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-destructive" style={{ left: `${((now - past30) / total) * 100}%` }} />
            <div className="flex flex-col gap-1">
              {visible.slice(0, 12).map((k) => {
                const start = Math.max(k.odMs, past30);
                const end = Math.min(k.doMs, future90);
                const left = ((start - past30) / total) * 100;
                const width = Math.max(1, ((end - start) / total) * 100);
                // 2 stripe-a: gornja Outdoor (#C70028 / status boja), donja Indoor (azurna)
                const outdoorCls =
                  k.status === "U_REALIZACIJI" ? "bg-emerald-500"
                  : k.status === "POTVRDENA" ? "bg-blue-500"
                  : k.status === "ZAVRSENA" ? "bg-gray-400"
                  : "bg-red-400";
                const indoorCls =
                  k.status === "U_REALIZACIJI" ? "bg-cyan-500"
                  : k.status === "POTVRDENA" ? "bg-indigo-500"
                  : k.status === "ZAVRSENA" ? "bg-gray-300"
                  : "bg-orange-400";
                return (
                  <div key={k.id} className="relative flex h-10 flex-col gap-1 rounded bg-secondary/10 p-0.5">
                    {/* Outdoor stripe (gornja) */}
                    <div className="relative h-1/2 rounded-sm bg-secondary/30">
                      {k.hasOutdoor ? (
                        <Link
                          href={`/logistika/kampanje/${k.id}`}
                          className={`absolute flex h-full items-center rounded-sm px-1.5 text-[9px] font-semibold text-white hover:opacity-90 ${outdoorCls}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`OUTDOOR · ${k.naziv} · ${k.partner} · ${formatDate(k.odDatum)} → ${formatDate(k.doDatum)}`}
                        >
                          <span className="truncate">O · {k.naziv}</span>
                        </Link>
                      ) : (
                        <div className="absolute flex h-full items-center px-1.5 text-[9px] italic text-muted-foreground" style={{ left: `${left}%`, width: `${width}%` }}>
                          O · —
                        </div>
                      )}
                    </div>
                    {/* Indoor stripe (donja) */}
                    <div className="relative h-1/2 rounded-sm bg-secondary/30">
                      {k.hasIndoor ? (
                        <Link
                          href={`/logistika/kampanje/${k.id}`}
                          className={`absolute flex h-full items-center rounded-sm px-1.5 text-[9px] font-semibold text-white hover:opacity-90 ${indoorCls}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`INDOOR · ${k.naziv} · ${k.partner} · ${formatDate(k.odDatum)} → ${formatDate(k.doDatum)}`}
                        >
                          <span className="truncate">I · {k.naziv}</span>
                        </Link>
                      ) : (
                        <div className="absolute flex h-full items-center px-1.5 text-[9px] italic text-muted-foreground" style={{ left: `${left}%`, width: `${width}%` }}>
                          I · —
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lista aktivnih */}
      {aktivne.length > 0 && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {aktivne.slice(0, 6).map((k) => (
            <Link key={k.id} href={`/logistika/kampanje/${k.id}`} className="flex items-center justify-between rounded-md border bg-card p-3 text-sm hover:bg-secondary/40">
              <div>
                <div className="font-medium">{k.naziv}</div>
                <div className="text-xs text-muted-foreground">{k.partner}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{formatDate(k.odDatum)} — {formatDate(k.doDatum)}</div>
              </div>
              <Badge variant={CAMP_TONE[k.status]}>{k.status.replace("_", " ")}</Badge>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

const PONUDA_TONE: Record<string, any> = {
  DRAFT: "default",
  POSLATA: "info",
  PRIHVACENA: "success",
};

function PonudeWidget({ items }: { items: any[] }) {
  const draftovi = items.filter((p) => p.status === "DRAFT");
  const poslate = items.filter((p) => p.status === "POSLATA");
  const prihvacene = items.filter((p) => p.status === "PRIHVACENA");
  const sumaPipeline = poslate.reduce((a, p) => a + Number(p.ukupno), 0);
  const sumaPrihvacene = prihvacene.reduce((a, p) => a + Number(p.ukupno), 0);

  // Follow-up pending: poslata > 5 dana, nema odgovora
  const stale = poslate.filter((p) => p.danaPoslata !== null && p.danaPoslata >= 5);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ponude ka klijentima</h2>
        <Link href="/prodaja/ponude" className="text-xs text-primary hover:underline">Sve ponude →</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="📝 Draft" value={String(draftovi.length)} />
        <Card label="✉️ Poslate" value={String(poslate.length)} hint={formatCurrency(sumaPipeline, "EUR")} />
        <Card label="✓ Prihvaćene" value={String(prihvacene.length)} hint={formatCurrency(sumaPrihvacene, "EUR")} />
        <Card label="⏰ Follow-up (>5d)" value={String(stale.length)} tone={stale.length > 0 ? "red" : undefined} hint="poslate, bez odgovora" />
      </div>

      {/* Aktivne poslate ponude */}
      {poslate.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Poslate ponude — čekanje odgovora</div>
          <div className="grid gap-2 md:grid-cols-2">
            {poslate.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/prodaja/ponude/${p.id}`} className="flex items-center justify-between rounded-md border bg-card p-3 text-sm hover:bg-secondary/40">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{p.broj}</div>
                  <div className="font-medium">{p.partner}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Poslata {p.danaPoslata !== null ? `pre ${p.danaPoslata}d` : "—"} · Važi do {formatDate(p.vaziDo)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(Number(p.ukupno), p.valuta)}</div>
                  {p.danaPoslata !== null && p.danaPoslata >= 5 && (
                    <Badge variant="warning">⏰ Pozovi</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Draft (nedovršene) */}
      {draftovi.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Draft ponude — nezavršene</div>
          <div className="flex flex-wrap gap-2">
            {draftovi.slice(0, 10).map((p) => (
              <Link key={p.id} href={`/prodaja/ponude/${p.id}`} className="rounded-md border bg-card px-3 py-2 text-xs hover:bg-secondary/40">
                <span className="font-mono text-muted-foreground">{p.broj}</span>
                <span className="mx-2">·</span>
                <span className="font-medium">{p.partner}</span>
                <span className="ml-2 text-muted-foreground">{formatCurrency(Number(p.ukupno), p.valuta)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
