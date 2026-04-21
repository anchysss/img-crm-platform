"use client";

import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading } = trpc.dashboard.today.useQuery();

  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam...</p>;
  if (!data) return <p className="text-sm text-destructive">Nema podataka</p>;

  const k = data.kpi;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Danas</h1>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card label="Otvoreni Opp" value={String(k.openCount)} />
        <Card label="Weighted pipeline" value={formatCurrency(k.weightedPipeline, "EUR")} />
        <Card label="Forecast ovog meseca" value={formatCurrency(k.forecastMonth, "EUR")} />
        <Card label="Win rate 90d" value={`${k.winRate90}%`} />
        <Card label="Closed Won mesec" value={formatCurrency(k.closedWonMonth, "EUR")} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Vruće stavke (zapelo &gt; 14 dana)</h2>
        {data.stale.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema zapelih stavki.</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-3 py-2">Naziv</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Probability</th>
                </tr>
              </thead>
              <tbody>
                {data.stale.map((o: any) => (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-2">{o.naziv}</td>
                    <td className="px-3 py-2">{o.stage?.kod}</td>
                    <td className="px-3 py-2">{o.probability}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
