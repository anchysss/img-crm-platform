"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function GdprPage() {
  const [email, setEmail] = useState("");
  const access = trpc.gdpr.rightToAccess.useQuery({ email }, { enabled: false });
  const erasure = trpc.gdpr.rightToErasure.useMutation();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">GDPR operacije</h1>
      <section className="rounded-md border p-4">
        <h2 className="mb-3 font-semibold">Pravo na pristup</h2>
        <div className="flex items-end gap-3">
          <Field label="Email subjekta">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button onClick={() => access.refetch()} disabled={!email}>Pretraži</Button>
        </div>
        {access.data && (
          <div className="mt-4 text-sm">
            <div className="mb-2"><strong>Pronađeno kontakata:</strong> {access.data.kontakti.length}</div>
            <div className="mb-2"><strong>Pronađeno korisnika:</strong> {access.data.korisnici.length}</div>
            <div className="space-y-2">
              {access.data.kontakti.map((k: any) => (
                <div key={k.id} className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <Badge>{k.pseudonimizovan ? "Pseudonimizovan" : "Aktivan"}</Badge>
                    <span className="ml-2">{k.ime} ({k.email ?? "—"})</span>
                    <span className="ml-2 text-xs text-muted-foreground">@ {k.partner?.naziv}</span>
                  </div>
                  {!k.pseudonimizovan && (
                    <Button size="sm" variant="destructive" onClick={async () => {
                      if (!confirm(`Pseudonimizovati kontakt ${k.ime}?`)) return;
                      await erasure.mutateAsync({ kontaktId: k.id });
                      setMsg(`Pseudonimizovan ${k.id}`);
                      access.refetch();
                    }}>Pravo na zaborav</Button>
                  )}
                </div>
              ))}
            </div>
            {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
