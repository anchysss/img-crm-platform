"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { downloadCsv, downloadXlsx } from "@/lib/export";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"];

export default function ReportsPage() {
  const funnel = trpc.pipeline.funnel.useQuery();
  const conversion = trpc.reports.conversionFunnel.useQuery();
  const winRate = trpc.reports.winRate.useQuery();
  const topPartners = trpc.reports.topPartners.useQuery();
  const aging = trpc.reports.aging.useQuery();
  const lostReasons = trpc.reports.lostReasonAnalytics.useQuery();
  const timeInStage = trpc.reports.timeInStage.useQuery();
  const cashFlow = trpc.reports.cashFlow.useQuery();
  const reactivation = trpc.reports.reactivationList.useQuery();
  const sixMo = trpc.reports.sixMonthsSinceCampaign.useQuery();
  const individualKpis = trpc.reports.individualKpis.useQuery();
  const teamKpis = trpc.reports.teamKpis.useQuery();

  const [util, setUtil] = useState({
    from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    to: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });
  const utilization = trpc.reports.inventoryUtilization.useQuery({ from: new Date(util.from), to: new Date(util.to) });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Izveštaji</h1>

      <Report
        title="Tim KPI (poslednjih 90 dana)"
        onExportCsv={() => teamKpis.data && downloadCsv("team-kpi.csv", [teamKpis.data])}
        onExportXlsx={() => teamKpis.data && downloadXlsx("team-kpi.xlsx", "Team KPI", [teamKpis.data])}
      >
        {teamKpis.data && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Realizovano" value={formatCurrency(teamKpis.data.realized, "EUR")} tone="emerald" />
            <Stat label="Weighted forecast" value={formatCurrency(teamKpis.data.weightedForecast, "EUR")} />
            <Stat label="Coverage ratio" value={`${teamKpis.data.coverageRatio}%`} hint={`target ${formatCurrency(teamKpis.data.monthlyTarget, "EUR")}`} />
            <Stat label="Novi klijenti" value={String(teamKpis.data.noviKlijenti)} tone="emerald" />
            <Stat label="Won deals" value={String(teamKpis.data.brojWonDeals)} />
            <Stat label="Otvorene prilike" value={String(teamKpis.data.brojOpenOpps)} />
          </div>
        )}
      </Report>

      <Report
        title="Individualni KPI po prodavcu (90d)"
        onExportCsv={() => individualKpis.data && downloadCsv("individual-kpi.csv", individualKpis.data as any)}
        onExportXlsx={() => individualKpis.data && downloadXlsx("individual-kpi.xlsx", "KPI", individualKpis.data as any)}
      >
        {individualKpis.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-2 py-2">Prodavac</th>
                  <th className="px-2 py-2 text-right">📞 Pozivi</th>
                  <th className="px-2 py-2 text-right">🤝 Sastanci</th>
                  <th className="px-2 py-2 text-right">✉️ Mailovi</th>
                  <th className="px-2 py-2 text-right">⏭ Follow-ups</th>
                  <th className="px-2 py-2 text-right">📄 Ponuda poslate</th>
                  <th className="px-2 py-2 text-right">✓ Won</th>
                  <th className="px-2 py-2 text-right">Vrednost won</th>
                  <th className="px-2 py-2 text-right">Pipeline 90d</th>
                  <th className="px-2 py-2 text-right">Weighted 90d</th>
                </tr>
              </thead>
              <tbody>
                {individualKpis.data.map((r: any) => (
                  <tr key={r.korisnikId} className="border-t">
                    <td className="px-2 py-1.5 font-medium">{r.ime}</td>
                    <td className="px-2 py-1.5 text-right">{r.pozivi}</td>
                    <td className="px-2 py-1.5 text-right">{r.sastanci}</td>
                    <td className="px-2 py-1.5 text-right">{r.mailovi}</td>
                    <td className="px-2 py-1.5 text-right">{r.followups}</td>
                    <td className="px-2 py-1.5 text-right">{r.ponudePoslate}</td>
                    <td className="px-2 py-1.5 text-right">{r.wonBroj}</td>
                    <td className="px-2 py-1.5 text-right font-medium text-emerald-700">{formatCurrency(r.wonValue, "EUR")}</td>
                    <td className="px-2 py-1.5 text-right">{formatCurrency(r.pipeline90, "EUR")}</td>
                    <td className="px-2 py-1.5 text-right">{formatCurrency(r.weighted90, "EUR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Report>

      <Report
        title="Pipeline funnel (trenutno)"
        onExportCsv={() => funnel.data && downloadCsv("funnel.csv", funnel.data.map((r) => ({ stage: r.kod, broj: r.count, weighted: r.weightedValue.toFixed(2) })))}
        onExportXlsx={() => funnel.data && downloadXlsx("funnel.xlsx", "Funnel", funnel.data.map((r) => ({ stage: r.kod, broj: r.count, weighted: Number(r.weightedValue.toFixed(2)) })))}
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
        title="Konverzije (Lead → Offer → Negotiation → Won)"
        onExportCsv={() => conversion.data && downloadCsv("conversions.csv", [conversion.data.conversions])}
        onExportXlsx={() => conversion.data && downloadXlsx("conversions.xlsx", "Conv", [conversion.data.conversions])}
      >
        {conversion.data && (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Lead → Offer" value={`${conversion.data.conversions.leadToOffer}%`} />
            <Stat label="Offer → Negotiation" value={`${conversion.data.conversions.offerToNegotiation}%`} />
            <Stat label="Negotiation → Won" value={`${conversion.data.conversions.negotiationToWon}%`} tone="emerald" />
          </div>
        )}
      </Report>

      <Report
        title="Time in stage"
        onExportCsv={() => timeInStage.data && downloadCsv("time-in-stage.csv", timeInStage.data.overdue as any)}
        onExportXlsx={() => timeInStage.data && downloadXlsx("time-in-stage.xlsx", "TiS", timeInStage.data.overdue as any)}
      >
        {timeInStage.data && (
          <>
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left"><tr><th className="px-3 py-2">Stage</th><th className="px-3 py-2 text-right">Broj</th><th className="px-3 py-2 text-right">Prosek (dana)</th><th className="px-3 py-2 text-right">Preko 60 dana</th></tr></thead>
              <tbody>
                {Object.entries(timeInStage.data.byStage).map(([kod, v]: any) => (
                  <tr key={kod} className="border-t">
                    <td className="px-3 py-2">{kod}</td>
                    <td className="px-3 py-2 text-right">{v.count}</td>
                    <td className="px-3 py-2 text-right">{v.avgDani}</td>
                    <td className="px-3 py-2 text-right">{v.overdue60 > 0 ? <span className="font-bold text-destructive">{v.overdue60}</span> : v.overdue60}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {timeInStage.data.overdue.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-medium">Lista prilika preko 60 dana ({timeInStage.data.overdue.length})</summary>
                <div className="mt-2 flex flex-col gap-1 text-xs">
                  {timeInStage.data.overdue.map((r: any) => (
                    <div key={r.id} className="rounded border p-2">
                      <strong>{r.naziv}</strong> · {r.partner} · Stage: <code>{r.stage}</code> · Vlasnik: {r.vlasnik} · Dani: <span className="font-bold text-destructive">{r.daniUFazi}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </Report>

      <Report
        title="Lost reason analytics"
        onExportCsv={() => lostReasons.data && downloadCsv("lost-reasons.csv", Object.entries(lostReasons.data).map(([k, v]: any) => ({ razlog: k, broj: v.count, vrednost: v.vrednost })))}
        onExportXlsx={() => lostReasons.data && downloadXlsx("lost-reasons.xlsx", "Lost", Object.entries(lostReasons.data).map(([k, v]: any) => ({ razlog: k, broj: v.count, vrednost: v.vrednost })))}
      >
        {lostReasons.data && (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left"><tr><th className="px-3 py-2">Razlog</th><th className="px-3 py-2 text-right">Broj</th><th className="px-3 py-2 text-right">Izgubljena vrednost</th></tr></thead>
            <tbody>
              {Object.entries(lostReasons.data).map(([k, v]: any) => (
                <tr key={k} className="border-t">
                  <td className="px-3 py-2">{k}</td>
                  <td className="px-3 py-2 text-right">{v.count}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(v.vrednost, "EUR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Report>

      <Report
        title="Cash flow projekcija (iz Planova fakturisanja)"
        onExportCsv={() => cashFlow.data && downloadCsv("cash-flow.csv", cashFlow.data as any)}
        onExportXlsx={() => cashFlow.data && downloadXlsx("cash-flow.xlsx", "Cash", cashFlow.data as any)}
      >
        {cashFlow.data && (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left"><tr><th className="px-3 py-2">Period</th><th className="px-3 py-2 text-right">Planirani iznos</th><th className="px-3 py-2 text-right">Fakturisano</th><th className="px-3 py-2 text-right">Razlika</th></tr></thead>
            <tbody>
              {cashFlow.data.map((r: any) => {
                const [g, m] = r.period.split("-");
                return (
                  <tr key={r.period} className="border-t">
                    <td className="px-3 py-2">{MONTH_NAMES[Number(m)]} {g}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.iznos, "EUR")}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.fakturisano, "EUR")}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.iznos - r.fakturisano, "EUR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Report>

      <Report
        title="Reactivation lista (Not advertising + Seasonal)"
        onExportCsv={() => reactivation.data && downloadCsv("reactivation.csv", reactivation.data.map((p: any) => ({ naziv: p.naziv, status: p.status, opp: p._count?.opportunities, akt: p._count?.aktivnosti })))}
        onExportXlsx={() => reactivation.data && downloadXlsx("reactivation.xlsx", "Reactivation", reactivation.data.map((p: any) => ({ naziv: p.naziv, status: p.status, opp: p._count?.opportunities, akt: p._count?.aktivnosti })))}
      >
        {reactivation.data && (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left"><tr><th className="px-3 py-2">Partner</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Opp</th><th className="px-3 py-2 text-right">Aktivnosti</th></tr></thead>
            <tbody>
              {reactivation.data.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">Nema partnera u reactivation listi.</td></tr>}
              {reactivation.data.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.naziv}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2 text-right">{p._count?.opportunities ?? 0}</td>
                  <td className="px-3 py-2 text-right">{p._count?.aktivnosti ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Report>

      <Report
        title="6 meseci od poslednje kampanje — kandidati za reaktivaciju"
        onExportCsv={() => sixMo.data && downloadCsv("6mo.csv", sixMo.data as any)}
        onExportXlsx={() => sixMo.data && downloadXlsx("6mo.xlsx", "6Mo", sixMo.data as any)}
      >
        {sixMo.data && (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left"><tr><th className="px-3 py-2">Partner</th><th className="px-3 py-2">Poslednja kampanja</th><th className="px-3 py-2 text-right">Dana od</th></tr></thead>
            <tbody>
              {sixMo.data.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">Nema kandidata.</td></tr>}
              {sixMo.data.map((r: any) => (
                <tr key={r.partnerId} className="border-t">
                  <td className="px-3 py-2">{r.partner}</td>
                  <td className="px-3 py-2">{r.kampanjaNaziv}</td>
                  <td className="px-3 py-2 text-right">{r.daniOd}</td>
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
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Ukupno zatvoreno" value={String(winRate.data.total)} />
            <Stat label="Won" value={String(winRate.data.won)} tone="emerald" />
            <Stat label="Lost" value={String(winRate.data.lost)} tone="red" />
          </div>
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

function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: "emerald" | "red"; hint?: string }) {
  const cls = tone === "emerald" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "";
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${cls}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
