"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, any> = {
  OTVOREN: "warning",
  PLACEN: "success",
  DELIMICNO_PLACEN: "info",
  STORNIRAN: "danger",
  OTKAZAN: "default",
};

export default function InvoicesPage() {
  const { data, isLoading, refetch } = trpc.invoices.list.useQuery();
  const storno = trpc.invoices.storno.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fakture i predračuni</h1>
        <div className="flex gap-2">
          <Link href="/invoices/new" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">+ Novi dokument</Link>
        </div>
      </div>

      <HandoffPanel />

      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Broj</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2 text-right">Ukupno</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((d: any) => (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2 font-mono"><Link href={`/invoices/${d.id}`} className="hover:underline">{d.broj}</Link></td>
                  <td className="px-3 py-2"><Badge>{d.tip}</Badge></td>
                  <td className="px-3 py-2">{d.partner?.naziv}</td>
                  <td className="px-3 py-2">{formatDate(d.datum)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(d.ukupno), d.valuta)}</td>
                  <td className="px-3 py-2"><Badge variant={STATUS_TONE[d.status]}>{d.status}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    {d.status !== "STORNIRAN" && d.tip !== "STORNO" && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        const razlog = prompt("Razlog storniranja:");
                        if (razlog && razlog.length >= 5) storno.mutate({ dokumentId: d.id, razlog });
                      }}>Storniraj</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HandoffPanel() {
  const [dates, setDates] = useState({
    od: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    do: new Date().toISOString().slice(0, 10),
  });
  const [result, setResult] = useState<any>(null);
  const trigger = trpc.handoff.triggerBatch.useMutation({
    onSuccess: (r) => setResult(r),
  });
  const batches = trpc.handoff.list.useQuery();

  return (
    <section className="rounded-md border bg-secondary/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Finansijski handoff (ERP)</h2>
        <span className="text-xs text-muted-foreground">Format po zemlji: SRB SEF / MNE / HRV Fina / BIH</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Od datuma"><Input type="date" value={dates.od} onChange={(e) => setDates({ ...dates, od: e.target.value })} /></Field>
        <Field label="Do datuma"><Input type="date" value={dates.do} onChange={(e) => setDates({ ...dates, do: e.target.value })} /></Field>
        <Button
          onClick={() => trigger.mutate({ odDatum: new Date(dates.od), doDatum: new Date(dates.do) })}
          disabled={trigger.isPending}
        >
          Pokreni batch
        </Button>
      </div>
      {result && (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
          ✓ Batch {result.batchId} ({result.status}). Fajl: <code className="text-xs">{result.fileUri}</code>
        </p>
      )}
      {trigger.error && <p className="mt-2 text-sm text-destructive">{trigger.error.message}</p>}
      {(batches.data ?? []).length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Prethodni batch-evi</div>
          <div className="mt-1 space-y-1 text-sm">
            {batches.data!.slice(0, 5).map((b: any) => (
              <div key={b.id} className="flex items-center gap-2">
                <Badge variant={b.status === "SUCCESS" ? "success" : b.status === "FAILED" ? "danger" : "info"}>{b.status}</Badge>
                <span className="font-mono text-xs">{b.format}</span>
                <span>{formatDate(b.odDatum)} — {formatDate(b.doDatum)}</span>
                <span className="text-muted-foreground">({b.brojZapisa} zapisa)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
