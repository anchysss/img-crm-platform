"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadOfferXlsx } from "@/lib/offer-export";

const TONE: Record<string, any> = {
  DRAFT: "default",
  POSLATA: "info",
  PRIHVACENA: "success",
  ODBIJENA: "danger",
  ISTEKLA: "warning",
};

export default function PonudaDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = trpc.ponude.byId.useQuery({ id });
  const setStatus = trpc.ponude.setStatus.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Ponuda nije pronađena.</p>;

  const podzbir = data.stavke.reduce((a: number, s: any) => a + Number(s.iznos), 0);
  const pdv = (podzbir * Number(data.stopaPdv)) / 100;
  const grand = podzbir + pdv;

  async function exportXlsx() {
    if (!data) return;
    await downloadOfferXlsx(`${data.broj}.xlsx`, {
      brojPonude: data.broj,
      datum: new Date(data.datum),
      poddeonica: "OUTDOOR / INDOOR — PONUDA",
      klijent: data.partner?.naziv ?? "—",
      klijentAdresa: data.partner?.adresa ?? undefined,
      agencija: undefined,
      kampanjaNaziv: data.opportunity?.naziv ?? data.broj,
      period: data.opportunity?.expCloseDate ? formatDate(data.opportunity.expCloseDate) : "—",
      grad: data.stavke[0]?.grad ?? "—",
      brojVozila: data.stavke.reduce((a: number, s: any) => a + s.brojVozila, 0),
      vaziDo: new Date(data.vaziDo),
      sastavio: `${data.vlasnik?.ime ?? ""} ${data.vlasnik?.prezime ?? ""}`.trim(),
      sastavioEmail: data.vlasnik?.email,
      pravnoLiceNaziv: "INFO MEDIA GROUP d.o.o.",
      pravnoLiceAdresa: "Omladinskih brigada 86, West 65 Tower, Beograd",
      pravnoLiceTel: "+381 11 3370 553",
      pravnoLiceEmail: "info@infomediagroup.rs",
      stavke: data.stavke.map((s: any) => ({
        rb: s.rb,
        opis: s.opis,
        grad: s.grad ?? "—",
        brojVozila: s.brojVozila,
        cena: Number(s.cena),
        popustPct: Number(s.popustPct),
        cenaSaPopustom: Number(s.cena) * (1 - Number(s.popustPct) / 100),
      })),
      valuta: data.valuta,
      stopaPdv: Number(data.stopaPdv),
      napomena: data.napomena ?? undefined,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Action bar — no-print */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/prodaja/ponude" className="text-sm text-muted-foreground hover:underline">← Nazad</Link>
          <Badge variant={TONE[data.status]}>{data.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportXlsx}>📥 Preuzmi XLSX</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>🖨️ Štampaj / PDF</Button>
          {data.status === "DRAFT" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "POSLATA" })}>✉️ Pošalji</Button>}
          {data.status === "POSLATA" && (
            <>
              <Button size="sm" onClick={() => setStatus.mutate({ id, status: "PRIHVACENA" })}>✓ Prihvaćena</Button>
              <Button size="sm" variant="destructive" onClick={() => setStatus.mutate({ id, status: "ODBIJENA" })}>✗ Odbijena</Button>
            </>
          )}
        </div>
      </div>

      {/* Printable A4-like document */}
      <div className="print-area mx-auto w-full max-w-4xl rounded-md border bg-white p-10 shadow-sm text-sm text-black print:border-0 print:shadow-none">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between border-b pb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.2em] text-red-700">INFO MEDIA GROUP d.o.o.</div>
            <div className="mt-1 text-xs text-gray-600">Omladinskih brigada 86, West 65 Tower, Beograd</div>
            <div className="text-xs text-gray-600">Tel: +381 11 3370 553, +381 11 3370550</div>
            <div className="text-xs text-gray-600">e-mail: info@infomediagroup.rs</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold uppercase">Ponuda</div>
            <div className="mt-1 text-xs">Broj: <span className="font-mono font-semibold">{data.broj}</span></div>
            <div className="text-xs">Datum: {formatDate(data.datum)}</div>
            <div className="text-xs">Važi do: {formatDate(data.vaziDo)}</div>
          </div>
        </header>

        {/* Klijent blok */}
        <section className="mb-5 grid grid-cols-2 gap-6 text-xs">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Klijent / Agencija</div>
            <div className="text-sm font-semibold">{data.partner?.naziv}</div>
            {data.partner?.adresa && <div>{data.partner.adresa}</div>}
            {data.partner?.grad && <div>{data.partner.grad}{data.partner.zemlja ? `, ${data.partner.zemlja}` : ""}</div>}
            {data.partner?.pibVat && <div>PIB: {data.partner.pibVat}</div>}
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Kampanja</div>
            <div className="text-sm font-semibold">{data.opportunity?.naziv ?? "—"}</div>
            {data.opportunity?.expCloseDate && <div>Period: {formatDate(data.opportunity.expCloseDate)}</div>}
            {data.stavke[0]?.grad && <div>Grad: {data.stavke[0].grad}</div>}
            <div>Broj vozila: {data.stavke.reduce((a: number, s: any) => a + s.brojVozila, 0)}</div>
          </div>
        </section>

        {/* Section title */}
        <div className="mb-2 bg-gray-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white">
          Outdoor / Indoor — Zakup vozila i oslikavanje
        </div>

        {/* Stavke table */}
        <table className="w-full border-collapse text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1.5 text-left">Rb</th>
              <th className="border px-2 py-1.5 text-left">Opis</th>
              <th className="border px-2 py-1.5 text-left">Grad</th>
              <th className="border px-2 py-1.5 text-right">Vozila</th>
              <th className="border px-2 py-1.5 text-right">Cena (€)</th>
              <th className="border px-2 py-1.5 text-right">Popust %</th>
              <th className="border px-2 py-1.5 text-right">Sa popustom (€)</th>
              <th className="border px-2 py-1.5 text-right">Ukupno (€)</th>
            </tr>
          </thead>
          <tbody>
            {data.stavke.map((s: any) => {
              const saPopustom = Number(s.cena) * (1 - Number(s.popustPct) / 100);
              return (
                <tr key={s.id}>
                  <td className="border px-2 py-1.5">{s.rb}</td>
                  <td className="border px-2 py-1.5">{s.opis}</td>
                  <td className="border px-2 py-1.5">{s.grad ?? "—"}</td>
                  <td className="border px-2 py-1.5 text-right">{s.brojVozila}</td>
                  <td className="border px-2 py-1.5 text-right">{Number(s.cena).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border px-2 py-1.5 text-right">{Number(s.popustPct)}%</td>
                  <td className="border px-2 py-1.5 text-right">{saPopustom.toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border px-2 py-1.5 text-right font-medium">{Number(s.iznos).toLocaleString("sr-Latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={7} className="border px-2 py-1.5 text-right font-bold">UKUPNO (bez PDV):</td>
              <td className="border px-2 py-1.5 text-right font-bold">{formatCurrency(podzbir, data.valuta)}</td>
            </tr>
            <tr>
              <td colSpan={7} className="border px-2 py-1.5 text-right">PDV {Number(data.stopaPdv)}%:</td>
              <td className="border px-2 py-1.5 text-right">{formatCurrency(pdv, data.valuta)}</td>
            </tr>
            <tr className="bg-gray-900 text-white">
              <td colSpan={7} className="border px-2 py-2 text-right text-sm font-bold">UKUPNO SA PDV:</td>
              <td className="border px-2 py-2 text-right text-sm font-bold">{formatCurrency(grand, data.valuta)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Napomena */}
        <section className="mt-6 text-[10px] leading-snug text-gray-700">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider">Napomena i opšti uslovi poslovanja:</div>
          {data.napomena ? (
            <div className="whitespace-pre-wrap">{data.napomena}</div>
          ) : (
            <div className="text-justify">
              Ponuda se odnosi na zakup vozila javnog gradskog prevoza i oslikavanje spoljašnjosti vozila.
              Na cenu zakupa odobren je popust u skladu sa periodom trajanja zakupa i brojem ukupno zakupljenih vozila.
              U osnovnu cenu je uključen zakup vozila, montaža reklamne poruke, dostavljanje fotodokumentacije, održavanje u periodu zakupa i uklanjanje reklamne poruke po isteku zakupa.
              Rok za oslikavanje spoljašnjosti vozila je 10 radnih dana od dana dostavljanja grafičke pripreme. Zakup se računa od datuma postavljanja reklamne poruke.
              Izveštaj o početku kampanje se šalje klijentu u pisanoj formi i sadrži garažne brojeve vozila, datum od kog se vozila sa reklamnim rešenjem nalaze u saobraćaju i fotografije sa montaže.
              Foto izveštaj iz saobraćaja se šalje klijentu u roku od 7 radnih dana.
              Sve cene su izražene u {data.valuta}. PDV od {Number(data.stopaPdv)}% nije uračunat u navedene cene.
              Fakturisanje usluga se vrši na osnovu ponude tj. ugovora.
            </div>
          )}
        </section>

        {/* Signature block */}
        <section className="mt-10 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="border-t pt-2">
              <div className="font-semibold">Za Naručioca (M.P.)</div>
              <div className="mt-4 h-12"></div>
              <div className="text-gray-500">Potpis i pečat</div>
            </div>
          </div>
          <div>
            <div className="border-t pt-2">
              <div className="font-semibold">Ponudu sastavio</div>
              <div className="mt-1">{data.vlasnik?.ime} {data.vlasnik?.prezime}</div>
              <div className="text-gray-600">{data.vlasnik?.email}</div>
            </div>
          </div>
        </section>
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
