"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/use-tenant";

type ViewMode = "daily" | "weekly" | "monthly";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay() || 7; // Pon=1...Ned=7
  if (day !== 1) x.setDate(x.getDate() - (day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

interface Bucket {
  start: Date;
  end: Date;   // inclusive last day
  label: string;
}

function buildBuckets(from: Date, to: Date, mode: ViewMode): Bucket[] {
  const out: Bucket[] = [];
  if (mode === "daily") {
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const s = new Date(d);
      out.push({ start: s, end: s, label: `${s.getDate()}/${s.getMonth() + 1}` });
    }
  } else if (mode === "weekly") {
    let cur = startOfWeek(from);
    while (cur <= to) {
      const end = addDays(cur, 6);
      out.push({ start: cur, end, label: `${cur.getDate()}/${cur.getMonth() + 1}–${end.getDate()}/${end.getMonth() + 1}` });
      cur = addDays(cur, 7);
    }
  } else {
    let cur = startOfMonth(from);
    while (cur <= to) {
      const endOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      out.push({ start: cur, end: endOfMonth, label: cur.toLocaleDateString("sr-Latn", { month: "short", year: "numeric" }) });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }
  return out;
}

const VIEW_DEFAULTS: Record<ViewMode, number> = {
  daily: 14,
  weekly: 8 * 7,
  monthly: 6 * 30,
};

export default function MediabookPage() {
  const { loading: tenantLoading, kod } = useTenant();
  const [view, setView] = useState<ViewMode>("daily");
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(addDays(new Date(), VIEW_DEFAULTS.daily)));
  const [grad, setGrad] = useState("");

  // Kada menjaš view, automatski prilagodi "to" da pokazuje razuman raspon
  useEffect(() => {
    setTo(isoDate(addDays(new Date(from), VIEW_DEFAULTS[view])));
  }, [view, from]);

  const { data, isLoading } = trpc.mediabook.grid.useQuery({
    from: new Date(from),
    to: new Date(to),
    grad: grad || undefined,
  });

  const buckets = useMemo(() => buildBuckets(new Date(from), new Date(to), view), [from, to, view]);

  // Aggregate reservation state across bucket range
  function bucketClass(rezs: any[], bucket: Bucket): string {
    const overlapping = rezs.filter((r) => new Date(r.odDatum) <= bucket.end && new Date(r.doDatum) >= bucket.start);
    if (overlapping.length === 0) return "bg-slot-free";
    const priority = ["RUNNING", "CONFIRMED", "HOLD", "CANCELLED", "RELEASED"];
    const worst = overlapping.reduce((a, r) => (priority.indexOf(r.status) < priority.indexOf(a.status) ? r : a));
    switch (worst.status) {
      case "HOLD": return "bg-slot-hold";
      case "CONFIRMED": return "bg-slot-confirmed";
      case "RUNNING": return "bg-slot-running";
      default: return "bg-slot-unavailable";
    }
  }

  const cellWidth = view === "daily" ? "min-w-[28px]" : view === "weekly" ? "min-w-[80px]" : "min-w-[100px]";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">MediaBook plan</h1>
        <div className="flex gap-1 rounded-md border p-1">
          {(["daily", "weekly", "monthly"] as const).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={view === m ? "default" : "ghost"}
              onClick={() => setView(m)}
            >
              {m === "daily" ? "Dnevno" : m === "weekly" ? "Nedeljno" : "Mesečno"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <label>Od <input type="date" className="ml-1 rounded border px-2 py-1" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Do <input type="date" className="ml-1 rounded border px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label>Grad <input placeholder="svi gradovi" className="ml-1 rounded border px-2 py-1" value={grad} onChange={(e) => setGrad(e.target.value)} /></label>
        {!tenantLoading && kod && <span className="self-center text-xs text-muted-foreground">Prikazuje se samo inventar za <strong>{kod}</strong></span>}
      </div>

      <Legend />

      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-secondary/60">
                <th className="sticky left-0 z-10 bg-secondary/80 px-2 py-1 text-left">Vozilo / Pozicija</th>
                {buckets.map((b) => <th key={b.start.toISOString()} className={`${cellWidth} px-1 py-1`}>{b.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr><td colSpan={buckets.length + 1} className="px-3 py-6 text-center text-muted-foreground">Nema vozila u izabranom filteru.</td></tr>
              )}
              {(data ?? []).map((v: any) =>
                v.pozicije.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-background px-2 py-1 whitespace-nowrap">
                      <strong>{v.registracija}</strong> · {v.grad} · {p.tip}
                    </td>
                    {buckets.map((b) => (
                      <td key={b.start.toISOString()} className={`h-6 ${cellWidth} ${bucketClass(p.rezervacije, b)}`} />
                    ))}
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
