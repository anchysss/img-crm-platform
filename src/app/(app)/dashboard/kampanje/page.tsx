"use client";

import { useState } from "react";
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

interface DragState {
  voziloId: string;
  pozicijaId: string;
  tipLabel: "Outdoor" | "Indoor";
  startPct: number;
  endPct: number;
}

export default function KampanjeChartPage() {
  const { data, isLoading, refetch } = trpc.dashboard.voziloKampanjeChart.useQuery();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dialogPrefill, setDialogPrefill] = useState<KampanjaCreatePrefill | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam...</p>;

  const now = Date.now();
  const past30 = now - 30 * 86400000;
  const future90 = now + 90 * 86400000;
  const total = future90 - past30;
  const nowOffset = ((now - past30) / total) * 100;

  function pctFromMouse(e: React.MouseEvent<HTMLDivElement>): number {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    return Math.max(0, Math.min(100, (x / r.width) * 100));
  }
  function pctToDate(pct: number): Date {
    return new Date(past30 + (total * pct) / 100);
  }

  function startDrag(voziloId: string, pozicijaId: string, tipLabel: "Outdoor" | "Indoor", e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a")) return; // klik na postojeću traku → idi na link
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

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Kampanje</h1>
        <p className="text-sm text-muted-foreground">Nema vozila u sistemu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kampanje po vozilu</h1>
        <span className="text-xs text-muted-foreground">
          Period: {new Date(past30).toLocaleDateString("sr-Latn")} — {new Date(future90).toLocaleDateString("sr-Latn")}
        </span>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-blue-500" />Outdoor — Potvrđena</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />Outdoor — U realizaciji</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-indigo-500" />Indoor — Potvrđena</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-cyan-500" />Indoor — U realizaciji</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-0.5 bg-destructive" />Sada</span>
          <span className="ml-auto italic">💡 Klikni i povuci preko praznog reda da kreiraš novu kampanju</span>
        </div>

        <div className="mb-2 flex items-center text-[10px] text-muted-foreground">
          <div className="w-44 shrink-0 px-1">Vozilo / Garaža</div>
          <div className="flex-1 relative">
            <div className="flex justify-between">
              <span>{new Date(past30).toLocaleDateString("sr-Latn")}</span>
              <span style={{ position: "absolute", left: `${nowOffset}%` }} className="font-semibold text-destructive">SADA</span>
              <span>{new Date(future90).toLocaleDateString("sr-Latn")}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {data.map((v: any) => {
            const isDraggingThis = drag?.voziloId === v.id;
            const dragA = Math.min(drag?.startPct ?? 0, drag?.endPct ?? 0);
            const dragB = Math.max(drag?.startPct ?? 0, drag?.endPct ?? 0);

            return (
              <div key={v.id} className="flex items-center border-t pt-2">
                <div className="w-44 shrink-0 px-1 text-[11px]">
                  <Link href={`/logistika/vozila/${v.id}`} className="font-mono font-semibold hover:underline">
                    {v.sifra ?? v.registracija ?? "?"}
                  </Link>
                  <div className="truncate text-[10px] text-muted-foreground">{v.tipVozila ?? v.model ?? "—"}</div>
                  {v.garaza && <div className="truncate text-[10px] text-muted-foreground">{v.garaza}</div>}
                </div>

                <div className="flex flex-1 flex-col gap-0.5">
                  {/* Outdoor red */}
                  <div
                    className={`relative h-5 rounded-sm bg-secondary/30 select-none ${v.outdoorPozicijaId ? "cursor-crosshair hover:bg-secondary/50" : "opacity-60"}`}
                    onMouseDown={(e) => v.outdoorPozicijaId && startDrag(v.id, v.outdoorPozicijaId, "Outdoor", e)}
                    onMouseMove={onMouseMove}
                    onMouseUp={endDrag}
                    onMouseLeave={() => isDraggingThis && drag?.tipLabel === "Outdoor" && endDrag()}
                    title={v.outdoorPozicijaId ? "Klikni i povuci za novu Outdoor kampanju" : "Vozilo nema outdoor poziciju"}
                  >
                    <div className="pointer-events-none absolute top-0 z-10 h-full w-px bg-destructive" style={{ left: `${nowOffset}%` }} />
                    {v.outdoor.length === 0 && !isDraggingThis && (
                      <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] italic text-muted-foreground">O · —</span>
                    )}
                    {v.outdoor.map((k: any) => {
                      const odMs = new Date(k.odDatum).getTime();
                      const doMs = new Date(k.doDatum).getTime();
                      const start = Math.max(odMs, past30);
                      const end = Math.min(doMs, future90);
                      const left = ((start - past30) / total) * 100;
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

                  {/* Indoor red */}
                  <div
                    className={`relative h-5 rounded-sm bg-secondary/30 select-none ${v.indoorPozicijaId ? "cursor-crosshair hover:bg-secondary/50" : "opacity-60"}`}
                    onMouseDown={(e) => v.indoorPozicijaId && startDrag(v.id, v.indoorPozicijaId, "Indoor", e)}
                    onMouseMove={onMouseMove}
                    onMouseUp={endDrag}
                    onMouseLeave={() => isDraggingThis && drag?.tipLabel === "Indoor" && endDrag()}
                    title={v.indoorPozicijaId ? "Klikni i povuci za novu Indoor kampanju" : "Vozilo nema indoor poziciju"}
                  >
                    <div className="pointer-events-none absolute top-0 z-10 h-full w-px bg-destructive" style={{ left: `${nowOffset}%` }} />
                    {v.indoor.length === 0 && !isDraggingThis && (
                      <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] italic text-muted-foreground">I · —</span>
                    )}
                    {v.indoor.map((k: any) => {
                      const odMs = new Date(k.odDatum).getTime();
                      const doMs = new Date(k.doDatum).getTime();
                      const start = Math.max(odMs, past30);
                      const end = Math.min(doMs, future90);
                      const left = ((start - past30) / total) * 100;
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

      <p className="text-[11px] text-muted-foreground">
        💡 Klikni i povuci preko outdoor (gornji) ili indoor (donji) reda da kreiraš novu kampanju za to vozilo. Klik na postojeću traku otvara kampanju.
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
