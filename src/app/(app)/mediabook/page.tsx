"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { useTenant } from "@/lib/use-tenant";

type ViewMode = "daily" | "weekly" | "monthly";
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) { const x = new Date(d); const day = x.getDay() || 7; if (day !== 1) x.setDate(x.getDate() - (day - 1)); x.setHours(0, 0, 0, 0); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

interface Bucket { start: Date; end: Date; label: string; }

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
      const end = endOfMonth < to ? endOfMonth : to;
      out.push({ start: cur, end, label: cur.toLocaleDateString("sr-Latn", { month: "short", year: "numeric" }) });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }
  return out;
}

const VIEW_DEFAULTS: Record<ViewMode, number> = { daily: 14, weekly: 56, monthly: 180 };

export default function KampanjePlanPage() {
  const { kod } = useTenant();
  const [view, setView] = useState<ViewMode>("daily");
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(addDays(new Date(), VIEW_DEFAULTS.daily)));
  const [grad, setGrad] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ pozicijaId?: string; odDatum?: Date; doDatum?: Date }>({});

  // Drag-select state: anchor (pozicijaId + bucket) i trenutni hover end-bucket
  const [drag, setDrag] = useState<null | { pozicijaId: string; startIdx: number; endIdx: number }>(null);

  useEffect(() => {
    setTo(isoDate(addDays(new Date(from), VIEW_DEFAULTS[view])));
  }, [view, from]);

  const { data, isLoading, refetch } = trpc.mediabook.grid.useQuery({
    from: new Date(from), to: new Date(to), grad: grad || undefined,
  });
  const buckets = useMemo(() => buildBuckets(new Date(from), new Date(to), view), [from, to, view]);

  // Globalni mouseup — završava drag i otvara dialog ako je validan range
  useEffect(() => {
    function onUp() {
      if (!drag) return;
      const lo = Math.min(drag.startIdx, drag.endIdx);
      const hi = Math.max(drag.startIdx, drag.endIdx);
      const odBucket = buckets[lo];
      const doBucket = buckets[hi];
      if (odBucket && doBucket) {
        const pozicija = (data ?? []).flatMap((v: any) => v.pozicije).find((p: any) => p.id === drag.pozicijaId);
        if (pozicija) {
          const allFree = buckets.slice(lo, hi + 1).every((b) => bucketStatus(pozicija.rezervacije, b) === null);
          if (allFree) {
            setPrefill({ pozicijaId: drag.pozicijaId, odDatum: odBucket.start, doDatum: doBucket.end });
            setCreateOpen(true);
          }
        }
      }
      setDrag(null);
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [drag, buckets, data]);

  function bucketStatus(rezs: any[], bucket: Bucket) {
    const overlapping = rezs.filter((r: any) => new Date(r.odDatum) <= bucket.end && new Date(r.doDatum) >= bucket.start);
    if (overlapping.length === 0) return null;
    const priority = ["RUNNING", "CONFIRMED", "HOLD", "CANCELLED", "RELEASED"];
    return overlapping.reduce((a: any, r: any) => (priority.indexOf(r.status) < priority.indexOf(a.status) ? r : a));
  }

  function bucketClass(rez: any | null) {
    if (!rez) return "bg-slot-free hover:bg-emerald-300 cursor-pointer";
    switch (rez.status) {
      case "HOLD": return "bg-slot-hold";
      case "CONFIRMED": return "bg-slot-confirmed";
      case "RUNNING": return "bg-slot-running";
      default: return "bg-slot-unavailable";
    }
  }

  function onCellClick(pozicijaId: string, bucket: Bucket, rez: any | null) {
    if (rez) return; // ne dozvoli klik na zauzetu ćeliju
    setPrefill({ pozicijaId, odDatum: bucket.start, doDatum: bucket.end });
    setCreateOpen(true);
  }

  const cellWidth = view === "daily" ? "min-w-[28px]" : view === "weekly" ? "min-w-[80px]" : "min-w-[100px]";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Kampanje plan</h1>
          <p className="text-sm text-muted-foreground">
            <strong>Klik</strong> na <span className="rounded bg-slot-free px-1.5 py-0.5 text-xs font-medium">slobodnu</span> ćeliju → kampanja na 1 jedinicu vremena.
            {" "}<strong>Drag</strong> (mouseDown + povlačenje) preko više ćelija u istom redu → kampanja na ceo izabrani period.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setPrefill({}); setCreateOpen(true); }}>+ Nova kampanja</Button>
          <div className="flex gap-1 rounded-md border p-1">
            {(["daily", "weekly", "monthly"] as const).map((m) => (
              <Button key={m} size="sm" variant={view === m ? "default" : "ghost"} onClick={() => setView(m)}>
                {m === "daily" ? "Dnevno" : m === "weekly" ? "Nedeljno" : "Mesečno"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <label>Od <input type="date" className="ml-1 rounded border px-2 py-1" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Do <input type="date" className="ml-1 rounded border px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label>Grad <input placeholder="svi" className="ml-1 rounded border px-2 py-1" value={grad} onChange={(e) => setGrad(e.target.value)} /></label>
        {kod && <span className="self-center text-xs text-muted-foreground">Inventar: <strong>{kod}</strong></span>}
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
                  <tr key={p.id} className="border-t select-none">
                    <td className="sticky left-0 z-10 bg-background px-2 py-1 whitespace-nowrap">
                      <strong>{v.registracija}</strong> · {v.grad} · {p.tip}
                    </td>
                    {buckets.map((b, idx) => {
                      const rez = bucketStatus(p.rezervacije, b);
                      const inDragRange =
                        drag &&
                        drag.pozicijaId === p.id &&
                        idx >= Math.min(drag.startIdx, drag.endIdx) &&
                        idx <= Math.max(drag.startIdx, drag.endIdx);
                      const conflictInRange = inDragRange && rez !== null;
                      return (
                        <td
                          key={b.start.toISOString()}
                          className={`h-6 ${cellWidth} transition-colors ${inDragRange ? (conflictInRange ? "bg-red-400 ring-2 ring-red-600" : "bg-blue-400 ring-1 ring-blue-600") : bucketClass(rez)}`}
                          onMouseDown={(e) => {
                            if (rez) return;
                            e.preventDefault();
                            setDrag({ pozicijaId: p.id, startIdx: idx, endIdx: idx });
                          }}
                          onMouseEnter={() => {
                            if (drag && drag.pozicijaId === p.id) setDrag({ ...drag, endIdx: idx });
                          }}
                          onClick={() => { if (!drag) onCellClick(p.id, b, rez); }}
                          title={rez ? `${rez.status}: ${new Date(rez.odDatum).toLocaleDateString("sr-Latn")} → ${new Date(rez.doDatum).toLocaleDateString("sr-Latn")}` : `Klikni ili prevuci da izabereš period (${b.label})`}
                        />
                      );
                    })}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <KampanjaCreateDialog
          prefill={prefill}
          onClose={() => { setCreateOpen(false); refetch(); }}
        />
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <LegendChip cls="bg-slot-free" label="Slobodno (klikni za novu kampanju)" />
      <LegendChip cls="bg-slot-hold" label="Hold" />
      <LegendChip cls="bg-slot-confirmed" label="Potvrđeno" />
      <LegendChip cls="bg-slot-running" label="U realizaciji" />
      <LegendChip cls="bg-slot-unavailable" label="Nedostupno / otkazano" />
    </div>
  );
}
function LegendChip({ cls, label }: { cls: string; label: string }) {
  return <span className="flex items-center gap-2"><span className={`inline-block h-3 w-6 rounded ${cls}`} />{label}</span>;
}

function KampanjaCreateDialog({ prefill, onClose }: { prefill: { pozicijaId?: string; odDatum?: Date; doDatum?: Date }; onClose: () => void }) {
  const tenant = useTenant();
  const partneri = trpc.lookups.partnersShort.useQuery();
  const opps = trpc.opportunities.list.useQuery({});
  const create = trpc.campaigns.create.useMutation({ onSuccess: onClose });
  const [form, setForm] = useState({
    naziv: "",
    partnerId: "",
    opportunityId: "",
    odDatum: prefill.odDatum ? isoDate(prefill.odDatum) : isoDate(new Date()),
    doDatum: prefill.doDatum ? isoDate(prefill.doDatum) : isoDate(addDays(new Date(), 14)),
    cena: "",
    napomene: "",
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!form.partnerId && partneri.data?.[0]) setForm((f) => ({ ...f, partnerId: partneri.data![0].id }));
  }, [partneri.data, form.partnerId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await create.mutateAsync({
        naziv: form.naziv,
        partnerId: form.partnerId,
        opportunityId: form.opportunityId || undefined,
        odDatum: new Date(form.odDatum),
        doDatum: new Date(form.doDatum),
        valuta: tenant.valuta,
        napomene: form.napomene || undefined,
        stavke: prefill.pozicijaId && form.cena ? [{
          pozicijaId: prefill.pozicijaId,
          odDatum: new Date(form.odDatum),
          doDatum: new Date(form.doDatum),
          cena: form.cena,
        }] : undefined,
      } as any);
    } catch (e: any) { setErr(e.message); }
  }

  const filteredOpps = (opps.data ?? []).filter((o: any) => !form.partnerId || o.partnerId === form.partnerId);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">
          {prefill.pozicijaId ? "Nova kampanja na ovoj poziciji" : "Nova kampanja"}
        </h2>
        {prefill.pozicijaId && (
          <div className="mb-3 rounded-md border bg-secondary/30 p-3 text-xs">
            ✅ Pozicija je pred-popunjena. Period {form.odDatum} — {form.doDatum} će biti rezervisan automatski.
          </div>
        )}
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Naziv kampanje *">
            <Input required value={form.naziv} onChange={(e) => setForm({ ...form, naziv: e.target.value })} placeholder="Npr. Lilly april 2026 — outdoor BG" />
          </Field>
          <Field label="Klijent *">
            <Select required value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
              <option value="">—</option>
              {(partneri.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
            </Select>
          </Field>
          <Field label="Vezana prilika (opciono)">
            <Select value={form.opportunityId} onChange={(e) => setForm({ ...form, opportunityId: e.target.value })}>
              <option value="">— bez prilike —</option>
              {filteredOpps.map((o: any) => <option key={o.id} value={o.id}>{o.naziv}</option>)}
            </Select>
          </Field>
          <Field label="Valuta"><Input value={tenant.valuta} disabled /></Field>
          <Field label="Trajanje od *"><Input type="date" required value={form.odDatum} onChange={(e) => setForm({ ...form, odDatum: e.target.value })} /></Field>
          <Field label="Trajanje do *"><Input type="date" required value={form.doDatum} onChange={(e) => setForm({ ...form, doDatum: e.target.value })} /></Field>
          {prefill.pozicijaId && (
            <Field label={`Cena za poziciju (${tenant.valuta}) *`}>
              <Input required type="number" step="0.01" value={form.cena} onChange={(e) => setForm({ ...form, cena: e.target.value })} placeholder="Cena za period" />
            </Field>
          )}
          <div className="col-span-2">
            <Field label="Napomene">
              <Textarea rows={3} value={form.napomene} onChange={(e) => setForm({ ...form, napomene: e.target.value })} />
            </Field>
          </div>
          {err && <p className="col-span-2 text-sm text-destructive">{err}</p>}
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Otkaži</Button>
            <Button type="submit" disabled={create.isPending || !form.naziv || !form.partnerId}>
              {create.isPending ? "Čuvam..." : "Kreiraj kampanju"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
