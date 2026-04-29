"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = trpc.invoices.byId.useQuery({ id });

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Dokument nije pronađen.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex items-center justify-between">
        <Link href="/invoices" className="text-sm text-muted-foreground hover:underline">← Nazad</Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>Štampaj / PDF</Button>
        </div>
      </div>

      <div className="print-area mx-auto w-full max-w-3xl rounded-md border bg-card p-8 shadow-sm print:shadow-none print:border-0">
        <header className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide">{tipLabel(data.tip)}</h1>
            <div className="mt-1 text-sm text-muted-foreground">Broj: <span className="font-mono font-medium text-foreground">{data.broj}</span></div>
            <div className="text-sm text-muted-foreground">Datum: {formatDate(data.datum)}</div>
            {data.rokPlacanja && <div className="text-sm text-muted-foreground">Rok plaćanja: {formatDate(data.rokPlacanja)}</div>}
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{data.pravnoLice.naziv}</div>
            <div className="text-muted-foreground">PIB: {data.pravnoLice.pib}</div>
            <div className="text-muted-foreground">{data.pravnoLice.zemlja}</div>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Kupac</div>
            <div className="mt-1 font-medium">{data.partner.naziv}</div>
            {data.partner.adresa && <div>{data.partner.adresa}</div>}
            <div>{data.partner.grad} · {data.partner.zemlja}</div>
            {data.partner.pibVat && <div>PIB/VAT: {data.partner.pibVat}</div>}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
            <div className="mt-1"><Badge>{data.status}</Badge></div>
            {data.kampanja && <div className="mt-1 text-xs">Kampanja: {data.kampanja.naziv}</div>}
          </div>
        </section>

        <section className="mt-6">
          <table className="w-full text-sm">
            <thead className="border-b-2 text-left">
              <tr>
                <th className="py-2">Opis</th>
                <th className="py-2 w-16 text-right">Kol.</th>
                <th className="py-2 w-24 text-right">Jed. cena</th>
                <th className="py-2 w-16 text-right">Popust %</th>
                <th className="py-2 w-24 text-right">Iznos</th>
              </tr>
            </thead>
            <tbody>
              {data.stavke.map((s: any) => (
                <tr key={s.id} className="border-b">
                  <td className="py-2">{s.opis}</td>
                  <td className="py-2 text-right">{Number(s.kolicina)}</td>
                  <td className="py-2 text-right">{formatCurrency(Number(s.jedinicnaCena), data.valuta)}</td>
                  <td className="py-2 text-right">{Number(s.popust)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(Number(s.iznos), data.valuta)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="pt-3 text-right">Podzbir</td><td className="pt-3 text-right">{formatCurrency(Number(data.podzbir), data.valuta)}</td></tr>
              <tr><td colSpan={4} className="text-right">PDV</td><td className="text-right">{formatCurrency(Number(data.pdv), data.valuta)}</td></tr>
              <tr><td colSpan={4} className="border-t-2 pt-2 text-right text-base font-bold">Ukupno</td><td className="border-t-2 pt-2 text-right text-base font-bold">{formatCurrency(Number(data.ukupno), data.valuta)}</td></tr>
            </tfoot>
          </table>
        </section>

        {data.napomene && (
          <section className="mt-6 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Napomena</div>
            <div className="mt-1">{data.napomene}</div>
          </section>
        )}

        <footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          Generisano iz IMG CRM sistema · {new Date().toISOString().slice(0, 10)}
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}

function tipLabel(tip: string) {
  switch (tip) {
    case "PREDRACUN": return "Predračun";
    case "FAKTURA": return "Faktura";
    case "AVANS": return "Avansni račun";
    case "STORNO": return "Storno";
    default: return tip;
  }
}
