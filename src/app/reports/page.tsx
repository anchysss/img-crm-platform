"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { downloadCsv, downloadXlsx } from "@/lib/export";

export default function ReportsPage() {
  const funnel = trpc.pipeline.funnel.useQuery();
  const winRate = trpc.reports.winRate.useQuery();
  const topPartners = trpc.reports.topPartners.useQuery();
  const aging = trpc.reports.aging.useQuery();

  const [util, setUtil] = useState({
    from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    to: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });
  const utilization = trpc.reports.inventoryUtilization.useQuery(
    { from: new Date(util.from), to: new Date(util.to) },
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Izveštaji</h1>

      <Report
        title="Pipeline funnel"
        onExportCsv={() => funnel.data && downloadCsv("funnel.csv", funnel.data.map((r) => ({ stage: r.kod, broj: r.count, weighted: r.weightedValue.toFixed(2) })))}
        onExportXlsx={() => funnel.data && downloadXlsx("funnel.xlsx", "Pipeline funnel", funnel.data.map((r) => ({ stage: r.kod, broj: r.count, weighted: Number(r.weightedValue.toFixed(2)) })))}
      >
        {funnel.data && (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left"><tr><th className="px-3 py-2">Stage</th><th className="px-3 py-2 text-right">Broj</th><th className="px-3 py-2 text-right">Weighted</th></tr></thead>
            <tbody>
              {funnel.data.map((r) => (
                <tr key={r.kod} className="border-t">
                  <td className="px-3 py-2">{r.kod}</td>
                  <td className="px-3 py-2 text-right">{r.count}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.weightedValue, "EUR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Report>

      <Report
        title="Win rate i ishodi"
        onExportCsv={() => winRate.data && downloadCsv("win-rate.csv", [{ ukupno: winRate.data.total, won: winRate.data.won, lost: winRate.data.lost, winRate: winRate.data.winRate }])}
        onExportXlsx={() => winRate.data && downloadXlsx("win-rate.xlsx", "Win rate", [{ ukupno: winRate.data.total, won: winRate.data.won, lost: winRate.data.lost, winRate: winRate.data.winRate }])}
      >
        {winRate.data && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Ukupno zatvoreno" value={String(winRate.data.total)} />
              <Stat label="Won" value={`${winRate.data.won}`} tone="emerald" />
              <Stat label="Lost" value={`${winRate.data.lost}`} tone="red" />
            </div>
            <div className="mt-3 text-sm"><strong>Win rate:</strong> {winRate.data.winRate}%</div>
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Po tipu partnera</div>
              <ul className="mt-1 text-sm">
                {Object.entries(winRate.data.byPartnerType).map(([k, v]) => (
                  <li key={k}>{k}: {(v as any).won} won / {(v as any).lost} lost</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </Report>

      <Report
        title="Top 10 klijenata (po prometu)"
        onExportCsv={() => topPartners.data && downloadCsv("top-partners.csv", topPartners.data)}
        onExportXlsx={() => topPartners.data && downloadXlsx("top-partners.xlsx", "Top 10", topPartners.data)}
      >
        {topPartners.data && (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left"><tr><th className="px-3 py-2">Partner</th><th className="px-3 py-2 text-right">Ukupno</th></tr></thead>
            <tbody>
              {topPartners.data.map((r: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{r.partner}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(r.ukupno), "EUR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Report>

      <Report
        title="Neplaćena potraživanja (aging)"
        onExportCsv={() => aging.data && downloadCsv("aging.csv", [aging.data])}
        onExportXlsx={() => aging.data && downloadXlsx("aging.xlsx", "Aging", [aging.data])}
      >
        {aging.data && (
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(aging.data).map(([k, v]) => (
              <Stat key={k} label={`${k} dana`} value={formatCurrency(v as number, "EUR")} />
            ))}
          </div>
        )}
      </Report>

      <Report
        title="Utilizacija inventara"
        onExportCsv={() => utilization.data && downloadCsv("utilization.csv", [utilization.data])}
        onExportXlsx={() => utilization.data && downloadXlsx("utilization.xlsx", "Utilization", [utilization.data])}
      >
        <div className="mb-3 flex gap-3">
          <Field label="Od"><Input type="date" value={util.from} onChange={(e) => setUtil({ ...util, from: e.target.value })} /></Field>
          <Field label="Do"><Input type="date" value={util.to} onChange={(e) => setUtil({ ...util, to: e.target.value })} /></Field>
        </div>
        {utilization.data && (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Ukupno dana slota" value={String(utilization.data.totalSlots)} />
            <Stat label="Zauzeto" value={String(utilization.data.busySlots)} />
            <Stat label="Utilizacija" value={`${utilization.data.utilization}%`} tone="emerald" />
          </div>
        )}
      </Report>
    </div>
  );
}

function Report({ title, onExportCsv, onExportXlsx, children }: { title: string; onExportCsv: () => void; onExportXlsx: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-md border">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onExportCsv}>CSV</Button>
          <Button size="sm" variant="outline" onClick={onExportXlsx}>XLSX</Button>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "red" }) {
  const cls = tone === "emerald" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "";
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
