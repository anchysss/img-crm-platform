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
  pozicijaId: string | null; // null kad vozilo nema poziciju → server kreira
  tipLabel: "Outdoor" | "Indoor";
  startPct: number;
  endPct: number;
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

const SR_MONTHS = ["Januar", "Februar", "Mart", "April", "Maj", "Jun", "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x; } // Mon
function endOfWeek(d: Date) { const x = startOfWeek(d); x.setDate(x.getDate() + 6); return endOfDay(x); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0); }
function endOfYear(d: Date) { return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999); }

function getRange(mode: ViewMode, anchor: Date, customFrom: string, customTo: string): { from: Date; to: Date } {
  switch (mode) {
    case "daily": return { from: startOfDay(anchor), to: endOfDay(anchor) };
    case "weekly": return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
    case "monthly": return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case "yearly": return { from: startOfYear(anchor), to: endOfYear(anchor) };
    case "custom":
      return {
        from: customFrom ? new Date(customFrom) : startOfDay(new Date()),
        to: customTo ? endOfDay(new Date(customTo)) : endOfDay(new Date(Date.now() + 30 * 86400000)),
      };
  }
}

function shiftAnchor(mode: ViewMode, anchor: Date, dir: -1 | 1): Date {
  const x = new Date(anchor);
  switch (mode) {
    case "daily": x.setDate(x.getDate() + dir); break;
    case "weekly": x.setDate(x.getDate() + 7 * dir); break;
    case "monthly": x.setMonth(x.getMonth() + dir); break;
    case "yearly": x.setFullYear(x.getFullYear() + dir); break;
  }
  return x;
}

function buildTicks(mode: ViewMode, monthlyGranul: "weeks" | "days", from: Date, to: Date): Array<{ pct: number; label: string }> {
  const total = to.getTime() - from.getTime();
  const ticks: Array<{ pct: number; label: string }> = [];
  const pct = (d: Date) => ((d.getTime() - from.getTime()) / total) * 100;

  if (mode === "daily") {
    // Sati 0, 6, 12, 18, 24
    for (let h = 0; h <= 24; h += 6) {
      const t = new Date(from); t.setHours(h, 0, 0, 0);
      ticks.push({ pct: pct(t), label: `${h}h` });
    }
  } else if (mode === "weekly") {
    const days = ["Po", "Ut", "Sr", "Čet", "Pe", "Su", "Ne"];
    for (let i = 0; i < 7; i++) {
      const t = new Date(from); t.setDate(t.getDate() + i);
      ticks.push({ pct: pct(t), label: `${days[i]} ${t.getDate()}.` });
    }
  } else if (mode === "monthly") {
    if (monthlyGranul === "days") {
      const dayCount = Math.round(total / 86400000);
      const step = dayCount > 20 ? 5 : 1;
      for (let i = 0; i <= dayCount; i += step) {
        const t = new Date(from); t.setDate(t.getDate() + i);
        ticks.push({ pct: pct(t), label: `${t.getDate()}.` });
      }
    } else {
      // Po nedeljama — start of each ISO week within range
      let w = new Date(from);
      const dow = (w.getDay() + 6) % 7;
      w.setDate(w.getDate() - dow);
      let n = 1;
      while (w <= to) {
        ticks.push({ pct: Math.max(0, pct(w)), label: `N${n} (${w.getDate()}.)` });
        w = new Date(w); w.setDate(w.getDate() + 7);
        n++;
      }
    }
  } else if (mode === "yearly") {
    for (let m = 0; m < 12; m++) {
      const t = new Date(from.getFullYear(), m, 1);
      ticks.push({ pct: pct(t), label: SR_MONTHS[m].slice(0, 3) });
    }
  } else if (mode === "custom") {
    const days = Math.round(total / 86400000);
    const step = Math.max(1, Math.floor(days / 8));
    for (let i = 0; i <= days; i += step) {
      const t = new Date(from); t.setDate(t.getDate() + i);
      ticks.push({ pct: pct(t), label: t.toLocaleDateString("sr-Latn") });
    }
  }
  return ticks;
}

