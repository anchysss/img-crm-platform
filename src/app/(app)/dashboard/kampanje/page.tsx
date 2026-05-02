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
      {/* Header sa period selektorom */}
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
        <>
          <ChartSection
            title="OUTDOOR kampanje"
            tone="outdoor"
            vozila={data}
            past={past}
            future={future}
            total={total}
            nowOffset={nowOffset}
            nowInRange={nowInRange}
            drag={drag}
            onMouseDown={startDrag}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
          />

          <ChartSection
            title="INDOOR kampanje"
            tone="indoor"
            vozila={data}
            past={past}
            future={future}
            total={total}
            nowOffset={nowOffset}
            nowInRange={nowInRange}
            drag={drag}
            onMouseDown={startDrag}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
          />
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        💡 Klikni i povuci preko reda u OUTDOOR sekciji za novu outdoor kampanju, ili u INDOOR sekciji za indoor.
        Klik na postojeću traku otvara kampanju.
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

function ChartSection({
  title,
  tone,
  vozila,
  past,
  future,
  total,
  nowOffset,
  nowInRange,
  drag,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: {
  title: string;
  tone: "outdoor" | "indoor";
  vozila: any[];
  past: number;
  future: number;
  total: number;
  nowOffset: number;
  nowInRange: boolean;
  drag: DragState | null;
  onMouseDown: (voziloId: string, pozicijaId: string, tipLabel: "Outdoor" | "Indoor", e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;
}) {
  const isOutdoor = tone === "outdoor";
  const tipLabel: "Outdoor" | "Indoor" = isOutdoor ? "Outdoor" : "Indoor";
  // Blago osenčen background različit za outdoor vs indoor zonu
  const sectionBg = isOutdoor ? "bg-blue-50/40" : "bg-indigo-50/40";
  const sectionBorder = isOutdoor ? "border-blue-200" : "border-indigo-200";
  const sectionHeaderBg = isOutdoor ? "bg-blue-100/70" : "bg-indigo-100/70";

  return (
    <div className={`rounded-md border ${sectionBorder} ${sectionBg} overflow-hidden`}>
      <div className={`flex items-center justify-between border-b ${sectionBorder} ${sectionHeaderBg} px-4 py-2 text-xs font-bold uppercase tracking-wider`}>
        <span>{title}</span>
        <div className="flex items-center gap-3 text-[10px] font-normal normal-case text-muted-foreground">
          {isOutdoor ? (
            <>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-blue-500" />Potvrđena</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />U realizaciji</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-indigo-500" />Potvrđena</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-cyan-500" />U realizaciji</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center px-4 pt-2 text-[10px] text-muted-foreground">
        <div className="w-44 shrink-0">Vozilo / Garaža</div>
        <div className="flex-1 relative">
          <div className="flex justify-between">
            <span>{new Date(past).toLocaleDateString("sr-Latn")}</span>
            {nowInRange && <span style={{ position: "absolute", left: `${nowOffset}%` }} className="font-semibold text-destructive">SADA</span>}
            <span>{new Date(future).toLocaleDateString("sr-Latn")}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-4 pb-3 pt-2">
        {vozila.map((v: any) => {
          const pozicijaId = isOutdoor ? v.outdoorPozicijaId : v.indoorPozicijaId;
          const kampanje = isOutdoor ? v.outdoor : v.indoor;
          const statusMap = isOutdoor ? STATUS_BG_OUT : STATUS_BG_IN;
          const dragColor = isOutdoor ? "bg-blue-500/40 ring-blue-500" : "bg-indigo-500/40 ring-indigo-500";
          const isDraggingThis = drag?.voziloId === v.id && drag?.tipLabel === tipLabel;
          const dragA = Math.min(drag?.startPct ?? 0, drag?.endPct ?? 0);
          const dragB = Math.max(drag?.startPct ?? 0, drag?.endPct ?? 0);

          return (
            <div key={v.id} className="flex items-center border-t border-white/60 pt-1.5">
              <div className="w-44 shrink-0 px-1 text-[11px]">
                <Link href={`/logistika/vozila/${v.id}`} className="font-mono font-semibold hover:underline">
                  {v.sifra ?? v.registracija ?? "?"}
                </Link>
                <div className="truncate text-[10px] text-muted-foreground">{v.tipVozila ?? v.model ?? "—"}</div>
                {v.garaza && <div className="truncate text-[10px] text-muted-foreground">{v.garaza}</div>}
              </div>

              <div
                className={`relative h-5 flex-1 rounded-sm bg-white/80 select-none ${pozicijaId ? "cursor-crosshair hover:bg-white" : "opacity-50"}`}
                onMouseDown={(e) => pozicijaId && onMouseDown(v.id, pozicijaId, tipLabel, e)}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={() => isDraggingThis && onMouseUp()}
                title={pozicijaId ? `Klikni i povuci za novu ${tipLabel} kampanju` : `Vozilo nema ${tipLabel.toLowerCase()} poziciju`}
              >
                {nowInRange && (
                  <div className="pointer-events-none absolute top-0 z-10 h-full w-px bg-destructive" style={{ left: `${nowOffset}%` }} />
                )}
                {kampanje.length === 0 && !isDraggingThis && (
                  <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] italic text-muted-foreground">—</span>
                )}
                {kampanje.map((k: any) => {
                  const odMs = new Date(k.odDatum).getTime();
                  const doMs = new Date(k.doDatum).getTime();
                  const start = Math.max(odMs, past);
                  const end = Math.min(doMs, future);
                  if (end < past || start > future) return null;
                  const left = ((start - past) / total) * 100;
                  const width = Math.max(0.5, ((end - start) / total) * 100);
                  const cls = statusMap[k.status] ?? (isOutdoor ? "bg-blue-500" : "bg-indigo-500");
                  return (
                    <Link
                      key={`${tone}-${k.id}`}
                      href={`/logistika/kampanje/${k.id}`}
                      className={`absolute top-0 flex h-full items-center rounded-sm px-1 text-[9px] font-semibold text-white hover:opacity-90 ${cls}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${tipLabel.toUpperCase()} · ${k.naziv} · ${k.partner} · ${formatDate(k.odDatum)} → ${formatDate(k.doDatum)}`}
                    >
                      <span className="truncate">{k.naziv}</span>
                    </Link>
                  );
                })}
                {isDraggingThis && (
                  <div className={`pointer-events-none absolute top-0 h-full rounded-sm ring-2 ${dragColor}`} style={{ left: `${dragA}%`, width: `${dragB - dragA}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
