"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, any> = {
  NOVO: "warning",
  PRIHVACEN_LOGISTIKA: "info",
  PRIPREMA_FAJLOVA: "warning",
  KOLORNA_PROBA: "warning",
  PROBA_ODOBRENA: "info",
  PRIPREMA_MONTAZE: "info",
  U_REALIZACIJI: "info",
  STAMPA_U_TOKU: "info",
  MONTAZA_U_TOKU: "info",
  ZAVRSEN: "success",
  OTKAZAN: "danger",
};

const PRIPREMA_TONE: Record<string, any> = {
  NEMA_PRIPREME: "default",
  U_PRIPREMI: "warning",
  POSLATA: "info",
  KOLORNA_PROBA_NA_OVERAVANJU: "warning",
  ODOBRENA: "success",
  KOREKCIJA: "danger",
  GOTOVO: "success",
};

export default function RadniNalogDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.radniNalozi.byId.useQuery({ id });
  const setStatus = trpc.radniNalozi.setStatus.useMutation({ onSuccess: () => refetch() });

  const createMontaza = trpc.nalogMontazu.create.useMutation({
    onSuccess: (n: any) => router.push(`/logistika/nalog-montazu/${n.id}`),
  });
  const createStampa = trpc.nalogStampu.create.useMutation({
    onSuccess: (n: any) => router.push(`/logistika/nalog-stampu/${n.id}`),
  });
  const createAlbum = trpc.fotoAlbum.create.useMutation({
    onSuccess: (a: any) => router.push(`/logistika/foto-album/${a.id}`),
  });
  const createPostbrending = trpc.postbrending.create.useMutation({
    onSuccess: () => refetch(),
  });
  const createResenje = trpc.resenja.create.useMutation({ onSuccess: () => refetch() });
  const setPriprema = trpc.radniNalozi.setPriprema.useMutation({ onSuccess: () => refetch() });
  const odobriProbu = trpc.radniNalozi.odobriProbu.useMutation({ onSuccess: () => refetch() });
  const vratiNaKorekciju = trpc.radniNalozi.vratiNaKorekciju.useMutation({ onSuccess: () => refetch() });

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
          {data.status === "PRIHVACEN_LOGISTIKA" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "PRIPREMA_FAJLOVA" })}>→ Priprema fajlova</Button>}
          {data.status === "PRIPREMA_FAJLOVA" && (data as any).kolornaProba && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "KOLORNA_PROBA" })}>→ Kolorna proba</Button>}
          {data.status === "PRIPREMA_FAJLOVA" && !(data as any).kolornaProba && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "PROBA_ODOBRENA" })}>→ Preskoči, štampa</Button>}
          {data.status === "PROBA_ODOBRENA" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "STAMPA_U_TOKU" })}>→ Štampa u toku</Button>}
          {data.status === "STAMPA_U_TOKU" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "MONTAZA_U_TOKU" })}>→ Montaža</Button>}
          {data.status === "MONTAZA_U_TOKU" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "ZAVRSEN" })}>✓ Završi</Button>}
          {/* Legacy flow fallback */}
          {data.status === "PRIPREMA_MONTAZE" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "U_REALIZACIJI" })}>Pokreni realizaciju</Button>}
          {data.status === "U_REALIZACIJI" && <Button size="sm" onClick={() => setStatus.mutate({ id, status: "ZAVRSEN" })}>Završi</Button>}
        </div>
      </div>

      {/* Priprema fajlova / kolorna proba panel (no-print) */}
      <div className="no-print rounded-md border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Priprema fajlova</h2>
            <Badge variant={PRIPREMA_TONE[(data as any).pripremaStatus ?? "NEMA_PRIPREME"]}>
              {((data as any).pripremaStatus ?? "NEMA_PRIPREME").replace(/_/g, " ")}
            </Badge>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean((data as any).kolornaProba)}
              onChange={(e) => setPriprema.mutate({ id, kolornaProba: e.target.checked })}
            />
            Radi se kolorna proba
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-gray-500">URL fajlova pripreme</label>
            <input
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="https://drive.google.com/..."
              defaultValue={(data as any).pripremaUrl ?? ""}
              onBlur={(e) => setPriprema.mutate({ id, pripremaUrl: e.target.value })}
            />
            {(data as any).pripremaUrl && (
              <a href={(data as any).pripremaUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-red-700 hover:underline">📎 Otvori pripremu</a>
            )}
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-gray-500">Status pripreme</label>
            <select
              className="w-full rounded border px-2 py-1.5 text-sm"
              value={(data as any).pripremaStatus ?? "NEMA_PRIPREME"}
              onChange={(e) => setPriprema.mutate({ id, pripremaStatus: e.target.value as any })}
            >
              <option value="NEMA_PRIPREME">Nema pripreme</option>
              <option value="U_PRIPREMI">U pripremi</option>
              <option value="POSLATA">Poslata logistici</option>
              <option value="KOLORNA_PROBA_NA_OVERAVANJU">Kolorna proba na overavanju</option>
              <option value="ODOBRENA">Odobrena</option>
              <option value="KOREKCIJA">Korekcija</option>
              <option value="GOTOVO">Gotovo — može u štampu</option>
            </select>
          </div>
        </div>

        {(data as any).korekcijaNapomena && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs">
            <strong>Razlog korekcije:</strong> {(data as any).korekcijaNapomena}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {((data as any).pripremaStatus === "KOLORNA_PROBA_NA_OVERAVANJU" || (data as any).pripremaStatus === "POSLATA") && (
            <>
              <Button size="sm" onClick={() => odobriProbu.mutate({ id })}>✓ Odobri probu</Button>
              <Button size="sm" variant="outline" onClick={() => {
                const razlog = prompt("Razlog korekcije:");
                if (razlog) vratiNaKorekciju.mutate({ id, razlog });
              }}>↩ Vrati na korekciju</Button>
            </>
          )}
          {((data as any).pripremaStatus === "U_PRIPREMI" || (data as any).pripremaStatus === "KOREKCIJA") && (
            <Button size="sm" onClick={() => setPriprema.mutate({ id, pripremaStatus: "POSLATA" })}>📨 Pošalji fajlove logistici</Button>
          )}
          {(data as any).pripremaPoslataAt && (
            <span className="text-xs text-muted-foreground">Poslato: {formatDate((data as any).pripremaPoslataAt)}</span>
          )}
          {(data as any).pripremaOdobrenaAt && (
            <span className="text-xs text-emerald-700">✓ Odobreno: {formatDate((data as any).pripremaOdobrenaAt)}</span>
          )}
        </div>
      </div>

      {/* Logistika workflow panel (no-print) */}
      <div className="no-print rounded-md border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Logistika workflow</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              const oznaka = prompt("Oznaka rešenja (npr. R01)", `R0${(data.resenja?.length ?? 0) + 1}`);
              if (!oznaka) return;
              const procStr = prompt("Procenat raspodele (0-100)", "100");
              if (procStr === null) return;
              const naziv = prompt("Naziv kreative (opciono)", "") || undefined;
              createResenje.mutate({ radniNalogId: id, oznaka, procenat: Number(procStr) || 100, naziv });
            }}>+ Rešenje</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const tip = (prompt("Tip naloga: BEOGRAD ili GRADOVI", "BEOGRAD") || "").toUpperCase();
              if (tip !== "BEOGRAD" && tip !== "GRADOVI") return;
              const grad = tip === "GRADOVI" ? (prompt("Grad", data.grad || "Novi Sad") || undefined) : undefined;
              createMontaza.mutate({ radniNalogId: id, tip: tip as any, grad });
            }}>+ Nalog za montažu</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const stamparija = (prompt("Štamparija: DPC_BEOGRAD / STAMPARIJA_NIS / DRUGA", "DPC_BEOGRAD") || "").toUpperCase();
              if (!["DPC_BEOGRAD","STAMPARIJA_NIS","DRUGA"].includes(stamparija)) return;
              const today = new Date(); const rok = new Date(today); rok.setDate(rok.getDate() + 3);
              createStampa.mutate({
                radniNalogId: id,
                stamparija: stamparija as any,
                datumPredaje: today,
                rokIzrade: rok,
              });
            }}>+ Nalog za štampu</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const tip = (prompt("Tip albuma: MONTAZA / SAOBRACAJ / POSTBRANDING", "MONTAZA") || "").toUpperCase();
              if (!["MONTAZA","SAOBRACAJ","POSTBRANDING"].includes(tip)) return;
              const naziv = prompt("Naziv albuma", `${data.partner?.naziv || "Album"} — ${tip}`);
              if (!naziv) return;
              createAlbum.mutate({ radniNalogId: id, naziv, tip: tip as any });
            }}>+ Foto album</Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (!confirm("Kreirati postbrending izveštaj?")) return;
              createPostbrending.mutate({ radniNalogId: id });
            }}>+ Postbrending</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Resenja */}
          <div className="rounded border p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Rešenja ({data.resenja?.length ?? 0})</div>
            {(!data.resenja || data.resenja.length === 0) ? (
              <p className="text-xs text-muted-foreground">Nema rešenja. Dodaj R01 (npr. 50/50 ili 100%).</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {data.resenja.map((r: any) => (
                  <li key={r.id} className="flex justify-between">
                    <span><strong>{r.oznaka}</strong> — {r.naziv ?? "—"}</span>
                    <span className="text-muted-foreground">{Number(r.procenat).toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Nalozi za montažu */}
          <div className="rounded border p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Nalozi za montažu ({data.montaze?.length ?? 0})</div>
            {(!data.montaze || data.montaze.length === 0) ? (
              <p className="text-xs text-muted-foreground">Nema naloga.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {data.montaze.map((n: any) => (
                  <li key={n.id}>
                    <Link href={`/logistika/nalog-montazu/${n.id}`} className="font-mono text-red-700 hover:underline">{n.broj}</Link>
                    <span className="ml-2 text-muted-foreground">[{n.tip}{n.grad ? ` · ${n.grad}` : ""}] · {n._count?.stavke ?? 0} stavki · {n.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Nalozi za štampu */}
          <div className="rounded border p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Nalozi za štampu ({data.stampe?.length ?? 0})</div>
            {(!data.stampe || data.stampe.length === 0) ? (
              <p className="text-xs text-muted-foreground">Nema naloga.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {data.stampe.map((n: any) => (
                  <li key={n.id}>
                    <Link href={`/logistika/nalog-stampu/${n.id}`} className="font-mono text-red-700 hover:underline">{n.broj}</Link>
                    <span className="ml-2 text-muted-foreground">[{n.stamparija}] · {n._count?.stavke ?? 0} stavki · {n.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Foto albumi */}
          <div className="rounded border p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Foto albumi ({data.albumi?.length ?? 0})</div>
            {(!data.albumi || data.albumi.length === 0) ? (
              <p className="text-xs text-muted-foreground">Nema albuma.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {data.albumi.map((a: any) => (
                  <li key={a.id}>
                    <Link href={`/logistika/foto-album/${a.id}`} className="text-red-700 hover:underline">{a.naziv}</Link>
                    <span className="ml-2 text-muted-foreground">[{a.tip}] · {a._count?.fotografije ?? 0} fotografija</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Postbrending */}
          <div className="rounded border p-3 md:col-span-2 lg:col-span-2">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Postbrending izveštaji ({data.postbrendinzi?.length ?? 0})</div>
            {(!data.postbrendinzi || data.postbrendinzi.length === 0) ? (
              <p className="text-xs text-muted-foreground">Nema izveštaja.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {data.postbrendinzi.map((p: any) => (
                  <li key={p.id} className="flex justify-between">
                    <span className="font-mono">{p.broj}</span>
                    <span className="text-muted-foreground">
                      {formatDate(p.datum)}
                      {p.poslatoAt ? ` · ✉️ poslato ${formatDate(p.poslatoAt)}` : " · nacrt"}
                      {p.pdfUrl ? <> · <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="text-red-700 hover:underline">PDF</a></> : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