function rangeLabel(mode: ViewMode, anchor: Date, range: { from: Date; to: Date }): string {
  switch (mode) {
    case "daily":
      return anchor.toLocaleDateString("sr-Latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    case "weekly": {
      return `${range.from.toLocaleDateString("sr-Latn")} — ${range.to.toLocaleDateString("sr-Latn")}`;
    }
    case "monthly": return `${SR_MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    case "yearly": return String(anchor.getFullYear());
    case "custom": return `${range.from.toLocaleDateString("sr-Latn")} — ${range.to.toLocaleDateString("sr-Latn")}`;
  }
}

type MonthlyGranul = "weeks" | "days";

export default function KampanjeChartPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [monthlyGranul, setMonthlyGranul] = useState<MonthlyGranul>("days");
  const [customFrom, setCustomFrom] = useState(isoDate(new Date()));
  const [customTo, setCustomTo] = useState(isoDate(new Date(Date.now() + 30 * 86400000)));
  const range = useMemo(() => getRange(viewMode, anchorDate, customFrom, customTo), [viewMode, anchorDate, customFrom, customTo]);

  function shift(dir: -1 | 1) { setAnchorDate((a) => shiftAnchor(viewMode, a, dir)); }
  function resetToToday() { setAnchorDate(new Date()); }

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
  function startDrag(voziloId: string, pozicijaId: string | null, tipLabel: "Outdoor" | "Indoor", e: React.MouseEvent<HTMLDivElement>) {
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
    // Ako pozicija postoji, prosledi pozicijaId; inače voziloId+tip da je server kreira
    setDialogPrefill(drag.pozicijaId ? {
      pozicijaId: drag.pozicijaId,
      odDatum: pctToDate(a),
      doDatum: pctToDate(b),
      tipLabel: drag.tipLabel,
    } : {
      voziloId: drag.voziloId,
      pozicijaTip: drag.tipLabel === "Outdoor" ? "CELO_VOZILO" : "UNUTRA",
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
              onClick={() => { setViewMode(m); if (m !== "custom") setAnchorDate(new Date()); }}
              className={`rounded-md border px-3 py-1 text-xs ${
                viewMode === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              {m === "daily" ? "Dnevno" : m === "weekly" ? "Nedeljno" : m === "monthly" ? "Mesečno" : m === "yearly" ? "Godišnje" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      {/* Navigacija (← anchor →) — za sve modove osim custom */}
      {viewMode !== "custom" && (
        <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
          <button
            onClick={() => shift(-1)}
            className="flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-secondary"
            title={`Prethodni ${viewMode === "daily" ? "dan" : viewMode === "weekly" ? "nedelja" : viewMode === "monthly" ? "mesec" : "godina"}`}
          >
            ← {viewMode === "daily" ? "Dan pre" : viewMode === "weekly" ? "Prethodna nedelja" : viewMode === "monthly" ? "Prethodni mesec" : "Prethodna godina"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{rangeLabel(viewMode, anchorDate, range)}</span>
            <button onClick={resetToToday} className="rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary" title="Vrati na danas">↺ Danas</button>
          </div>
          <button
            onClick={() => shift(1)}
            className="flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-secondary"
            title={`Sledeći ${viewMode === "daily" ? "dan" : viewMode === "weekly" ? "nedelja" : viewMode === "monthly" ? "mesec" : "godina"}`}
          >
            {viewMode === "daily" ? "Dan posle" : viewMode === "weekly" ? "Sledeća nedelja" : viewMode === "monthly" ? "Sledeći mesec" : "Sledeća godina"} →
          </button>
        </div>
      )}

      {/* Mesečni: sub-toggle granularnosti */}
      {viewMode === "monthly" && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Prikaz:</span>
          <button
            onClick={() => setMonthlyGranul("days")}
            className={`rounded-md border px-3 py-1 ${monthlyGranul === "days" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
          >Po danima</button>
          <button
            onClick={() => setMonthlyGranul("weeks")}
            className={`rounded-md border px-3 py-1 ${monthlyGranul === "weeks" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
          >Po nedeljama</button>
        </div>
      )}

      {/* Custom: date pickeri ispod */}
      {viewMode === "custom" && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs">
          <span className="text-muted-foreground">Opseg:</span>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded border px-2 py-1 text-xs" />
          <span>—</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded border px-2 py-1 text-xs" />
          <span className="ml-3 text-muted-foreground">{rangeLabel(viewMode, anchorDate, range)}</span>
        </div>
      )}

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

          {/* Header sa datumima — tick labelovi po modu */}
          <div className="mb-2 flex items-stretch text-[10px] text-muted-foreground">
            <div className="w-44 shrink-0 px-1">Vozilo / Garaža</div>
            <div className="w-6 shrink-0"></div>
            <div className="flex-1 relative h-5">
              {buildTicks(viewMode, monthlyGranul, range.from, range.to).map((t, i) => (
                <span
                  key={`tick-${i}`}
                  style={{ position: "absolute", left: `${t.pct}%`, transform: "translateX(-50%)" }}
                  className="whitespace-nowrap"
                >
                  {t.label}
                </span>
              ))}
              {nowInRange && <span style={{ position: "absolute", left: `${nowOffset}%`, transform: "translateX(-50%)" }} className="font-semibold text-destructive">▼</span>}
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
                    {/* OUTDOOR red — blago plav background. Drag radi i bez postojeće pozicije (server kreira) */}
                    <div
                      className="relative h-5 rounded-r-sm bg-blue-50/60 select-none cursor-crosshair hover:bg-blue-100/60"
                      onMouseDown={(e) => startDrag(v.id, v.outdoorPozicijaId ?? null, "Outdoor", e)}
                      onMouseMove={onMouseMove}
                      onMouseUp={endDrag}
                      onMouseLeave={() => isDraggingThis && drag?.tipLabel === "Outdoor" && endDrag()}
                      title="Klikni i povuci za novu Outdoor kampanju"
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

                    {/* INDOOR red — blago indigo background. Drag radi i bez postojeće pozicije (server kreira) */}
                    <div
                      className="relative h-5 rounded-r-sm bg-indigo-50/60 select-none cursor-crosshair hover:bg-indigo-100/60"
                      onMouseDown={(e) => startDrag(v.id, v.indoorPozicijaId ?? null, "Indoor", e)}
                      onMouseMove={onMouseMove}
                      onMouseUp={endDrag}
                      onMouseLeave={() => isDraggingThis && drag?.tipLabel === "Indoor" && endDrag()}
                      title="Klikni i povuci za novu Indoor kampanju"
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
