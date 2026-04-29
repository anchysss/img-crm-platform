"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, any> = {
  AKTIVNO: "success",
  U_ZAKUPU: "info",
  SERVIS: "warning",
  KVAR: "danger",
  NA_FARBANJU: "warning",
  POVUCENO: "default",
  SIHTA: "info",
};

const REZ_TONE: Record<string, any> = {
  HOLD: "warning",
  CONFIRMED: "info",
  RUNNING: "success",
  CANCELLED: "danger",
  RELEASED: "default",
};

export default function VoziloDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = trpc.vehicles.byId.useQuery({ id });
  const rez = trpc.vehicles.reservationsForVehicle.useQuery({ id });

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Vozilo nije pronađeno.</p>;

  const now = new Date();
  const aktivneRez = (rez.data ?? []).filter((r: any) => new Date(r.doDatum) >= now);
  const istorijaRez = (rez.data ?? []).filter((r: any) => new Date(r.doDatum) < now);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{data.tipVozilaTxt ?? data.tip}</h1>
            <Badge variant={STATUS_TONE[data.status]}>{data.status}</Badge>
            {data.aktivan ? <Badge variant="success">Aktivan</Badge> : <Badge>Neaktivan</Badge>}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono font-medium text-foreground">{data.registracija}</span>
            {data.inventurniBroj && <span className="ml-2">· Inv. <span className="font-mono">{data.inventurniBroj}</span></span>}
            {data.sifra && <span className="ml-2">· Šifra <span className="font-mono">{data.sifra}</span></span>}
            <span className="ml-2">· {data.grad} · {data.dobavljac ?? "—"}</span>
          </div>
        </div>
        <Link href="/logistika/vozila" className="text-sm text-muted-foreground hover:underline">← Sva vozila</Link>
      </header>

      {/* Info grid */}
      <section className="grid gap-3 md:grid-cols-3">
        <Info label="Garaža" value={data.garaza ?? "—"} />
        <Info label="Model" value={data.model ?? "—"} />
        <Info label="Oznaka" value={data.oznaka ?? "—"} />
        <Info label="Period zakupa" value={data.zakupOd && data.zakupDo ? `${formatDate(data.zakupOd)} — ${formatDate(data.zakupDo)}` : "—"} />
        <Info label="Broj ugovora" value={data.brojUgovora ?? "—"} />
        <Info label="Kom.naknada do" value={data.komNaknadaDatumDo ? formatDate(data.komNaknadaDatumDo) : "—"} />
        <Info label="GPS" value={data.gps ? "Da" : "Ne"} />
        <Info label="Pozicije" value={String(data.pozicije.length)} />
        <Info label="Opis" value={data.opis ?? "—"} />
      </section>

      {/* Linije */}
      {data.linija && data.linija.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Gradske linije ({data.linija.length})</h2>
          <div className="flex flex-wrap gap-2">
            {data.linija.map((l: string, i: number) => (
              <span key={i} className="rounded-md border bg-secondary/30 px-3 py-1 text-xs">{l}</span>
            ))}
          </div>
        </section>
      )}

      {/* Aktivne rezervacije / kampanje */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Aktivne kampanje na ovom vozilu ({aktivneRez.length})</h2>
        {aktivneRez.length === 0 ? (
          <p className="text-sm text-muted-foreground">Vozilo trenutno nije zauzeto.</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-3 py-2">Kampanja / Prilika</th>
                  <th className="px-3 py-2">Klijent</th>
                  <th className="px-3 py-2">Pozicija</th>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {aktivneRez.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {r.kampanja ? (
                        <Link href={`/logistika/kampanje/${r.kampanja.id}`} className="hover:underline">{r.kampanja.naziv}</Link>
                      ) : r.opportunity ? (
                        <Link href={`/prodaja/prilike/${r.opportunity.id}`} className="hover:underline">{r.opportunity.naziv} (prilika)</Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.kampanja?.partner?.naziv ?? r.opportunity?.partner?.naziv ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.pozicija.tip}</td>
                    <td className="px-3 py-2 text-xs">{formatDate(r.odDatum)} — {formatDate(r.doDatum)}</td>
                    <td className="px-3 py-2"><Badge variant={REZ_TONE[r.status]}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Timeline kalendar */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Vremenska osa zauzeća</h2>
        <Timeline reservations={(rez.data ?? [])} />
      </section>

      {/* Istorija */}
      {istorijaRez.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Prošle kampanje ({istorijaRez.length})</h2>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-3 py-2">Kampanja</th>
                  <th className="px-3 py-2">Klijent</th>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {istorijaRez.slice(0, 30).map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      {r.kampanja ? (
                        <Link href={`/logistika/kampanje/${r.kampanja.id}`} className="text-xs hover:underline">{r.kampanja.naziv}</Link>
                      ) : r.opportunity ? (
                        <Link href={`/prodaja/prilike/${r.opportunity.id}`} className="text-xs hover:underline">{r.opportunity.naziv}</Link>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.kampanja?.partner?.naziv ?? r.opportunity?.partner?.naziv ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{formatDate(r.odDatum)} — {formatDate(r.doDatum)}</td>
                    <td className="px-3 py-2"><Badge variant={REZ_TONE[r.status]}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function Timeline({ reservations }: { reservations: any[] }) {
  if (reservations.length === 0) return <p className="text-sm text-muted-foreground">Nema rezervacija.</p>;
  // Find min/max date range
  const dates = reservations.flatMap((r) => [new Date(r.odDatum).getTime(), new Date(r.doDatum).getTime()]);
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  const totalRange = maxDate.getTime() - minDate.getTime() || 1;
  const now = Date.now();

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-4">
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        <span>{minDate.toLocaleDateString("sr-Latn")}</span>
        <span>{maxDate.toLocaleDateString("sr-Latn")}</span>
      </div>
      <div className="relative h-2 w-full rounded bg-secondary/40">
        {/* "Now" marker */}
        {now >= minDate.getTime() && now <= maxDate.getTime() && (
          <div
            className="absolute top-[-4px] h-4 w-0.5 bg-destructive"
            style={{ left: `${((now - minDate.getTime()) / totalRange) * 100}%` }}
            title="Sada"
          />
        )}
      </div>
      <div className="flex flex-col gap-1">
        {reservations.slice(0, 20).map((r) => {
          const start = new Date(r.odDatum).getTime();
          const end = new Date(r.doDatum).getTime();
          const left = ((start - minDate.getTime()) / totalRange) * 100;
          const width = Math.max(0.5, ((end - start) / totalRange) * 100);
          const cls = r.status === "RUNNING" ? "bg-emerald-500" : r.status === "CONFIRMED" ? "bg-blue-500" : r.status === "HOLD" ? "bg-amber-500" : "bg-gray-400";
          return (
            <div key={r.id} className="relative h-5 rounded bg-secondary/20">
              <div
                className={`absolute h-full rounded ${cls}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${r.kampanja?.naziv ?? r.opportunity?.naziv ?? r.status}: ${formatDate(r.odDatum)} — ${formatDate(r.doDatum)}`}
              />
              <span className="absolute left-2 text-[10px] text-foreground/80 leading-5 pointer-events-none">
                {r.kampanja?.naziv ?? r.opportunity?.naziv ?? r.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
