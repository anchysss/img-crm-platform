"use client";

import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const { data, isLoading } = trpc.pipeline.funnel.useQuery();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Izveštaji</h1>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Pipeline funnel</h2>
        {isLoading ? <p>Učitavam...</p> : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2 text-right">Broj</th>
                  <th className="px-3 py-2 text-right">Weighted</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => (
                  <tr key={row.kod} className="border-t">
                    <td className="px-3 py-2">{row.kod}</td>
                    <td className="px-3 py-2 text-right">{row.count}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.weightedValue, "EUR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-sm text-muted-foreground">
        Dodatni izveštaji (win rate, utilizacija inventara, top-10, aging) u M7. Eksporti u XLSX/PDF u istom milestoneu.
      </p>
    </div>
  );
}
