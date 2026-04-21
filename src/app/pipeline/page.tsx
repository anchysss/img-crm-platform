"use client";

import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/utils";

export default function PipelinePage() {
  const { data, isLoading } = trpc.pipeline.kanban.useQuery();

  if (isLoading) return <p>Učitavam pipeline...</p>;
  if (!data) return <p>Nema podataka.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Pipeline</h1>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {data.map((col) => (
          <div key={col.stage.id} className="min-w-[280px] flex-1 rounded-md border bg-secondary/30 p-3">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold">{col.stage.naziv}</h2>
              <span className="text-xs text-muted-foreground">{col.items.length} · {col.stage.defaultProbability}%</span>
            </div>
            <div className="flex flex-col gap-2">
              {col.items.map((o: any) => (
                <div key={o.id} className="rounded-md border bg-card p-3 text-sm shadow-sm">
                  <div className="font-medium">{o.naziv}</div>
                  <div className="text-xs text-muted-foreground">{o.partner.naziv}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span>{formatCurrency(Number(o.expValue), o.valuta)}</span>
                    <span className="text-muted-foreground">{o.probability}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
