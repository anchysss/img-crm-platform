import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-start justify-center gap-8 p-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">IMG CRM platforma</h1>
        <p className="mt-3 text-muted-foreground">
          CRM + inventar transit media + finansijski handoff. Multi-country (MNE / SRB / HRV / BIH).
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Prijava
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border px-4 py-2 hover:bg-secondary"
        >
          Dashboard
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        Verzija 0.1.0 · Milestone M0 + M1 isporučeni, M2–M10 scaffolded.
      </p>
    </main>
  );
}
