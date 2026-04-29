"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, any> = {
  NOVO: "warning",
  PRIHVACEN_LOGISTIKA: "info",
  PRIPREMA_MONTAZE: "info",
  U_REALIZACIJI: "info",
  ZAVRSEN: "success",
  OTKAZAN: "danger",
};

export default function RadniNalogDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = trpc.radniNalozi.byId.useQuery({ id });
  const setStatus = trpc.radniNalozi.setStatus.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Radni nalog ne postoji.</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Action bar (no-print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/logistika/radni-nalozi" className="text-sm text-muted-foreground hover:underline">← Nazad</Link>
          <Badge variant={STATUS_TONE[data.status]}>{data.status.replace(/_/g, " ")}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>🖨️ Štampaj / PDF</Button>
          {data.status === "NOVO" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "PRIHVACEN_LOGISTIKA" })}>✓ Prihvati nalog</Button>}
          {data.status === "PRIHVACEN_LOGISTIKA" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "PRIPREMA_MONTAZE" })}>U pripremi</Button>}
          {data.status === "PRIPREMA_MONTAZE" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "U_REALIZACIJI" })}>Pokreni realizaciju</Button>}
          {data.status === "U_REALIZACIJI" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "ZAVRSEN" })}>Završi</Button>}
        </div>
      </div>

      {/* Printable A4 dokument */}
      <div className="print-area mx-auto w-full max-w-4xl rounded-md border bg-white p-10 shadow-sm text-sm text-black print:border-0 print:shadow-none">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between border-b-4 border-red-700 pb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.2em] text-red-700">INFO MEDIA GROUP d.o.o.</div>
            <div className="mt-1 text-xs text-gray-600">Omladinskih brigada 86, West 65 Tower, Beograd</div>
            <div className="text-xs text-gray-600">Tel: +381 11 3370 553, +381 11 3370550</div>
            <div className="text-xs text-gray-600">e-mail: info@infomediagroup.rs</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold uppercase">Radni nalog</div>
            <div className="mt-1 text-xs">Broj: <span className="font-mono font-semibold">{data.broj}</span></div>
            <div className="text-xs">Datum kreiranja: {formatDate(data.createdAt)}</div>
            <div className="mt-1 inline-block rounded-md border-2 border-red-700 px-2 py-0.5 text-xs font-bold uppercase text-red-700">
              {data.status.replace(/_/g, " ")}
            </div>
          </div>
        </header>

        {/* Klijent + Period blok */}
        <section className="mb-5 grid grid-cols-2 gap-6 text-xs">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Klijent / Naručilac</div>
            <div className="text-sm font-semibold">{data.partner?.naziv ?? "—"}</div>
            {data.partner?.adresa && <div>{data.partner.adresa}</div>}
            {data.partner?.grad && <div>{data.partner.grad}{data.partner.zemlja ? `, ${data.partner.zemlja}` : ""}</div>}
            {data.partner?.pibVat && <div>PIB: {data.partner.pibVat}</div>}
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Period kampanje</div>
            <div className="text-sm font-semibold">{formatDate(data.odDatum)} — {formatDate(data.doDatum)}</div>
            {data.grad && <div>Grad: {data.grad}</div>}
            <div className="mt-1 text-xs text-gray-500">Prodavac: {data.vlasnik?.ime} {data.vlasnik?.prezime}</div>
          </div>
        </section>

        {/* Section title */}
        <div className="mb-2 bg-gray-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white">
          Zadatak za logistiku
        </div>

        {/* Detalji posla */}
        <section className="mb-5 grid grid-cols-2 gap-4 text-xs">
          <div className="rounded border p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Vezana prilika / kampanja</div>
            <div className="mt-1">{data.opportunity?.naziv ?? "—"}</div>
            {data.opportunityId && <div className="mt-1 text-[10px] text-gray-500">ID: <code>{data.opportunityId}</code></div>}
          </div>
          <div className="rounded border p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Logistika zadužena</div>
            <div className="mt-1">{data.logistikaId ? <code className="text-[10px]">{data.logistikaId}</code> : "Još nije dodeljeno"}</div>
          </div>
        </section>

        {/* Workflow checklist */}
        <section className="mb-5">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Workflow</div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1.5 text-left">Faza</th>
                <th className="border px-2 py-1.5 text-left">Status</th>
                <th className="border px-2 py-1.5 text-left">Napomena</th>
              </tr>
            </thead>
            <tbody>
              {[
                { kod: "NOVO", label: "1. Kreiran iz prihvaćene ponude" },
                { kod: "PRIHVACEN_LOGISTIKA", label: "2. Logistika prihvatila nalog" },
                { kod: "PRIPREMA_MONTAZE", label: "3. Priprema montaže (idejno rešenje, materijal)" },
                { kod: "U_REALIZACIJI", label: "4. Realizacija — montaža + foto izveštaj" },
                { kod: "ZAVRSEN", label: "5. Završen — kraj kampanje, skidanje" },
              ].map((step) => {
                const stages = ["NOVO", "PRIHVACEN_LOGISTIKA", "PRIPREMA_MONTAZE", "U_REALIZACIJI", "ZAVRSEN"];
                const currentIdx = stages.indexOf(data.status);
                const stepIdx = stages.indexOf(step.kod);
                const done = stepIdx <= currentIdx;
                return (
                  <tr key={step.kod}>
                    <td className="border px-2 py-1.5">{step.label}</td>
                    <td className="border px-2 py-1.5">
                      {done ? <span className="font-bold text-emerald-700">✓ {data.status === step.kod ? "TRENUTNO" : "Završeno"}</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="border px-2 py-1.5">&nbsp;</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Napomena */}
        {data.napomena && (
          <section className="mb-5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Napomena</div>
            <div className="rounded border bg-gray-50 p-3 text-xs whitespace-pre-wrap">{data.napomena}</div>
          </section>
        )}

        {/* Kreativa */}
        {data.kreativaUrl && (
          <section className="mb-5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Kreativa</div>
            <a href={data.kreativaUrl} target="_blank" rel="noreferrer" className="text-xs text-red-700 hover:underline">
              📎 {data.kreativaUrl}
            </a>
          </section>
        )}

        {/* Signature block */}
        <section className="mt-12 grid grid-cols-3 gap-8 text-xs">
          <div>
            <div className="border-t-2 border-gray-400 pt-2 text-center">
              <div className="font-semibold">Prodavac</div>
              <div className="mt-1 text-gray-600">{data.vlasnik?.ime} {data.vlasnik?.prezime}</div>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-gray-400 pt-2 text-center">
              <div className="font-semibold">Logistika</div>
              <div className="mt-4 h-8"></div>
              <div className="text-[10px] text-gray-500">Potpis i datum prijema</div>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-gray-400 pt-2 text-center">
              <div className="font-semibold">Završetak</div>
              <div className="mt-4 h-8"></div>
              <div className="text-[10px] text-gray-500">Datum + potpis</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 border-t pt-3 text-center text-[9px] text-gray-500">
          Generisano: {new Date().toLocaleString("sr-Latn")} · Info Media Group d.o.o. · IMG CRM platforma
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          aside { display: none !important; }
          main { padding: 0 !important; }
          @page { size: A4; margin: 1.2cm; }
        }
      `}</style>
    </div>
  );
}
