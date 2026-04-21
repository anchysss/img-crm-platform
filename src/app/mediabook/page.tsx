"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc-client";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function MediabookPage() {
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date(Date.now() + 14 * 86400000)));
  const { data, isLoading } = trpc.mediabook.grid.useQuery({ from: new Date(from), to: new Date(to) });

  const days = useMemo(() => {
    const start = new Date(from);
    const end = new Date(to);
    const out: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d));
    return out;
  }, [from, to]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">MediaBook plan</h1>
      <div className="flex gap-3 text-sm">
        <label>Od <input type="date" className="ml-1 rounded border px-2 py-1" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Do <input type="date" className="ml-1 rounded border px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <Legend />
      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-secondary/60">
                <th className="sticky left-0 bg-secondary/80 px-2 py-1 text-left">Vozilo / Pozicija</th>
                {days.map((d) => <th key={d.toISOString()} className="px-1 py-1">{d.getDate()}/{d.getMonth() + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((v: any) =>
                v.pozicije.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="sticky left-0 bg-background px-2 py-1 whitespace-nowrap">
                      <strong>{v.registracija}</strong> · {p.tip}
                    </td>
                    {days.map((d) => {
                      const rez = p.rezervacije.find((r: any) => new Date(r.odDatum) <= d && d <= new Date(r.doDatum));
                      const cls = rez
                        ? rez.status === "HOLD" ? "bg-slot-hold" :
                          rez.status === "CONFIRMED" ? "bg-slot-confirmed" :
                          rez.status === "RUNNING" ? "bg-slot-running" :
                          "bg-slot-unavailable"
                        : "bg-slot-free";
                      return <td key={d.toISOString()} className={`h-6 ${cls}`} />;
                    })}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <LegendChip cls="bg-slot-free" label="Slobodno" />
      <LegendChip cls="bg-slot-hold" label="Hold" />
      <LegendChip cls="bg-slot-confirmed" label="Potvrđeno" />
      <LegendChip cls="bg-slot-running" label="U realizaciji" />
      <LegendChip cls="bg-slot-unavailable" label="Nedostupno" />
    </div>
  );
}

function LegendChip({ cls, label }: { cls: string; label: string }) {
  return <span className="flex items-center gap-2"><span className={`inline-block h-3 w-6 rounded ${cls}`} />{label}</span>;
}
