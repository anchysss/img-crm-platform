"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { formatDate } from "@/lib/utils";
import { KampanjaCreateDialog, type KampanjaCreatePrefill } from "@/components/kampanja/kampanja-create-dialog";

const STATUS_BG_OUT: Record<string, string> = {
  POTVRDENA: "bg-blue-500",
  U_REALIZACIJI: "bg-emerald-500",
  ZAVRSENA: "bg-gray-400",
  OTKAZANA: "bg-red-400",
};
const STATUS_BG_IN: Record<string, string> = {
  POTVRDENA: "bg-indigo-500",
  U_REALIZACIJI: "bg-cyan-500",
  ZAVRSENA: "bg-gray-300",
  OTKAZANA: "bg-orange-400",
};

type ViewMode = "daily" | "weekly" | "monthly" | "yearly" | "custom";

interface DragState {
  voziloId: string;
  pozicijaId: string;
  tipLabel: "Outdoor" | "Indoor";
  startPct: number;
  endPct: number;
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function getRange(mode: ViewMode, customFrom: string, customTo: string): { from: Date; to: Date } {
  const now = new Date();
  switch (mode) {
    case "daily": {
      const from = new Date(now); from.setDate(from.getDate() - 3); from.setHours(0, 0, 0, 0);
      const to = new Date(now); to.setDate(to.getDate() + 3); to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case "weekly": {
      const from = new Date(now); from.setDate(from.getDate() - 7);
      const to = new Date(now); to.setDate(to.getDate() + 21);
      return { from, to };
    }
    case "monthly": {
      const from = new Date(now); from.setMonth(from.getMonth() - 1);
      const to = new Date(now); to.setMonth(to.getMonth() + 2);
      return { from, to };
    }
    case "yearly": {
      const from = new Date(now); from.setMonth(from.getMonth() - 3);
      const to = new Date(now); to.setMonth(to.getMonth() + 9);
      return { from, to };
    }
    case "custom":
      return {
        from: customFrom ? new Date(customFrom) : new Date(now.getTime() - 30 * 86400000),
        to: customTo ? new Date(customTo) : new Date(now.getTime() + 90 * 86400000),
      };
  }
}

export default function KampanjeChartPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [customFrom, setCustomFrom] = useState(isoDate(new Date()));
  const [customTo, setCustomTo] = useState(isoDate(new Date(Date.now() + 30 * 86400000)));
  const range = useMemo(() => getRange(viewMode, customFrom, customTo), [viewMode, customFrom, customTo]);

  const { data, isLoading, refetch } = trpc.dashboard.voziloKampanjeChart.useQuery({
    from: range.from,
    to: range.to,
  });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dialogPrefill, setDialogPrefill] = useState<KampanjaCreatePrefill | null>(null);

  const now = Date.now();
  const past = range.from.getTime();
  const future = range.to.getTime();
  const total = Math.max(1, future - past);
  const nowOffset = Math.max(0, Math.min(100, ((now - past) / total) * 100));
  const nowInRange = now >= past && now <= future;

