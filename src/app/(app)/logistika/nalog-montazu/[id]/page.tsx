"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, any> = {
  NACRT: "warning",
  POSLATO: "info",
  POSTAVLJENO: "success",
  PROBLEM: "danger",
  OTKAZANO: "danger",
};

export default function NalogMontazuDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error, refetch } = trpc.nalogMontazu.byId.useQuery({ id });
  const montazeri = trpc.logistikaLookups.montazeri.list.useQuery();
  const masine = trpc.logistikaLookups.masine.list.useQuery();

  const addStavka = trpc.nalogMontazu.addStavka.useMutation({ onSuccess: () => refetch() });
  const setStavkaStatus = trpc.nalogMontazu.setStavkaStatus.useMutation({ onSuccess: () => refetch() });
  const removeStavka = trpc.nalogMontazu.removeStavka.useMutation({ onSuccess: () => refetch() });
  const setNalogStatus = trpc.nalogMontazu.setStatus.useMutation({ onSuccess: () => refetch() });
  const update = trpc.nalogMontazu.update.useMutation({ onSuccess: () => refetch() });
  const vratiNaKorekciju = trpc.nalogMontazu.vratiNaKorekciju.useMutation({ onSuccess: () => refetch() });
  const odobriKorekciju = trpc.nalogMontazu.odobriKorekciju.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.nalogMontazu.remove.useMutation({ onSuccess: () => router.push(`/logistika/radni-nalozi/${data?.radniNalogId}`) });

  // form state — kolone iz "nalog za montažu.xlsx": GB | tip vozila | skidanje m² | montaža m² | RN
  const [garazniBroj, setGB] = useState("");
  const [tipVozila, setTipVozila] = useState("");
  const [linija, setLinija] = useState("");
  const [skidanje, setSkidanje] = useState<number | "">("");
  const [montaza, setMontaza] = useState<number | "">("");
  const [rnSt, setRnSt] = useState("");

  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam...</p>;
  if (error) return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
      <p className="font-semibold text-destructive">Greška: {error.message}</p>
      <p className="mt-1 text-xs text-muted-foreground">Ako je &quot;Tenant mismatch&quot;, nalog pripada drugom pravnom licu.</p>
    </div>
  );
  if (!data) return <p>Nalog ne postoji.</p>;

  const radniNalog: any = data.radniNalog;
  const sumSkidanje = data.stavke.reduce((s: number, x: any) => s + Number(x.skidanjeM2 ?? 0), 0);
  const sumMontaza = data.stavke.reduce((s: number, x: any) => s + Number(x.montazaM2 ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href={`/logistika/radni-nalozi/${data.radniNalogId}`} className="text-sm text-muted-foreground hover:underline">← Nazad na RN</Link>
          <Badge variant={STATUS_TONE[data.status]}>{data.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>🖨️ Štampaj</Button>
          {data.status === "NACRT" && <Button size="sm" onClick={() => setNalogStatus.mutate({ id, status: "POSLATO" })}>Pošalji ekipi</Button>}
          {data.status === "POSLATO" && <Button size="sm" onClick={() => setNalogStatus.mutate({ id, status: "POSTAVLJENO" })}>Označi postavljeno</Button>}
          {data.status !== "PROBLEM" && (
            <Button size="sm" variant="outline" onClick={() => {
              const razlog = prompt("Razlog popravke (biće poslat montažeru):");
              if (razlog && razlog.trim()) vratiNaKorekciju.mutate({ id, razlog: razlog.trim() });
            }}>↩ Popravi</Button>
          )}
          {data.status === "PROBLEM" && (
            <Button size="sm" onClick={() => odobriKorekciju.mutate({ id })}>✓ Odobri popravku</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { if (confirm("Obriši nalog?")) remove.mutate({ id }); }}>Obriši</Button>
        </div>
      </div>

      {(data as any).korekcijaNapomena && data.status === "PROBLEM" && (
        <div className="no-print rounded-md border-2 border-amber-300 bg-amber-50 p-3 text-sm">
          <strong className="text-amber-900">⚠️ Popravka u toku:</strong> {(data as any).korekcijaNapomena}
        </div>
      )}

      {/* Header edit panel */}
      <div className="no-print rounded-md border bg-white p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-5">
          <select
            className="rounded border px-2 py-1.5 text-sm"
            defaultValue={data.montazerId ?? ""}
            onChange={(e) => update.mutate({ id, montazerId: e.target.value || null })}
          >
            <option value="">— montažer —</option>
            {montazeri.data?.map((m: any) => <option key={m.id} value={m.id}>{m.naziv}</option>)}
          </select>
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="Prevoznik (Niš ekspres…)"
            defaultValue={data.prevoznikNaziv ?? ""}
            onBlur={(e) => update.mutate({ id, prevoznikNaziv: e.target.value })}
          />
          <select
            className="rounded border px-2 py-1.5 text-sm"
            defaultValue={data.masinaId ?? ""}
            onChange={(e) => update.mutate({ id, masinaId: e.target.value || null })}
          >
            <option value="">— mašina —</option>
            {masine.data?.map((m: any) => <option key={m.id} value={m.id}>{m.naziv}</option>)}
          </select>
          <input
            type="date"
            className="rounded border px-2 py-1.5 text-sm"
            defaultValue={data.datumMontaze ? new Date(data.datumMontaze).toISOString().substring(0, 10) : ""}
            onBlur={(e) => update.mutate({ id, datumMontaze: e.target.value ? new Date(e.target.value) : null })}
          />
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="Vreme (08:00 ili od 06h)"
            defaultValue={data.vremeMontaze ?? ""}
            onBlur={(e) => update.mutate({ id, vremeMontaze: e.target.value })}
          />
        </div>
      </div>

      {/* Print A4 */}
      <div className="print-area mx-auto w-full max-w-4xl rounded-md border bg-white p-10 shadow-sm text-sm text-black print:border-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between border-b-4 border-red-700 pb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.2em] text-red-700">INFO MEDIA GROUP d.o.o.</div>
            <div className="mt-1 text-xs text-gray-600">Omladinskih brigada 86, West 65 Tower, Beograd</div>
            <div className="text-xs text-gray-600">Tel: +381 11 3370 553</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold uppercase">Nalog za montažu</div>
            <div className="mt-1 text-xs">Broj: <span className="font-mono font-semibold">{data.broj}</span></div>
            <div className="text-xs">Tip: <strong>{data.tip}</strong>{data.grad ? ` · ${data.grad}` : ""}</div>
            <div className="text-xs">Datum: {data.datumMontaze ? formatDate(data.datumMontaze) : "—"} {data.vremeMontaze ?? ""}</div>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-6 text-xs">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Klijent / Kampanja</div>
            <div className="text-sm font-semibold">{radniNalog?.partner?.naziv ?? "—"}</div>
            <div>RN: <span className="font-mono">{radniNalog?.broj}</span></div>
            <div>Period: {formatDate(radniNalog?.odDatum)} — {formatDate(radniNalog?.doDatum)}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Ekipa / Prevoznik</div>
            <div className="text-sm">Montažer: <strong>{data.montazerRef?.naziv ?? data.ekipa ?? "—"}</strong></div>
            <div>Prevoznik: {data.prevoznikNaziv ?? "—"}</div>
            <div>MAŠINA: {data.masinaRef?.naziv ?? "—"}</div>
            {data.napomena && <div className="mt-1 text-[11px] text-gray-600">{data.napomena}</div>}
          </div>
        </section>

        <div className="mb-2 bg-gray-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white">
          Stavke — vozila i površine
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1 text-center">#</th>
              <th className="border px-2 py-1 text-left">GB</th>
              <th className="border px-2 py-1 text-left">tip vozila</th>
              <th className="border px-2 py-1 text-left">linija</th>
              <th className="border px-2 py-1 text-right">skidanje m²</th>
              <th className="border px-2 py-1 text-right">montaža m²</th>
              <th className="border px-2 py-1 text-left">RN</th>
              <th className="border px-2 py-1 text-left">Status</th>
              <th className="no-print border px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {data.stavke.length === 0 && (
              <tr><td colSpan={9} className="border px-2 py-3 text-center text-muted-foreground">Nema stavki — dodaj ispod</td></tr>
            )}
            {data.stavke.map((s: any, idx: number) => (
              <tr key={s.id}>
                <td className="border px-2 py-1 text-center">{s.redniBr ?? idx + 1}</td>
                <td className="border px-2 py-1">{s.vozilo?.sifra ?? s.garazniBroj ?? "—"}</td>
                <td className="border px-2 py-1">{s.vozilo?.tipVozilaTxt ?? s.tipVozila ?? "—"}</td>
                <td className="border px-2 py-1">{s.linija ?? "—"}</td>
                <td className="border px-2 py-1 text-right">{s.skidanjeM2 ? Number(s.skidanjeM2) : "—"}</td>
                <td className="border px-2 py-1 text-right">{s.montazaM2 ? Number(s.montazaM2) : "—"}</td>
                <td className="border px-2 py-1 font-mono">{s.rnStamparije ?? "—"}</td>
                <td className="border px-2 py-1">
                  <Badge variant={STATUS_TONE[s.status]}>{s.status}</Badge>
                </td>
                <td className="no-print border px-2 py-1">
                  <select
                    className="rounded border px-1 py-0.5 text-[10px]"
                    value={s.status}
                    onChange={(e) => setStavkaStatus.mutate({ stavkaId: s.id, status: e.target.value as any })}
                  >
                    <option>NACRT</option>
                    <option>POSLATO</option>
                    <option>POSTAVLJENO</option>
                    <option>PROBLEM</option>
                    <option>OTKAZANO</option>
                  </select>
                  <button className="ml-1 text-[10px] text-red-600 hover:underline" onClick={() => removeStavka.mutate({ stavkaId: s.id })}>×</button>
                </td>
              </tr>
            ))}
            {data.stavke.length > 0 && (
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="border px-2 py-1 text-right">UKUPNO m²</td>
                <td className="border px-2 py-1 text-right">{sumSkidanje.toFixed(2)}</td>
                <td className="border px-2 py-1 text-right">{sumMontaza.toFixed(2)}</td>
                <td colSpan={3} className="border px-2 py-1"></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Add stavka inline */}
        <div className="no-print mt-3 grid grid-cols-7 gap-1 text-xs">
          <input className="rounded border px-2 py-1" placeholder="GB (3117)" value={garazniBroj} onChange={(e) => setGB(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="tip vozila" value={tipVozila} onChange={(e) => setTipVozila(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="linija" value={linija} onChange={(e) => setLinija(e.target.value)} />
          <input type="number" step="0.5" className="rounded border px-2 py-1" placeholder="skidanje m²" value={skidanje} onChange={(e) => setSkidanje(e.target.value === "" ? "" : Number(e.target.value))} />
          <input type="number" step="0.5" className="rounded border px-2 py-1" placeholder="montaža m²" value={montaza} onChange={(e) => setMontaza(e.target.value === "" ? "" : Number(e.target.value))} />
          <input className="rounded border px-2 py-1" placeholder="RN štamp." value={rnSt} onChange={(e) => setRnSt(e.target.value)} />
          <Button size="sm" onClick={() => {
            addStavka.mutate({
              nalogId: id,
              garazniBroj: garazniBroj || undefined,
              tipVozila: tipVozila || undefined,
              linija: linija || undefined,
              skidanjeM2: skidanje === "" ? undefined : (skidanje as number),
              montazaM2: montaza === "" ? undefined : (montaza as number),
              rnStamparije: rnSt || undefined,
            });
            setGB(""); setTipVozila(""); setLinija(""); setSkidanje(""); setMontaza(""); setRnSt("");
          }}>+</Button>
        </div>

        <section className="mt-12 grid grid-cols-3 gap-8 text-xs">
          <div className="border-t-2 border-gray-400 pt-2 text-center">
            <div className="font-semibold">Logistika</div>
            <div className="mt-4 h-8"></div>
            <div className="text-[10px] text-gray-500">Datum + potpis</div>
          </div>
          <div className="border-t-2 border-gray-400 pt-2 text-center">
            <div className="font-semibold">Vođa montaže</div>
            <div className="mt-4 h-8"></div>
            <div className="text-[10px] text-gray-500">Datum + potpis</div>
          </div>
          <div className="border-t-2 border-gray-400 pt-2 text-center">
            <div className="font-semibold">Završeno</div>
            <div className="mt-4 h-8"></div>
            <div className="text-[10px] text-gray-500">Datum + potpis</div>
          </div>
        </section>

        <footer className="mt-8 border-t pt-3 text-center text-[9px] text-gray-500">
          Generisano: {new Date().toLocaleString("sr-Latn")} · Info Media Group d.o.o.
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
