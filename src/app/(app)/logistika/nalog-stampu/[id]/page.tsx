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

export default function NalogStampuDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.nalogStampu.byId.useQuery({ id });
  const folije = trpc.logistikaLookups.folije.list.useQuery();
  const dorade = trpc.logistikaLookups.dorade.list.useQuery();
  const masine = trpc.logistikaLookups.masine.list.useQuery();

  const addStavka = trpc.nalogStampu.addStavka.useMutation({ onSuccess: () => refetch() });
  const removeStavka = trpc.nalogStampu.removeStavka.useMutation({ onSuccess: () => refetch() });
  const setStatus = trpc.nalogStampu.setStatus.useMutation({ onSuccess: () => refetch() });
  const update = trpc.nalogStampu.update.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.nalogStampu.remove.useMutation({ onSuccess: () => router.push(`/logistika/radni-nalozi/${data?.radniNalogId}`) });

  // form state for new stavka (HIGER kolone)
  const [fileNaziv, setFileNaziv] = useState("");
  const [formatX, setFormatX] = useState<number | "">("");
  const [formatY, setFormatY] = useState<number | "">("");
  const [tiraz, setTiraz] = useState(1);
  const [folijaId, setFolijaId] = useState("");
  const [doradaId, setDoradaId] = useState("");

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Nalog ne postoji.</p>;

  const radniNalog: any = data.radniNalog;

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href={`/logistika/radni-nalozi/${data.radniNalogId}`} className="text-sm text-muted-foreground hover:underline">← Nazad na RN</Link>
          <Badge variant={STATUS_TONE[data.status]}>{data.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>🖨️ Štampaj</Button>
          {data.status === "NACRT" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "POSLATO" })}>Pošalji štampariji</Button>}
          {data.status === "POSLATO" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "POSTAVLJENO" })}>Završeno</Button>}
          <Button size="sm" variant="outline" onClick={() => { if (confirm("Obriši nalog?")) remove.mutate({ id }); }}>Obriši</Button>
        </div>
      </div>

      {/* Header edit panel (no-print) */}
      <div className="no-print rounded-md border bg-white p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="Naziv kampanje (FAIRY HIGER - 2 kom)"
            defaultValue={data.kampanjaNaziv ?? ""}
            onBlur={(e) => update.mutate({ id, kampanjaNaziv: e.target.value })}
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
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="RN štamparije (broj koji vrati štamparija)"
            defaultValue={data.rnStamparije ?? ""}
            onBlur={(e) => update.mutate({ id, rnStamparije: e.target.value })}
          />
          <input
            className="rounded border px-2 py-1.5 text-sm"
            placeholder="Rok izrade vreme (DO 14H)"
            defaultValue={data.rokIzradeTime ?? ""}
            onBlur={(e) => update.mutate({ id, rokIzradeTime: e.target.value })}
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
            <div className="text-2xl font-bold uppercase">Nalog za štampu</div>
            <div className="mt-1 text-xs">Broj: <span className="font-mono font-semibold">{data.broj}</span></div>
            <div className="text-xs">Štamparija: <strong>{data.stamparija}</strong></div>
            <div className="text-xs">Datum: {formatDate(data.datumPredaje)} · Rok: {formatDate(data.rokIzrade)} {data.rokIzradeTime ?? ""}</div>
            {data.rnStamparije && <div className="text-xs">RN štamparije: <span className="font-mono">{data.rnStamparije}</span></div>}
          </div>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-6 text-xs">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Naručilac</div>
            <div className="text-sm font-semibold">{radniNalog?.partner?.naziv ?? "—"}</div>
            <div>RN: <span className="font-mono">{radniNalog?.broj}</span></div>
            <div>Period kampanje: {formatDate(radniNalog?.odDatum)} — {formatDate(radniNalog?.doDatum)}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Kampanja / Mašina</div>
            <div className="text-sm font-semibold">{data.kampanjaNaziv ?? "—"}</div>
            <div>MAŠINA: <strong>{data.masinaRef?.naziv ?? data.masina ?? "—"}</strong></div>
            {data.napomena && <div className="mt-1 text-[11px] text-gray-600">{data.napomena}</div>}
          </div>
        </section>

        <div className="mb-2 bg-gray-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white">
          Stavke za štampu
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1 text-center">#</th>
              <th className="border px-2 py-1 text-left">File</th>
              <th className="border px-2 py-1 text-right">Format X (cm)</th>
              <th className="border px-2 py-1 text-right">Format Y (cm)</th>
              <th className="border px-2 py-1 text-right">Tiraž</th>
              <th className="border px-2 py-1 text-left">FOLIJA</th>
              <th className="border px-2 py-1 text-left">Dorada</th>
              <th className="no-print border px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {data.stavke.length === 0 && (
              <tr><td colSpan={8} className="border px-2 py-3 text-center text-muted-foreground">Nema stavki — dodaj ispod</td></tr>
            )}
            {data.stavke.map((s: any, i: number) => (
              <tr key={s.id}>
                <td className="border px-2 py-1 text-center">{s.redniBr ?? i + 1}</td>
                <td className="border px-2 py-1">{s.fileNaziv ?? s.format}</td>
                <td className="border px-2 py-1 text-right">{s.formatX ? Number(s.formatX) : "—"}</td>
                <td className="border px-2 py-1 text-right">{s.formatY ? Number(s.formatY) : "—"}</td>
                <td className="border px-2 py-1 text-right">{s.tiraz}</td>
                <td className="border px-2 py-1">{s.folijaRef?.naziv ?? s.materijal ?? "—"}</td>
                <td className="border px-2 py-1">{s.doradaRef?.naziv ?? s.dorada ?? "—"}</td>
                <td className="no-print border px-2 py-1">
                  <button className="text-[10px] text-red-600 hover:underline" onClick={() => removeStavka.mutate({ stavkaId: s.id })}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add stavka inline (HIGER kolone) */}
        <div className="no-print mt-3 grid grid-cols-7 gap-1 text-xs">
          <input className="rounded border px-2 py-1 col-span-2" placeholder="File (155X105 - RAM - HIG crv)" value={fileNaziv} onChange={(e) => setFileNaziv(e.target.value)} />
          <input type="number" className="rounded border px-2 py-1" placeholder="X cm" value={formatX} onChange={(e) => setFormatX(e.target.value === "" ? "" : Number(e.target.value))} />
          <input type="number" className="rounded border px-2 py-1" placeholder="Y cm" value={formatY} onChange={(e) => setFormatY(e.target.value === "" ? "" : Number(e.target.value))} />
          <input type="number" className="rounded border px-2 py-1" placeholder="Tiraž" value={tiraz} onChange={(e) => setTiraz(Number(e.target.value))} />
          <select className="rounded border px-2 py-1" value={folijaId} onChange={(e) => setFolijaId(e.target.value)}>
            <option value="">— folija —</option>
            {folije.data?.map((f: any) => <option key={f.id} value={f.id}>{f.naziv}</option>)}
          </select>
          <select className="rounded border px-2 py-1" value={doradaId} onChange={(e) => setDoradaId(e.target.value)}>
            <option value="">— dorada —</option>
            {dorade.data?.map((d: any) => <option key={d.id} value={d.id}>{d.naziv}</option>)}
          </select>
        </div>
        <div className="no-print mt-2">
          <Button size="sm" disabled={!fileNaziv} onClick={() => {
            const formatLegacy = formatX && formatY ? `${formatX}x${formatY}` : (fileNaziv || "—");
            addStavka.mutate({
              nalogId: id,
              grad: "BG",
              fileNaziv,
              formatX: formatX === "" ? undefined : (formatX as number),
              formatY: formatY === "" ? undefined : (formatY as number),
              tiraz,
              folijaId: folijaId || undefined,
              doradaId: doradaId || undefined,
              format: formatLegacy,
              materijal: "DRUGO" as any,
            });
            setFileNaziv(""); setFormatX(""); setFormatY(""); setTiraz(1); setFolijaId(""); setDoradaId("");
          }}>+ Dodaj stavku</Button>
        </div>

        <p className="mt-4 text-[10px] uppercase tracking-wider text-gray-600 print:block">
          OBAVEZNO ODŠTAMPATI UPUTSTVA I PREVIEW NA PAPIRU MINIMALNE VELIČINE A3
        </p>

        <section className="mt-12 grid grid-cols-3 gap-8 text-xs">
          <div className="border-t-2 border-gray-400 pt-2 text-center">
            <div className="font-semibold">IMG (naručilac)</div>
            <div className="mt-4 h-8"></div>
          </div>
          <div className="border-t-2 border-gray-400 pt-2 text-center">
            <div className="font-semibold">Štamparija</div>
            <div className="mt-4 h-8"></div>
            <div className="text-[10px] text-gray-500">Potpis prijema</div>
          </div>
          <div className="border-t-2 border-gray-400 pt-2 text-center">
            <div className="font-semibold">Predaja IMG</div>
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
          @page { size: A4 landscape; margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