  function pctFromMouse(e: React.MouseEvent<HTMLDivElement>): number {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    return Math.max(0, Math.min(100, (x / r.width) * 100));
  }
  function pctToDate(pct: number): Date {
    return new Date(past + (total * pct) / 100);
  }
  function startDrag(voziloId: string, pozicijaId: string, tipLabel: "Outdoor" | "Indoor", e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a")) return;
    const pct = pctFromMouse(e);
    setDrag({ voziloId, pozicijaId, tipLabel, startPct: pct, endPct: pct });
  }
  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!drag) return;
    setDrag({ ...drag, endPct: pctFromMouse(e) });
  }
  function endDrag() {
    if (!drag) return;
    const a = Math.min(drag.startPct, drag.endPct);
    const b = Math.max(drag.startPct, drag.endPct);
    if (b - a < 0.5) {
      setDrag(null);
      return;
    }
    setDialogPrefill({
      pozicijaId: drag.pozicijaId,
      odDatum: pctToDate(a),
      doDatum: pctToDate(b),
      tipLabel: drag.tipLabel,
    });
    setDrag(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Kampanje po vozilu</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Period:</span>
          {(["daily", "weekly", "monthly", "yearly", "custom"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`rounded-md border px-3 py-1 text-xs ${
                viewMode === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              {m === "daily" ? "Dnevno" : m === "weekly" ? "Nedeljno" : m === "monthly" ? "Mesečno" : m === "yearly" ? "Godišnje" : "Custom"}
            </button>
          ))}
          {viewMode === "custom" && (
            <span className="ml-2 flex items-center gap-1">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded border px-2 py-0.5 text-xs" />
              <span>—</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded border px-2 py-0.5 text-xs" />
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {range.from.toLocaleDateString("sr-Latn")} — {range.to.toLocaleDateString("sr-Latn")}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Učitavam...</p>}
      {!isLoading && (!data || data.length === 0) && <p className="text-sm text-muted-foreground">Nema vozila u sistemu.</p>}

      {!isLoading && data && data.length > 0 && (
        <div className="rounded-md border bg-card p-4">
          {/* Legenda */}
          <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-blue-500" />Outdoor — Potvrđena</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />Outdoor — U realizaciji</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-indigo-500" />Indoor — Potvrđena</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-cyan-500" />Indoor — U realizaciji</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-0.5 bg-destructive" />Sada</span>
            <span className="ml-auto italic">💡 Klikni i povuci preko O (gornji) ili I (donji) reda</span>
          </div>

          {/* Header sa datumima */}
          <div className="mb-2 flex items-center text-[10px] text-muted-foreground">
            <div className="w-44 shrink-0 px-1">Vozilo / Garaža</div>
            <div className="w-6 shrink-0"></div>
            <div className="flex-1 relative">
              <div className="flex justify-between">
                <span>{new Date(past).toLocaleDateString("sr-Latn")}</span>
                {nowInRange && <span style={{ position: "absolute", left: `${nowOffset}%` }} className="font-semibold text-destructive">SADA</span>}
                <span>{new Date(future).toLocaleDateString("sr-Latn")}</span>
              </div>
            </div>
          </div>

          {/* Lista vozila — svaki vozilo ima 2 reda (Outdoor iznad, Indoor ispod) */}
          <div className="flex flex-col gap-2">
            {data.map((v: any) => {
              const isDraggingThis = drag?.voziloId === v.id;
              const dragA = Math.min(drag?.startPct ?? 0, drag?.endPct ?? 0);
              const dragB = Math.max(drag?.startPct ?? 0, drag?.endPct ?? 0);

              return (
                <div key={v.id} className="flex items-stretch border-t pt-2">
                  {/* Levo: vozilo info */}
                  <div className="w-44 shrink-0 px-1 text-[11px]">
                    <Link href={`/logistika/vozila/${v.id}`} className="font-mono font-semibold hover:underline">
                      {v.sifra ?? v.registracija ?? "?"}
                    </Link>
                    <div className="truncate text-[10px] text-muted-foreground">{v.tipVozila ?? v.model ?? "—"}</div>
                    {v.garaza && <div className="truncate text-[10px] text-muted-foreground">{v.garaza}</div>}
                  </div>

                  {/* O / I labele kolona */}
                  <div className="flex w-6 shrink-0 flex-col gap-0.5">
                    <div className="flex h-5 items-center justify-center rounded-l-sm bg-blue-50 text-[9px] font-bold text-blue-700">O</div>
                    <div className="flex h-5 items-center justify-center rounded-l-sm bg-indigo-50 text-[9px] font-bold text-indigo-700">I</div>
                  </div>

                  {/* Desno: 2 reda (outdoor + indoor) */}
                  <div className="flex flex-1 flex-col gap-0.5">
                    {/* OUTDOOR red — blago plav background */}
                    <div
                      className={`relative h-5 rounded-r-sm bg-blue-50/60 select-none ${v.outdoorPozicijaId ? "cursor-crosshair hover:bg-blue-100/60" : "opacity-50"}`}
                      onMouseDown={(e) => v.outdoorPozicijaId && startDrag(v.id, v.outdoorPozicijaId, "Outdoor", e)}
                      onMouseMove={onMouseMove}
                      onMouseUp={endDrag}
                      onMouseLeave={() => isDraggingThis && drag?.tipLabel === "Outdoor" && endDrag()}
                      title={v.outdoorPozicijaId ? "Klikni i povuci za novu Outdoor kampanju" : "Vozilo nema outdoor poziciju"}
                    >
                      {nowInRange && <div className="pointer-events-none absolute top-0 z-10 h-full w-px bg-destructive" style={{ left: `${nowOffset}%` }} />}
                      {v.outdoor.length === 0 && !(isDraggingThis && drag?.tipLabel === "Outdoor") && (
                        <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] italic text-muted-foreground">—</span>
                      )}
                      {v.outdoor.map((k: any) => {
                        const odMs = new Date(k.odDatum).getTime();
                        const doMs = new Date(k.doDatum).getTime();
                        const start = Math.max(odMs, past);
                        const end = Math.min(doMs, future);
                        if (end < past || start > future) return null;
                        const left = ((start - past) / total) * 100;
                        const width = Math.max(0.5, ((end - start) / total) * 100);
                        const cls = STATUS_BG_OUT[k.status] ?? "bg-blue-500";
                        return (
                          <Link
                            key={`out-${k.id}`}
                            href={`/logistika/kampanje/${k.id}`}
                            className={`absolute top-0 flex h-full items-center rounded-sm px-1 text-[9px] font-semibold text-white hover:opacity-90 ${cls}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`OUTDOOR · ${k.naziv} · ${k.partner} · ${formatDate(k.odDatum)} → ${formatDate(k.doDatum)}`}
                          >
                            <span className="truncate">{k.naziv}</span>
                          </Link>
                        );
                      })}
                      {isDraggingThis && drag?.tipLabel === "Outdoor" && (
                        <div className="pointer-events-none absolute top-0 h-full rounded-sm bg-blue-500/40 ring-2 ring-blue-500" style={{ left: `${dragA}%`, width: `${dragB - dragA}%` }} />
                      )}
                    </div>

                    {/* INDOOR red — blago indigo background */}
                    <div
                      className={`relative h-5 rounded-r-sm bg-indigo-50/60 select-none ${v.indoorPozicijaId ? "cursor-crosshair hover:bg-indigo-100/60" : "opacity-50"}`}
                      onMouseDown={(e) => v.indoorPozicijaId && startDrag(v.id, v.indoorPozicijaId, "Indoor", e)}
                      onMouseMove={onMouseMove}
                      onMouseUp={endDrag}
                      onMouseLeave={() => isDraggingThis && drag?.tipLabel === "Indoor" && endDrag()}
                      title={v.indoorPozicijaId ? "Klikni i povuci za novu Indoor kampanju" : "Vozilo nema indoor poziciju"}
                    >
                      {nowInRange && <div className="pointer-events-none absolute top-0 z-10 h-full w-px bg-destructive" style={{ left: `${nowOffset}%` }} />}
                      {v.indoor.length === 0 && !(isDraggingThis && drag?.tipLabel === "Indoor") && (
                        <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] italic text-muted-foreground">—</span>
                      )}
                      {v.indoor.map((k: any) => {
                        const odMs = new Date(k.odDatum).getTime();
                        const doMs = new Date(k.doDatum).getTime();
                        const start = Math.max(odMs, past);
                        const end = Math.min(doMs, future);
                        if (end < past || start > future) return null;
                        const left = ((start - past) / total) * 100;
                        const width = Math.max(0.5, ((end - start) / total) * 100);
                        const cls = STATUS_BG_IN[k.status] ?? "bg-indigo-500";
                        return (
                          <Link
                            key={`in-${k.id}`}
                            href={`/logistika/kampanje/${k.id}`}
                            className={`absolute top-0 flex h-full items-center rounded-sm px-1 text-[9px] font-semibold text-white hover:opacity-90 ${cls}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`INDOOR · ${k.naziv} · ${k.partner} · ${formatDate(k.odDatum)} → ${formatDate(k.doDatum)}`}
                          >
                            <span className="truncate">{k.naziv}</span>
                          </Link>
                        );
                      })}
                      {isDraggingThis && drag?.tipLabel === "Indoor" && (
                        <div className="pointer-events-none absolute top-0 h-full rounded-sm bg-indigo-500/40 ring-2 ring-indigo-500" style={{ left: `${dragA}%`, width: `${dragB - dragA}%` }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        💡 Svaki vozilo ima 2 reda — gornji (O) za Outdoor kampanje, donji (I) za Indoor.
        Klikni i povuci preko praznog reda da kreiraš novu kampanju.
      </p>

      {dialogPrefill && (
        <KampanjaCreateDialog
          prefill={dialogPrefill}
          onClose={() => {
            setDialogPrefill(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
