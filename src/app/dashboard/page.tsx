"use client";

import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const { data, isLoading } = trpc.dashboard.today.useQuery();
  const forecastAcc = trpc.dashboard.forecastAccuracy.useQuery();

  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam...</p>;
  if (!data) return <p className="text-sm text-destructive">Nema podataka</p>;

  const k = data.kpi;
  return (
    <div className="flex flex-col gap-6">
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
